import { useEffect, useState } from "react";
import { apiGet, useAuth } from "../auth";

export function CertificatesPage() {
  const { token, apiBase } = useAuth();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ certificates: Array<Record<string, unknown>> }>("/certificates", token, apiBase)
      .then((d) => setRows(d.certificates))
      .catch((e) => setError(String(e)));
  }, [token, apiBase]);

  return (
    <>
      <h1>Certificates</h1>
      <p className="lede">Cloud certificate stubs issued on finalize. Signed PDF/JSON-LD later.</p>
      {error && <div className="panel">{error}</div>}
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Certificate</th>
              <th>Completeness</th>
              <th>Grade</th>
              <th>Issued</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={String(c.certificateId)}>
                <td className="mono">{String(c.certificateId)}</td>
                <td>{String(c.completeness)}</td>
                <td>{String((c.grade as { band?: string } | undefined)?.band ?? "—")}</td>
                <td className="mono">
                  {c.issuedAt ? new Date(String(c.issuedAt)).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {!rows.length && !error && (
              <tr>
                <td colSpan={4}>No certificates yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
