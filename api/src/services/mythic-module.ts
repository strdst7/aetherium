import { SigilIdentity } from "../types/identity";
import {
  MythicIdentitySchema,
  MythicPromptContext,
  MythifyResult,
  ToneModel,
  VoiceModel,
  SymbolicAnchor,
  NarrativeConstraint,
} from "../types/mythic";
import { SymbolicAnchorLoader } from "./symbolic-anchor-loader";

/**
 * MythicModule generates an identity schema from a SigilIdentity and
 * rewrites LLM outputs to match the identity's tone, voice, and symbolic anchors.
 * 
 * Purpose: This is the "soul" of the identity system. It shapes how the LLM
 * speaks and ensures outputs align with the registered identity.
 */
export class MythicModule {
  private anchorLoader: SymbolicAnchorLoader;
  private schemaCache: Map<string, MythicIdentitySchema> = new Map();

  constructor(anchorLoader: SymbolicAnchorLoader) {
    this.anchorLoader = anchorLoader;
  }

  /**
   * Generate a MythicIdentitySchema from a SigilIdentity.
   * 
   * @param identity The identity to generate schema for
   * @returns A schema containing tone, voice, symbolic anchors, and constraints
   */
  async generateSchema(identity: SigilIdentity): Promise<MythicIdentitySchema> {
    // Check cache
    const cacheKey = `${identity.id}:${identity.version}`;
    const cached = this.schemaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Ensure anchors are loaded
    if (!this.anchorLoader.isLoaded()) {
      await this.anchorLoader.load();
    }

    // Extract tone and voice from identity config
    const tone = this.extractToneModel(identity);
    const voice = this.extractVoiceModel(identity);

    // Get symbolic anchors from design system
    const symbolicAnchors = this.anchorLoader.getAnchors();

    // Extract narrative constraints from identity rules
    const narrativeConstraints = this.extractConstraints(identity);

    const schema: MythicIdentitySchema = {
      identityId: identity.id,
      identityName: identity.name,
      version: identity.version,
      tone,
      voice,
      symbolicAnchors,
      narrativeConstraints,
      generatedAt: new Date().toISOString(),
    };

    // Cache schema
    this.schemaCache.set(cacheKey, schema);

    return schema;
  }

  /**
   * Generate prompt context from identity.
   * 
   * @param identity The identity to generate context for
   * @returns A context object with tone, voice, symbolic, and constraint strings
   */
  async generatePromptContext(identity: SigilIdentity): Promise<MythicPromptContext> {
    const schema = await this.generateSchema(identity);

    const toneContext = `Tone: ${schema.tone.register} (intensity: ${schema.tone.intensity}). Modifiers: ${schema.tone.modifiers.join(", ")}.`;
    const voiceContext = `Voice: ${schema.voice.character}. Vocabulary: ${schema.voice.vocabulary}. Structure: ${schema.voice.sentenceStructure}. Pacing: ${schema.voice.pacing}.`;
    const symbolicContext = `Symbolic anchors: ${schema.symbolicAnchors.map(a => `${a.concept}=${a.value}`).join(", ")}.`;
    const constraintContext = `Constraints: ${schema.narrativeConstraints.map(c => c.description).join("; ")}.`;

    const fullContext = `${toneContext}\n${voiceContext}\n${symbolicContext}\n${constraintContext}`;

    return {
      identityName: identity.name,
      toneContext,
      voiceContext,
      symbolicContext,
      constraintContext,
      fullContext,
    };
  }

