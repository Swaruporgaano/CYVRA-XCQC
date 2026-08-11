# Resume here — CYVRA XCQC

Use this file when you come back to the project after a break.

## Open the project next time

**Option A — GitHub Codespace (API + web dev)**

1. Open the repo: [https://github.com/Swaruporgaano/CYVRA-XCQC](https://github.com/Swaruporgaano/CYVRA-XCQC)
2. **Code → Codespaces → Create codespace on `main`**
3. In the terminal, confirm you are in the repo root **`CYVRA-XCQC`** (not `codespaces-react` or another folder). Run `pwd` — it should end with `/CYVRA-XCQC`.
4. Follow [`CODESPACE-RUN.md`](./CODESPACE-RUN.md) to start API and web.

**Option B — Local (Windows + Cursor)**

1. Clone or pull: `git clone https://github.com/Swaruporgaano/CYVRA-XCQC.git`
2. In Cursor: **File → Open Folder** → select the `CYVRA-XCQC` directory on disk.
3. API/web: see root [`README.md`](../README.md). Windows agent: run on a physical PC (see [`WINDOWS-AGENT-MVP.md`](./WINDOWS-AGENT-MVP.md)).

## Where we left off (Plan 3)

| Done | Next |
|------|------|
| Neon, Render, and Netlify accounts linked to the repo | Verify **Render** `/health` responds |
| Plan 3 deploy runbook written | Set **Netlify** `VITE_API_URL` to your Render API URL |
| `render.yaml` / `netlify.toml` updated for monorepo | Apply **Neon** schema (`apps/api/sql/neon-schema.sql`) if not done |
| | End-to-end **Windows agent** test against Render |

## Key docs

| Doc | Purpose |
|-----|---------|
| [`DEPLOY-RENDER-NEON-NETLIFY.md`](./DEPLOY-RENDER-NEON-NETLIFY.md) | **Plan 3** full deploy runbook (Neon → Render → Netlify → agent) |
| [`NEON-SETUP.md`](./NEON-SETUP.md) | Neon Postgres setup and `DATABASE_URL` |
| [`CODESPACE-RUN.md`](./CODESPACE-RUN.md) | Run API + web in Codespace |
| [`WINDOWS-AGENT-MVP.md`](./WINDOWS-AGENT-MVP.md) | Build and run the Windows agent against cloud API |

## Secrets (do not commit)

Store these only in platform dashboards or local `.env` (never in git):

- Neon `DATABASE_URL`
- Render `XCQC_INGEST_TOKEN` (and any other API env vars)
- Netlify `VITE_API_URL` (your Render API base URL)

Copy names from [`.env.example`](../.env.example); paste real values in Neon / Render / Netlify UI or Codespace secrets.
