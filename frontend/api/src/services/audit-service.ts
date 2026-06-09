import { MongoClient, Db, Collection } from 'mongodb';
import * as crypto from 'crypto';
import { 
  AuditRecord, 
  AuditRecordCreate, 
  AuditQuery, 
  AuditListResponse 
} from '../types/audit';

export const AUDIT_COLLECTION_NAME = 'audit_records';

/**
 * AuditService
 * 
 * Stores immutable audit records in MongoDB with tamper-detection hashes,
 * efficient query support, and best-effort semantics.
 */
export class AuditService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<AuditRecord> | null = null;

  constructor(private uri?: string) {}

  /**
   * Connects to MongoDB and ensures indexes are created.
   * 
   * @param uri Optional MongoDB connection string (overrides constructor/env)
   */
  async connect(uri?: string): Promise<void> {
    const connectionUri = uri || this.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/aetherium';
    
    try {
      this.client = new MongoClient(connectionUri);
      await this.client.connect();
      this.db = this.client.db();
      this.collection = this.db.collection<AuditRecord>(AUDIT_COLLECTION_NAME);
      
      await this.ensureIndexes();
      console.log('✅ AuditService connected to MongoDB');
    } catch (error) {
      console.error('❌ AuditService failed to connect to MongoDB:', error);
      // We don't throw here to maintain best-effort semantics
    }
  }

  /**
   * Ensures required indexes exist on the audit collection.
   */
  async ensureIndexes(): Promise<void> {
    if (!this.collection) return;

    try {
      await this.collection.createIndex({ identityId: 1 }, { background: true });
      await this.collection.createIndex({ timestamp: -1 }, { background: true });
      await this.collection.createIndex({ identityId: 1, timestamp: -1 }, { background: true });
    } catch (error) {
      console.warn('⚠️ AuditService failed to create indexes:', error);
    }
  }

  /**
   * Generates a SHA-256 hash for tamper detection.
   * 
   * @param record The audit record creation payload
   * @returns Hex string hash
   */
  generateHash(record: AuditRecordCreate): string {
    const canonical = `${record.identityId}|${record.identityVersion}|${record.prompt}|${record.output}|${record.provenance.providerName}`;
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Saves an audit record to MongoDB (best-effort).
   * 
   * @param recordCreate The audit record creation payload
   * @returns The complete saved AuditRecord
   */
  async save(recordCreate: AuditRecordCreate): Promise<AuditRecord> {
    const recordId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const hash = this.generateHash(recordCreate);

    const record: AuditRecord = {
      ...recordCreate,
      recordId,
      timestamp,
      hash
    };

    if (this.collection) {
      try {
        await this.collection.insertOne(record as any);
      } catch (error) {
        console.warn(`⚠️ AuditService failed to save record ${recordId}:`, error);
        // Best-effort: we log the warning but return the record anyway
      }
    } else {
      console.warn(`⚠️ AuditService not connected, record ${recordId} not saved to DB`);
    }

    return record;
  }

  /**
   * Queries audit records with filtering and pagination.
   * 
   * @param query The audit query parameters
   * @returns Paginated list of audit records
   */
  async query(query: AuditQuery): Promise<AuditListResponse> {
    if (!this.collection) {
      throw new Error('AuditService not connected to database');
    }

    const filter: any = { identityId: query.identityId };
    
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = query.from;
      if (query.to) filter.timestamp.$lte = query.to;
    }

    const total = await this.collection.countDocuments(filter);
    
    const limit = Math.min(query.limit || 50, 500);
    const offset = query.offset || 0;
    const sortDirection = query.sort === 'asc' ? 1 : -1;

    const records = await this.collection
      .find(filter)
      .sort({ timestamp: sortDirection })
      .limit(limit)
      .skip(offset)
      .toArray();

    // Remove MongoDB _id from returned records
    const sanitizedRecords = records.map(r => {
      const { _id, ...rest } = r as any;
      return rest as AuditRecord;
    });

    return {
      records: sanitizedRecords,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + records.length < total
      },
      apiVersion: '1.0.0'
    };
  }

  /**
   * Closes the MongoDB connection.
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
    }
  }
}
