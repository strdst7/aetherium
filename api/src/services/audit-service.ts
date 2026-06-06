import { MongoClient, Db } from "mongodb";
import { createHash, randomUUID } from "crypto";
import {
  AuditRecord,
  AuditRecordCreate,
  AuditQuery,
  AuditListResponse,
  AuditPagination,
} from "../types/audit";

export const AUDIT_COLLECTION_NAME = "audit_records";

/**
 * AuditService stores and queries immutable audit records in MongoDB.
 * 
 * Purpose: Captures every identity-bound generation with full provenance.
 * Best-effort semantics: save failures are logged but don't block generation.
 */
export class AuditService {
  private client?: MongoClient;
  private db?: Db;
  private uri?: string;

  constructor(uri?: string) {
    this.uri = uri || process.env.MONGODB_URI;
  }

  /**
   * Connect to MongoDB and ensure indexes.
   */
  async connect(uri?: string): Promise<void> {
    const connectionUri = uri || this.uri || process.env.MONGODB_URI;
    if (!connectionUri || connectionUri === "undefined") {
      throw new Error("MongoDB URI is required for AuditService");
    }

    this.client = new MongoClient(connectionUri);
    await this.client.connect();
    this.db = this.client.db();
    console.log("[AuditService] Connected to MongoDB");

    await this.ensureIndexes();
  }

  /**
   * Save an audit record. Best-effort: failures are logged but not thrown.
   */
  async save(record: AuditRecordCreate): Promise<AuditRecord | null> {
    try {
      if (!this.db) {
        console.warn("[AuditService] Not connected to MongoDB");
        return null;
      }

      const recordId = this.generateUUID();
      const timestamp = new Date().toISOString();
      const hash = this.generateHash(record);

      const auditRecord: AuditRecord = {
        ...record,
        recordId,
        timestamp,
        hash,
      };

      const collection = this.db.collection(AUDIT_COLLECTION_NAME);
      await collection.insertOne(auditRecord);

      return auditRecord;
    } catch (error) {
      console.warn(
        "[AuditService] Failed to save audit record:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Query audit records with filtering and pagination.
   */
  async query(query: AuditQuery): Promise<AuditListResponse> {
    if (!this.db) {
      throw new Error("AuditService not connected to MongoDB");
    }

    const collection = this.db.collection(AUDIT_COLLECTION_NAME);

    // Build filter
    const filter: any = { identityId: query.identityId };
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) {
        filter.timestamp.$gte = query.from;
      }
      if (query.to) {
        filter.timestamp.$lte = query.to;
      }
    }

    // Count total
    const total = await collection.countDocuments(filter);

    // Set defaults
    const limit = Math.min(query.limit || 50, 500);
    const offset = Math.max(query.offset || 0, 0);
    const sort = query.sort === "asc" ? 1 : -1;

    // Execute query
    const records = (await collection
      .find(filter)
      .sort({ timestamp: sort })
      .limit(limit)
      .skip(offset)
      .toArray()) as unknown as AuditRecord[];

    const pagination: AuditPagination = {
      total,
      limit,
      offset,
      hasMore: offset + records.length < total,
    };

    return {
      records,
      pagination,
      apiVersion: "1.0.0",
    };
  }

  /**
   * Generate SHA-256 hash of key fields for tamper detection.
   */
  generateHash(record: AuditRecordCreate): string {
    const canonical = JSON.stringify({
      identityId: record.identityId,
      identityVersion: record.identityVersion,
      prompt: record.prompt,
      output: record.output,
      originalOutput: record.provenance.originalOutput,
      providerName: record.provenance.providerName,
      modelVersion: record.provenance.modelVersion,
      regenerationAttempts: record.provenance.regenerationAttempts,
      mythifyTransformations: record.provenance.mythifyTransformations,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }

  /**
   * Ensure MongoDB indexes exist for efficient queries.
   */
  private async ensureIndexes(): Promise<void> {
    if (!this.db) return;

    const collection = this.db.collection(AUDIT_COLLECTION_NAME);

    try {
      await collection.createIndex({ identityId: 1 }, { background: true });
      await collection.createIndex({ timestamp: -1 }, { background: true });
      await collection.createIndex(
        { identityId: 1, timestamp: -1 },
        { background: true }
      );
      console.log("[AuditService] Indexes ensured");
    } catch (error) {
      console.warn(
        "[AuditService] Failed to create indexes:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Generate a UUID v4 string.
   */
  private generateUUID(): string {
    return randomUUID();
  }

  /**
   * Disconnect from MongoDB.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = undefined;
      this.db = undefined;
      console.log("[AuditService] Disconnected from MongoDB");
    }
  }
}
