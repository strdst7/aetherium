/**
 * API client for Aetherium backend
 * 
 * Base URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
 */

import {
  SigilIdentity,
  IdentityCreateRequest,
  MemoryDocument,
  ReasoningResponse,
  AuditListResponse,
} from '../types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': '1.0.0',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `API request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Get all registered identities
 */
export async function getIdentities(): Promise<SigilIdentity[]> {
  return fetchJSON('/identity');
}

/**
 * Register a new identity
 */
export async function registerIdentity(payload: IdentityCreateRequest): Promise<SigilIdentity> {
  return fetchJSON('/identity/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Get memory shards, optionally filtered by identity
 */
export async function getMemoryShards(identityId?: string): Promise<MemoryDocument[]> {
  const query = identityId ? `?identityId=${encodeURIComponent(identityId)}` : '';
  return fetchJSON(`/v1/memory/all${query}`);
}

/**
 * Submit a reasoning request
 */
export async function submitReasonRequest(
  identity_anchor: string,
  messages: { role: string; content: string }[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    memoryK?: number;
    enableTools?: boolean;
  }
): Promise<ReasoningResponse> {
  return fetchJSON('/v1/reason', {
    method: 'POST',
    body: JSON.stringify({
      identity_anchor,
      messages,
      options: {
        maxTokens: 512,
        temperature: 0.7,
        memoryK: 5,
        ...options,
      },
    }),
  });
}

/**
 * Query audit records for an identity
 */
export async function getAuditRecords(
  identityId: string,
  options?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
  }
): Promise<AuditListResponse> {
  const params = new URLSearchParams({ identity_id: identityId });
  if (options?.from) params.append('from', options.from);
  if (options?.to) params.append('to', options.to);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.sort) params.append('sort', options.sort);

  return fetchJSON(`/audit?${params.toString()}`);
}
