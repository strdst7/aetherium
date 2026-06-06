import request from 'supertest';
import express from 'express';
import { createHealthRouter } from '../routes/health';
import { HealthResponse } from '../types/api-contracts';

describe('Health Check Integration', () => {
  function createMockMemoryService(shouldFail = false) {
    return {
      vectorSearch: jest.fn().mockImplementation(() => {
        if (shouldFail) {
          return Promise.reject(new Error('Database disconnected'));
        }
        return Promise.resolve([]);
      }),
    };
  }

  function createMockProviderRegistry(allHealthy = true) {
    return {
      listProviders: jest.fn().mockReturnValue([
        {
          name: 'mock-provider',
          healthCheck: jest.fn().mockResolvedValue({ ok: allHealthy }),
        },
      ]),
    };
  }

  function createMockProviderRegistryEmpty() {
    return {
      listProviders: jest.fn().mockReturnValue([]),
    };
  }

  function createMockMcpClient(healthy = true) {
    return {
      isHealthy: jest.fn().mockReturnValue(healthy),
    };
  }

  function createApp(options: {
    memoryService?: any;
    providerRegistry?: any;
    mcpClient?: any;
  }) {
    const app = express();
    app.use('/', createHealthRouter(options));
    return app;
  }

  it('should return ok when all services are healthy', async () => {
    const app = createApp({
      memoryService: createMockMemoryService(),
      providerRegistry: createMockProviderRegistry(true),
      mcpClient: createMockMcpClient(true),
    });

    const response = await request(app).get('/health').expect(200);
    const body = response.body as HealthResponse;

    expect(body.status).toBe('ok');
    expect(body.checks?.database).toBe('ok');
    expect(body.checks?.llm).toBe('ok');
    expect(body.checks?.mcp).toBe('ok');
    expect(body.apiVersion).toBe('1.0.0');
  });

  it('should return degraded when LLM is unavailable', async () => {
    const app = createApp({
      memoryService: createMockMemoryService(),
      providerRegistry: createMockProviderRegistry(false),
      mcpClient: createMockMcpClient(true),
    });

    const response = await request(app).get('/health').expect(503);
    const body = response.body as HealthResponse;

    expect(body.status).toBe('degraded');
    expect(body.checks?.llm).toBe('error');
    expect(body.checks?.database).toBe('ok');
    expect(body.checks?.mcp).toBe('ok');
  });

  it('should return degraded when database is disconnected', async () => {
    const app = createApp({
      memoryService: createMockMemoryService(true),
      providerRegistry: createMockProviderRegistry(true),
      mcpClient: createMockMcpClient(true),
    });

    const response = await request(app).get('/health').expect(503);
    const body = response.body as HealthResponse;

    expect(body.status).toBe('degraded');
    expect(body.checks?.database).toBe('error');
    expect(body.checks?.llm).toBe('ok');
    expect(body.checks?.mcp).toBe('ok');
  });

  it('should include timestamp in ISO format', async () => {
    const app = createApp({
      memoryService: createMockMemoryService(),
      providerRegistry: createMockProviderRegistry(true),
      mcpClient: createMockMcpClient(true),
    });

    const response = await request(app).get('/health').expect(200);
    const body = response.body as HealthResponse;

    // ISO 8601 regex: YYYY-MM-DDTHH:mm:ss.sssZ
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    expect(body.timestamp).toMatch(isoRegex);
  });

  it('should handle missing optional services gracefully', async () => {
    const app = createApp({});

    const response = await request(app).get('/health').expect(200);
    const body = response.body as HealthResponse;

    expect(body.status).toBe('ok');
    expect(body.checks?.database).toBe('ok');
    expect(body.checks?.llm).toBe('ok');
    expect(body.checks?.mcp).toBe('ok');
  });
});
