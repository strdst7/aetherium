# Aetherium API Integration Guide

This guide helps API integrators get started with the Aetherium platform — a sovereign, identity-first AI intelligence platform that provides natural-language reasoning with identity-consistent outputs.

For a complete, machine-readable API specification, see [`api/openapi.yml`](./api/openapi.yml).

---

## Getting Started

### Base URL

| Environment | URL |
|-------------|-----|
| Local development | `http://localhost:8080` |
| Production | `https://api.aetherium.io/v1` |

### Required Headers

Every request must include:

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes (for POST/PUT) |
| `Accept-Version` | `1.0.0` | Recommended |
| `X-API-Version` | `1.0.0` | Alternative to `Accept-Version` |

You may also pass the version as a query parameter: `?apiVersion=1.0.0`.

### Authentication

v1 of the Aetherium API does not require authentication. API key authentication is planned for v2 (see [REQUIREMENTS.md](./REQUIREMENTS.md)).

### First Request — Health Check

**curl:**

```bash
curl -X GET http://localhost:8080/health \
  -H "Accept-Version: 1.0.0"
```

**JavaScript:**

```javascript
const response = await fetch('http://localhost:8080/health', {
  headers: { 'Accept-Version': '1.0.0' },
});
const health = await response.json();
console.log(health.status); // "ok" | "degraded" | "down"
```

**Expected response:**

```json
{
  "status": "ok",
  "timestamp": "2026-06-06T12:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "llm": "ok",
    "mcp": "ok"
  }
}
```

---

## Identity Registration

Before submitting reasoning requests, register a `SigilIdentity`. The identity anchor ensures consistent tone, voice, and symbolic behavior across all generations.

### Register a New Identity

**curl:**

```bash
curl -X POST http://localhost:8080/identity/register \
  -H "Content-Type: application/json" \
  -H "Accept-Version: 1.0.0" \
  -d '{
    "name": "Research Assistant",
    "developerId": "dev@example.com",
    "config": {
      "preferredProvider": "gemini",
      "defaultTemperature": 0.7,
      "maxTokens": 1024,
      "customRules": [
        "Use academic tone",
        "Cite sources when possible"
      ]
    }
  }'
```

**JavaScript:**

```javascript
const identity = await fetch('http://localhost:8080/identity/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': '1.0.0',
  },
  body: JSON.stringify({
    name: 'Research Assistant',
    developerId: 'dev@example.com',
    config: {
      preferredProvider: 'gemini',
      defaultTemperature: 0.7,
      maxTokens: 1024,
      customRules: ['Use academic tone', 'Cite sources when possible'],
    },
  }),
}).then(r => r.json());

console.log(identity.identity.id);      // "id_xyz789"
console.log(identity.identity.version); // 1
console.log(identity.identity.sigilHash); // deterministic hash
```

**Expected response fields:**

| Field | Description |
|-------|-------------|
| `identity.id` | Unique identity identifier (e.g., `id_xyz789`) |
| `identity.name` | Human-readable name |
| `identity.developerId` | Developer who registered the identity |
| `identity.sigilHash` | Deterministic hash of canonicalized identity fields |
| `identity.version` | Starts at 1; increments on every update |
| `identity.config` | Provider preferences, temperature, custom rules |
| `identity.versions` | Immutable version history array |

### List All Identities

**curl:**

```bash
curl -X GET http://localhost:8080/identity \
  -H "Accept-Version: 1.0.0"
```

**JavaScript:**

```javascript
const identities = await fetch('http://localhost:8080/identity', {
  headers: { 'Accept-Version': '1.0.0' },
}).then(r => r.json());

console.log(identities.count);           // total number of identities
console.log(identities.identities[0].id); // first identity id
```

---

## Submitting a Reasoning Request

Send a natural-language prompt to the reasoning engine. The `identity_anchor` binds the generation to a registered identity, ensuring tone and symbolic consistency.

### Single-Step Reasoning (Tool Mode)

**curl:**

