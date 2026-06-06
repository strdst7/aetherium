import { Orchestrator, OrchestratorRequest } from "../../services/orchestrator";
import { ProviderRegistry } from "../../services/provider-registry";
import { MemoryService } from "../../services/memory-service";
import { IdentityService } from "../../services/identity-service";
import { IdentityBindingService } from "../../services/identity-binding";
import { AuditService } from "../../services/audit-service";
import { MythicModule } from "../../services/mythic-module";
import { SymbolicAnchorLoader } from "../../services/symbolic-anchor-loader";
import { SovereignHaloService } from "../../services/sovereign-halo";
import { IdentityConstraintEngine } from "../../services/identity-constraints";
import { MockProviderFactory } from "../../tests/helpers/mock-provider-factory";
import { BenchmarkRunner } from "../../tests/helpers/benchmark";
import {
  DEFAULT_CONCURRENCY_SCENARIO,
} from "../../tests/fixtures/performance-fixtures";

describe("Concurrency Safety", () => {
  const testUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium_test";

  let identityService: IdentityService;
  let memoryService: MemoryService;
  let auditService: AuditService;
  let identityBinding: IdentityBindingService;
  let registry: ProviderRegistry;

  beforeAll(async () => {
    identityService = new IdentityService();
    memoryService = new MemoryService();
    auditService = new AuditService(testUri);

    await identityService.connect(testUri);
    await memoryService.connect(testUri);
    await auditService.connect();

    identityBinding = new IdentityBindingService(identityService);
    registry = ProviderRegistry.instance;
  });

  afterAll(async () => {
    await identityService.disconnect();
    await memoryService.disconnect();
    await auditService.disconnect();
    registry.reset();
  });

  beforeEach(async () => {
    registry.reset();
    identityBinding.clearCache();
  });

  async function createOrchestrator(options?: {
    mockResponseText?: string;
    maxAttempts?: number;
  }): Promise<Orchestrator> {
    const mockProvider = new MockProviderFactory({
      deterministic: true,
      responseText: options?.mockResponseText ?? "Mock generated response",
    });
    registry.register(mockProvider, 0, ["local", "embeddings"]);

    const anchorLoader = new SymbolicAnchorLoader();
    await anchorLoader.load();
    const mythicModule = new MythicModule(anchorLoader);
    const constraintEngine = new IdentityConstraintEngine();
    const sovereignHalo = new SovereignHaloService(constraintEngine, mythicModule, {
      maxAttempts: options?.maxAttempts ?? 3,
      requireSymbolicAnchors: false,
      skipSafetyCheck: true,
    });

    return new Orchestrator(
      memoryService,
      registry,
      identityBinding,
      mythicModule,
      sovereignHalo,
      auditService
    );
  }

  it("should handle concurrent requests for different identities without memory leakage", async () => {
    // Create 3 distinct identities
    const identityA = await identityService.createIdentity({
      name: "Concurrent Identity A",
      developerId: "concurrent-a@test.com",
      config: { preferredProvider: "gemini" },
    });

    const identityB = await identityService.createIdentity({
      name: "Concurrent Identity B",
      developerId: "concurrent-b@test.com",
      config: { preferredProvider: "gemini" },
    });

    const identityC = await identityService.createIdentity({
      name: "Concurrent Identity C",
      developerId: "concurrent-c@test.com",
      config: { preferredProvider: "gemini" },
    });

    // Insert a memory shard for identity A only
    await memoryService.upsertMemory(
      {
        content: "Secret memory shard for identity A only",
        embedding: Array.from({ length: 384 }, (_, i) => (i % 2 === 0 ? 0.5 : 0.1)),
      },
      identityA.id
    );

    const orchestrator = await createOrchestrator();

    // Fire 3 concurrent requests, one for each identity
    const requests: OrchestratorRequest[] = [
      {
        identity_anchor: identityA.id,
        messages: [{ role: "user", content: "What do you know?" }],
      },
      {
        identity_anchor: identityB.id,
        messages: [{ role: "user", content: "What do you know?" }],
      },
      {
        identity_anchor: identityC.id,
        messages: [{ role: "user", content: "What do you know?" }],
      },
    ];

    const [responseA, responseB, responseC] = await Promise.all(
      requests.map((req) => orchestrator.process(req))
    );

    // Identity A should see its own memory shard
    expect(responseA.context.relevantMemories.length).toBeGreaterThanOrEqual(1);
    expect(responseA.context.relevantMemories[0].doc.content).toContain(
      "Secret memory shard for identity A only"
    );

    // Identity B should have no memory shards (no leakage from A)
    expect(responseB.context.relevantMemories).toEqual([]);

    // Identity C should have no memory shards (no leakage from A)
    expect(responseC.context.relevantMemories).toEqual([]);

    // Each response should match the correct identity
    expect(responseA.context.identity?.id).toBe(identityA.id);
    expect(responseB.context.identity?.id).toBe(identityB.id);
    expect(responseC.context.identity?.id).toBe(identityC.id);
  });

  it("should handle concurrent requests with identity-bound constraints without contamination", async () => {
    // Create identity A with "must not contain: jargon" rule
    const identityA = await identityService.createIdentity({
      name: "Constraint Identity A",
      developerId: "constraint-a@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["must not contain: jargon"],
      },
    });

    // Create identity B with "must not contain: slang" rule
    const identityB = await identityService.createIdentity({
      name: "Constraint Identity B",
      developerId: "constraint-b@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["must not contain: slang"],
      },
    });

    // Mock provider returns text containing both "jargon" and "slang"
    const orchestrator = await createOrchestrator({
      mockResponseText:
        "This response has jargon and also some slang like cool beans.",
      maxAttempts: 1,
    });

    // Fire 2 concurrent requests
    const requests: OrchestratorRequest[] = [
      {
        identity_anchor: identityA.id,
        messages: [{ role: "user", content: "Say something" }],
      },
      {
        identity_anchor: identityB.id,
        messages: [{ role: "user", content: "Say something" }],
      },
    ];

    const [responseA, responseB] = await Promise.all(
      requests.map((req) => orchestrator.process(req))
    );

    // Identity A should fail on "jargon" violation
    expect(responseA.validationReport).toBeDefined();
    expect(responseA.validationReport!.status).toBe("failed");

    // Identity B should fail on "slang" violation
    expect(responseB.validationReport).toBeDefined();
    expect(responseB.validationReport!.status).toBe("failed");

    // Neither identity's constraint leaked to the other:
    // A should NOT have failed on "slang" (it has no slang rule)
    const aFailedChecks = responseA.validationReport!.checks.filter(
      (c) => c.rule.name.includes("slang")
    );
    expect(aFailedChecks).toHaveLength(0);

    // B should NOT have failed on "jargon" (it has no jargon rule)
    const bFailedChecks = responseB.validationReport!.checks.filter(
      (c) => c.rule.name.includes("jargon")
    );
    expect(bFailedChecks).toHaveLength(0);
  });

  it("should maintain audit record isolation under concurrent load", async () => {
    // Create 2 identities
    const identityA = await identityService.createIdentity({
      name: "Audit Isolation A",
      developerId: "audit-iso-a@test.com",
      config: { preferredProvider: "gemini" },
    });

    const identityB = await identityService.createIdentity({
      name: "Audit Isolation B",
      developerId: "audit-iso-b@test.com",
      config: { preferredProvider: "gemini" },
    });

    const orchestrator = await createOrchestrator();

    // Fire 2 concurrent generation requests
    const requests: OrchestratorRequest[] = [
      {
        identity_anchor: identityA.id,
        messages: [{ role: "user", content: "Generate something for A" }],
      },
      {
        identity_anchor: identityB.id,
        messages: [{ role: "user", content: "Generate something for B" }],
      },
    ];

    await Promise.all(requests.map((req) => orchestrator.process(req)));

    // Query audit records for each identity
    const auditA = await auditService.query({ identityId: identityA.id });
    const auditB = await auditService.query({ identityId: identityB.id });

    // Audit records for A should all have identityId === A.id
    expect(auditA.records.length).toBeGreaterThanOrEqual(1);
    for (const record of auditA.records) {
      expect(record.identityId).toBe(identityA.id);
    }

    // Audit records for B should all have identityId === B.id
    expect(auditB.records.length).toBeGreaterThanOrEqual(1);
    for (const record of auditB.records) {
      expect(record.identityId).toBe(identityB.id);
    }

    // No audit record for A contains B's identityId
    const leakedRecords = auditA.records.filter(
      (r) => r.identityId === identityB.id
    );
    expect(leakedRecords).toHaveLength(0);
  });

  it("should complete all concurrent requests without errors under moderate load", async () => {
    const scenario = DEFAULT_CONCURRENCY_SCENARIO;

    // Create identities in the database with unique developerIds
    const dbIdentities = await Promise.all(
      scenario.identities.map((id, i) =>
        identityService.createIdentity({
          name: id.name,
          developerId: `moderate-load-${i}@test.com`,
          config: id.config,
        })
      )
    );

    // Map scenario request identity anchors to real DB identity IDs
    const orchestrator = await createOrchestrator();

    const requests: OrchestratorRequest[] = scenario.requests.map((req, i) => ({
      identity_anchor: dbIdentities[i % dbIdentities.length].id,
      messages: req.messages,
    }));

    const benchmark = new BenchmarkRunner("concurrent-load");

    // Fire all requests concurrently with Promise.all
    const responses = await benchmark.run(async () => {
      return Promise.all(requests.map((req) => orchestrator.process(req)));
    }, "batch");

    // Log benchmark summary
    const summary = benchmark.summary();
    console.log("[Concurrency Safety] Moderate load benchmark:", summary);

    // All responses should have status ok (no exceptions thrown)
    expect(responses).toHaveLength(requests.length);

    for (const response of responses) {
      // All responses should have text with length > 0
      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(0);

      // All responses should have a valid context
      expect(response.context).toBeDefined();
      expect(response.context.identity).toBeDefined();
    }

    // Total batch time logged for baseline tracking (no hard assertion — just tracking)
    expect(summary.count).toBeGreaterThan(0);
    expect(Number.isFinite(summary.mean)).toBe(true);
  });
});
