import { NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { DashboardPage } from "./pages/Dashboard";
import { SessionsPage } from "./pages/Sessions";
import { CertificatesPage } from "./pages/Certificates";
import { UsersPage } from "./pages/Users";
import { LicensesPage } from "./pages/Licenses";
import { DevicesPage } from "./pages/Devices";
import { ReportsPage } from "./pages/Reports";
import { SettingsPage } from "./pages/Settings";
import { OperatorPage } from "./pages/Operator";

const links = [
  ["/", "Dashboard"],
  ["/operator", "Operator"],
  ["/sessions", "Sessions"],
  ["/certificates", "Certificates"],
  ["/devices", "Devices"],
  ["/users", "Users"],
  ["/licenses", "Licenses"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
] as const;

export function App() {
  const { role, setRole } = useAuth();

  return (
    <div className="shell">
      <aside className="nav">
        <p className="brand">
          CYVRA <span>XCQC</span>
        </p>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            {label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <label style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Demo role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            style={{ width: "100%", marginTop: 6 }}
          >
            <option value="PLATFORM_SUPER">PLATFORM_SUPER</option>
            <option value="TENANT_ADMIN">TENANT_ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
          </select>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/operator" element={<OperatorPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
