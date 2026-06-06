import { IdentityController } from "./identity";
import { IdentityService } from "../services/identity-service";
import { Request, Response } from "express";

jest.mock("../services/identity-service");

describe("IdentityController", () => {
  let mockService: jest.Mocked<IdentityService>;
  let controller: IdentityController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();
    sendMock = jest.fn().mockReturnThis();

    mockRes = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
    };

    mockService = {
      createIdentity: jest.fn(),
      getIdentityById: jest.fn(),
      listIdentities: jest.fn(),
      updateIdentity: jest.fn(),
      getVersionHistory: jest.fn(),
      deleteIdentity: jest.fn(),
    } as any;

    controller = new IdentityController(mockService);
  });

  describe("register", () => {
    it("should create a new identity and return 201", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Test Developer",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: {},
        versions: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      mockService.createIdentity.mockResolvedValue(mockIdentity);

      mockReq = {
        body: {
          name: "Test Developer",
          developerId: "dev@example.com",
        },
      };

      await controller.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: mockIdentity,
          apiVersion: "1.0.0",
        })
      );
    });

    it("should reject invalid request with missing name", async () => {
      mockReq = {
        body: {
          developerId: "dev@example.com",
        },
      };

      await expect(
        controller.register(mockReq as Request, mockRes as Response)
      ).rejects.toThrow("Identity registration validation failed");
    });

    it("should reject invalid request with missing developerId", async () => {
      mockReq = {
        body: {
          name: "Test Developer",
        },
      };

      await expect(
        controller.register(mockReq as Request, mockRes as Response)
      ).rejects.toThrow("Identity registration validation failed");
    });

    it("should reject invalid request with empty name", async () => {
      mockReq = {
        body: {
          name: "",
          developerId: "dev@example.com",
        },
      };

      await expect(
        controller.register(mockReq as Request, mockRes as Response)
      ).rejects.toThrow("Identity registration validation failed");
    });
  });

  describe("getById", () => {
    it("should return an identity by ID", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Test Developer",
        developerId: "dev@example.com",
        sigilHash: "sig_abc123",
        version: 1,
        config: {},
        versions: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      mockService.getIdentityById.mockResolvedValue(mockIdentity);

      mockReq = {
        params: { id: "id_123" },
        originalUrl: "/identity/id_123",
      };

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: mockIdentity,
          apiVersion: "1.0.0",
        })
      );
    });

    it("should throw 404 if identity not found", async () => {
      mockService.getIdentityById.mockResolvedValue(null);

      mockReq = {
        params: { id: "nonexistent" },
        originalUrl: "/identity/nonexistent",
      };

      await expect(
        controller.getById(mockReq as Request, mockRes as Response)
      ).rejects.toMatchObject({
        code: "IDENTITY_NOT_FOUND",
        status: 404,
      });
    });
  });

  describe("list", () => {
    it("should return all identities", async () => {
      const mockIdentities = [
        { id: "id_1", name: "Dev 1", developerId: "dev1@example.com" },
        { id: "id_2", name: "Dev 2", developerId: "dev2@example.com" },
      ];
      mockService.listIdentities.mockResolvedValue({ identities: mockIdentities, total: 2 } as any);

      mockReq = { query: {} };

      await controller.list(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          identities: mockIdentities,
          count: 2,
          total: 2,
          apiVersion: "1.0.0",
        })
      );
    });
  });

  describe("update", () => {
    it("should update an identity and return it", async () => {
      const mockIdentity = {
        id: "id_123",
        name: "Updated Name",
        developerId: "dev@example.com",
        sigilHash: "sig_def456",
        version: 2,
        config: {},
        versions: [
          {
            version: 1,
            timestamp: "2024-01-01T00:00:00Z",
            state: {
              id: "id_123",
              name: "Original Name",
              developerId: "dev@example.com",
              sigilHash: "sig_abc123",
              version: 1,
              config: {},
              versions: [],
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
          },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      mockService.updateIdentity.mockResolvedValue(mockIdentity as any);

      mockReq = {
        params: { id: "id_123" },
        body: { name: "Updated Name" },
      };

      await controller.update(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: mockIdentity,
          apiVersion: "1.0.0",
        })
      );
    });

    it("should throw 404 if identity not found", async () => {
      mockService.updateIdentity.mockResolvedValue(null);

      mockReq = {
        params: { id: "nonexistent" },
        body: { name: "New Name" },
        originalUrl: "/identity/nonexistent",
      };

      await expect(
        controller.update(mockReq as Request, mockRes as Response)
      ).rejects.toMatchObject({
        code: "IDENTITY_NOT_FOUND",
        status: 404,
      });
    });

    it("should reject invalid request with empty name", async () => {
      mockReq = {
        params: { id: "id_123" },
        body: { name: "" },
      };

      await expect(
        controller.update(mockReq as Request, mockRes as Response)
      ).rejects.toThrow("Identity update validation failed");
    });
  });

  describe("getVersions", () => {
    it("should return version history", async () => {
      const mockVersions = [
        { version: 1, timestamp: "2024-01-01T00:00:00Z", state: {} },
        { version: 2, timestamp: "2024-01-02T00:00:00Z", state: {} },
      ];
      mockService.getVersionHistory.mockResolvedValue(mockVersions as any);

      mockReq = {
        params: { id: "id_123" },
      };

      await controller.getVersions(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: "id_123",
          versions: mockVersions,
          count: 2,
          apiVersion: "1.0.0",
        })
      );
    });

    it("should throw 404 if identity not found", async () => {
      mockService.getVersionHistory.mockResolvedValue(null);

      mockReq = {
        params: { id: "nonexistent" },
        originalUrl: "/identity/nonexistent/versions",
      };

      await expect(
        controller.getVersions(mockReq as Request, mockRes as Response)
      ).rejects.toMatchObject({
        code: "IDENTITY_NOT_FOUND",
        status: 404,
      });
    });
  });

  describe("delete", () => {
    it("should delete an identity and return 204", async () => {
      mockService.deleteIdentity.mockResolvedValue(true);

      mockReq = {
        params: { id: "id_123" },
      };

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it("should throw 404 if identity not found", async () => {
      mockService.deleteIdentity.mockResolvedValue(false);

      mockReq = {
        params: { id: "nonexistent" },
        originalUrl: "/identity/nonexistent",
      };

      await expect(
        controller.delete(mockReq as Request, mockRes as Response)
      ).rejects.toMatchObject({
        code: "IDENTITY_NOT_FOUND",
        status: 404,
      });
    });
  });
});
