import { IdentityService } from "./identity-service";
import { IdentityCreateRequest, IdentityUpdateRequest } from "../types/identity";

jest.mock("mongodb", () => {
  const actual = jest.requireActual("mongodb");
  return {
    ...actual,
    MongoClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          createIndex: jest.fn().mockResolvedValue(undefined),
          insertOne: jest.fn().mockResolvedValue({ insertedId: "test-id" }),
          findOne: jest.fn().mockResolvedValue(null),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          findOneAndUpdate: jest.fn().mockResolvedValue(null),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        }),
      }),
    })),
  };
});

describe("IdentityService", () => {
  let service: IdentityService;
  let mockCollection: any;

  beforeEach(async () => {
    service = new IdentityService();
    
    // Setup mock collection
    mockCollection = {
      createIndex: jest.fn().mockResolvedValue(undefined),
      insertOne: jest.fn().mockResolvedValue({ insertedId: "test-id" }),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    // Mock MongoClient
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(mockCollection),
      }),
    };

    (require("mongodb").MongoClient as jest.Mock).mockImplementation(() => mockClient);
    
    await service.connect("mongodb://localhost:27017/test");
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe("createIdentity", () => {
    it("should create an identity with all required fields", async () => {
      const request: IdentityCreateRequest = {
        name: "Test Developer",
        developerId: "dev@example.com",
      };

      const result = await service.createIdentity(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Developer");
      expect(result.developerId).toBe("dev@example.com");
      expect(result.sigilHash).toBeDefined();
      expect(result.sigilHash).toMatch(/^sig_/);
      expect(result.version).toBe(1);
      expect(result.versions).toEqual([]);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Developer",
          developerId: "dev@example.com",
          version: 1,
        })
      );
    });

    it("should create an identity with config", async () => {
      const request: IdentityCreateRequest = {
        name: "Test Developer",
        developerId: "dev@example.com",
        config: {
          preferredProvider: "gemini",
          defaultTemperature: 0.5,
        },
      };

      const result = await service.createIdentity(request);

      expect(result.config).toEqual({
        preferredProvider: "gemini",
        defaultTemperature: 0.5,
      });
    });

    it("should generate deterministic sigil hashes for same inputs", async () => {
      const request: IdentityCreateRequest = {
        name: "Test Developer",
        developerId: "dev@example.com",
      };

      const result1 = await service.createIdentity(request);
      const result2 = await service.createIdentity(request);

      // Both should have the same hash for same inputs
      expect(result1.sigilHash).toBe(result2.sigilHash);
    });

    it("should throw if not connected", async () => {
      await service.disconnect();
      
      await expect(service.createIdentity({
        name: "Test",
        developerId: "test@example.com",
      })).rejects.toThrow("Identity service not connected");
    });
  });

  describe("getIdentityById", () => {
    it("should retrieve an identity by ID", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Test",
        developerId: "test@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: {},
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockCollection.findOne.mockResolvedValue(mockIdentity);

      const result = await service.getIdentityById("id_123");

      expect(result).toEqual(mockIdentity);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: "id_123" });
    });

    it("should return null if identity not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await service.getIdentityById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getIdentityByDeveloperId", () => {
    it("should retrieve an identity by developerId", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Test",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: {},
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockCollection.findOne.mockResolvedValue(mockIdentity);

      const result = await service.getIdentityByDeveloperId("dev@example.com");

      expect(result).toEqual(mockIdentity);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ developerId: "dev@example.com" });
    });
  });

  describe("listIdentities", () => {
    it("should return all identities", async () => {
      const mockIdentities = [
        { id: "id_1", name: "Dev 1", developerId: "dev1@example.com" },
        { id: "id_2", name: "Dev 2", developerId: "dev2@example.com" },
      ];
      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockIdentities),
      });

      const result = await service.listIdentities();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Dev 1");
      expect(result[1].name).toBe("Dev 2");
    });
  });

  describe("updateIdentity", () => {
    it("should update identity and create version snapshot", async () => {
      const existingIdentity = {
        id: "id_123",
        name: "Original Name",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: { preferredProvider: "gemini" },
        versions: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updatedIdentity = {
        ...existingIdentity,
        name: "Updated Name",
        sigilHash: "sig_def456",
        version: 2,
        updatedAt: expect.any(String),
        versions: [
          {
            version: 1,
            timestamp: "2024-01-01T00:00:00Z",
            state: existingIdentity,
          },
        ],
      };

      mockCollection.findOne.mockResolvedValue(existingIdentity);
      mockCollection.findOneAndUpdate.mockResolvedValue(updatedIdentity);

      const request: IdentityUpdateRequest = {
        name: "Updated Name",
      };

      const result = await service.updateIdentity("id_123", request);

      expect(result).toBeDefined();
      expect(result?.name).toBe("Updated Name");
      expect(result?.version).toBe(2);
      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { id: "id_123" },
        {
          $set: expect.objectContaining({
            name: "Updated Name",
            version: 2,
          }),
          $push: {
            versions: expect.objectContaining({
              version: 1,
              state: existingIdentity,
            }),
          },
        },
        { returnDocument: "after" }
      );
    });

    it("should update config fields", async () => {
      const existingIdentity = {
        id: "id_123",
        name: "Test",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: { preferredProvider: "gemini", defaultTemperature: 0.7 },
        versions: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockCollection.findOne.mockResolvedValue(existingIdentity);
      mockCollection.findOneAndUpdate.mockResolvedValue({
        ...existingIdentity,
        config: { preferredProvider: "gemini", defaultTemperature: 0.5, maxTokens: 1000 },
        version: 2,
      });

      const request: IdentityUpdateRequest = {
        config: { defaultTemperature: 0.5, maxTokens: 1000 },
      };

      const result = await service.updateIdentity("id_123", request);

      expect(result?.config).toEqual({
        preferredProvider: "gemini",
        defaultTemperature: 0.5,
        maxTokens: 1000,
      });
    });

    it("should return null if identity not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await service.updateIdentity("nonexistent", { name: "New Name" });

      expect(result).toBeNull();
    });
  });

  describe("getVersionHistory", () => {
    it("should return version history", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Test",
        versions: [
          { version: 1, timestamp: "2024-01-01T00:00:00Z", state: {} },
          { version: 2, timestamp: "2024-01-02T00:00:00Z", state: {} },
        ],
      };
      mockCollection.findOne.mockResolvedValue(mockIdentity);

      const result = await service.getVersionHistory("id_123");

      expect(result).toHaveLength(2);
      expect(result?.[0].version).toBe(1);
      expect(result?.[1].version).toBe(2);
    });

    it("should return null if identity not found", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await service.getVersionHistory("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("deleteIdentity", () => {
    it("should delete an identity", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteIdentity("id_123");

      expect(result).toBe(true);
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ id: "id_123" });
    });

    it("should return false if identity not found", async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await service.deleteIdentity("nonexistent");

      expect(result).toBe(false);
    });
  });
});
