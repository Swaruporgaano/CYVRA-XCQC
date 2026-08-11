# Run CYVRA XCQC in GitHub Codespaces

Codespaces is ideal for **API + web** development. The **Windows native agent must run on a physical Windows PC** (WMI, SMART, battery, BitLocker are not available on Linux).

## Open the Codespace

1. Open [https://github.com/Swaruporgaano/CYVRA-XCQC](https://github.com/Swaruporgaano/CYVRA-XCQC)
2. **Code → Codespaces → Create codespace on main**
3. Wait for `postCreateCommand` (`npm install` + shared build)

## Start API + web

**Terminal 1 — API:**

```bash
cp .env.example .env
npm run dev:api
```

Default: `http://0.0.0.0:8080`. Codespaces forwards port **8080** — use the **Ports** tab for the public URL.

**Terminal 2 — Web:**

```bash
npm run dev:web
```

Vite serves on **5173** (also forwarded). The dev server proxies `/api` → `http://127.0.0.1:8080`.

Verify:

```bash
curl -s http://127.0.0.1:8080/health | jq
```

## Optional: Neon in Codespace

Not required. To use durable storage, set a Codespace secret `DATABASE_URL` and follow [NEON-SETUP.md](./NEON-SETUP.md).

## Point Windows agent at Codespace API

On your **Windows laptop** (Admin PowerShell recommended for Wave B Full):

1. Build the agent:

   ```powershell
   cd apps\agent-windows
   dotnet build Xcqc.Agent.sln -c Release
   ```

2. From the Codespace **Ports** tab, copy the forwarded URL for port **8080** (e.g. `https://xxxx-8080.app.github.dev`).

3. Run the agent against that URL:

   ```powershell
   $env:XCQC_INGEST_TOKEN = "dev-ingest-token"   # match .env in Codespace
   dotnet run --project Xcqc.Agent -c Release -- `
     --api https://xxxx-8080.app.github.dev `
     --token $env:XCQC_INGEST_TOKEN
   ```

   Or use Render production API instead of Codespace forwarding.

4. Confirm session in Codespace:

   ```bash
   curl -s http://127.0.0.1:8080/sessions | jq
   ```

## Electron operator UI

Electron runs on **Windows only** (not in Codespace):

```powershell
cd apps\agent-windows\electron
npm install
$env:XCQC_API_BASE_URL = "https://xxxx-8080.app.github.dev"
npm start
```

## What does NOT run in Codespace

| Component | Where to run |
|-----------|----------------|
| `Xcqc.Agent.exe` (.NET WMI collectors) | Windows 10/11 PC |
| Electron shell | Windows PC |
| `apps/api` + `apps/web` | Codespace or local Node |

## npm scripts (repo root)

| Script | Description |
|--------|-------------|
| `npm install` / `npm run install:all` | Install workspaces + build shared |
| `npm run dev:api` | Express API with hot reload |
| `npm run dev:web` | Vite React admin/operator shell |
| `npm run build:shared` | Compile `@cyvra/xcqc-shared` |
| `npm run build` | Shared + API + web production build |
| `npm run typecheck` | Typecheck all TS packages |

## Render alternative

For a stable agent target without Codespace port forwarding, deploy API to Render ([RENDER-DEPLOY.md](./RENDER-DEPLOY.md)) and set `XCQC_API_BASE_URL` to the Render URL.
