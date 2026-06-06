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

describe("Identity Consistency Integration", () => {
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

  /**
   * Helper: extract tone markers from text
   */
  function extractToneMarkers(text: string): string[] {
    const markers: string[] = [];
    const formalWords = ["shall", "hereby", "furthermore", "pursuant", "notwithstanding", "heretofore", "cannot", "will not", "do not"];
    const playfulWords = ["awesome", "fantastic", "super", "dandy"];
    const somberWords = ["notable", "regrettable"];

    const textLower = text.toLowerCase();
    for (const word of formalWords) {
      if (textLower.includes(word)) markers.push(word);
    }
    for (const word of playfulWords) {
      if (textLower.includes(word)) markers.push(word);
    }
    for (const word of somberWords) {
      if (textLower.includes(word)) markers.push(word);
    }
    return markers;
  }

  /**
   * Helper: extract symbolic references from text
   */
  function extractSymbolicReferences(text: string, anchors: string[]): string[] {
    const found: string[] = [];
    const textLower = text.toLowerCase();
    for (const anchor of anchors) {
      if (textLower.includes(anchor.toLowerCase())) {
        found.push(anchor);
      }
    }
    return found;
  }

  it("should return consistent tone for same identity and prompt", async () => {
    // Create identity with formal tone rule; mock text must contain the word "formal"
    // to pass IdentityConstraintEngine's literal "must contain" check for tone rules.
    const identity = await identityService.createIdentity({
      name: "Formal Academic Identity",
      developerId: "formal@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["tone: formal", "must contain: academic rigor"],
      },
    });

    const orchestrator = createOrchestrator({
      mockResponseText: "I think this demonstrates formal academic rigor and I can't wait to tell you that I believe it will be excellent.",
    });

    const request: OrchestratorRequest = {
      identity_anchor: identity.id,
      messages: [{ role: "user", content: "Explain something" }],
    };

    const response1 = await orchestrator.process(request);
    const response2 = await orchestrator.process(request);

    // With deterministic provider and same identity, outputs should be identical
    expect(response1.text).toBe(response2.text);

    // But response IDs should differ (proving two distinct calls were made)
    expect(response1.id).not.toBe(response2.id);

    // Both outputs should contain formal/academic language markers
    // (the word "formal" is required by the constraint rule and present in mock text)
    expect(response1.text.toLowerCase()).toContain("formal");
    expect(response2.text.toLowerCase()).toContain("formal");

    // Structurally similar (same sentence count)
    const sentences1 = response1.text.split(".").filter(s => s.trim().length > 0);
    const sentences2 = response2.text.split(".").filter(s => s.trim().length > 0);
    expect(sentences1.length).toBe(sentences2.length);
  });

  it("should apply symbolic anchors consistently", async () => {
    const identity = await identityService.createIdentity({
      name: "Symbolic Identity",
      developerId: "symbolic@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["tone: formal"],
      },
    });

    const orchestrator = createOrchestrator({
      mockResponseText: "This response is aligned with geometry principles and demonstrates formal tone.",
    });

    const request: OrchestratorRequest = {
      identity_anchor: identity.id,
      messages: [{ role: "user", content: "Tell me about structure" }],
    };

    const response1 = await orchestrator.process(request);
    const response2 = await orchestrator.process(request);

    // With deterministic provider and same identity, outputs should be identical
    expect(response1.text).toBe(response2.text);

    // Response IDs should differ between distinct calls
    expect(response1.id).not.toBe(response2.id);

    // SymbolicAnchorLoader falls back to default anchors in test environment.
    // Default anchors may include "geometry", "ratio", "archetype".
    // MythicModule.injectSymbolicReferences appends an anchor reference when anchors exist.
    const anchors1 = extractSymbolicReferences(response1.text, ["geometry", "ratio", "archetype"]);
    const anchors2 = extractSymbolicReferences(response2.text, ["geometry", "ratio", "archetype"]);

    // Both should reference the same symbolic anchors
    expect(anchors1).toEqual(expect.arrayContaining(anchors2));
    expect(anchors2).toEqual(expect.arrayContaining(anchors1));
  });

  it("should maintain worldview consistency across multiple prompts", async () => {
    const identity = await identityService.createIdentity({
      name: "Optimistic Identity",
      developerId: "optimistic@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["tone: playful", "must contain: positive outlook"],
      },
    });

    const orchestrator = createOrchestrator({
      mockResponseText: "This is a great playful result with a positive outlook.",
    });

    const prompts = [
      "Tell me about challenges",
      "What about failures?",
      "How do we handle setbacks?",
    ];

    const responses: string[] = [];
    for (const prompt of prompts) {
      const request: OrchestratorRequest = {
        identity_anchor: identity.id,
        messages: [{ role: "user", content: prompt }],
      };
      const response = await orchestrator.process(request);
      responses.push(response.text);
    }

    // All outputs should reflect optimistic/playful worldview
    // The mock text contains "playful" and "positive outlook" which are required by constraints.
    for (const text of responses) {
      expect(text.toLowerCase()).toContain("playful");
      expect(text.toLowerCase()).toContain("positive outlook");
    }
  });

  it("should produce identical validation reports for identical inputs", async () => {
    const identity = await identityService.createIdentity({
      name: "Constrained Identity",
      developerId: "constrained@test.com",
      config: {
        preferredProvider: "gemini",
        customRules: ["must contain: rigor", "must not contain: error"],
      },
    });

    const orchestrator = createOrchestrator({
      mockResponseText: "I think this demonstrates rigor and precision and I can't wait to tell you that I believe it will be excellent.",
      maxAttempts: 1,
    });

    const request: OrchestratorRequest = {
      identity_anchor: identity.id,
      messages: [{ role: "user", content: "Demonstrate precision" }],
    };

    const response1 = await orchestrator.process(request);
    const response2 = await orchestrator.process(request);

    expect(response1.validationReport).toBeDefined();
    expect(response2.validationReport).toBeDefined();

    // Compare ruleChecks by rule name and pass/fail status
    const checks1 = response1.validationReport!.checks.map(c => ({
      id: c.rule.id,
      passed: c.passed,
    }));
    const checks2 = response2.validationReport!.checks.map(c => ({
      id: c.rule.id,
      passed: c.passed,
    }));

    expect(checks1).toEqual(checks2);
  });
});
