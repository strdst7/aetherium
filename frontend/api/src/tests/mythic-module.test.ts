import { MythicModuleService } from '../services/mythic-module';
import { SymbolicAnchorLoader } from '../services/symbolic-anchor-loader';
import { SigilIdentity } from '../types/identity';
import { DEFAULT_NEUTRAL_MYTHIC } from '../types/mythic';

describe('MythicModuleService', () => {
  let loader: SymbolicAnchorLoader;
  let service: MythicModuleService;

  beforeEach(async () => {
    loader = new SymbolicAnchorLoader();
    service = new MythicModuleService(loader);
    await service.initialize();
  });

  it('should generate schema for identity with mythic config', () => {
    const identity: SigilIdentity = {
      id: 'test-id',
      name: 'Test',
      description: 'Test',
      rules: [],
      config: {
        mythic: {
          tone: ['arcane'],
          voice: 'first-person',
          symbolicAnchors: ['GoldenRatio']
        }
      }
    };

    const schema = service.generateSchema(identity);
    expect(schema.isNeutral).toBe(false);
    expect(schema.tone).toContain('arcane');
    expect(schema.voice).toBe('first-person');
    expect(schema.anchors.length).toBeGreaterThan(0);
    expect(schema.sigilHash).toBeDefined();
  });

  it('should return DEFAULT_NEUTRAL_MYTHIC for neutral identity', () => {
    const identity: SigilIdentity = {
      id: 'neutral',
      name: 'Neutral',
      description: 'Neutral',
      rules: []
    };

    const schema = service.generateSchema(identity);
    expect(schema).toEqual(DEFAULT_NEUTRAL_MYTHIC);
  });

  it('should mythify output based on tone and voice', async () => {
    const identity: SigilIdentity = {
      id: 'test-id',
      name: 'Test',
      description: 'Test',
      rules: [],
      config: {
        mythic: {
          tone: ['ceremonial', 'arcane'],
          voice: 'first-person',
          symbolicAnchors: []
        }
      }
    };

    const result = await service.mythify(identity, 'It is important to use this.');
    expect(result.applied).toBe(true);
    expect(result.output).toContain('Hearken');
    expect(result.output).toContain('I am');
    expect(result.output).toContain('crucial');
    expect(result.output).toContain('utilize');
  });
});
