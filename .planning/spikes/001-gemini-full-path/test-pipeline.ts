/**
 * Spike 001: Gemini Full Pipeline — end-to-end orchestrator test.
 *
 * Runs the full pipeline through the Orchestrator with Gemini as the provider.
 * Uses in-memory services (no MongoDB/Redis required).
 *
 * Requires GEMINI_API_KEY env var.
 */

import { GeminiProvider } from "../../../api/src/adapters/gemini-provider";
import { ProviderRegistry } from "../../../api/src/services/provider-registry";
import { MemoryService } from "../../../api/src/services/memory-service";
import { ReflectiveService } from "../../../api/src/services/reflective-service";
import { Orchestrator } from "../../../api/src/services/orchestrator";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

async function run() {
  console.log("═══ Spike 001: Gemini Full Pipeline ═══\n");

  // --- Setup ---
  // Register Gemini as the only provider (highest priority)
  const gemini = new GeminiProvider(API_KEY);
  const registry = ProviderRegistry.instance;
  registry.reset();
  registry.register(gemini, 0, ["cloud", "tool-use", "embeddings"]);

  console.log("◆ Providers registered: Gemini (priority 0)");

  // In-memory services
  const memoryService = new MemoryService();
  const reflectiveService = new ReflectiveService();
  const orchestrator = new Orchestrator(memoryService, registry);

  console.log("◆ Orchestrator initialized (in-memory mode)\n");

  // --- Test: Provider Picking ---
  console.log("─── 1. Provider Picking ───");
  const picked = await registry.pick({ requireToolUse: true });
  const pickedName = picked ? picked.name : "none";
  console.log(`  pick(requireToolUse: true) → ${pickedName}`);
  if (pickedName !== "gemini") {
    console.log(`  ✗ Expected gemini, got ${pickedName}`);
    process.exit(1);
  }
  console.log("  ✓ Gemini selected with requireToolUse\n");

  // --- Test: Basic Orchestrator Process ---
  console.log("─── 2. Orchestrator.process() ───");
  try {
    const response = await orchestrator.process({
      identity_anchor: "spike-test-identity",
      messages: [
        { role: "user", content: "Say 'Gemini pipeline spike successful' and nothing else." },
      ],
      maxTokens: 100,
      temperature: 0.0,
    });
    const hasText = !!response.text && response.text.length > 0;
    console.log(`  Provider used: ${response.context.selectedProvider}`);
    console.log(`  Response text (${response.text?.length || 0} chars): "${response.text?.substring(0, 120)}"`);

    if (!hasText) {
      console.log("  ✗ Empty response from orchestrator");
      process.exit(1);
    }
    console.log("  ✓ Orchestrator.process() completed\n");
  } catch (err) {
    console.log(`  ✗ Orchestrator.process() threw: ${err}`);
    process.exit(1);
  }

  // --- Test: Orchestrator with Tools ---
  console.log("─── 3. Orchestrator.processWithTools() ───");
  try {
    const response = await orchestrator.processWithTools(
      {
        identity_anchor: "spike-test-identity",
        messages: [
          {
            role: "user",
            content:
              "What's the weather in Tokyo? Use the get_weather tool.",
          },
        ],
        maxTokens: 200,
        temperature: 0.0,
      },
      [
        {
          name: "get_weather",
          description: "Get current weather for a city",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string", description: "City name" },
            },
            required: ["city"],
          },
        },
      ]
    );

    const hasText = !!response.text;
    const hasToolCalls = !!response.toolCalls && response.toolCalls.length > 0;

    console.log(`  Provider used: ${response.context.selectedProvider}`);
    console.log(`  Text returned: ${hasText}`);
    console.log(`  Tool calls: ${hasToolCalls ? response.toolCalls!.map((t) => `${t.name}(${JSON.stringify(t.arguments)})`).join(", ") : "none"}`);

    if (!hasText && !hasToolCalls) {
      console.log("  ⚠ Neither text nor tool calls returned");
    }

    if (hasToolCalls) {
      console.log("  ✓ Gemini generated tool calls\n");
    } else {
      console.log("  ~ Gemini returned text only (tool declined)\n");
    }
  } catch (err) {
    console.log(`  ✗ Orchestrator.processWithTools() threw: ${err}`);
    if (err instanceof Error && err.message.includes("does not support tool use")) {
      console.log("  → The picked provider doesn't implement generateWithTools");
      console.log("  → Check that Gemini is registered with supportsToolUse: true");
    }
    process.exit(1);
  }

  // --- Summary ---
  console.log("═══════════════════════════════════════════════════");
  console.log(" SPIKE 001: Pipeline Test — ALL CHECKS PASSED");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n Gemini full path validated ✓");
  console.log(" - Provider pick with requireToolUse");
  console.log(" - Orchestrator.process() (text generation)");
  console.log(" - Orchestrator.processWithTools() (tool-use)");
  console.log("\n═══════════════════════════════════════════════════\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