```bash
curl -X POST http://localhost:8080/v1/reason \
  -H "Content-Type: application/json" \
  -H "Accept-Version: 1.0.0" \
  -d '{
    "identity_anchor": "id_abc123",
    "messages": [
      { "role": "user", "content": "Explain quantum computing" }
    ],
    "options": {
      "mode": "tool",
      "enableTools": true,
      "maxToolIterations": 5,
      "temperature": 0.7,
      "memoryK": 5
    }
  }'
```

**JavaScript:**

```javascript
const result = await fetch('http://localhost:8080/v1/reason', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': '1.0.0',
  },
  body: JSON.stringify({
    identity_anchor: 'id_abc123',
    messages: [{ role: 'user', content: 'Explain quantum computing' }],
    options: {
      mode: 'tool',
      enableTools: true,
      maxToolIterations: 5,
      temperature: 0.7,
      memoryK: 5,
    },
  }),
}).then(r => r.json());

console.log(result.output);   // generated text
console.log(result.status);   // "approved" | "refine" | "reject"
console.log(result.reasoning.trace); // step-by-step reasoning trace
```

### Interpreting `ReasonResponse`

| Field | Description |
|-------|-------------|
| `id` | Unique response identifier |
| `output` | Generated text output |
| `status` | Reflective evaluation status (`approved`, `refine`, `reject`) |
| `identity_anchor` | Identity used for this generation |
| `reasoning.orchestrator.selectedProvider` | Which LLM provider served the request |
| `reasoning.orchestrator.topMemories` | Relevant memory shards retrieved |
| `reasoning.reflective.status` | Validation result from Sovereign Halo |
| `reasoning.reflective.confidenceScore` | Confidence between 0.0 and 1.0 |
| `reasoning.trace` | Step-by-step trace of the generation pipeline |
| `toolCalls` | Tools invoked during generation (if `enableTools: true`) |
| `toolExecutionTrace` | Detailed tool execution log |
| `metadata.processingTimeMs` | Total request latency in milliseconds |
| `apiVersion` | API version that handled the request |

### Handling Validation Failures

If `status` is `refine` or `reject`, inspect `reasoning.reflective.violations`:

```javascript
if (result.status === 'reject') {
  const violations = result.reasoning.reflective.violations;
  console.error('Validation failed:', violations);
  // violations[].rule, violations[].severity, violations[].message
}
```

A `reject` status means the output violated identity constraints (forbidden behaviors, tone deviation, or symbolic drift). The Orchestrator will attempt up to 3 regenerations with tightened constraints before returning a structured failure.

### Multi-Step Task Mode

For complex requests that require planning and tool orchestration:

**curl:**

```bash
curl -X POST http://localhost:8080/v1/reason \
  -H "Content-Type: application/json" \
  -H "Accept-Version: 1.0.0" \
  -d '{
    "identity_anchor": "id_abc123",
    "messages": [
      { "role": "user", "content": "Analyze quarterly sales data and generate a report" }
    ],
    "options": {
      "mode": "task",
      "enableTools": true,
      "maxTaskIterations": 20
    }
  }'
```

In task mode, the response includes `plan` (the executed plan) and `actions` (synthesized outputs such as reports or record updates).

### Multi-Agent Council

For high-stakes reasoning, route through the multi-agent council:

**curl:**

```bash
curl -X POST http://localhost:8080/v1/multi-agent/reason \
  -H "Content-Type: application/json" \
  -H "Accept-Version: 1.0.0" \
  -d '{
    "identity_anchor": "id_abc123",
    "prompt": "Analyze the implications of quantum computing on cryptography"
  }'
```

**JavaScript:**

```javascript
const council = await fetch('http://localhost:8080/v1/multi-agent/reason', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': '1.0.0',
  },
  body: JSON.stringify({
    identity_anchor: 'id_abc123',
    prompt: 'Analyze the implications of quantum computing on cryptography',
  }),
}).then(r => r.json());

console.log(council.archivist.output);    // memory gathering
console.log(council.sigilKeeper.output);  // intent validation
console.log(council.narrator.output);     // final synthesis
console.log(council.narrator.validationReport.status); // "passed"
```

