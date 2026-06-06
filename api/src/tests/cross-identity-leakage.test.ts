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
import { MultiAgentOrchestrator } from "../services/multi-agent-orchestrator";
import { ReflectiveService } from "../services/reflective-service";
import { MockProviderFactory } from "../tests/helpers/mock-provider-factory";

describe("Cross-Identity Leakage and Contamination", () => {
  const testUri = process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium_test";

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

  it("should not leak memory shards between identities", async () => {
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

    // Upsert memory shard for identityA
    await memoryService.upsertMemory(
      {
        content: "Secret memory shard for identity A only",
        embedding: Array.from({ length: 384 }, (_, i) => (i % 2 === 0 ? 0.5 : 0.1)),
      },
      identityA.id
    );

    // Query memory for identityB
    const queryEmbedding = Array.from({ length: 384 }, () => 0.1);
    const results = await memoryService.vectorSearch(queryEmbedding, 0.1, 5, identityB.id);

    expect(results).toEqual([]);
  });

  it("should not leak memory shards in orchestrator context", async () => {
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

    // Call orchestrator for identityB
    const request: OrchestratorRequest = {
      identity_anchor: identityB.id,
      messages: [{ role: "user", content: "What do you know?" }],
    };

    const response = await orchestrator.process(request);

    // No cross-identity memory leakage in orchestrator context
    expect(response.context.relevantMemories).toEqual([]);
  });

  it("should not apply identity A constraints to identity B generation", async () => {
    const identityA = await identityService.createIdentity({
      name: "Identity A",
      developerId: "a@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["must not contain: red"],
      },
    });

    const identityB = await identityService.createIdentity({
      name: "Identity B",
      developerId: "b@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: [],
      },
    });

    // Mock provider returns text containing "red"
    const orchestrator = createOrchestrator({
      mockResponseText: "The color red is vibrant and beautiful.",
      maxAttempts: 1,
    });

    const request: OrchestratorRequest = {
      identity_anchor: identityB.id,
      messages: [{ role: "user", content: "Describe a color" }],
    };

    const response = await orchestrator.process(request);

    // Identity B has no constraints, so validation should pass (approved)
    expect(response.validationReport).toBeDefined();
    expect(response.validationReport!.status).toBe("passed");

    // Output should still contain "red" (not rewritten by fallback)
    expect(response.text.toLowerCase()).toContain("red");
  });

  it("should not mix identity contexts in multi-agent council", async () => {
    const identityA = await identityService.createIdentity({
      name: "Alpha Identity",
      developerId: "alpha@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["tone: formal"],
      },
    });

    const identityB = await identityService.createIdentity({
      name: "Beta Identity",
      developerId: "beta@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["tone: playful"],
      },
    });

    // Register a mock provider for the Narrator agent
    const mockProvider = new MockProviderFactory({
      deterministic: true,
      responseText: "Council response for the active identity.",
    });
    registry.register(mockProvider, 0, ["local"]);

    const multiAgentOrchestrator = new MultiAgentOrchestrator(
      memoryService,
      new ReflectiveService(),
      identityBinding,
      undefined // skip sovereign halo for this test
    );

    const result = await multiAgentOrchestrator.runFlow(
      "What is the council's verdict?",
      identityB.id
    );

    // The returned identity metadata must match identityB, not identityA
    expect(result.identity).toBeDefined();
    expect(result.identity!.name).toBe(identityB.name);
    expect(result.identity!.name).not.toBe(identityA.name);
    expect(result.identity!.id).toBe(identityB.id);
  });

  it("should isolate audit records by identity", async () => {
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

    // Save audit record for identityA
    await auditService.save({
      identityId: identityA.id,
      identityName: identityA.name,
      identityVersion: identityA.version,
      prompt: "Test prompt for A",
      output: "Test output for A",
      reasoningTrace: undefined,
      validationReport: undefined,
      provenance: {
        originalOutput: "Test output for A",
        providerName: "mock",
        modelVersion: "demo",
        mythifyTransformations: [],
        regenerationAttempts: undefined,
        memoryShards: [],
      },
      metadata: {},
    });

    // Query audit for identityB
    const result = await auditService.query({ identityId: identityB.id });

    expect(result.records).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});