  /**
   * Rewrite LLM output to match identity's tone and voice.
   * 
   * @param identity The identity to match
   * @param rawOutput The raw LLM output
   * @returns The rewritten output with transformation metadata
   */
  async mythify(identity: SigilIdentity, rawOutput: string): Promise<MythifyResult> {
    const schema = await this.generateSchema(identity);
    const transformations: string[] = [];
    let output = rawOutput;

    // Apply tone transformations
    if (schema.tone.register !== "neutral") {
      // Simple transformations for demonstration
      // In production, this would use an LLM to rewrite
      if (schema.tone.register === "formal") {
        output = this.makeFormal(output);
        transformations.push("formalized");
      } else if (schema.tone.register === "playful") {
        output = this.makePlayful(output);
        transformations.push("playful-ized");
      } else if (schema.tone.register === "somber") {
        output = this.makeSomber(output);
        transformations.push("somber-ized");
      }
    }

    // Apply voice transformations
    if (schema.voice.character === "poetic") {
      output = this.makePoetic(output);
      transformations.push("poetic-ized");
    } else if (schema.voice.character === "authoritative") {
      output = this.makeAuthoritative(output);
      transformations.push("authoritative-ized");
    }

    // Apply symbolic anchors
    const geometryAnchors = schema.symbolicAnchors.filter(a => a.context === "geometry");
    if (geometryAnchors.length > 0) {
      output = this.injectSymbolicReferences(output, geometryAnchors);
      transformations.push("symbolic-anchors");
    }

    // Check constraint compliance
    const constraints = schema.narrativeConstraints;
    const passed = this.checkConstraints(output, constraints);

    return {
      output,
      applied: transformations.length > 0,
      transformations,
      confidence: passed ? 0.95 : 0.7,
    };
  }

  /**
   * Get a default neutral schema for when no identity is specified.
   */
  getDefaultSchema(): MythicIdentitySchema {
    return {
      identityId: "neutral",
      identityName: "Neutral",
      version: 1,
      tone: {
        register: "neutral",
        intensity: 0.5,
        modifiers: [],
      },
      voice: {
        character: "conversational",
        vocabulary: "accessible",
        sentenceStructure: "standard",
        pacing: "normal",
      },
      symbolicAnchors: this.anchorLoader.getAnchors().slice(0, 3),
      narrativeConstraints: [],
      generatedAt: new Date().toISOString(),
    };
  }

  private extractToneModel(identity: SigilIdentity): ToneModel {
    const rules = identity.config?.customRules || [];
    
    // Look for tone rules
    const toneRule = rules.find(r => r.toLowerCase().startsWith("tone:"));
    let register = "neutral";
    let intensity = 0.5;
    const modifiers: string[] = [];

    if (toneRule) {
      const toneValue = toneRule.split(":")[1]?.trim().toLowerCase() || "";
      if (toneValue) {
        register = toneValue;
        intensity = 0.7;
      }
    }

    // Check for other modifiers
    if (rules.some(r => r.toLowerCase().includes("urgent"))) {
      modifiers.push("urgent");
    }
    if (rules.some(r => r.toLowerCase().includes("gentle"))) {
      modifiers.push("gentle");
    }

    return { register, intensity, modifiers };
  }

  private extractVoiceModel(identity: SigilIdentity): VoiceModel {
    const rules = identity.config?.customRules || [];

    // Determine voice character from rules
    let character = "conversational";
    let vocabulary = "accessible";
    let sentenceStructure = "standard";
    let pacing = "normal";

    if (rules.some(r => r.toLowerCase().includes("formal") || r.toLowerCase().includes("professional"))) {
      character = "authoritative";
      vocabulary = "sophisticated";
      sentenceStructure = "complex";
    }

    if (rules.some(r => r.toLowerCase().includes("simple") || r.toLowerCase().includes("plain"))) {
      vocabulary = "accessible";
      sentenceStructure = "simple";
    }

    if (rules.some(r => r.toLowerCase().includes("poetic") || r.toLowerCase().includes("artistic"))) {
      character = "poetic";
      vocabulary = "rich";
      sentenceStructure = "flowing";
    }

    return { character, vocabulary, sentenceStructure, pacing };
  }

