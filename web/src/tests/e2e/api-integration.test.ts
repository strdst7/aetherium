import { getIdentities, submitReasonRequest } from '../../lib/api-client';
import { ReasoningResponse } from '../../types/api';

describe('API Integration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch identities from API', async () => {
    const mockIdentities = [
      { id: '1', name: 'Test Identity', developerId: 'dev1', sigilHash: 'abc', version: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockIdentities),
    });

    const result = await getIdentities();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Identity');

    const request = (global.fetch as jest.Mock).mock.calls[0];
    expect(request[0]).toBe('http://localhost:8080/identity');
    expect(request[1].method).toBeUndefined(); // GET request
  });

  it('should submit reason request and receive response', async () => {
    const mockResponse: ReasoningResponse = {
      id: 'resp-1',
      output: 'Hello from Aetherium',
      status: 'approved',
      identity_anchor: 'test',
      reasoning: {
        orchestrator: {
          selectedProvider: 'mock',
          relevantMemoriesCount: 0,
          topMemories: [],
        },
        reflective: {
          status: 'approved',
          violations: [],
          suggestedConstraints: [],
          confidenceScore: 0.95,
        },
        trace: [],
      },
      metadata: {
        version: '1.0.0',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await submitReasonRequest('test', [{ role: 'user', content: 'Hello' }]);
    expect(result.output).toBe('Hello from Aetherium');
    expect(result.status).toBe('approved');
    expect(result.id).toBe('resp-1');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ detail: 'Internal server error' }),
    });

    await expect(
      submitReasonRequest('test', [{ role: 'user', content: 'Hello' }])
    ).rejects.toThrow('Internal server error');
  });

  it('should include API version in requests', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ output: 'test', status: 'approved', id: '1', identity_anchor: 'test', reasoning: { orchestrator: { selectedProvider: 'mock', relevantMemoriesCount: 0, topMemories: [] }, reflective: { status: 'approved', violations: [], suggestedConstraints: [], confidenceScore: 1 }, trace: [] } }),
    });

    await submitReasonRequest('test', [{ role: 'user', content: 'Hello' }]);

    const request = (global.fetch as jest.Mock).mock.calls[0];
    const headers = request[1].headers as Record<string, string>;
    const hasVersionHeader =
      headers['X-API-Version'] !== undefined ||
      headers['Accept-Version'] !== undefined ||
      headers['x-api-version'] !== undefined ||
      headers['accept-version'] !== undefined;
    expect(hasVersionHeader).toBe(true);
  });
});
