import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCustomerAuth, customerApiGet, customerApiPost } from "../../customer-auth";
import { AuthLayout } from "./AuthLayout";

interface LicenseStatus {
  id: string;
  keyLast4: string;
  status: string;
  createdAt: string;
  activatedAt?: string | null;
  activation?: {
    id: string;
    status: string;
    deviceId: string;
    activatedAt: string;
    lastSeenAt?: string | null;
  } | null;
}

interface LicenseStatusResponse {
  licenses: LicenseStatus[];
  policy: string;
  downloadTokenTtlMinutes: number;
}

export function CustomerAccountPage() {
  const { customer, token, loading, logout, refreshMe, apiBase } = useCustomerAuth();
  const [licenses, setLicenses] = useState<LicenseStatus[]>([]);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ token: string; expiresAt: string } | null>(null);

  const loadLicenses = useCallback(async () => {
    if (!token) return;
    try {
      const data = await customerApiGet<LicenseStatusResponse>(
        "/api/v1/license/status",
        apiBase,
        token,
      );
      setLicenses(data.licenses);
      setLicenseError(null);
    } catch (e) {
      setLicenseError(String(e));
    }
  }, [token, apiBase]);

  useEffect(() => {
    if (token) refreshMe().catch(() => undefined);
  }, [token, refreshMe]);

  useEffect(() => {
    loadLicenses().catch(() => undefined);
  }, [loadLicenses]);

  const issueLicense = async () => {
    if (!token) return;
    setBusy(true);
    setLicenseError(null);
    try {
      const data = await customerApiPost<{
        license: LicenseStatus;
        licenseKey?: string;
        message: string;
      }>("/api/v1/license/issue", apiBase, {}, token);
      if (data.licenseKey) setIssuedKey(data.licenseKey);
      await loadLicenses();
    } catch (e) {
      setLicenseError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const requestDownload = async (licenseId: string) => {
    if (!token) return;
    setBusy(true);
    setLicenseError(null);
    try {
      const data = await customerApiPost<{
        downloadToken: string;
        expiresAt: string;
        downloadUrl: string;
      }>("/api/v1/license/download-authorize", apiBase, { licenseId }, token);
      setDownloadInfo({ token: data.downloadToken, expiresAt: data.expiresAt });
    } catch (e) {
      setLicenseError(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Loading…">
        <p className="lede">Checking your session…</p>
      </AuthLayout>
    );
  }

  if (!token || !customer) {
    return <Navigate to="/account/login" replace />;
  }

  return (
    <AuthLayout title="Your account" subtitle="Signed in with mobile OTP.">
      <div className="panel" style={{ marginTop: 0 }}>
        <table>
          <tbody>
            <tr>
              <th>Status</th>
              <td>
                <span className={`badge ${customer.status === "active" ? "ok" : "warn"}`}>
                  {customer.status}
                </span>
              </td>
            </tr>
            <tr>
              <th>Mobile</th>
              <td className="mono">{customer.mobile}</td>
            </tr>
            {customer.email && (
              <tr>
                <th>Email</th>
                <td>{customer.email}</td>
              </tr>
            )}
            {customer.name && (
              <tr>
                <th>Name</th>
                <td>{customer.name}</td>
              </tr>
            )}
            <tr>
              <th>Customer ID</th>
              <td className="mono" style={{ fontSize: "0.75rem" }}>
                {customer.id}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Licenses</h2>
        <p className="lede" style={{ marginBottom: "0.75rem" }}>
          16-digit keys, one-time download tokens, and device activation (SAME_DEVICE policy).
          Production portal will live on a <strong>cyvoriq.com</strong> subdomain (DNS not configured yet).
        </p>

        {licenseError && <div className="panel warn" style={{ marginBottom: "0.75rem" }}>{licenseError}</div>}

        {issuedKey && (
          <div className="panel ok" style={{ marginBottom: "0.75rem" }}>
            <strong>Save this key now — shown once:</strong>
            <p className="mono" style={{ fontSize: "1.1rem", letterSpacing: "0.1em" }}>{issuedKey}</p>
          </div>
        )}

        {downloadInfo && (
          <div className="panel" style={{ marginBottom: "0.75rem" }}>
            <strong>Download authorized</strong> (expires {new Date(downloadInfo.expiresAt).toLocaleString()})
            <p className="mono" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
              Token: {downloadInfo.token.slice(0, 24)}…
            </p>
            <a
              className="btn"
              href={`${apiBase}/api/v1/license/download`}
              onClick={(e) => {
                e.preventDefault();
                fetch(`${apiBase}/api/v1/license/download`, {
                  headers: { Authorization: `Bearer ${downloadInfo.token}` },
                })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "CYVRA-XCQC-setup-stub.exe";
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch((err) => setLicenseError(String(err)));
              }}
            >
              Download agent (stub)
            </a>
          </div>
        )}

        <div className="row" style={{ marginBottom: "1rem" }}>
          <button className="btn" type="button" disabled={busy} onClick={issueLicense}>
            Issue license key
          </button>
        </div>

        {licenses.length === 0 ? (
          <p className="lede">No license keys yet. Click &quot;Issue license key&quot; to generate one.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Status</th>
                <th>Activation</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => (
                <tr key={lic.id}>
                  <td className="mono">••••{lic.keyLast4}</td>
                  <td>
                    <span className={`badge ${lic.status === "activated" ? "ok" : lic.status === "revoked" ? "warn" : ""}`}>
                      {lic.status}
                    </span>
                  </td>
                  <td>
                    {lic.activation ? (
                      <span className="mono" style={{ fontSize: "0.75rem" }}>
                        {lic.activation.status} · {lic.activation.deviceId.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="lede">Not activated</span>
                    )}
                  </td>
                  <td>
                    {lic.status !== "revoked" && (
                      <button
                        className="btn secondary"
                        type="button"
                        disabled={busy}
                        onClick={() => requestDownload(lic.id)}
                      >
                        Authorize download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row" style={{ marginTop: "1rem" }}>
        <button className="btn secondary" type="button" onClick={logout}>
          Sign out
        </button>
        <Link className="btn" to="/">
          Operator console
        </Link>
      </div>
    </AuthLayout>
  );
}
