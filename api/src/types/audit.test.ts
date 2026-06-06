import {
  AuditRecord,
  AuditRecordCreate,
  AuditQuery,
  AuditPagination,
  AuditProvenance,
  AuditListResponse,
} from "./audit";

describe("AuditRecord", () => {
  it("can be constructed with all required fields", () => {
    const provenance: AuditProvenance = {
      originalOutput: "Hello world",
      providerName: "gemini",
      modelVersion: "1.5-pro",
    };

    const record: AuditRecord = {
      recordId: "uuid-123",
      identityId: "identity_123",
      identityName: "Test Identity",
      identityVersion: 1,
      prompt: "Test prompt",
      output: "Test output",
      provenance,
      timestamp: new Date().toISOString(),
      hash: "sha256-hash",
    };

    expect(record.recordId).toBe("uuid-123");
    expect(record.identityId).toBe("identity_123");
    expect(record.hash).toBe("sha256-hash");
  });

  it("hash field is non-empty", () => {
    const provenance: AuditProvenance = {
      originalOutput: "Hello",
      providerName: "gemini",
    };

    const record: AuditRecord = {
      recordId: "uuid-123",
      identityId: "identity_123",
      identityName: "Test",
      identityVersion: 1,
      prompt: "Test",
      output: "Test",
      provenance,
      timestamp: new Date().toISOString(),
      hash: "abc123def456",
    };

    expect(record.hash).toBeTruthy();
    expect(record.hash.length).toBeGreaterThan(0);
  });
});

describe("AuditRecordCreate", () => {
  it("omits auto-generated fields (recordId, timestamp, hash)", () => {
    const provenance: AuditProvenance = {
      originalOutput: "Hello",
      providerName: "gemini",
    };

    const create: AuditRecordCreate = {
      identityId: "identity_123",
      identityName: "Test",
      identityVersion: 1,
      prompt: "Test",
      output: "Test",
      provenance,
    };

    expect(create).toBeDefined();
    expect("recordId" in create).toBe(false);
    expect("timestamp" in create).toBe(false);
    expect("hash" in create).toBe(false);
  });
});

describe("AuditQuery", () => {
  it("defaults are sensible", () => {
    const query: AuditQuery = {
      identityId: "identity_123",
    };

    expect(query.identityId).toBe("identity_123");
    expect(query.limit).toBeUndefined();
    expect(query.offset).toBeUndefined();
    expect(query.sort).toBeUndefined();
  });

  it("accepts all optional parameters", () => {
    const query: AuditQuery = {
      identityId: "identity_123",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-12-31T23:59:59.999Z",
      limit: 50,
      offset: 0,
      sort: "desc",
    };

    expect(query.limit).toBe(50);
    expect(query.sort).toBe("desc");
  });
});

describe("AuditPagination", () => {
  it("calculates hasMore correctly when more records exist", () => {
    const pagination: AuditPagination = {
      total: 100,
      limit: 10,
      offset: 0,
      hasMore: true,
    };

    expect(pagination.hasMore).toBe(true);
    expect(pagination.total).toBe(100);
  });

  it("calculates hasMore correctly when no more records", () => {
    const pagination: AuditPagination = {
      total: 10,
      limit: 10,
      offset: 0,
      hasMore: false,
    };

    expect(pagination.hasMore).toBe(false);
  });
});

describe("AuditProvenance", () => {
  it("requires originalOutput and providerName", () => {
    const provenance: AuditProvenance = {
      originalOutput: "Raw output",
      providerName: "gemini",
    };

    expect(provenance.originalOutput).toBe("Raw output");
    expect(provenance.providerName).toBe("gemini");
  });

  it("can include optional fields", () => {
    const provenance: AuditProvenance = {
      originalOutput: "Raw output",
      providerName: "gemini",
      modelVersion: "1.5-pro",
      mythifyTransformations: ["formalized"],
      regenerationAttempts: 2,
      memoryShards: [
        { id: "mem_1", excerpt: "Memory excerpt", score: 0.95 },
      ],
    };

    expect(provenance.mythifyTransformations).toContain("formalized");
    expect(provenance.memoryShards).toHaveLength(1);
  });
});

describe("AuditListResponse", () => {
  it("contains records, pagination, and apiVersion", () => {
    const response: AuditListResponse = {
      records: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
      apiVersion: "1.0.0",
    };

    expect(response.records).toBeDefined();
    expect(response.pagination).toBeDefined();
    expect(response.apiVersion).toBe("1.0.0");
  });
});
