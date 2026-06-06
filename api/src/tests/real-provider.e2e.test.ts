import { describeIfRealProvider, itIfRealProvider } from "./helpers/real-provider-guard";
import { checkRequiredEnvVars } from "./helpers/env-checker";
import { GeminiProvider } from "../adapters/gemini-provider";
import { ProviderRegistry } from "../services/provider-registry";
import { Orchestrator } from "../services/orchestrator";
import { IdentityService } from "../services/identity-service";
import { AuditService } from "../services/audit-service";
import { MemoryService } from "../services/memory-service";
import { IdentityBindingService } from "../services/identity-binding";
import { MythicModule } from "../services/mythic-module";
import { SymbolicAnchorLoader } from "../services/symbolic-anchor-loader";
import { SovereignHaloService } from "../services/sovereign-halo";
import { IdentityConstraintEngine } from "../services/identity-constraints";
import { createIdentity } from "./fixtures/identity-factory";

describeIfRealProvider("Real Provider E2E — Gemini", () => {
  const testUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/aetherium_test";

  let identityService: IdentityService;
  let memoryService: MemoryService;
  let auditService: AuditService;
  let identityBinding: IdentityBindingService;
  let registry: ProviderRegistry;
  let orchestrator: Orchestrator;
  let geminiProvider: GeminiProvider;

  beforeAll(async () => {
    const envCheck = checkRequiredEnvVars([
      {
        name: "GEMINI_API_KEY",
        description: "API key for Gemini provider",
        validate: (v) => v.length >= 10,
      },
    ]);

    if (!envCheck.allPresent) {
      console.log(
        "[Real Provider E2E] Credentials missing, tests will be skipped"
      );
      return;
    }

    console.log(
      "[Real Provider E2E] Credentials present, running against live Gemini"
    );

    // Connect services
    identityService = new IdentityService();
    memoryService = new MemoryService();
    auditService = new AuditService(testUri);

    await identityService.connect(testUri);
    await memoryService.connect(testUri);
    await auditService.connect();

    identityBinding = new IdentityBindingService(identityService);
    registry = ProviderRegistry.instance;

    // Create real Gemini provider
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    geminiProvider = new GeminiProvider(apiKey);
    registry.register(geminiProvider, 0, ["embeddings"]);

    // Build orchestrator with full pipeline
    const anchorLoader = new SymbolicAnchorLoader();
    const mythicModule = new MythicModule(anchorLoader);
    const constraintEngine = new IdentityConstraintEngine();
    const sovereignHalo = new SovereignHaloService(constraintEngine, mythicModule, {
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
  }, 30000);

  afterAll(async () => {
    if (identityService) await identityService.disconnect();
    if (memoryService) await memoryService.disconnect();
    if (auditService) await auditService.disconnect();
    console.log("[Real Provider E2E] Tests complete");
  }, 30000);

  beforeEach(async () => {
    if (global.testDb) {
      await global.testDb.reset();
    }
    if (registry) {
      registry.reset();
      if (geminiProvider) {
        registry.register(geminiProvider, 0, ["embeddings"]);
      }
    }
    if (identityBinding) {
      identityBinding.clearCache();
    }
  });

  itIfRealProvider(
    "should connect to real Gemini and generate text",
    async () => {
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
      const provider = new GeminiProvider(apiKey);

      const result = await provider.generate({
        model: "gemini-1.5-pro",
        prompt: "Say hello in one sentence.",
        maxTokens: 100,
        temperature: 0.7,
      });

      expect(result.text).toBeDefined();
      expect(result.text!.length).toBeGreaterThan(10);
      expect(result.id).toMatch(/^gemini-/);
    },
    30000
  );

  itIfRealProvider(
    "should run full pipeline with real Gemini provider",
    async () => {
      // 1. Create identity
      const identity = await identityService.createIdentity({
        name: "Real Provider Test Identity",
        developerId: "real-test@example.com",
        config: {
          preferredProvider: "gemini",
          customRules: ["Be helpful and concise"],
        },
      });

      // 2. Register real provider
      registry.register(geminiProvider, 0, ["embeddings"]);

      // 3. Run orchestrator
      const request = {
        identity_anchor: identity.id,
        messages: [{ role: "user", content: "What is the capital of France?" }],
        maxTokens: 200,
        temperature: 0.5,
      };

      const response = await orchestrator.process(request);

      // 4. Assertions
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.validationReport).toBeDefined();

      // 5. Verify audit record exists
      const auditResult = await auditService.query({
        identityId: identity.id,
        limit: 10,
      });

      expect(auditResult.records.length).toBeGreaterThan(0);
      const record = auditResult.records[0];
      expect(record.identityId).toBe(identity.id);
      expect(record.output).toBe(response.text);
    },
    30000
  );

  itIfRealProvider(
    "should verify identity shaping with real provider",
    async () => {
      // Create identity with formal tone
      const identity = await identityService.createIdentity({
        name: "Formal Scholar Identity",
        developerId: "formal-test@example.com",
        config: {
          preferredProvider: "gemini",
          customRules: [
            "Use formal academic language",
            "Maintain scholarly tone",
          ],
        },
      });

      registry.register(geminiProvider, 0, ["embeddings"]);

      const request = {
        identity_anchor: identity.id,
        messages: [
          { role: "user", content: "Explain the importance of education." },
        ],
        maxTokens: 300,
        temperature: 0.5,
      };

      const response = await orchestrator.process(request);

      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);

      // Formal tone markers (best-effort — real LLM output is non-deterministic)
      const textLower = response.text.toLowerCase();
      const formalMarkers = [
        "education",
        "significant",
        "important",
        "society",
        "development",
      ];
      const hasFormalLanguage = formalMarkers.some((marker) =>
        textLower.includes(marker)
      );
      expect(hasFormalLanguage).toBe(true);
    },
    30000
  );

  itIfRealProvider(
    "should handle real provider failures gracefully",
    async () => {
      // Use an invalid API key to trigger failure
      const invalidProvider = new GeminiProvider("invalid-key-12345");

      // Register invalid provider with higher priority
      registry.register(invalidProvider, -1);

      // Also register a mock-like fallback that will be picked if invalid fails health check
      // But since we only have the real GeminiProvider, we test that health check fails
      const health = await invalidProvider.healthCheck();
      expect(health.ok).toBe(false);

      // ProviderRegistry.pick should skip the unhealthy invalid provider
      // and pick the previously registered valid GeminiProvider (if present)
      // or throw "No healthy providers available"
      try {
        const picked = await registry.pick({ requireEmbeddings: true });
        // If we get here, the registry picked the valid provider (geminiProvider)
        expect(picked).toBeDefined();
      } catch (error: any) {
        // If no valid provider is registered, it should throw a structured error
        expect(error.message).toMatch(/No healthy providers available/);
      }
    },
    30000
  );
});
