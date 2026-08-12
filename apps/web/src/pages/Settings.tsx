export function SettingsPage() {
  return (
    <>
      <h1>Settings</h1>
      <p className="lede">Tenant preferences, consent copy, and API endpoints.</p>
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
              <th>Neon</th>
              <td>Optional until durable store / Wave C baselines</td>
            </tr>
            <tr>
              <th>Cloudflare Workers</th>
              <td>Host via Wrangler (`docs/CLOUDFLARE-WORKERS.md`)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
