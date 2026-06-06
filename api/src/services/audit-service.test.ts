import { AuditService, AUDIT_COLLECTION_NAME } from "./audit-service";
import { AuditRecordCreate, AuditQuery } from "../types/audit";

// Mock MongoDB
const mockCollection = {
  insertOne: jest.fn(),
  find: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnValue([]),
  countDocuments: jest.fn().mockReturnValue(0),
  createIndex: jest.fn(),
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
};

const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  db: jest.fn().mockReturnValue(mockDb),
};

// Mock MongoDB client constructor
jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => mockClient),
}));

describe("AuditService", () => {
  let auditService: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService = new AuditService("mongodb://localhost:27017/test");
  });

  describe("connect", () => {
    it("connects to MongoDB and ensures indexes", async () => {
      await auditService.connect();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockCollection.createIndex).toHaveBeenCalledTimes(3);
    });

    it("throws when URI is not provided", async () => {
      const service = new AuditService();
      delete process.env.MONGODB_URI;
      await expect(service.connect()).rejects.toThrow("MongoDB URI is required");
    });
  });

  describe("save", () => {
    beforeEach(async () => {
      await auditService.connect();
    });

    it("saves audit record with generated recordId, timestamp, and hash", async () => {
      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test Identity",
        identityVersion: 1,
        prompt: "Test prompt",
        output: "Test output",
        provenance: {
          originalOutput: "Test output",
          providerName: "gemini",
        },
      };

      const result = await auditService.save(record);

      expect(result).toBeDefined();
      expect(result?.recordId).toBeDefined();
      expect(result?.timestamp).toBeDefined();
      expect(result?.hash).toBeDefined();
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    });

    it("generates unique recordId for each save", async () => {
      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const result1 = await auditService.save(record);
      const result2 = await auditService.save(record);

      expect(result1?.recordId).not.toBe(result2?.recordId);
    });

    it("generates consistent hash for same input", async () => {
      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const result1 = await auditService.save(record);
      const result2 = await auditService.save(record);

      // Note: Different timestamps mean different hashes, but we can test the hash function directly
      expect(auditService.generateHash(record)).toBe(auditService.generateHash(record));
    });

    it("handles save failure gracefully (logs warning, doesn't throw)", async () => {
      mockCollection.insertOne.mockRejectedValueOnce(new Error("DB error"));

      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const result = await auditService.save(record);
      expect(result).toBeNull();
    });

    it("returns null when not connected", async () => {
      const disconnectedService = new AuditService("mongodb://localhost:27017/test");
      // Don't connect

      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const result = await disconnectedService.save(record);
      expect(result).toBeNull();
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      await auditService.connect();
    });

    it("returns records filtered by identityId", async () => {
      const mockRecords = [
        { recordId: "1", identityId: "identity_123", output: "Output 1" },
      ];
      mockCollection.toArray.mockResolvedValueOnce(mockRecords);
      mockCollection.countDocuments.mockResolvedValueOnce(1);

      const query: AuditQuery = {
        identityId: "identity_123",
      };

      const result = await auditService.query(query);

      expect(result.records).toHaveLength(1);
      expect(result.records[0].recordId).toBe("1");
      expect(result.pagination.total).toBe(1);
    });

    it("supports date range filtering", async () => {
      mockCollection.toArray.mockResolvedValueOnce([]);
      mockCollection.countDocuments.mockResolvedValueOnce(0);

      const query: AuditQuery = {
        identityId: "identity_123",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-12-31T23:59:59.999Z",
      };

      await auditService.query(query);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: "identity_123",
          timestamp: {
            $gte: "2026-01-01T00:00:00.000Z",
            $lte: "2026-12-31T23:59:59.999Z",
          },
        })
      );
    });

    it("applies limit and offset", async () => {
      mockCollection.toArray.mockResolvedValueOnce([]);
      mockCollection.countDocuments.mockResolvedValueOnce(0);

      const query: AuditQuery = {
        identityId: "identity_123",
        limit: 25,
        offset: 10,
      };

      await auditService.query(query);

      expect(mockCollection.limit).toHaveBeenCalledWith(25);
      expect(mockCollection.skip).toHaveBeenCalledWith(10);
    });

    it("enforces max limit of 500", async () => {
      mockCollection.toArray.mockResolvedValueOnce([]);
      mockCollection.countDocuments.mockResolvedValueOnce(0);

      const query: AuditQuery = {
        identityId: "identity_123",
        limit: 1000,
      };

      await auditService.query(query);

      expect(mockCollection.limit).toHaveBeenCalledWith(500);
    });

    it("returns pagination metadata", async () => {
      mockCollection.toArray.mockResolvedValueOnce([
        { recordId: "1" },
        { recordId: "2" },
      ]);
      mockCollection.countDocuments.mockResolvedValueOnce(10);

      const query: AuditQuery = {
        identityId: "identity_123",
        limit: 2,
        offset: 0,
      };

      const result = await auditService.query(query);

      expect(result.pagination.total).toBe(10);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(true);
    });

    it("sorts descending by default", async () => {
      mockCollection.toArray.mockResolvedValueOnce([]);
      mockCollection.countDocuments.mockResolvedValueOnce(0);

      const query: AuditQuery = {
        identityId: "identity_123",
      };

      await auditService.query(query);

      expect(mockCollection.sort).toHaveBeenCalledWith({ timestamp: -1 });
    });

    it("sorts ascending when specified", async () => {
      mockCollection.toArray.mockResolvedValueOnce([]);
      mockCollection.countDocuments.mockResolvedValueOnce(0);

      const query: AuditQuery = {
        identityId: "identity_123",
        sort: "asc",
      };

      await auditService.query(query);

      expect(mockCollection.sort).toHaveBeenCalledWith({ timestamp: 1 });
    });

    it("returns empty array when no records match", async () => {
      mockCollection.toArray.mockResolvedValueOnce([]);
      mockCollection.countDocuments.mockResolvedValueOnce(0);

      const query: AuditQuery = {
        identityId: "nonexistent",
      };

      const result = await auditService.query(query);

      expect(result.records).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });

  describe("generateHash", () => {
    it("produces SHA-256 hex string", () => {
      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test prompt",
        output: "Test output",
        provenance: {
          originalOutput: "Test output",
          providerName: "gemini",
        },
      };

      const hash = auditService.generateHash(record);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("same input produces same hash", () => {
      const record: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const hash1 = auditService.generateHash(record);
      const hash2 = auditService.generateHash(record);
      expect(hash1).toBe(hash2);
    });

    it("different input produces different hash", () => {
      const record1: AuditRecordCreate = {
        identityId: "identity_123",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const record2: AuditRecordCreate = {
        identityId: "identity_456",
        identityName: "Test",
        identityVersion: 1,
        prompt: "Test",
        output: "Test",
        provenance: {
          originalOutput: "Test",
          providerName: "gemini",
        },
      };

      const hash1 = auditService.generateHash(record1);
      const hash2 = auditService.generateHash(record2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("disconnect", () => {
    it("closes MongoDB connection", async () => {
      await auditService.connect();
      await auditService.disconnect();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
