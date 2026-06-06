import request from "supertest";
import express from "express";
import { createAuditRouter, AuditController } from "./audit";
import { AuditService } from "../services/audit-service";
import { AuditRecord, AuditListResponse } from "../types/audit";

// Mock AuditService
const mockAuditService = {
  query: jest.fn(),
} as unknown as AuditService;

describe("AuditController", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(createAuditRouter(mockAuditService));
  });

  describe("GET /audit", () => {
    it("returns audit records for valid identity_id", async () => {
      const mockResponse: AuditListResponse = {
        records: [
          {
            recordId: "1",
            identityId: "identity_123",
            identityName: "Test",
            identityVersion: 1,
            prompt: "Test",
            output: "Test",
            provenance: { originalOutput: "Test", providerName: "gemini" },
            timestamp: new Date().toISOString(),
            hash: "hash",
          } as AuditRecord,
        ],
        pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
        apiVersion: "1.0.0",
      };

      mockAuditService.query = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .get("/audit?identity_id=identity_123")
        .expect(200);

      expect(response.body.records).toHaveLength(1);
      expect(response.body.records[0].identityId).toBe("identity_123");
      expect(response.body.pagination.total).toBe(1);
    });

    it("returns 400 when identity_id is missing", async () => {
      const response = await request(app).get("/audit").expect(400);

      expect(response.body.detail).toContain("identity_id is required");
    });

    it("returns 400 when from date is invalid", async () => {
      const response = await request(app)
        .get("/audit?identity_id=123&from=invalid-date")
        .expect(400);

      expect(response.body.detail).toContain("from must be a valid ISO 8601 date");
    });

    it("returns 400 when to date is invalid", async () => {
      const response = await request(app)
        .get("/audit?identity_id=123&to=invalid-date")
        .expect(400);

      expect(response.body.detail).toContain("to must be a valid ISO 8601 date");
    });

    it("returns 400 when limit exceeds 500", async () => {
      const response = await request(app)
        .get("/audit?identity_id=123&limit=1000")
        .expect(400);

      expect(response.body.detail).toContain("limit must be a number between 1 and 500");
    });

    it("returns 400 when offset is negative", async () => {
      const response = await request(app)
        .get("/audit?identity_id=123&offset=-1")
        .expect(400);

      expect(response.body.detail).toContain("offset must be a non-negative number");
    });

    it("returns 400 when sort is invalid", async () => {
      const response = await request(app)
        .get("/audit?identity_id=123&sort=invalid")
        .expect(400);

      expect(response.body.detail).toContain("sort must be 'asc' or 'desc'");
    });

    it("returns pagination metadata in response", async () => {
      const mockResponse: AuditListResponse = {
        records: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
        apiVersion: "1.0.0",
      };

      mockAuditService.query = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .get("/audit?identity_id=identity_123")
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.hasMore).toBe(false);
    });

    it("returns empty records array when no results", async () => {
      const mockResponse: AuditListResponse = {
        records: [],
        pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
        apiVersion: "1.0.0",
      };

      mockAuditService.query = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .get("/audit?identity_id=nonexistent")
        .expect(200);

      expect(response.body.records).toHaveLength(0);
    });

    it("returns 500 when query throws error", async () => {
      mockAuditService.query = jest.fn().mockRejectedValue(new Error("DB error"));

      const response = await request(app)
        .get("/audit?identity_id=123")
        .expect(500);

      expect(response.body.detail).toContain("DB error");
    });
  });

  describe("Immutability", () => {
    it("no POST endpoint exists", async () => {
      await request(app).post("/audit").expect(404);
    });

    it("no PUT endpoint exists", async () => {
      await request(app).put("/audit").expect(404);
    });

    it("no DELETE endpoint exists", async () => {
      await request(app).delete("/audit").expect(404);
    });

    it("no PATCH endpoint exists", async () => {
      await request(app).patch("/audit").expect(404);
    });
  });

  describe("Query parameters", () => {
    it("passes all query parameters to AuditService", async () => {
      const mockResponse: AuditListResponse = {
        records: [],
        pagination: { total: 0, limit: 25, offset: 10, hasMore: false },
        apiVersion: "1.0.0",
      };

      mockAuditService.query = jest.fn().mockResolvedValue(mockResponse);

      await request(app)
        .get("/audit?identity_id=123&from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.999Z&limit=25&offset=10&sort=asc")
        .expect(200);

      expect(mockAuditService.query).toHaveBeenCalledWith({
        identityId: "123",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-12-31T23:59:59.999Z",
        limit: 25,
        offset: 10,
        sort: "asc",
      });
    });
  });
});
