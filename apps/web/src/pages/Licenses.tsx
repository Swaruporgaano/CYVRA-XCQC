import { useEffect, useState } from "react";
import { apiGet, useAuth } from "../auth";

export function LicensesPage() {
  const { token, apiBase } = useAuth();
  const [license, setLicense] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ license: Record<string, unknown> }>("/licenses/tenant-lab", token, apiBase)
      .then((d) => setLicense(d.license))
      .catch((e) => setError(String(e)));
  }, [token, apiBase]);

  return (
    <>
      <h1>Licenses</h1>
      <p className="lede">Credits are server-metered. Never trust client-submitted balances.</p>
      {error && <div className="panel">{error}</div>}
      {license && (
        <div className="grid">
          <div className="stat">
            <strong>{String(license.creditsRemaining)}</strong>
            <span>Credits remaining</span>
          </div>
          <div className="stat">
            <strong>{String(license.creditsTotal)}</strong>
            <span>Credits total</span>
          </div>
          <div className="stat">
            <strong>{String(license.plan)}</strong>
            <span>Plan</span>
          </div>
        </div>
      )}
    </>
  );
}
