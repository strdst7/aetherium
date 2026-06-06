import Head from "next/head";

export default function Governance() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: "800px", lineHeight: "1.6" }}>
      <Head>
        <title>Aetherium | Governance</title>
      </Head>
      
      <h1>Sigil Keeper Governance</h1>
      <p style={{ fontSize: "18px", color: "#4B5563" }}>
        Every identity artifact must pass compliance checks before merging. 
        This ensures Aetherium's identity fidelity is preserved across all interfaces.
      </p>

      <div style={{ backgroundColor: "#F9FAFB", padding: "24px", borderRadius: "8px", border: "1px solid #E5E7EB", marginTop: "24px" }}>
        <h2 style={{ marginTop: 0 }}>Core Enforcement Rules</h2>
        <ul style={{ paddingLeft: "20px" }}>
          <li style={{ marginBottom: "12px" }}>
            <strong>RULE_COLOR_PALETTE</strong>: Artifacts must only use approved colors from the Aetherium design system. Raw RGB values (e.g., pure red/green/blue) are strictly forbidden.
          </li>
          <li style={{ marginBottom: "12px" }}>
            <strong>RULE_GEO_INTEGRITY</strong>: Canonical Sigil geometry must be preserved. Rotation, skewing, or scaling of core sigil components is prohibited.
          </li>
          <li style={{ marginBottom: "12px" }}>
            <strong>RULE_MOTION_TIMING</strong>: All animations must adhere to standard duration and easing tokens defined in the motion system.
          </li>
        </ul>
      </div>

      <p style={{ marginTop: "32px", color: "#6B7280" }}>
        Rules are enforced automatically via the <strong>Identity Compliance</strong> CI pipeline. 
        Check the latest GitHub Action runs for detailed compliance reports.
      </p>

      <div style={{ marginTop: "40px" }}>
        <a 
          href="/memory" 
          style={{ 
            color: "#4F46E5", 
            textDecoration: "none", 
            fontWeight: "bold" 
          }}
        >
          ← Back to Identity Map
        </a>
      </div>
    </div>
  );
}
