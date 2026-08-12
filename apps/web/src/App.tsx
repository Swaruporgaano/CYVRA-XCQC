import { NavLink, Navigate, Route, Routes } from "react-router-dom";
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
import { CustomerLoginPage } from "./pages/customer/Login";
import { CustomerRegisterPage } from "./pages/customer/Register";
import { CustomerVerifyPage } from "./pages/customer/VerifyOtp";
import { CustomerAccountPage } from "./pages/customer/Account";
import { LandingPage } from "./pages/landing/LandingPage";
import { LegacyOperatorRedirect } from "./LegacyRedirect";

const appLinks = [
  ["/app", "Dashboard"],
  ["/app/operator", "Operator"],
  ["/app/sessions", "Sessions"],
  ["/app/certificates", "Certificates"],
  ["/app/devices", "Devices"],
  ["/app/users", "Users"],
  ["/app/licenses", "Licenses"],
  ["/app/reports", "Reports"],
  ["/app/settings", "Settings"],
  ["/account", "Customer account"],
] as const;

function OperatorShell() {
  const { role, setRole } = useAuth();

  return (
    <div className="shell">
      <aside className="nav">
        <p className="brand">
          DevicePulse <span>Console</span>
        </p>
        {appLinks.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/app"}>
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
          <Route index element={<DashboardPage />} />
          <Route path="operator" element={<OperatorPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="licenses" element={<LicensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/account/login" element={<CustomerLoginPage />} />
      <Route path="/account/register" element={<CustomerRegisterPage />} />
      <Route path="/account/verify" element={<CustomerVerifyPage />} />
      <Route path="/account" element={<CustomerAccountPage />} />
      <Route path="/app/*" element={<OperatorShell />} />
      {/* Legacy operator paths → /app/... */}
      <Route path="/dashboard" element={<LegacyOperatorRedirect />} />
      <Route path="/operator/*" element={<LegacyOperatorRedirect />} />
      <Route path="/sessions/*" element={<LegacyOperatorRedirect />} />
      <Route path="/certificates/*" element={<LegacyOperatorRedirect />} />
      <Route path="/devices/*" element={<LegacyOperatorRedirect />} />
      <Route path="/users/*" element={<LegacyOperatorRedirect />} />
      <Route path="/licenses/*" element={<LegacyOperatorRedirect />} />
      <Route path="/reports/*" element={<LegacyOperatorRedirect />} />
      <Route path="/settings/*" element={<LegacyOperatorRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
