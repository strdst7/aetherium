# Testing Patterns

**Analysis Date:** 2026-06-06

## Test Framework

**Runner:**
- Jest ^30.4.2 in both `api/` and `web/` packages
- ts-jest for TypeScript transpilation

**Config:**
- API: `api/jest.config.js` — Node environment, minimal config using `createDefaultPreset()`
- Web: `web/jest.config.js` — jsdom environment, custom `jsx: 'react-jsx'` tsconfig, `@/` path alias mapping

**Assertion Library:**
- Jest built-in matchers (`toBe`, `toEqual`, `toContainEqual`, `toHaveBeenCalledTimes`)
- Web additionally uses `@testing-library/jest-dom` for DOM-specific matchers (`toBeInTheDocument()`)
- Loaded via `web/jest.setup.js`: `require('@testing-library/jest-dom')`

**Run Commands:**
```bash
# API
cd api && npm test        # Run all API tests

# Web
cd web && npm test        # Run all web tests
```

## Test File Organization

**Location:**
- Tests are **co-located with source** — not in a separate `tests/` or `__tests__/` directory
- Pattern: `service.ts` → `service.test.ts` in the same directory

**Examples:**
- `api/src/services/orchestrator.ts` → `api/src/services/orchestrator.test.ts`
- `api/src/services/memory-service.ts` → `api/src/services/memory-service.test.ts`
- `api/src/controllers/memory.ts` → `api/src/controllers/memory.test.ts`
- `web/pages/index.tsx` → `web/src/index.test.tsx` (slightly different location for page tests)

**Naming:**
- `.test.ts` for plain TypeScript
- `.test.tsx` for React component tests

**Count:**
- API: 7 test files covering services and controllers
- Web: 1 test file for the main page component

## Test Structure

**Suite Organization:**
```typescript
describe('ComponentName', () => {
  let instance: ServiceClass;

  beforeEach(() => {
    instance = new ServiceClass();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should do something specific', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

**Observed Patterns:**
- Top-level `describe` uses the class or component name
- `beforeEach` for per-test setup (mock resets, instance creation)
- `afterEach` with `jest.clearAllMocks()` is standard across API tests
- `beforeAll` / `afterAll` used sparingly (only in `memory-service.test.ts`)

## Mocking

**Framework:** Jest built-in mocking (`jest.mock`, `jest.fn`, `jest.spyOn`)

**Module-level Mocking (API):**
```typescript
jest.mock('./provider-registry');
jest.mock('./memory-service');
jest.mock('./reflective-service');
```
Used in: `api/src/services/orchestrator.test.ts`

**Function Mocking:**
```typescript
const mockProvider = {
  name: 'mock-provider',
  embed: jest.fn().mockResolvedValue({ embeddings: [0.1, 0.2, 0.3] }),
  generate: jest.fn()
    .mockResolvedValueOnce({ id: 'id-1', text: 'Original response' })
    .mockResolvedValueOnce({ id: 'id-2', text: 'Refined response' })
};
```

**Global API Mocking (Web):**
```typescript
global.fetch = jest.fn();
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  json: async () => mockResponse,
});
```
Used in: `web/src/index.test.tsx`

**Spy-based Mocking:**
```typescript
jest.spyOn(ollama, 'healthCheck').mockResolvedValue({ ok: true });
```
Used in: `api/src/services/failover.test.ts`

**What to Mock:**
- External HTTP calls (`fetch`, Ollama provider)
- Database connections (`MemoryService` in controller tests)
- Service dependencies when testing a unit in isolation

**What NOT to Mock:**
- Pure utility functions (e.g., `cosineSimilarity` is duplicated inline in `memory-service.test.ts` for verification)
- Simple data structures and interfaces

## Fixtures and Factories

**Test Data:**
No dedicated fixture factories exist. Test data is constructed inline as plain objects:

```typescript
const mockDocs = [{ id: '1', content: 'mem 1' }, { id: '2', content: 'mem 2' }];

const mockContext: OrchestratorContext = {
  identity_anchor: 'sigil:v1:halo-arc:001',
  queryEmbedding: [0.1, 0.2, 0.3],
  relevantMemories: [ /* ... */ ],
  systemPrompt: 'You are Aetherium',
  fullPrompt: '...',
  selectedProvider: 'mock'
};
```

**No external fixture libraries** (e.g., faker, factory-bot) are used.

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:**
```bash
cd api && npx jest --coverage
cd web && npx jest --coverage
```

## Test Types

**Unit Tests:**
- Service logic tested in isolation with mocked dependencies
- Provider registry sorting and health check logic
- Reflective service rule evaluation logic

**Integration Tests:**
- `failover.test.ts` tests actual provider failover behavior using real `OllamaProvider` and `MockProvider` instances (with spy mocking on health checks)
- `memory.test.ts` uses `supertest` with a real Express app and mocked `MemoryService`

**Controller / HTTP Tests:**
```typescript
import request from 'supertest';

const app = express();
app.use('/', createMemoryRouter(mockMemoryService));

const response = await request(app).get('/v1/memory/all');
expect(response.status).toBe(200);
```
Used in: `api/src/controllers/memory.test.ts`

**React Component Tests:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

render(<Home />);
expect(screen.getByText(/⚡ Aetherium Reasoning Shell/i)).toBeInTheDocument();
```
Used in: `web/src/index.test.tsx`

**E2E Tests:**
- Not used. No Playwright, Cypress, or Puppeteer configuration detected.

## Common Patterns

**Async Testing:**
```typescript
it('should successfully orchestrate reasoning without refinement', async () => {
  const result = await orchestrator.process({ /* ... */ });
  expect(result.text).toBe('Original response');
});
```

**Error Testing:**
```typescript
await expect(registry.pick()).rejects.toThrow('No healthy providers available');
```

**DOM Async Testing:**
```typescript
await waitFor(() => {
  expect(screen.getByText(/Candidate Output/i)).toBeInTheDocument();
});
```

**Mock Reset Pattern:**
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

**Multiple Call Verification:**
```typescript
expect(mockProvider.generate).toHaveBeenCalledTimes(2);
const secondCall = mockProvider.generate.mock.calls[1][0];
expect(secondCall.prompt).toContain('Constraints:');
```

## Testing Gaps

- No dedicated `__mocks__/` directories for reusable mocks
- No test utilities or helper functions extracted to shared files
- `memory-service.test.ts` does not actually test MongoDB interactions (commented out connection logic)
- Web has only one test file for the entire frontend (`web/src/index.test.tsx`)
- No API contract or OpenAPI validation tests
- No snapshot tests detected

---

*Testing analysis: 2026-06-06*
