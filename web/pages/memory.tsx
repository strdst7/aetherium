import { useEffect, useState } from "react";
import { UMAP } from "umap-js";
import Head from "next/head";
import { Layout } from "../components/Layout";
import { IdentitySelector } from "../components/IdentitySelector";
import { getMemoryShards, getIdentities } from "../src/lib/api-client";
import { SigilIdentity } from "../src/types/api";

interface MemoryPoint {
  x: number;
  y: number;
  doc: any;
}

export default function MemoryViz() {
  const [points, setPoints] = useState<MemoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identities, setIdentities] = useState<SigilIdentity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<string>("");

  // Trace state
  const [query, setQuery] = useState("");
  const [trace, setTrace] = useState<any>(null);
  const [tracing, setTracing] = useState(false);

  // Load identities for dropdown
  useEffect(() => {
    async function loadIdentities() {
      try {
        const ids = await getIdentities();
        setIdentities(ids);
      } catch (err) {
        console.error("Failed to load identities:", err);
      }
    }
    loadIdentities();
  }, []);

  const handleTrace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setTracing(true);
    try {
      const url = selectedIdentity
        ? `http://localhost:8080/v1/memory/trace?query=${encodeURIComponent(query)}&identityId=${encodeURIComponent(selectedIdentity)}`
        : `http://localhost:8080/v1/memory/trace?query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Trace failed");
      const data = await res.json();
      setTrace(data);
    } catch (err) {
      alert("Trace error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTracing(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const docs = await getMemoryShards(selectedIdentity || undefined);

        // Filter docs that have embeddings
        const docsWithEmbeddings = docs.filter((d: any) => d.embedding && Array.isArray(d.embedding));

        if (docsWithEmbeddings.length === 0) {
          setError("No memories with embeddings found.");
          setLoading(false);
          return;
        }

        const embeddings = docsWithEmbeddings.map((d: any) => d.embedding);

        // UMAP needs at least a few points to work well
        if (embeddings.length < 2) {
          setPoints(docsWithEmbeddings.map((d: any) => ({ x: 400, y: 300, doc: d })));
          setLoading(false);
          return;
        }

        const umap = new UMAP({
          nComponents: 2,
          nNeighbors: Math.min(15, embeddings.length - 1),
          minDist: 0.1
        });

        const coords = umap.fit(embeddings);

        // Normalize coordinates for better display
        const xCoords = coords.map(c => c[0]);
        const yCoords = coords.map(c => c[1]);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        const normalized = coords.map((c, i) => {
          const x = maxX === minX ? 0.5 : (c[0] - minX) / (maxX - minX);
          const y = maxY === minY ? 0.5 : (c[1] - minY) / (maxY - minY);
          return {
            x: (x * 700) + 50,
            y: (y * 500) + 50,
            doc: docsWithEmbeddings[i]
          };
        });

        setPoints(normalized);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedIdentity]);

  return (
    <Layout>
      <div style={{ padding: 20 }}>
        <Head>
          <title>Aetherium | Memory Visualization</title>
        </Head>

        <h1>Memory Visualization & Trace</h1>
        <p>A visual map of Aetherium's identity fidelity and retrieval transparency.</p>

        <div style={{ marginBottom: 20, maxWidth: 400 }}>
          <IdentitySelector
            identities={identities}
            selectedId={selectedIdentity}
            onChange={setSelectedIdentity}
            label="Filter by Identity"
          />
          {selectedIdentity && (
            <p style={{ fontSize: '0.85em', color: '#7f8c8d', marginTop: 8 }}>
              Showing only memory shards scoped to selected identity
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {/* Visualization Section */}
          <section>
            <h2>Identity Map</h2>
            {loading ? (
              <div style={{ padding: 40 }}>Loading identity map...</div>
            ) : error ? (
              <div style={{ padding: 40, color: "red" }}>Error: {error}</div>
            ) : (
              <div style={{ display: "flex", gap: "20px" }}>
                <svg
                  width="800"
                  height="600"
                  style={{
                    border: "1px solid #ccc",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "8px"
                  }}
                >
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={8}
                      fill={trace?.results?.some((r: any) => r.doc.id === p.doc.id) ? "#EF4444" : "#4F46E5"}
                      style={{ cursor: "pointer", transition: "r 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.setAttribute("r", "12"))}
                      onMouseLeave={(e) => (e.currentTarget.setAttribute("r", "8"))}
                      onClick={() => alert(JSON.stringify(p.doc, null, 2))}
                    />
                  ))}
                  {points.length === 0 && (
                    <text x="400" y="300" textAnchor="middle" fill="#999">No memory data to visualize</text>
                  )}
                </svg>

                <div style={{ width: "300px", fontSize: "14px", color: "#666" }}>
                  <h3>Legend</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#4F46E5" }}></div>
                    <span>Identity Memory</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#EF4444" }}></div>
                    <span>Retrieved in Trace</span>
                  </div>
                  <p>
                    The spatial proximity between nodes represents semantic similarity. Nodes in red were retrieved in the last trace query.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Trace Section */}
          <section style={{ borderTop: "1px solid #eee", paddingTop: "20px" }}>
            <h2>Retrieval Trace</h2>
            <form onSubmit={handleTrace} style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter query to trace..."
                style={{
                  padding: "10px",
                  width: "400px",
                  borderRadius: "4px",
                  border: "1px solid #ccc"
                }}
              />
              <button
                type="submit"
                disabled={tracing}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {tracing ? "Tracing..." : "Trace Retrieval"}
              </button>
            </form>

            {trace && (
              <div>
                <h3>Results for: "{query}"</h3>
                <div style={{ marginBottom: "10px", fontSize: "12px", color: "#888" }}>
                  Embedding generated: [{trace.embedding.slice(0, 5).map((v: number) => v.toFixed(3)).join(", ")} ...]
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th style={{ padding: "12px", border: "1px solid #ddd" }}>Memory ID</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd" }}>Similarity</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd" }}>Identity Score</th>
                      <th style={{ padding: "12px", border: "1px solid #ddd" }}>Content Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trace.results.map((r: any) => (
                      <tr key={r.doc.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px", border: "1px solid #ddd", fontFamily: "monospace" }}>{r.doc.id}</td>
                        <td style={{ padding: "12px", border: "1px solid #ddd" }}>{r.score.toFixed(4)}</td>
                        <td style={{ padding: "12px", border: "1px solid #ddd" }}>{r.doc.metadata?.identity_score || "N/A"}</td>
                        <td style={{ padding: "12px", border: "1px solid #ddd", fontSize: "12px" }}>
                          {r.doc.content.substring(0, 100)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
