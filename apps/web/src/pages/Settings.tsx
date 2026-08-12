export function SettingsPage() {
  return (
    <>
      <h1>Settings</h1>
      <p className="lede">Tenant preferences, consent copy, and API endpoints.</p>

      <div className="panel hosting-note">
        <strong>Production hosting (planned):</strong> Customer-facing CYVRA XCQC will be served from a{" "}
        <strong>subdomain of cyvoriq.com</strong> (e.g. <code>xcqc.cyvoriq.com</code>). DNS is not
        configured yet — this Worker remains on <code>*.workers.dev</code> until cutover.{" "}
        <code>cyvoriq.in</code> integration is deferred.
      </div>

      <div className="panel">
        <table>
          <tbody>
            <tr>
              <th>Product</th>
              <td>CYVRA XCQC</td>
            </tr>
            <tr>
              <th>Default profile</th>
              <td>laptop trade-in / warranty</td>
            </tr>
            <tr>
              <th>API</th>
              <td>
                <code>{import.meta.env.VITE_API_URL ?? "/api (dev proxy)"}</code>
              </td>
            </tr>
            <tr>
              <th>Customer auth (L2)</th>
              <td>
                <a href="/account/register">Register</a> · <a href="/account/login">Login</a> · OTP via
                Render API (<code>/api/v1/auth/*</code>)
              </td>
            </tr>
            <tr>
              <th>Neon</th>
              <td>
                Sessions + commercial tables (<code>customers</code>, <code>otp_transactions</code>) when{" "}
                <code>DATABASE_URL</code> is set on Render
              </td>
            </tr>
            <tr>
              <th>Cloudflare Workers</th>
              <td>Host via Wrangler (<code>docs/CLOUDFLARE-WORKERS.md</code>)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
