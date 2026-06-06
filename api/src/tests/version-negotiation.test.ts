import { versionNegotiation, addVersionToResponse, VersionedRequest } from "../middleware/version-negotiation";
import { Request, Response, NextFunction } from "express";

describe("Version Negotiation Middleware", () => {
  let mockReq: Partial<VersionedRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      query: {},
      originalUrl: "/v1/reason",
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
  });

  it("should default to current API version when no version is specified", () => {
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockReq.apiVersion).toBe("1.0.0");
    expect(mockRes.setHeader).toHaveBeenCalledWith("API-Version", "1.0.0");
    expect(mockRes.setHeader).toHaveBeenCalledWith("Supported-Versions", "1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });

  it("should accept version via Accept-Version header", () => {
    mockReq.headers = { "accept-version": "1.0.0" };
    
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockReq.apiVersion).toBe("1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });

  it("should accept version via X-API-Version header", () => {
    mockReq.headers = { "x-api-version": "1.0.0" };
    
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockReq.apiVersion).toBe("1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });

  it("should accept version via query parameter", () => {
    mockReq.query = { apiVersion: "1.0.0" };
    
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockReq.apiVersion).toBe("1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });

  it("should reject unsupported versions with 404", () => {
    mockReq.headers = { "accept-version": "2.0.0" };
    
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://api.aetherium.io/errors/unsupported-version",
        title: "Unsupported API Version",
        status: 404,
      })
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should prioritize Accept-Version over X-API-Version", () => {
    mockReq.headers = {
      "accept-version": "1.0.0",
      "x-api-version": "2.0.0",
    };
    
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockReq.apiVersion).toBe("1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });

  it("should prioritize headers over query parameter", () => {
    mockReq.headers = { "accept-version": "1.0.0" };
    mockReq.query = { apiVersion: "2.0.0" };
    
    versionNegotiation(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    expect(mockReq.apiVersion).toBe("1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });
});

describe("Add Version to Response Middleware", () => {
  let mockReq: Partial<VersionedRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      apiVersion: "1.0.0",
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
  });

  it("should add apiVersion to response body", () => {
    addVersionToResponse(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    const body = { data: "test" } as any;
    mockRes.json!(body);
    
    expect(body.apiVersion).toBe("1.0.0");
    expect(nextFn).toHaveBeenCalled();
  });

  it("should not override existing apiVersion", () => {
    mockReq.apiVersion = "1.0.0";
    
    addVersionToResponse(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    const body = { apiVersion: "2.0.0" };
    mockRes.json!(body);
    
    expect(body.apiVersion).toBe("2.0.0");
  });

  it("should use default version when req.apiVersion is undefined", () => {
    mockReq.apiVersion = undefined;
    
    addVersionToResponse(mockReq as VersionedRequest, mockRes as Response, nextFn);
    
    const body = { data: "test" } as any;
    mockRes.json!(body);
    
    expect(body.apiVersion).toBe("1.0.0");
  });
});
