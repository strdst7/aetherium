import { Orchestrator, OrchestratorRequest } from "../services/orchestrator";
import { ProviderRegistry } from "../services/provider-registry";
import { MemoryService } from "../services/memory-service";
import { IdentityService } from "../services/identity-service";
import { IdentityBindingService } from "../services/identity-binding";
import { AuditService } from "../services/audit-service";
import { MythicModule } from "../services/mythic-module";
import { SymbolicAnchorLoader } from "../services/symbolic-anchor-loader";
import { SovereignHaloService } from "../services/sovereign-halo";
import { IdentityConstraintEngine } from "../services/identity-constraints";
import { MockProviderFactory } from "../tests/helpers/mock-provider-factory";
import { createIdentity } from "../tests/fixtures/identity-factory";

describe("Full Pipeline Integration", () => {
  const testUri = process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium_test";

  let identityService: IdentityService;
  let memoryService: MemoryService;
  let auditService: AuditService;
  let identityBinding: IdentityBindingService;
  let registry: ProviderRegistry;
  let orchestrator: Orchestrator;

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
  });

  beforeEach(async () => {
    registry.reset();
    identityBinding.clearCache();
  });

  function createOrchestrator(options?: {
    mockResponseText?: string;
    maxAttempts?: number;
  }): Orchestrator {
    const mockProvider = new MockProviderFactory({
      deterministic: true,
      responseText: options?.mockResponseText ?? "Mock generated response",
    });
    registry.register(mockProvider, 0, ["local", "embeddings"]);

    const anchorLoader = new SymbolicAnchorLoader();
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

  it("should pass full pipeline: register identity → generate → audit record exists", async () => {
    // 1. Create identity
    const identity = await identityService.createIdentity({
      name: "Pipeline Test Identity",
      developerId: "pipeline@test.com",
      config: { preferredProvider: "gemini", customRules: ["Be helpful"] },
    });

    // 2. Create orchestrator with mock provider
    const orchestrator = createOrchestrator({
      mockResponseText: "This is a helpful response about quantum computing.",
    });

    // 3. Submit request
    const request: OrchestratorRequest = {
      identity_anchor: identity.id,
      messages: [{ role: "user", content: "Explain quantum computing" }],
    };

    const response = await orchestrator.process(request);

    // 4. Assert response
    expect(response.text).toBeTruthy();
    expect(response.text.length).toBeGreaterThan(0);
    expect(response.validationReport).toBeDefined();

    // 5. Query audit records
    const auditResult = await auditService.query({ identityId: identity.id });
    expect(auditResult.records).toHaveLength(1);

    const auditRecord = auditResult.records[0];
    expect(auditRecord.identityId).toBe(identity.id);
    expect(auditRecord.prompt).toBeTruthy();
    expect(auditRecord.output).toBeTruthy();
    expect(auditRecord.reasoningTrace).toBeDefined();
    expect(auditRecord.validationReport).toBeDefined();
    expect(auditRecord.timestamp).toBeTruthy();
    expect(auditRecord.hash).toBeTruthy();
    expect(auditRecord.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should apply identity constraints during reasoning", async () => {
    // Create identity with forbidden behavior
    const identity = await identityService.createIdentity({
      name: "Constrained Identity",
      developerId: "constrained@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["must not contain: technical jargon"],
      },
    });

    // Mock provider returns text containing forbidden content
    const orchestrator = createOrchestrator({
      mockResponseText: "This text contains technical jargon that violates the rule.",
      maxAttempts: 1,
    });

    const request: OrchestratorRequest = {
      identity_anchor: identity.id,
      messages: [{ role: "user", content: "Tell me something" }],
    };

    const response = await orchestrator.process(request);

    // Validation report should exist and show failure
    expect(response.validationReport).toBeDefined();
    expect(response.validationReport!.status).toBe("failed");

    // Audit record should have validation report attached
    const auditResult = await auditService.query({ identityId: identity.id });
    expect(auditResult.records.length).toBeGreaterThanOrEqual(1);
    const auditRecord = auditResult.records[0];
    expect(auditRecord.validationReport).toBeDefined();
    expect(auditRecord.validationReport!.status).toBe("failed");
  });

  it("should scope memory retrieval to identity", async () => {
    // Create two identities
    const identityA = await identityService.createIdentity({
      name: "Identity A",
      developerId: "a@test.com",
      config: { preferredProvider: "gemini" },
    });

    const identityB = await identityService.createIdentity({
      name: "Identity B",
      developerId: "b@test.com",
      config: { preferredProvider: "gemini" },
    });

    // Insert memory for identityA
    await memoryService.upsertMemory(
      {
        content: "Memory shard for identity A only",
        embedding: Array.from({ length: 384 }, (_, i) => (i % 2 === 0 ? 0.5 : 0.1)),
      },
      identityA.id
    );

    const orchestrator = createOrchestrator();

    // Query for identityB
    const request: OrchestratorRequest = {
      identity_anchor: identityB.id,
      messages: [{ role: "user", content: "What do you know?" }],
    };

    const response = await orchestrator.process(request);

    // Memory retrieval should be scoped — no cross-identity leakage
    expect(response.context.relevantMemories).toEqual([]);
  });

  it("should measure identity binding latency ≤ 200ms", async () => {
    const identity = await identityService.createIdentity({
      name: "Latency Test Identity",
      developerId: "latency@test.com",
      config: { preferredProvider: "gemini" },
    });

    const start = Date.now();
    const resolved = await identityBinding.resolve(identity.id);
    const elapsed = Date.now() - start;

    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(identity.id);
    expect(elapsed).toBeLessThanOrEqual(200);
  });
});
