import { AuditService, AUDIT_COLLECTION_NAME } from './audit-service';
import { AuditRecordCreate, AuditQuery } from '../types/audit';
import { MongoClient } from 'mongodb';

// Mock MongoDB
jest.mock('mongodb');

describe('AuditService', () => {
  let service: AuditService;
  let mockCollection: any;
  let mockDb: any;
  let mockClient: any;

  const mockRecordCreate: AuditRecordCreate = {
    identityId: 'id-123',
    identityName: 'Test Identity',
    identityVersion: 1,
    prompt: 'Test prompt',
    output: 'Test output',
    provenance: {
      originalOutput: 'Test output',
      providerName: 'gemini'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCollection = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
      createIndex: jest.fn().mockResolvedValue('index-name'),
      countDocuments: jest.fn().mockResolvedValue(100),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        { _id: 'mongo-id-1', ...mockRecordCreate, recordId: 'r1', timestamp: '2026-01-01T00:00:00Z', hash: 'h1' },
        { _id: 'mongo-id-2', ...mockRecordCreate, recordId: 'r2', timestamp: '2026-01-02T00:00:00Z', hash: 'h2' }
      ])
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(undefined)
    };

    (MongoClient as unknown as jest.Mock).mockImplementation(() => mockClient);

    service = new AuditService('mongodb://mock');
    
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('connect and ensureIndexes', () => {
    it('connects to MongoDB and ensures indexes', async () => {
      await service.connect();
      
      expect(MongoClient).toHaveBeenCalledWith('mongodb://mock');
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith(AUDIT_COLLECTION_NAME);
      
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ identityId: 1 }, { background: true });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ timestamp: -1 }, { background: true });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ identityId: 1, timestamp: -1 }, { background: true });
    });

    it('uses provided URI or falls back to env var', async () => {
      process.env.MONGODB_URI = 'mongodb://env';
      const envService = new AuditService();
      await envService.connect();
      expect(MongoClient).toHaveBeenCalledWith('mongodb://env');
    });

    it('handles connection failure gracefully', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));
      await service.connect();
      expect(console.error).toHaveBeenCalled();
      // Should not throw
    });
  });

  describe('generateHash', () => {
    it('produces SHA-256 hex string', () => {
      const hash = service.generateHash(mockRecordCreate);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('same input produces same hash', () => {
      const hash1 = service.generateHash(mockRecordCreate);
      const hash2 = service.generateHash(mockRecordCreate);
      expect(hash1).toBe(hash2);
    });

    it('different input produces different hash', () => {
      const hash1 = service.generateHash(mockRecordCreate);
      const hash2 = service.generateHash({ ...mockRecordCreate, output: 'Different' });
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('saves audit record with generated recordId, timestamp, and hash', async () => {
      const record = await service.save(mockRecordCreate);
      
      expect(record.recordId).toBeDefined();
      expect(record.timestamp).toBeDefined();
      expect(record.hash).toBeDefined();
      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
        recordId: record.recordId,
        identityId: 'id-123'
      }));
    });

    it('returns complete AuditRecord with all fields', async () => {
      const record = await service.save(mockRecordCreate);
      expect(record.identityId).toBe(mockRecordCreate.identityId);
      expect(record.prompt).toBe(mockRecordCreate.prompt);
      expect(record.provenance).toEqual(mockRecordCreate.provenance);
    });

    it('generates unique recordId for each save', async () => {
      const record1 = await service.save(mockRecordCreate);
      const record2 = await service.save(mockRecordCreate);
      expect(record1.recordId).not.toBe(record2.recordId);
    });

    it('handles save failure gracefully (logs warning, doesn\'t throw)', async () => {
      mockCollection.insertOne.mockRejectedValue(new Error('Insert failed'));
      
      const record = await service.save(mockRecordCreate);
      
      expect(console.warn).toHaveBeenCalled();
      expect(record.recordId).toBeDefined(); // Still returns the record
    });

    it('handles save when not connected gracefully', async () => {
      const unconnectedService = new AuditService();
      const record = await unconnectedService.save(mockRecordCreate);
      
      expect(console.warn).toHaveBeenCalled();
      expect(record.recordId).toBeDefined();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('throws if not connected', async () => {
      const unconnectedService = new AuditService();
      await expect(unconnectedService.query({ identityId: 'id-123' })).rejects.toThrow('not connected');
    });

    it('returns records filtered by identityId', async () => {
      const query: AuditQuery = { identityId: 'id-123' };
      await service.query(query);
      
      expect(mockCollection.find).toHaveBeenCalledWith({ identityId: 'id-123' });
    });

    it('supports date range filtering (from/to)', async () => {
      const query: AuditQuery = { 
        identityId: 'id-123',
        from: '2026-01-01T00:00:00Z',
        to: '2026-12-31T23:59:59Z'
      };
      await service.query(query);
      
      expect(mockCollection.find).toHaveBeenCalledWith({ 
        identityId: 'id-123',
        timestamp: {
          $gte: '2026-01-01T00:00:00Z',
          $lte: '2026-12-31T23:59:59Z'
        }
      });
    });

    it('applies limit and offset for pagination', async () => {
      const query: AuditQuery = { identityId: 'id-123', limit: 10, offset: 20 };
      await service.query(query);
      
      expect(mockCollection.limit).toHaveBeenCalledWith(10);
      expect(mockCollection.skip).toHaveBeenCalledWith(20);
    });

    it('enforces max limit of 500', async () => {
      const query: AuditQuery = { identityId: 'id-123', limit: 1000 };
      await service.query(query);
      
      expect(mockCollection.limit).toHaveBeenCalledWith(500);
    });

    it('sorts by timestamp descending by default', async () => {
      const query: AuditQuery = { identityId: 'id-123' };
      await service.query(query);
      
      expect(mockCollection.sort).toHaveBeenCalledWith({ timestamp: -1 });
    });

    it('sorts by timestamp ascending when specified', async () => {
      const query: AuditQuery = { identityId: 'id-123', sort: 'asc' };
      await service.query(query);
      
      expect(mockCollection.sort).toHaveBeenCalledWith({ timestamp: 1 });
    });

    it('returns pagination metadata (total, hasMore)', async () => {
      const query: AuditQuery = { identityId: 'id-123', limit: 10, offset: 0 };
      const result = await service.query(query);
      
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(true); // 0 + 2 < 100
    });

    it('removes MongoDB _id from returned records', async () => {
      const query: AuditQuery = { identityId: 'id-123' };
      const result = await service.query(query);
      
      expect((result.records[0] as any)._id).toBeUndefined();
      expect(result.records[0].recordId).toBe('r1');
    });
  });
});
