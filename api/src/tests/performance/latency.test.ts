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

describe("Latency Validation", () => {
  const testUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium_test";

  let identityService: IdentityService;
  let memoryService: MemoryService;
  let auditService: AuditService;
  let identityBinding: IdentityBindingService;
  let registry: ProviderRegistry;
  let orchestrator: Orchestrator;
  let sovereignHalo: SovereignHaloService;
  let mythicModule: MythicModule;

  beforeAll(async () => {
    identityService = new IdentityService();
    memoryService = new MemoryService();
    auditService = new AuditService(testUri);

    await identityService.connect(testUri);
    await memoryService.connect(testUri);
    await auditService.connect();

    identityBinding = new IdentityBindingService(identityService);
    registry = ProviderRegistry.instance;

    const anchorLoader = new SymbolicAnchorLoader();
    await anchorLoader.load();
    mythicModule = new MythicModule(anchorLoader);
    const constraintEngine = new IdentityConstraintEngine();
    sovereignHalo = new SovereignHaloService(constraintEngine, mythicModule, {
      maxAttempts: 3,
      requireSymbolicAnchors: false,
      skipSafetyCheck: true,
    });

    orchestrator = new Orchestrator(
      memoryService,
      registry,
      identityBinding,
      mythicModule,
      sovereignHalo,
      auditService
    );
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

    const mockProvider = new MockProviderFactory({
      deterministic: true,
      responseText: "Mock generated response for latency test",
    });
    registry.register(mockProvider, 0, ["local", "embeddings"]);
  });

  it("should measure p99 full pipeline latency under 5000ms", async () => {
    const identity = await identityService.createIdentity({
      name: "Latency Test Identity",
      developerId: "latency@test.com",
      config: { preferredProvider: "gemini", customRules: ["Be helpful"] },
    });

    const benchmark = new BenchmarkRunner("full-pipeline");

    for (let i = 0; i < 20; i++) {
      const request: OrchestratorRequest = {
        identity_anchor: identity.id,
        messages: [{ role: "user", content: "Explain quantum computing" }],
      };
      await benchmark.run(() => orchestrator.process(request), `run-${i}`);
    }

    const summary = benchmark.summary();
    console.log("[Latency Validation] Full pipeline benchmark:", summary);

    expect(benchmark.getP99()).toBeLessThan(5000);
    expect(benchmark.getMean()).toBeLessThan(3000);
  });

  it("should measure identity binding latency under 200ms", async () => {
    const identity = await identityService.createIdentity({
      name: "Binding Latency Identity",
      developerId: "binding-latency@test.com",
      config: { preferredProvider: "gemini" },
    });

    const benchmark = new BenchmarkRunner("identity-binding");

    for (let i = 0; i < 20; i++) {
      await benchmark.run(
        () => identityBinding.resolve(identity.id),
        `resolve-${i}`
      );
    }

    const summary = benchmark.summary();
    console.log("[Latency Validation] Identity binding benchmark:", summary);

    expect(benchmark.getP99()).toBeLessThanOrEqual(200);
    expect(benchmark.getMax()).toBeLessThanOrEqual(200);
  });

  it("should measure Sovereign Halo validation latency under 1000ms", async () => {
    const identity = await identityService.createIdentity({
      name: "Halo Latency Identity",
      developerId: "halo-latency@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["must contain: helpful"],
      },
    });

    const mockOutput = "This is a helpful response about quantum computing.";
    const benchmark = new BenchmarkRunner("sovereign-halo");

    for (let i = 0; i < 20; i++) {
      await benchmark.run(
        () => sovereignHalo.validate(mockOutput, identity, 1),
        `validate-${i}`
      );
    }

    const summary = benchmark.summary();
    console.log("[Latency Validation] Sovereign Halo benchmark:", summary);

    expect(benchmark.getP99()).toBeLessThan(1000);
  });
});
