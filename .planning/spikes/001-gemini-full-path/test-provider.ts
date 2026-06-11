/**
 * Spike 001: Gemini Provider — standalone provider method tests.
 *
 * Tests healthCheck, generate, generateWithTools, and embed methods
 * against the real Gemini API. Requires GEMINI_API_KEY env var.
 */

import { GeminiProvider } from "../../../api/src/adapters/gemini-provider";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY environment variable is required");
  console.error("   Get one at: https://aistudio.google.com/app/apikey");
  process.exit(1);
}

const provider = new GeminiProvider(API_KEY, "gemini-2.5-flash");
const results: Array<{ name: string; passed: boolean; detail: string }> = [];

async function run() {
  // --- 1. Health Check ---
  console.log("\n◆ Testing healthCheck()...");
  try {
    const health = await provider.healthCheck();
    if (health.ok) {
      results.push({ name: "healthCheck", passed: true, detail: `ok: true, model: ${health.info?.model || "unknown"}` });
      console.log(`  ✓ healthCheck passed — ${health.info?.model}`);
    } else {
      results.push({ name: "healthCheck", passed: false, detail: "ok: false, info: " + health.info });
      console.log("  ✗ healthCheck failed — " + health.info);
    }
  } catch (err) {
    results.push({ name: "healthCheck", passed: false, detail: `exception: ${err}` });
    console.log(`  ✗ healthCheck threw: ${err}`);
  }

  // --- 2. Text Generation ---
  console.log("\n◆ Testing generate()...");
  try {
    const response = await provider.generate({
      model: "gemini-2.5-flash",
      prompt: "Respond with exactly: Hello, Aetherium spike test.",
      maxTokens: 50,
      temperature: 0.0,
    });
    const hasText = !!response.text && response.text.length > 0;
    results.push({
      name: "generate",
      passed: hasText,
      detail: hasText
        ? `text (${response.text.length} chars): "${response.text.substring(0, 80)}..."`
        : "empty or missing text field",
    });
    console.log(`  ${hasText ? "✓" : "✗"} generate() — ${hasText ? response.text.substring(0, 80) : "no text returned"}`);
  } catch (err) {
    results.push({ name: "generate", passed: false, detail: `exception: ${err}` });
    console.log(`  ✗ generate() threw: ${err}`);
  }

  // --- 3. Tool-Use Generation ---
  console.log("\n◆ Testing generateWithTools()...");
  try {
    const response = await provider.generateWithTools(
      {
        model: "gemini-2.5-flash",
        prompt: "What's the weather in London? Use the get_weather tool to find out.",
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
              units: { type: "string", enum: ["celsius", "fahrenheit"] },
            },
            required: ["city"],
          },
        },
      ]
    );
    const hasText = !!response.text;
    const hasToolCalls = !!response.toolCalls && response.toolCalls.length > 0;
    results.push({
      name: "generateWithTools",
      passed: hasText || hasToolCalls,
      detail: hasToolCalls
        ? `tool calls: ${response.toolCalls!.map((t) => t.name).join(", ")}`
        : hasText
          ? `text only (no tool call — model may have declined): "${response.text.substring(0, 80)}"`
          : "no text and no tool calls returned",
    });
    if (hasToolCalls) {
      console.log(`  ✓ generateWithTools() returned tool calls: ${response.toolCalls!.map((t) => `${t.name}(${JSON.stringify(t.arguments)})`).join(", ")}`);
    } else if (hasText) {
      console.log(`  ~ generateWithTools() returned text only (model declined tool): "${response.text.substring(0, 80)}"`);
    } else {
      console.log(`  ✗ generateWithTools() returned nothing`);
    }
  } catch (err) {
    results.push({ name: "generateWithTools", passed: false, detail: `exception: ${err}` });
    console.log(`  ✗ generateWithTools() threw: ${err}`);
  }

  // --- 4. Embeddings ---
  console.log("\n◆ Testing embed()...");
  try {
    const result = await provider.embed("Aetherium identity coherence test query");
    const embeddings = Array.isArray(result.embeddings) ? result.embeddings : [result.embeddings];
    const first = Array.isArray(embeddings[0]) ? embeddings[0] : embeddings;
    const dims = (first as number[]).length;
    const hasValues = dims > 0 && (first as number[]).some((v) => v !== 0);
    results.push({
      name: "embed",
      passed: hasValues,
      detail: hasValues ? `${dims}-dimensional embedding returned` : "zero-valued or empty embedding",
    });
    console.log(`  ${hasValues ? "✓" : "✗"} embed() — ${dims} dimensions`);
  } catch (err) {
    results.push({ name: "embed", passed: false, detail: `exception: ${err}` });
    console.log(`  ✗ embed() threw: ${err}`);
  }

  // --- Summary ---
  console.log("\n═══════════════════════════════════════════════════");
  console.log(" SPIKE 001: Gemini Provider Test Results");
  console.log("═══════════════════════════════════════════════════");
  for (const r of results) {
    console.log(` ${r.passed ? "✓" : "✗"} ${r.name}: ${r.detail.substring(0, 120)}`);
  }
  const passed = results.filter((r) => r.passed).length;
  console.log(`\n ${passed}/${results.length} tests passed`);
  console.log("═══════════════════════════════════════════════════\n");

  process.exit(passed === results.length ? 0 : 1);
}

run().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
