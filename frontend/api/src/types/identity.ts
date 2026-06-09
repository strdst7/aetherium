import { MythicIdentity } from './mythic';

export interface IdentityConfig {
  mythic?: MythicIdentity;
}

export interface SigilIdentity {
  id: string;
  name: string;
  description: string;
  rules: string[];
  config?: IdentityConfig;
}
