import { MultiAgentOrchestrator } from "./services/multi-agent-orchestrator";
import { MemoryService } from "./services/memory-service";
import { ReflectiveService } from "./services/reflective-service";
import { ProviderRegistry } from "./services/provider-registry";
import { MockProvider } from "./adapters/mock-provider";

async function runDemo() {
  // Setup mocks
  const mockMemoryService = {
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    vectorSearch: jest.fn().mockResolvedValue([
      {
        doc: { 
          id: "mem_halo_1", 
          content: "The Halo Arc must maintain ratio 1:1.618. It is a golden curve, never to be squared.",
          metadata: { identity_score: 0.95 }
        },
        score: 0.98
      },
      {
        doc: { 
          id: "mem_halo_2", 
          content: "Sigil geometry is sacred. Rotation is a violation of the primary anchor.",
          metadata: { identity_score: 0.92 }
        },
        score: 0.85
      }
    ])
  } as any;

  const reflectiveService = new ReflectiveService();
  
  // Register mock provider
  const registry = ProviderRegistry.instance;
  registry.reset();
  registry.register(new MockProvider(), 1);

  const orchestrator = new MultiAgentOrchestrator(mockMemoryService, reflectiveService);
  
  const prompt = "halo arc is square";
  const identityAnchor = "halo-arc-primary";

  console.log("--- MULTI-AGENT FLOW START ---");
  console.log(`Prompt: ${prompt}`);
  
  const result = await orchestrator.runFlow(prompt, identityAnchor);
  
  console.log("\n--- AGENT RESPONSES ---");
  console.log(`Archivist: ${result.archivist.output}`);
  console.log(`Archivist Meta (Memories): ${result.archivist.meta.results.length}`);
  
  console.log(`Sigil Keeper Verdict: ${result.sigilKeeper.output}`);
  if (result.sigilKeeper.meta?.violations) {
    console.log(`Sigil Keeper Violations: ${JSON.stringify(result.sigilKeeper.meta.violations)}`);
  }
  
  console.log(`Narrator Output:\n${result.narrator.output}`);
  console.log("--- FLOW COMPLETE ---");
}

// Simple mock for jest.fn() since we aren't running in jest
const jest = {
  fn: (impl?: any) => {
    const fn = async (...args: any[]) => {
      fn.mock.calls.push(args);
      return impl ? impl(...args) : undefined;
    };
    fn.mock = { calls: [] as any[] };
    fn.mockResolvedValue = (val: any) => {
      impl = async () => val;
      return fn;
    };
    return fn;
  }
};

runDemo().catch(console.error);
