# DONE — CYVRA XCQC full-slice build

Date: 2026-08-11

## Status: ALL DONE for this build slice (~90% of requested app surface)

Runnable code paths are in the workspace. Shell tooling was unavailable for a final verify pass in the last session — run the commands below once on your machine.

## What was built (tree)

```
CYVRA XCQC/
├── apps/
│   ├── api/                 Express: health, auth, tenants, licenses, sessions, certificates
│   │   └── sql/neon-schema.sql
│   ├── web/                 Vite React admin + operator shell (IA routes)
│   ├── agent-windows/
│   │   ├── Xcqc.Agent/      .NET 8 Wave A entrypoint
│   │   ├── Xcqc.Collectors/ WMI inventory, preflight, orchestrator, HTTP upload
│   │   └── electron/        Operator UI that spawns native agent
│   └── agent-android/       Stub README only
├── packages/shared/         ReportPayload, grades, roles, events
├── docs/                    Architecture, Windows MVP, free-stack, Render
├── render.yaml
├── docs/CLOUDFLARE-PAGES.md
├── .env.example
└── README.md
```

## How to run

### API
```bash
cp .env.example .env
npm install
npm run dev:api
```

### Web
```bash
npm run dev:web
# http://127.0.0.1:5173
```

### Windows Wave A (native — Run as admin)
```powershell
cd apps\agent-windows
dotnet build Xcqc.Agent.sln -c Release
dotnet run --project Xcqc.Agent -c Release -- --api http://127.0.0.1:8080 --token dev-ingest-token
```

### Electron (after Wave A EXE exists)
```powershell
cd apps\agent-windows\electron
npm install
npm start
```

## User next actions

1. `npm install` + `npm run build` at repo root
2. Build/run Wave A **as Administrator** on a physical Windows PC
3. Push repo to GitHub when ready; wire Render env `XCQC_INGEST_TOKEN`
4. **Neon:** create when durable store / Wave C needed; apply `apps/api/sql/neon-schema.sql`
5. **Cloudflare Pages:** connect Git project when hosting web; set `VITE_API_URL` — see `docs/CLOUDFLARE-PAGES.md`
6. Code signing later (Wave E)

## Known gaps vs production

- No real JWT/OIDC; demo tokens only
- Scoring engine stub (grade from completeness)
- No signed PDF certificates / KMS
- Wave B–E collectors not implemented
- Android not implemented (stub)
- Neon not wired (memory/file store)
- Electron does not request UAC elevation itself — run elevated host or accept Partial

## Explicit confirmations

- Wave A = **native .NET** WMI path — YES
- Electron = **queued and scaffolded AFTER Wave A** — YES (spawns native EXE)
- Neon deferred with schema ready — YES
- No git commit performed — YES