  private extractConstraints(identity: SigilIdentity): NarrativeConstraint[] {
    const rules = identity.config?.customRules || [];
    const constraints: NarrativeConstraint[] = [];

    for (const rule of rules) {
      const lower = rule.toLowerCase();
      if (lower.startsWith("must contain:")) {
        constraints.push({
          type: "must_include",
          description: rule,
          weight: 1.0,
        });
      } else if (lower.startsWith("must not contain:")) {
        constraints.push({
          type: "must_avoid",
          description: rule,
          weight: 1.0,
        });
      } else if (lower.startsWith("tone:")) {
        constraints.push({
          type: "tone_match",
          description: rule,
          weight: 0.8,
        });
      } else {
        constraints.push({
          type: "structure",
          description: rule,
          weight: 0.5,
        });
      }
    }

    return constraints;
  }

  // Simple text transformation methods
  private makeFormal(text: string): string {
    return text
      .replace(/\b(can't|won't|don't|doesn't|didn't|hasn't|haven't|isn't|aren't|wasn't|weren't)\b/gi, (match: string) => {
        const formal: Record<string, string> = {
          "can't": "cannot", "won't": "will not", "don't": "do not", "doesn't": "does not",
          "didn't": "did not", "hasn't": "has not", "haven't": "have not", "isn't": "is not",
          "aren't": "are not", "wasn't": "was not", "weren't": "were not",
        };
        return formal[match.toLowerCase()] || match;
      })
      .replace(/\b(hey|hi|hello|yo|hiya)\b/gi, "Greetings")
      .replace(/\b(gonna|wanna|gotta)\b/gi, (match: string) => {
        const formal: Record<string, string> = {
          "gonna": "going to", "wanna": "want to", "gotta": "got to",
        };
        return formal[match.toLowerCase()] || match;
      });
  }

  private makePlayful(text: string): string {
    return text
      .replace(/\b(great|excellent|good|fine)\b/gi, (match: string) => {
        const playful: Record<string, string> = {
          "great": "awesome", "excellent": "fantastic", "good": "super", "fine": "dandy",
        };
        return playful[match.toLowerCase()] || match;
      });
  }

  private makeSomber(text: string): string {
    return text
      .replace(/\b(awesome|fantastic|super|great|excellent|amazing|wonderful)\b/gi, "notable")
      .replace(/\b(terrible|awful|bad|horrible)\b/gi, "regrettable");
  }

  private makePoetic(text: string): string {
    // Add some poetic flourishes
    const lines = text.split(".");
    return lines.map((line: string, i: number) => {
      if (i % 3 === 0 && line.length > 20) {
        return line.trim() + ", as the stars align in silent witness.";
      }
      return line;
    }).join(".");
  }

  private makeAuthoritative(text: string): string {
    return text
      .replace(/\b(think|believe|feel|suggest)\b/gi, (match: string) => {
        const authoritative: Record<string, string> = {
          "think": "assert", "believe": "maintain", "feel": "state", "suggest": "recommend",
        };
        return authoritative[match.toLowerCase()] || match;
      });
  }

  private injectSymbolicReferences(text: string, anchors: SymbolicAnchor[]): string {
    // Add subtle symbolic references at the end
    if (anchors.length > 0 && text.length > 50) {
      const anchor = anchors[0];
      return text + `\n\n[Aligned with ${anchor.concept}: ${anchor.value}]`;
    }
    return text;
  }

  private checkConstraints(output: string, constraints: NarrativeConstraint[]): boolean {
    const outputLower = output.toLowerCase();

    for (const constraint of constraints) {
      if (constraint.type === "must_include") {
        const required = constraint.description.split(":")[1]?.trim() || "";
        if (required && !outputLower.includes(required.toLowerCase())) {
          return false;
        }
      } else if (constraint.type === "must_avoid") {
        const forbidden = constraint.description.split(":")[1]?.trim() || "";
        if (forbidden && outputLower.includes(forbidden.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  }
}
