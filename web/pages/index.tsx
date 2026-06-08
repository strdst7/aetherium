'use client';

import { useState, useEffect, useRef } from 'react';
import { ReasoningResponse } from '../src/types/api';
import { IdentitySelector } from '../components/IdentitySelector';
import { ReasoningTrace } from '../components/ReasoningTrace';
import { ValidationReport } from '../components/ValidationReport';
import { submitReasonRequest, getIdentities } from '../src/lib/api-client';
import { SigilIdentity } from '../src/types/api';

// TODO: When identity-context.tsx is available (Plan 09-07), import useIdentity
// and sync identityAnchor with global context for persistence across navigation.

export default function Home() {
  const [identities, setIdentities] = useState<SigilIdentity[]>([]);
  const [identityAnchor, setIdentityAnchor] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ReasoningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement | null>(null);

  // Load identities on mount
  useEffect(() => {
    async function load() {
      try {
        const ids = await getIdentities();
        setIdentities(ids);
        if (ids.length > 0 && !identityAnchor) {
          setIdentityAnchor(ids[0].id);
        }
      } catch (err) {
        console.error('Failed to load identities:', err);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (response && resultRef.current) {
      resultRef.current.focus();
    }
  }, [response]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityAnchor || !prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await submitReasonRequest(
        identityAnchor,
        [{ role: 'user', content: prompt }],
        {
          maxTokens: 512,
          temperature: 0.7,
          memoryK: 5,
        }
      );
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const demoPrompts = [
    { anchor: 'sigil:v1:halo-arc:001', text: 'Describe the Halo Arc and its relationship to the Flood threat.' },
    { anchor: 'sigil:v1:halo-arc:001', text: 'Who are the key allies in the fight against the Flood?' },
    { anchor: 'sigil:v1:halo-arc:001', text: 'What is Master Chief\'s role in containing the Flood?' },
  ];

  const loadDemo = (demo: typeof demoPrompts[0]) => {
    setIdentityAnchor(demo.anchor);
    setPrompt(demo.text);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>⚡ Aetherium Identity Test</h1>
        <p style={styles.subtitle}>Select an identity, submit a prompt, and inspect the reasoning trace and validation report.</p>
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => fetch(`${apiUrl}/api/forceFail?on=true`)} style={styles.demoButton}>Simulate Provider Failure</button>
          <button onClick={() => fetch(`${apiUrl}/api/forceFail?on=false`)} style={styles.demoButton}>Restore Provider</button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Input Section */}
        <section style={styles.section}>
          <h2>Query</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Identity</label>
              <IdentitySelector
                identities={identities}
                selectedId={identityAnchor}
                onChange={setIdentityAnchor}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={styles.textarea}
                placeholder="Enter your reasoning query..."
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim() || !identityAnchor}
              style={{
                ...styles.button,
                opacity: loading || !prompt.trim() || !identityAnchor ? 0.5 : 1,
                cursor: loading || !prompt.trim() || !identityAnchor ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '⏳ Processing...' : '🚀 Submit'}
            </button>
          </form>

          {/* Demo Prompts */}
          <div style={styles.demoSection}>
            <p style={styles.demoLabel}>Quick Demo Prompts:</p>
            {demoPrompts.map((demo, i) => (
              <button
                key={i}
                onClick={() => loadDemo(demo)}
                style={styles.demoButton}
              >
                {demo.text.substring(0, 50)}...
              </button>
            ))}
          </div>
        </section>

        {/* Error */}
        {error && (
          <section style={{ ...styles.section, ...styles.error }}>
            <h3>❌ Error</h3>
            <p>{error}</p>
          </section>
        )}

        {/* Response Section */}
        {response && (
          <section
            style={styles.section}
            aria-live="polite"
            ref={resultRef}
            tabIndex={-1}
          >
            <div
              style={{
                ...styles.statusBadge,
                backgroundColor: response.status === 'approved' ? '#d4edda' : response.status === 'refine' ? '#fff3cd' : '#f8d7da',
                color: response.status === 'approved' ? '#155724' : response.status === 'refine' ? '#856404' : '#721c24',
                border: `1px solid ${response.status === 'approved' ? '#c3e6cb' : response.status === 'refine' ? '#ffeeba' : '#f5c6cb'}`
              }}
            >
              Reflective Verdict: {response.status.toUpperCase()}
            </div>

            <div style={{ marginTop: 20 }}>
              <h2>Candidate Output</h2>
              <div style={{ ...styles.output, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>{response.output}</div>

              {/* Validation Report */}
              {response.validationReport && (
                <>
                  <h2>🔒 Sovereign Halo Validation</h2>
                  <ValidationReport report={response.validationReport} />
                </>
              )}

              <h2>Reflective Result</h2>
              <div
                style={{
                  ...styles.contextBox,
                  borderLeft: `6px solid ${response.status === 'approved' ? '#28a745' : response.status === 'refine' ? '#ffc107' : '#dc3545'}`,
                }}
              >
                {response.status === 'refine' && (
                  <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '10px' }}>
                    Identity Violation — action blocked
                  </p>
                )}
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                  {JSON.stringify(response.reasoning.reflective, null, 2)}
                </pre>
              </div>

              {response.metadata?.refinedCandidate && (
                <>
                  <h2 style={{ color: '#27ae60' }}>Refined Answer — Identity Aligned</h2>
                  <div style={{ ...styles.output, borderLeftColor: '#27ae60', backgroundColor: '#f0fff4', border: '2px solid #27ae60' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8em', backgroundColor: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                        Aligned with Sigil Law
                      </span>
                    </div>
                    {response.metadata.refinedCandidate.text}
                  </div>
                </>
              )}
            </div>

            {/* Reasoning Trace */}
            <h3>📊 Processing Trace</h3>
            <ReasoningTrace trace={response.reasoning.trace || []} />

            {/* Orchestrator Context */}
            <h3 style={{ marginTop: '24px' }}>🧠 Orchestrator Context</h3>
            <div style={styles.contextBox}>
              <p><strong>Provider:</strong> {response.reasoning.orchestrator.selectedProvider}</p>
              <p><strong>Relevant Memories:</strong> {response.reasoning.orchestrator.relevantMemoriesCount}</p>

              {response.reasoning.orchestrator.topMemories.length > 0 && (
                <div>
                  <strong>Top Memories:</strong>
                  {response.reasoning.orchestrator.topMemories.map((mem) => (
                    <div key={mem.id} style={styles.memory}>
                      <span style={styles.memoryId}>{mem.id}</span>
                      <span style={styles.memoryScore}>Score: {mem.score.toFixed(2)}</span>
                      <p>{mem.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reflective Check */}
            <h3>🔍 Reflective Validation</h3>
            <div style={styles.contextBox}>
              <p><strong>Status:</strong> {response.reasoning.reflective.status}</p>
              <p><strong>Confidence:</strong> {(response.reasoning.reflective.confidenceScore * 100).toFixed(0)}%</p>

              {response.reasoning.reflective?.violations?.length > 0 && (
                <div>
                  <strong>Violations ({response.reasoning.reflective.violations.length}):</strong>
                  {response.reasoning.reflective.violations.map((v, i) => (
                    <div key={i} style={styles.violation}>
                      <span style={{ color: v.severity === 'error' ? '#e74c3c' : '#f39c12' }}>
                        [{v.severity?.toUpperCase() || 'INFO'}]
                      </span>
                      {' '}{v.message}
                    </div>
                  ))}
                </div>
              )}

              {response.reasoning.reflective?.suggestedConstraints?.length > 0 && (
                <div>
                  <strong>Suggested Constraints:</strong>
                  {response.reasoning.reflective.suggestedConstraints.map((c, i) => (
                    <div key={i} style={styles.constraint}>
                      <code>{c.constraint}</code>: {c.rationale}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p style={styles.processingTime}>
              ⏱️ Processed in {response.metadata?.processingTimeMs}ms
            </p>
          </section>
        )}
      </main>

      {/* Architecture footnote */}
      <div style={styles.footnote}>
        <span style={{ color: '#D9C27A' }}>⊹</span>{' '}
        Architecture: MIII-AIM Sovereign Engine v1.0
        <span style={{ color: '#D9C27A', margin: '0 8px' }}>·</span>
        Identity-routed via Aetherium Crystal Core
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '2px solid #3498db',
  },
  title: {
    fontSize: '2.5em',
    color: '#2c3e50',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '1.1em',
    color: '#7f8c8d',
    margin: 0,
  },
  main: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.42s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  error: {
    borderLeft: '4px solid #e74c3c',
    backgroundColor: '#fadbd8',
  },
  form: {
    display: 'grid',
    gap: '16px',
  },
  formGroup: {
    display: 'grid',
    gap: '8px',
  },
  label: {
    fontWeight: 600,
    color: '#2c3e50',
  },
  input: {
    padding: '10px',
    border: '1px solid #bdc3c7',
    borderRadius: '4px',
    fontSize: '1em',
    fontFamily: 'inherit',
    transition: 'border-color 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  textarea: {
    padding: '10px',
    border: '1px solid #bdc3c7',
    borderRadius: '4px',
    fontSize: '1em',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  button: {
    padding: '12px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1.05em',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  demoSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #ecf0f1',
  },
  demoLabel: {
    marginBottom: '10px',
    color: '#7f8c8d',
    fontWeight: 600,
  },
  demoButton: {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginBottom: '8px',
    backgroundColor: '#ecf0f1',
    border: '1px solid #bdc3c7',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '8px 12px',
    borderRadius: '4px',
    fontWeight: 600,
    marginBottom: '15px',
  },
  output: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderLeft: '4px solid #3498db',
    borderRadius: '4px',
    lineHeight: '1.6',
    marginBottom: '20px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  contextBox: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  memory: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: 'white',
    borderLeft: '3px solid #27ae60',
    borderRadius: '2px',
  },
  memoryId: {
    fontWeight: 600,
    color: '#27ae60',
  },
  memoryScore: {
    marginLeft: '10px',
    color: '#7f8c8d',
    fontSize: '0.9em',
  },
  violation: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#fff5f5',
    borderRadius: '3px',
    fontSize: '0.95em',
  },
  constraint: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f0f7ff',
    borderRadius: '3px',
    fontSize: '0.95em',
  },
  processingTime: {
    marginTop: '15px',
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: '0.95em',
  },
  footnote: {
    marginTop: '40px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '0.8em',
    letterSpacing: '0.02em',
  },
};
