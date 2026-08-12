import { useEffect, useState } from "react";
import { formatFetchError } from "../api-errors";
import { useAuth } from "../auth";

interface SessionRow {
  sessionId: string;
  status: string;
  createdAt: string;
  profile: string;
  platform: string;
  completeness: string | null;
  certificateId: string | null;
}

export function SessionsPage() {
  const { apiBase } = useAuth();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ingest = import.meta.env.VITE_INGEST_TOKEN ?? "dev-ingest-token";
    fetch(`${apiBase}/sessions`, { headers: { Authorization: `Bearer ${ingest}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => setRows(d.sessions ?? []))
      .catch((e) => setError(formatFetchError(e, apiBase)));
  }, [apiBase]);

  return (
    <>
      <h1>Sessions</h1>
      <p className="lede">Live and historical diagnostic runs (API is source of truth).</p>
      {error && <div className="panel">{error}</div>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Status</th>
              <th>Profile</th>
              <th>Completeness</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.sessionId}>
                <td className="mono">{s.sessionId.slice(0, 8)}…</td>
                <td>
                  <span className={`badge ${s.status === "completed" ? "ok" : "warn"}`}>
                    {s.status}
                  </span>
                </td>
                <td>{s.profile}</td>
                <td>{s.completeness ?? "—"}</td>
                <td className="mono">{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && !error && (
              <tr>
                <td colSpan={5}>No sessions yet — run Wave A agent or Operator start.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
