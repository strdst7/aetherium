/**
 * Mythic Module Types
 * 
 * Defines the "soul" of an identity — the tone, voice, symbolic anchors,
 * and narrative constraints that shape LLM prompts and output rewriting.
 */

export interface ToneModel {
  /** Primary emotional register (e.g., "formal", "playful", "somber") */
  register: string;
  /** Intensity level 0-1 */
  intensity: number;
  /** Modifiers that adjust tone in context */
  modifiers: string[];
}

export interface VoiceModel {
  /** Character of the voice (e.g., "authoritative", "conversational", "poetic") */
  character: string;
  /** Vocabulary level (e.g., "technical", "accessible", "sophisticated") */
  vocabulary: string;
  /** Sentence structure preference */
  sentenceStructure: string;
  /** Pacing and rhythm description */
  pacing: string;
}

export interface SymbolicAnchor {
  /** The symbolic concept (e.g., "golden_ratio", "sigil_core") */
  concept: string;
  /** The value or representation */
  value: string;
  /** Context where this anchor applies */
  context: string;
  /** Weight/importance 0-1 */
  weight: number;
}

export interface NarrativeConstraint {
  /** The rule type */
  type: "must_include" | "must_avoid" | "tone_match" | "structure";
  /** The rule description */
  description: string;
  /** Weight/importance 0-1 */
  weight: number;
}

export interface MythicIdentitySchema {
  /** Identity this schema belongs to */
  identityId: string;
  /** Identity name */
  identityName: string;
  /** Version of the schema */
  version: number;
  /** Tone model for this identity */
  tone: ToneModel;
  /** Voice model for this identity */
  voice: VoiceModel;
  /** Symbolic anchors from design system */
  symbolicAnchors: SymbolicAnchor[];
  /** Narrative constraints */
  narrativeConstraints: NarrativeConstraint[];
  /** Generated at timestamp */
  generatedAt: string;
}

export interface MythicPromptContext {
  /** Identity name to inject into prompts */
  identityName: string;
  /** Tone context string */
  toneContext: string;
  /** Voice context string */
  voiceContext: string;
  /** Symbolic context string */
  symbolicContext: string;
  /** Constraint context string */
  constraintContext: string;
  /** Full combined context */
  fullContext: string;
}

export interface MythifyResult {
  /** The rewritten output */
  output: string;
  /** Whether the rewrite was applied */
  applied: boolean;
  /** Transformations applied */
  transformations: string[];
  /** Confidence score 0-1 */
  confidence: number;
}
