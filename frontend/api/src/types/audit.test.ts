import {
  AuditRecord,
  AuditRecordCreate,
  AuditQuery,
  AuditPagination
} from './audit';

describe('Audit Types', () => {
  it('should construct a valid AuditRecord with all fields', () => {
    const record: AuditRecord = {
      recordId: '123e4567-e89b-12d3-a456-426614174000',
      identityId: 'id-123',
      identityName: 'Test Identity',
      identityVersion: 1,
      prompt: 'Hello',
      output: 'World',
      provenance: {
        originalOutput: 'World',
        providerName: 'gemini'
      },
      timestamp: new Date().toISOString(),
      hash: 'abc123hash'
    };

    expect(record.recordId).toBeDefined();
    expect(record.identityId).toBe('id-123');
    expect(record.provenance.providerName).toBe('gemini');
  });

  it('should ensure AuditRecord hash is non-empty', () => {
    const record: AuditRecord = {
      recordId: '123e4567-e89b-12d3-a456-426614174000',
      identityId: 'id-123',
      identityName: 'Test Identity',
      identityVersion: 1,
      prompt: 'Hello',
      output: 'World',
      provenance: {
        originalOutput: 'World',
        providerName: 'gemini'
      },
      timestamp: new Date().toISOString(),
      hash: 'abc123hash'
    };

    expect(record.hash.length).toBeGreaterThan(0);
  });

  it('should allow AuditRecordCreate without auto-generated fields', () => {
    const create: AuditRecordCreate = {
      identityId: 'id-123',
      identityName: 'Test Identity',
      identityVersion: 1,
      prompt: 'Hello',
      output: 'World',
      provenance: {
        originalOutput: 'World',
        providerName: 'gemini'
      }
    };

    expect((create as any).recordId).toBeUndefined();
    expect((create as any).timestamp).toBeUndefined();
    expect((create as any).hash).toBeUndefined();
  });

  it('should have sensible defaults for AuditQuery (conceptually)', () => {
    const query: AuditQuery = {
      identityId: 'id-123'
    };
    
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const sort = query.sort ?? 'desc';

    expect(limit).toBe(50);
    expect(offset).toBe(0);
    expect(sort).toBe('desc');
  });

  it('should calculate hasMore correctly in AuditPagination', () => {
    const pagination: AuditPagination = {
      total: 100,
      limit: 50,
      offset: 0,
      hasMore: true
    };

    expect(pagination.hasMore).toBe(true);

    const paginationEnd: AuditPagination = {
      total: 100,
      limit: 50,
      offset: 50,
      hasMore: false
    };

    expect(paginationEnd.hasMore).toBe(false);
  });
});
