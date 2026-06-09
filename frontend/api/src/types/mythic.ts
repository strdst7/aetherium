export interface SymbolicAnchor {
  name: string;
  weight: number;
  description: string;
}

export interface MythicIdentity {
  tone: string[];
  voice: string;
  symbolicAnchors: string[];
  narrativeConstraints?: string[];
}

export interface MythicIdentitySchema {
  tone: string[];
  voice: string;
  anchors: SymbolicAnchor[];
  sigilHash: string;
  isNeutral: boolean;
}

export const DEFAULT_NEUTRAL_MYTHIC: MythicIdentitySchema = {
  tone: ['neutral'],
  voice: 'objective',
  anchors: [],
  sigilHash: '0000000000000000',
  isNeutral: true,
};
