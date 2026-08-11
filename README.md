# CYVRA XCQC

On-device diagnostic agents + cloud control plane for Post-Production / OQC–IQC / Business / Compliance reports.

**Hierarchy:** Agents are dumb collectors. **API owns truth.** Web is windows onto truth.

## Freeze summary

1. Product/repo: **CYVRA XCQC** (`CYVRA-XCQC`) — DOCX “Certis” was an alternate name; XCQC wins.
2. **Windows Wave A = native .NET 8** (WMI inventory + upload + preflight).
3. **Next after Wave A = Electron UI shell** that drives the native agent (not Electron-only diagnostics).
4. Reuse **Render**; **in-memory/file** until Neon; scaffold **Netlify** (`apps/web` + `netlify.toml`).
5. Protocol: `POST /sessions` → events → `finalize` with `ReportPayload` v1.

## Monorepo

| Path | Role |
|------|------|
| `apps/api` | Express API — health, auth stub, tenants, licenses, sessions, certificates |
| `apps/web` | Vite React admin + operator shell |
| `apps/agent-windows` | .NET 8 `Xcqc.Agent` + `Xcqc.Collectors` (Wave A+B) |
| `apps/agent-windows/electron` | Electron operator UI → spawns native agent |
| `apps/agent-android` | Stub README (Kotlin later) |
| `packages/shared` | ReportPayload, grades, roles, session events |
| `docs/` | Runbooks + free-stack timing |
| `render.yaml` / `netlify.toml` | Deploy stubs |

## Quick start

### API
```bash
cp .env.example .env
npm install
npm run dev:api
# http://127.0.0.1:8080/health
```

### Web admin/operator
```bash
npm run dev:web
# http://127.0.0.1:5173  (proxies /api → :8080)
```

### Windows agent (Wave A+B — native)
```powershell
cd apps\agent-windows
dotnet build Xcqc.Agent.sln -c Release
# Run as Administrator for Full Wave B (SMART / deep battery):
dotnet run --project Xcqc.Agent -c Release -- --api http://127.0.0.1:8080 --token dev-ingest-token
```

### Codespaces (API + web only)
See [`docs/CODESPACE-RUN.md`](docs/CODESPACE-RUN.md). Windows agent runs on your PC, not in the Linux Codespace.

### Electron (after Wave A build)
```powershell
cd apps\agent-windows\electron
npm install
npm start
```

## Plan 3 — Deploy (recommended)

Fix Codespace `/health` first, then cloud in order: **Neon → Render → Netlify → Windows agent**.

Full step-by-step: [`docs/DEPLOY-RENDER-NEON-NETLIFY.md`](docs/DEPLOY-RENDER-NEON-NETLIFY.md)

## Neon / Netlify

- **Neon:** optional durable storage — [`docs/NEON-SETUP.md`](docs/NEON-SETUP.md). Schema: `apps/api/sql/neon-schema.sql`.
- **Netlify:** create when hosting `apps/web`; set `VITE_API_URL` to Render API.

## Docs

- [`docs/DEPLOY-RENDER-NEON-NETLIFY.md`](docs/DEPLOY-RENDER-NEON-NETLIFY.md) — **Plan 3** deploy runbook
- [`docs/CODESPACE-RUN.md`](docs/CODESPACE-RUN.md)
- [`docs/NEON-SETUP.md`](docs/NEON-SETUP.md)

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/WINDOWS-AGENT-MVP.md`](docs/WINDOWS-AGENT-MVP.md)
- [`docs/FREE-STACK.md`](docs/FREE-STACK.md)
- [`docs/ADMIN-HIERARCHY.md`](docs/ADMIN-HIERARCHY.md)
- [`docs/DOCX-ALIGNMENT.md`](docs/DOCX-ALIGNMENT.md)
- [`docs/RENDER-DEPLOY.md`](docs/RENDER-DEPLOY.md)
