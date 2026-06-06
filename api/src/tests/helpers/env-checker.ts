export interface RequiredEnvVar {
  name: string;
  description: string;
  validate?: (value: string) => boolean;
}

export interface EnvCheckResult {
  present: string[];
  missing: string[];
  allPresent: boolean;
  statuses: Record<
    string,
    { present: boolean; valid?: boolean; message?: string }
  >;
}

/**
 * Check a list of required environment variables.
 *
 * Returns detailed status for each variable, including optional
 * custom validation.  Safe to call in any environment (test, CI,
 * local).
 */
export function checkRequiredEnvVars(
  vars: RequiredEnvVar[]
): EnvCheckResult {
  const present: string[] = [];
  const missing: string[] = [];
  const statuses: EnvCheckResult["statuses"] = {};

  for (const v of vars) {
    const raw = process.env[v.name];
    const isPresent = raw !== undefined && raw.trim() !== "";

    if (!isPresent) {
      missing.push(v.name);
      statuses[v.name] = { present: false };
      continue;
    }

    if (v.validate) {
      const valid = v.validate(raw);
      statuses[v.name] = {
        present: true,
        valid,
        message: valid ? undefined : `Validation failed for ${v.name}`,
      };
      if (valid) {
        present.push(v.name);
      } else {
        missing.push(v.name);
      }
    } else {
      present.push(v.name);
      statuses[v.name] = { present: true, valid: true };
    }
  }

  return {
    present,
    missing,
    allPresent: missing.length === 0,
    statuses,
  };
}
