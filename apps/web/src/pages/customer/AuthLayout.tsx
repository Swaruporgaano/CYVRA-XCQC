import { Link } from "react-router-dom";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="login">
      <div className="login-card">
        <p className="brand" style={{ marginBottom: "0.5rem" }}>
          Device<span style={{ color: "var(--accent)" }}>Pulse</span>
        </p>
        <h1 style={{ fontSize: "1.35rem", marginBottom: subtitle ? "0.35rem" : "1rem" }}>{title}</h1>
        {subtitle && <p className="lede" style={{ marginBottom: "1rem" }}>{subtitle}</p>}
        {children}
        <p className="auth-foot" style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--muted)" }}>
          Operator console: <Link to="/app">Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
