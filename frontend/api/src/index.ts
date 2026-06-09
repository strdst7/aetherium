import express from 'express';
import { IdentityService } from './services/identity-service';
import { IdentityBindingService } from './services/identity-binding';
import { SymbolicAnchorLoader } from './services/symbolic-anchor-loader';
import { MythicModuleService } from './services/mythic-module';
import { IdentityConstraintEngine } from './services/identity-constraints';
import { SovereignHaloService } from './services/sovereign-halo';
import { Orchestrator } from './services/orchestrator';
import { MultiAgentOrchestrator } from './services/multi-agent-orchestrator';
import { createReasonRouter } from './controllers/reason';
import { createMultiAgentRouter } from './controllers/multi-agent';
import { MemoryService } from './services/memory-service';
import { ProviderRegistry } from './services/provider-registry';

const app = express();
app.use(express.json());

// 1. Initialize base services
const memoryService = new MemoryService();
const providerRegistry = new ProviderRegistry();
const identityService = new IdentityService();

// 2. Initialize IdentityBindingService after IdentityService
const identityBindingService = new IdentityBindingService(identityService);

// 3. Phase 6: Initialize Mythic Module
const symbolicAnchorLoader = new SymbolicAnchorLoader();
const mythicModuleService = new MythicModuleService(symbolicAnchorLoader);
symbolicAnchorLoader.load().then(anchors => {
  (mythicModuleService as any).anchorsMap = anchors;
});

// 4. Phase 7: Initialize Sovereign Halo
const constraintEngine = new IdentityConstraintEngine();
console.log("✅ Identity constraint engine initialized");

const sovereignHalo = new SovereignHaloService(constraintEngine, mythicModuleService, {
  maxAttempts: 3,
  temperaturePenalty: 0.1,
  requireSymbolicAnchors: true,
  toneTolerance: 0.5,
  skipSafetyCheck: false,
});
console.log("✅ Sovereign Halo initialized");

// 5. Initialize Orchestrators with Sovereign Halo
const orchestrator = new Orchestrator(
  memoryService, 
  providerRegistry, 
  identityBindingService, 
  mythicModuleService, 
  sovereignHalo
);

// Note: ReflectiveService is instantiated internally by Orchestrator and MultiAgentOrchestrator
// or passed in depending on the exact signature. We pass a dummy one here for MultiAgentOrchestrator.
const multiAgentOrchestrator = new MultiAgentOrchestrator(
  memoryService,
  {} as any, // reflectiveService stub
  identityBindingService,
  sovereignHalo
);
console.log("✅ Multi-agent orchestrator initialized with Sovereign Halo");

// 6. Wire routers
app.use('/v1/reason', createReasonRouter(orchestrator));
app.use('/v1/multi-agent', createMultiAgentRouter(multiAgentOrchestrator, identityBindingService));

export { app, identityBindingService, orchestrator, multiAgentOrchestrator };
