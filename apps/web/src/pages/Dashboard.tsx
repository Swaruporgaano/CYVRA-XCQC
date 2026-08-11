import { useEffect, useState } from "react";
import { apiGet, useAuth } from "../auth";

export function DashboardPage() {
  const { token, apiBase } = useAuth();
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [sessions, setSessions] = useState(0);
  const [certs, setCerts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await fetch(`${apiBase}/health`).then((r) => r.json());
        const ingest = import.meta.env.VITE_INGEST_TOKEN ?? "dev-ingest-token";
        const s = await fetch(`${apiBase}/sessions`, {
          headers: { Authorization: `Bearer ${ingest}` },
        })
          .then(async (r) => (r.ok ? r.json() : { count: 0 }))
          .catch(() => ({ count: 0 }));
        const c = await apiGet<{ count: number }>("/certificates", token, apiBase);
        if (!cancelled) {
          setHealth(h);
          setSessions(s.count ?? 0);
          setCerts(c.count ?? 0);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, apiBase]);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="lede">
        Control plane window onto API truth. Agents collect; scoring and certificates stay
        server-side.
      </p>
      {error && (
        <div className="panel">
          <strong>API unreachable</strong>
          <p className="lede">{error}</p>
          <p className="lede">Start API with <code>npm run dev:api</code> then refresh.</p>
        </div>
      )}
      <div className="grid">
        <div className="stat">
          <strong>{health?.ok ? "UP" : "—"}</strong>
          <span>API health</span>
        </div>
        <div className="stat">
          <strong>{String(health?.store ?? "—")}</strong>
          <span>Store mode</span>
        </div>
        <div className="stat">
          <strong>{sessions}</strong>
          <span>Sessions (ingest list)</span>
        </div>
        <div className="stat">
          <strong>{certs}</strong>
          <span>Certificates</span>
        </div>
      </div>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>MVP defaults</h3>
        <ul>
          <li>Profile v1: laptop trade-in / warranty</li>
          <li>Windows Wave A inventory live; Wave B+ next</li>
          <li>Neon optional until durable store required</li>
        </ul>
      </div>
    </>
  );
}
