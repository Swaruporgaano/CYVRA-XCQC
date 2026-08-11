import { useState } from "react";
import { apiPost, useAuth } from "../auth";

export function OperatorPage() {
  const { token, apiBase } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function startSession() {
    setBusy(true);
    setLog((l) => [...l, "Creating session…"]);
    try {
      // Operator UI creates a portal session; agent uses ingest token separately.
      const ingest = import.meta.env.VITE_INGEST_TOKEN ?? "dev-ingest-token";
      const res = await fetch(`${apiBase}/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ingest}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId: "tenant-lab",
          operatorId: "web-operator",
          profile: "laptop",
          platform: "windows",
          agentVersion: "portal-0.1",
          deviceHint: "operator-start",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setSessionId(data.sessionId);
      setLog((l) => [
        ...l,
        `Session ${data.sessionId}`,
        "Run Windows agent with this session via Electron or CLI upload path.",
      ]);
    } catch (e) {
      setLog((l) => [...l, e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }

  async function consumeLicense() {
    try {
      const r = await apiPost<{ license: { creditsRemaining: number } }>(
        "/licenses/tenant-lab/consume",
        token,
        apiBase,
        { amount: 1 },
      );
      setLog((l) => [...l, `License credits remaining: ${r.license.creditsRemaining}`]);
    } catch (e) {
      setLog((l) => [...l, e instanceof Error ? e.message : String(e)]);
    }
  }

  return (
    <>
      <h1>Operator</h1>
      <p className="lede">
        Start a test session for laptop trade-in / warranty. The native Windows agent (or Electron
        shell) collects WMI evidence and finalizes to the API.
      </p>
      <div className="row">
        <button className="btn" disabled={busy} onClick={startSession}>
          Start session
        </button>
        <button className="btn secondary" onClick={consumeLicense}>
          Consume 1 credit
        </button>
      </div>
      {sessionId && (
        <div className="panel">
          <div>
            Active session: <code>{sessionId}</code>
          </div>
        </div>
      )}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Activity</h3>
        <pre className="mono" style={{ whiteSpace: "pre-wrap" }}>
          {log.join("\n") || "No actions yet."}
        </pre>
      </div>
    </>
  );
}
