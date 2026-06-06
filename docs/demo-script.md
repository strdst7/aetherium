# Aetherium Demo Script

**Goal:** Show identity as law, the Dual‑Mind flow, multi‑agent council, memory transparency, and governance enforcement in a 3–5 minute live demo.

## 1. Opening (30 seconds)
*   **Narrative:** "Aetherium treats identity as infrastructure — the Sigil is law."
*   **Visual:** Show the Sigil on screen and the **Governance** page with the compliance rules.
*   **One‑liner:** "We enforce identity across UI, memory, and reasoning."

## 2. Single‑agent flow (60 seconds)
*   **Action:** Switch to **Web Shell**. 
*   **Prompt:** `Rotate the sigil and describe the Halo Arc.`
*   **Visual Cue:** 
    *   Show the initial candidate output.
    *   Show **Reflective Result** JSON with `RULE_GEO_INTEGRITY` violation highlighted in red.
    *   Show **Refined Output** in green border.
*   **Narration:** "The Reflective Layer caught the violation and automatically re‑generated the response under identity constraints."

## 3. Multi‑agent council (75 seconds)
*   **Action:** Switch to **Agents** page. 
*   **Prompt 1:** `Propose a new way to visualize the Halo Arc.`
*   **Visual Cue:**
    *   Show **Archivist** output: list of retrieved memories and short summary.
    *   Show **Sigil Keeper** verdict: `APPROVED` with no violations.
    *   Show **Narrator** final answer.
*   **Action:** Enter: `halo arc is square.`
*   **Visual Cue:**
    *   Show **Archivist** retrieval of identity anchors.
    *   Show **Sigil Keeper** verdict: `REVISE` with `RULE_IDENTITY_CONTRADICTION`.
    *   Show **Narrator** final answer after injected constraints.
*   **Narration:** "The Internal Council enforces identity fidelity and corrects user intent when it contradicts established law."

## 4. Memory and trace visualization (45 seconds)
*   **Action:** Open **Memory** page, run query: `Halo Arc`.
*   **Visual Cue:**
    *   Show **Identity Map** (UMAP) with retrieved nodes highlighted in red.
    *   Show **Trace Table** with `similarity`, `identity_score`, and `weightedScore`.
*   **Narration:** "This is how Aetherium reasons — every retrieval is transparent, spatial, and auditable."

## 5. Governance and CI (45 seconds)
*   **Action:** Show a failing PR or run `sigil-validate` on a bad SVG.
*   **Visual Cue:** 
    *   Show **JSON violation report** for a bad artifact.
    *   Show **Storybook compliance badge** reflecting the failure.
*   **Narration:** "Identity is code. Our CI pipeline blocks merges that violate Sigil Law, ensuring the system never drifts."

## 6. Closing (20 seconds)
*   **Narrative:** "Aetherium is an identity‑governed AI council: memory, law, and synthesis."
*   **Callout:** Point to repo tag `v0.1-prototype` and the demo video.
