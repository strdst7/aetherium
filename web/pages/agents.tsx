import { useState } from "react";
import Head from "next/head";

export default function AgentsDemo() {
  const [prompt, setPrompt] = useState("");
  const [identityAnchor, setIdentityAnchor] = useState("halo-arc-1");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/v1/multi-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_anchor: identityAnchor,
          prompt: prompt
        })
      });
      if (!res.ok) throw new Error("Multi-agent flow failed");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <Head>
        <title>Aetherium | Council Chambers</title>
      </Head>

      <div style={{ marginBottom: "40px" }}>
        <h1>The Internal Council</h1>
        <p style={{ color: "#4B5563", fontSize: "18px" }}>
          Witness how Aetherium’s specialized agents collaborate under Sigil Law to preserve identity fidelity.
        </p>
      </div>

      <form onSubmit={runFlow} style={{ marginBottom: "40px", backgroundColor: "#f3f4f6", padding: "24px", borderRadius: "8px" }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Identity Anchor</label>
          <input 
            type="text" 
            value={identityAnchor} 
            onChange={(e) => setIdentityAnchor(e.target.value)}
            style={{ padding: "10px", width: "300px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Reasoning Prompt</label>
          <textarea 
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Aetherium to reason about its identity or the halo rings..."
            style={{ padding: "12px", width: "100%", borderRadius: "4px", border: "1px solid #ccc", fontFamily: "inherit" }}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: "12px 24px", 
            backgroundColor: "#4F46E5", 
            color: "white", 
            border: "none", 
            borderRadius: "4px", 
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px"
          }}
        >
          {loading ? "Council is deliberating..." : "Consult the Council"}
        </button>
      </form>

      {results && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {/* Archivist Panel */}
          <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#EEF2FF", padding: "12px", borderBottom: "1px solid #E5E7EB" }}>
              <h3 style={{ margin: 0, color: "#4338CA" }}>📚 Archivist</h3>
            </div>
            <div style={{ padding: "16px", fontSize: "14px" }}>
              <p><strong>Status:</strong> {results.archivist.output}</p>
              <p><strong>Memories Retrieved:</strong> {results.archivist.meta?.results?.length || 0}</p>
              <div style={{ marginTop: "10px", maxHeight: "200px", overflowY: "auto", fontSize: "12px", color: "#666" }}>
                {results.archivist.meta?.results?.map((r: any, i: number) => (
                  <div key={i} style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                    {r.doc.content.substring(0, 80)}...
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sigil Keeper Panel */}
          <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ backgroundColor: results.sigilKeeper.output === "APPROVED" ? "#ECFDF5" : "#FEF2F2", padding: "12px", borderBottom: "1px solid #E5E7EB" }}>
              <h3 style={{ margin: 0, color: results.sigilKeeper.output === "APPROVED" ? "#047857" : "#B91C1C" }}>🛡️ Sigil Keeper</h3>
            </div>
            <div style={{ padding: "16px", fontSize: "14px" }}>
              <p><strong>Verdict:</strong> <span style={{ fontWeight: "bold", color: results.sigilKeeper.output === "APPROVED" ? "#059669" : "#DC2626" }}>{results.sigilKeeper.output}</span></p>
              {results.sigilKeeper.meta?.violations?.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <p style={{ color: "#B91C1C", fontWeight: "bold" }}>Violations Detected:</p>
                  <ul style={{ color: "#991B1B", paddingLeft: "20px" }}>
                    {results.sigilKeeper.meta.violations.map((v: any, i: number) => (
                      <li key={i}>{v.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Narrator Panel */}
          <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden", gridColumn: "span 3" }}>
            <div style={{ backgroundColor: "#F9FAFB", padding: "12px", borderBottom: "1px solid #E5E7EB" }}>
              <h3 style={{ margin: 0 }}>🗣️ Narrator</h3>
            </div>
            <div style={{ padding: "20px", lineHeight: "1.7" }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{results.narrator.output}</div>
              <div style={{ marginTop: "20px", fontSize: "12px", color: "#9CA3AF", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                Identity fidelity preserved using {results.narrator.meta?.usage?.totalTokens || 0} tokens.
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: "40px" }}>
        <a href="/" style={{ color: "#4F46E5", textDecoration: "none" }}>← Back to Web Shell</a>
      </div>
    </div>
  );
}