---

## Memory Management

Aetherium persists memory shards in MongoDB with vector search. All memory operations are scoped to an identity to prevent cross-identity leakage.

### Upsert a Memory Document

**curl:**

```bash
curl -X POST http://localhost:8080/v1/memory/upsert \
  -H "Content-Type: application/json" \
  -H "Accept-Version: 1.0.0" \
  -d '{
    "content": "New research finding on topological quantum error correction shows promising results.",
    "metadata": {
      "source": "research-lab",
      "topic": "quantum-error-correction"
    },
    "identity_anchor": "id_abc123"
  }'
```

**JavaScript:**

```javascript
const doc = await fetch('http://localhost:8080/v1/memory/upsert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': '1.0.0',
  },
  body: JSON.stringify({
    content: 'New research finding on topological quantum error correction shows promising results.',
    metadata: { source: 'research-lab', topic: 'quantum-error-correction' },
    identity_anchor: 'id_abc123',
  }),
}).then(r => r.json());

console.log(doc.id);     // "mem_003"
console.log(doc.sigil);  // "id_abc123"
```

### Search Memory with Identity Scoping

**curl:**

```bash
curl -X POST http://localhost:8080/v1/memory/search \
  -H "Content-Type: application/json" \
  -H "Accept-Version: 1.0.0" \
  -d '{
    "query": "quantum computing papers",
    "identity_anchor": "id_abc123",
    "limit": 5
  }'
```

**JavaScript:**

```javascript
const results = await fetch('http://localhost:8080/v1/memory/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Version': '1.0.0',
  },
  body: JSON.stringify({
    query: 'quantum computing papers',
    identity_anchor: 'id_abc123',
    limit: 5,
  }),
}).then(r => r.json());

console.log(results.results[0].score);  // 0.92
console.log(results.results[0].doc.content);
```

> **Important:** Memory retrieval is strictly identity-scoped. Passing an `identity_anchor` ensures only shards tagged with that identity are returned. Omitting the anchor is allowed but returns unscoped results.

---

## Audit Trail

Every generated output is stored as an immutable `AuditRecord`. The audit trail is append-only: no PUT, PATCH, or DELETE endpoints exist.

### Query Audit Records

**curl:**

```bash
curl -X GET "http://localhost:8080/audit?identity_id=id_abc123&from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z&limit=20&offset=0&sort=desc" \
  -H "Accept-Version: 1.0.0"
```

**JavaScript:**

```javascript
const params = new URLSearchParams({
  identity_id: 'id_abc123',
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-12-31T23:59:59.000Z',
  limit: '20',
  offset: '0',
  sort: 'desc',
});

const audit = await fetch(`http://localhost:8080/audit?${params.toString()}`, {
  headers: { 'Accept-Version': '1.0.0' },
}).then(r => r.json());

console.log(audit.pagination.total);  // 42
console.log(audit.records[0].prompt); // "Explain quantum computing"
console.log(audit.records[0].hash);   // SHA-256 tamper-detection hash
```

### Verify Immutability

To confirm the audit trail is append-only:

1. **No mutation endpoints exist** for `/audit`. Only `GET` is supported.
2. Each record contains a `hash` field (SHA-256 of key fields). Re-computing the hash from the returned fields should match the stored hash.
3. The `timestamp` is set server-side at creation and cannot be altered.

```javascript
// Verify a record's hash (pseudo-code)
const record = audit.records[0];
const computed = sha256(record.identityId + record.prompt + record.output + record.timestamp);
assert.strictEqual(computed, record.hash);
```

---

## Error Handling

Aetherium uses the [RFC 7807](https://tools.ietf.org/html/rfc7807) Problem Details format for all error responses.

### Problem Details Structure

```json
{
  "type": "https://aetherium.io/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "messages array is required",
  "instance": "/v1/reason",
  "errors": [
    { "field": "messages", "message": "Array is required", "code": "MISSING_FIELD" }
  ],
  "apiVersion": "1.0.0"
}
```

### Common Error Codes

| Status | Type URI | Cause | Resolution |
|--------|----------|-------|------------|
| `400` | `about:blank` or `https://aetherium.io/errors/invalid-request` | Missing required field, invalid type, or validation failure | Check `errors` array for specific field-level messages |
| `404` | `https://aetherium.io/errors/identity-not-found` | Identity ID does not exist | Verify the identity was registered |
| `404` | `https://api.aetherium.io/errors/unsupported-version` | Requested API version is not supported | Use `Accept-Version: 1.0.0` or omit the header |
| `500` | `about:blank` | Internal server error (LLM timeout, DB failure) | Retry with exponential backoff; check `/health` |

