import { SigilIdentity } from '../types/identity';
import { MythicIdentitySchema, DEFAULT_NEUTRAL_MYTHIC, SymbolicAnchor } from '../types/mythic';
import { SymbolicAnchorLoader } from './symbolic-anchor-loader';

export interface MythifyResult {
  output: string;
  applied: boolean;
  metadata: {
    tone: string;
    anchors: string;
    latency: number;
  };
}

export class MythicModuleService {
  private anchorsMap: Map<string, SymbolicAnchor> = new Map();

  constructor(private anchorLoader: SymbolicAnchorLoader) {}

  async initialize() {
    this.anchorsMap = await this.anchorLoader.load();
  }

  generateSchema(identity: SigilIdentity): MythicIdentitySchema {
    if (!identity.config?.mythic) {
      return DEFAULT_NEUTRAL_MYTHIC;
    }

    const mythic = identity.config.mythic;
    const anchors = (mythic.symbolicAnchors || [])
      .map(name => this.anchorsMap.get(name))
      .filter((a): a is SymbolicAnchor => a !== undefined);

    const sigilHash = this.simulateHash(identity.id + JSON.stringify(anchors));

    return {
      tone: mythic.tone || [],
      voice: mythic.voice || 'objective',
      anchors,
      sigilHash,
      isNeutral: false,
    };
  }

  generateMythicPrompt(identity: SigilIdentity): string {
    const schema = this.generateSchema(identity);
    if (schema.isNeutral) return '';

    let prompt = `[MYTHIC CONTEXT]\nTone: ${schema.tone.join(', ')}\nVoice: ${schema.voice}\n`;
    if (schema.anchors.length > 0) {
      prompt += `Symbolic Anchors: ${schema.anchors.map(a => a.name).join(', ')}\n`;
    }
    if (identity.config?.mythic?.narrativeConstraints) {
      prompt += `Narrative Constraints: ${identity.config.mythic.narrativeConstraints.join('; ')}\n`;
    }
    return prompt + '\n';
  }

  async mythify(identity: SigilIdentity, text: string): Promise<MythifyResult> {
    const start = Date.now();
    const schema = this.generateSchema(identity);
    
    if (schema.isNeutral) {
      return {
        output: text,
        applied: false,
        metadata: { tone: 'neutral', anchors: 'none', latency: Date.now() - start }
      };
    }

    let transformed = text;
    let applied = false;

    // Apply tone transformations
    if (schema.tone.includes('arcane')) {
      transformed = transformed.replace(/\b(use|make|do)\b/gi, 'utilize');
      transformed = transformed.replace(/\b(important|key)\b/gi, 'crucial');
      applied = true;
    }

    if (schema.tone.includes('ceremonial')) {
      if (!transformed.startsWith('Hearken,')) {
        transformed = `Hearken, seeker of truth.\n\n${transformed}`;
        applied = true;
      }
    }

    if (schema.voice === 'first-person') {
      transformed = transformed.replace(/\b(It is)\b/gi, 'I am');
      applied = true;
    }

    // Apply symbolic anchors
    if (schema.anchors.some(a => a.name === 'GoldenRatio')) {
      if (!transformed.includes('golden proportion')) {
        transformed += '\n\n[Aligned with the golden proportion]';
        applied = true;
      }
    }

    const latency = Date.now() - start;

    return {
      output: transformed,
      applied,
      metadata: {
        tone: schema.tone.join(','),
        anchors: schema.anchors.map(a => a.name).join(','),
        latency
      }
    };
  }

  private simulateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
  }
}
