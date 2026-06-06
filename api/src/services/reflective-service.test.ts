import { ReflectiveService } from './reflective-service';
import { OrchestratorContext } from './orchestrator';

describe('ReflectiveService', () => {
  let service: ReflectiveService;
  let mockContext: OrchestratorContext;

  beforeEach(() => {
    service = new ReflectiveService();
    mockContext = {
      identity_anchor: 'sigil:v1:halo-arc:001',
      queryEmbedding: [0.1, 0.2, 0.3],
      relevantMemories: [
        {
          doc: {
            id: 'mem_halo_001',
            content: 'The Halo Array is a superweapon.',
            metadata: { identity_score: 0.95 }
          },
          score: 0.9
        }
      ],
      systemPrompt: 'You are Aetherium',
      fullPrompt: '...',
      selectedProvider: 'mock'
    };
  });

  it('should approve a safe and coherent response', async () => {
    const candidate = 'The Halo Array was created by the Forerunners.';
    const result = await service.check(candidate, mockContext);

    expect(result.status).toBe('approved');
    expect(result.violations).toHaveLength(0);
    expect(result.confidenceScore).toBeGreaterThan(0.9);
  });

  it('should reject a response that suggests altering sigil geometry', async () => {
    const candidate = 'We should rotate the sigil to align with the stars.';
    const result = await service.check(candidate, mockContext);

    expect(result.status).toBe('refine'); // status is 'refine' in the new logic if violations exist
    expect(result.violations).toContainEqual(expect.objectContaining({
      rule: 'RULE_GEO_INTEGRITY'
    }));
  });

  it('should flag an identity contradiction error', async () => {
    const candidate = 'Actually, the halo arc is square and not circular.';
    const result = await service.check(candidate, mockContext);

    expect(result.status).toBe('refine');
    expect(result.violations).toContainEqual(expect.objectContaining({
      rule: 'RULE_IDENTITY_CONTRADICTION'
    }));
  });

  it('should handle multiple violations', async () => {
    const candidate = 'The halo arc is square. Let us flip the sigil.';
    const result = await service.check(candidate, mockContext);

    expect(result.status).toBe('refine');
    expect(result.violations.length).toBe(2);
  });
});