### Version Negotiation Failure

If you request an unsupported API version, the server returns `404` with a Problem Details body:

```bash
curl -X GET http://localhost:8080/v1/reason \
  -H "Accept-Version: 99.0.0"
```

```json
{
  "type": "https://api.aetherium.io/errors/unsupported-version",
  "title": "Unsupported API Version",
  "status": 404,
  "detail": "API version '99.0.0' is not supported. Supported versions: 1.0.0",
  "instance": "/v1/reason",
  "apiVersion": "1.0.0"
}
```

---

## Versioning

### How Version Negotiation Works

Aetherium supports three ways to specify the API version, in order of precedence:

1. **`Accept-Version` header** (preferred)
2. **`X-API-Version` header** (fallback)
3. **`?apiVersion=` query parameter** (last resort)

If no version is specified, the request defaults to the current version (`1.0.0`).

### Current Version

- **Current:** `1.0.0`
- **Supported:** `1.0.0`

### Backward Compatibility Guarantee

Aetherium follows additive-only backward compatibility within major versions:

- New fields may be added to response objects
- New optional parameters may be added to requests
- Existing fields will not be removed or renamed
- Enum values may be extended but existing values remain valid

When a breaking change is necessary, it will be released under a new major version (e.g., `2.0.0`) and the old version will remain supported for a deprecation period.

### Response Version Headers

Every response includes:

- `API-Version: 1.0.0` — the version that served the request
- `Supported-Versions: 1.0.0` — all currently supported versions

---

## Rate Limits & Performance

### Expected Latency

| Operation | Target | Typical |
|-----------|--------|---------|
| Identity lookup + rule application | ≤200ms | ~108ms |
| Full reasoning pipeline (tool mode) | p99 <5s | ~2–4s |
| Memory vector search | <100ms | ~50ms |
| Audit record write | <50ms | ~20ms |

### Concurrent Request Guidance

- **Identity-bound generations** can run concurrently safely. The system isolates memory retrieval and identity context per request.
- **No cross-identity leakage** has been verified under concurrent load (see integration tests).
- For high-throughput scenarios, we recommend:
  - Reusing the same `identity_anchor` across related requests (benefits from identity caching)
  - Keeping `memoryK` ≤ 10 to reduce vector search overhead
  - Using `skipReflection: true` for latency-sensitive non-critical paths

### Resource Limits

| Resource | Limit |
|----------|-------|
| `maxTokens` | 4096 |
| `memoryK` | 100 |
| `limit` (audit) | 500 |
| Request body size | 1 MB |

---

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health check |
| `/v1/info` | GET | API metadata and capabilities |
| `/v1/reason` | POST | Natural-language reasoning |
| `/v1/memory/search` | POST | Vector memory search |
| `/v1/memory/upsert` | POST | Insert or update memory |
| `/identity/register` | POST | Create a new identity |
| `/identity` | GET | List all identities |
| `/identity/{id}` | GET/PUT/DELETE | Retrieve, update, or delete an identity |
| `/identity/{id}/versions` | GET | Immutable version history |
| `/audit` | GET | Query append-only audit trail |
| `/v1/multi-agent/reason` | POST | Multi-agent council reasoning |

---

*Last updated: 2026-06-06*
