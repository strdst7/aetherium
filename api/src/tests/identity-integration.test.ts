import { IdentityService } from "../services/identity-service";
import { IdentityController } from "../controllers/identity";
import { Request, Response } from "express";

describe("Identity Integration", () => {
  let service: IdentityService;
  let controller: IdentityController;

  beforeEach(async () => {
    service = new IdentityService();
    
    // Mock the collection for integration tests
    const mockCollection = {
      createIndex: jest.fn().mockResolvedValue(undefined),
      insertOne: jest.fn().mockResolvedValue({ insertedId: "test-id" }),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    // Inject mock collection directly
    (service as any).collection = mockCollection;
    
    controller = new IdentityController(service);
  });

  describe("Full identity lifecycle", () => {
    it("should register, retrieve, update, and list identities", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Test Developer",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: { preferredProvider: "gemini" },
        versions: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      // Setup mock for insert
      const mockCollection = (service as any).collection;
      mockCollection.insertOne.mockResolvedValue({ insertedId: mockIdentity.id });
      mockCollection.findOne.mockResolvedValue(mockIdentity);
      mockCollection.findOneAndUpdate.mockResolvedValue({
        ...mockIdentity,
        name: "Updated Developer",
        version: 2,
        versions: [
          {
            version: 1,
            timestamp: "2024-01-01T00:00:00Z",
            state: mockIdentity,
          },
        ],
      });

      // 1. Register
      const registerReq = {
        body: {
          name: "Test Developer",
          developerId: "dev@example.com",
          config: { preferredProvider: "gemini" },
        },
      } as Request;
      const registerRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.register(registerReq, registerRes);

      expect(registerRes.status).toHaveBeenCalledWith(201);
      expect(registerRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: expect.objectContaining({
            name: "Test Developer",
            developerId: "dev@example.com",
          }),
          apiVersion: "1.0.0",
        })
      );

      // 2. Get by ID
      const getReq = {
        params: { id: mockIdentity.id },
      } as unknown as Request;
      const getRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.getById(getReq, getRes);

      expect(getRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: mockIdentity,
          apiVersion: "1.0.0",
        })
      );

      // 3. Update
      const updateReq = {
        params: { id: mockIdentity.id },
        body: { name: "Updated Developer" },
      } as unknown as Request;
      const updateRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.update(updateReq, updateRes);

      expect(updateRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: expect.objectContaining({
            name: "Updated Developer",
            version: 2,
          }),
          apiVersion: "1.0.0",
        })
      );

      // 4. List
      const listReq = {} as Request;
      const listRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([mockIdentity]),
      });

      await controller.list(listReq, listRes);

      expect(listRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          apiVersion: "1.0.0",
        })
      );
    });

    it("should maintain version history on updates", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Original Name",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: {},
        versions: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updatedIdentity = {
        ...mockIdentity,
        name: "Updated Name",
        version: 2,
        versions: [
          {
            version: 1,
            timestamp: "2024-01-01T00:00:00Z",
            state: mockIdentity,
          },
        ],
      };

      const mockCollection = (service as any).collection;
      mockCollection.findOne.mockResolvedValue(mockIdentity);
      mockCollection.findOneAndUpdate.mockResolvedValue(updatedIdentity);

      // Update
      const updateReq = {
        params: { id: mockIdentity.id },
        body: { name: "Updated Name" },
      } as unknown as Request;
      const updateRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.update(updateReq, updateRes);

      // Verify version was created
      expect(updateRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: expect.objectContaining({
            versions: expect.arrayContaining([
              expect.objectContaining({
                version: 1,
                state: mockIdentity,
              }),
            ]),
          }),
        })
      );

      // Get versions
      const versionsReq = {
        params: { id: mockIdentity.id },
      } as unknown as Request;
      const versionsRes = {
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockCollection.findOne.mockResolvedValue(updatedIdentity);

      await controller.getVersions(versionsReq, versionsRes);

      expect(versionsRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: mockIdentity.id,
          versions: expect.arrayContaining([
            expect.objectContaining({
              version: 1,
              state: mockIdentity,
            }),
          ]),
          count: 1,
          apiVersion: "1.0.0",
        })
      );
    });

    it("should handle duplicate registration attempts", async () => {
      const mockCollection = (service as any).collection;
      mockCollection.insertOne.mockRejectedValue(new Error("duplicate key error"));

      const registerReq = {
        body: {
          name: "Test Developer",
          developerId: "dev@example.com",
        },
      } as Request;
      const registerRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await expect(controller.register(registerReq, registerRes)).rejects.toThrow("duplicate key error");
    });
  });
});
