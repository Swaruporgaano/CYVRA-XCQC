import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCustomerAuth } from "../../customer-auth";
import { AuthLayout } from "./AuthLayout";

export function CustomerAccountPage() {
  const { customer, token, loading, logout, refreshMe } = useCustomerAuth();

  useEffect(() => {
    if (token) refreshMe().catch(() => undefined);
  }, [token, refreshMe]);

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
          16-digit license keys and device activation arrive in <strong>L3</strong>. You are authenticated
          and ready for the next phase.
        </p>
        <span className="badge warn">Coming in L3</span>
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
