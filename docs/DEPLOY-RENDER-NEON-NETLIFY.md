# Plan 3 — Codespace health → Neon → Render → Cloudflare Workers

> **Note:** Netlify hosting is **deprecated** for this repo. Use **Cloudflare Workers (Wrangler)** for `apps/web` (Phase D). See [`CLOUDFLARE-WORKERS.md`](./CLOUDFLARE-WORKERS.md).

End-to-end deployment for **CYVRA XCQC**: fix local/Codespace API first, then cloud stack in order.

| Phase | Goal |
|-------|------|
| **A** | `curl /health` works in Codespace |
| **B** | Neon Postgres + schema |
| **C** | API on Render (reuse existing project if possible) |
| **D** | Web on Cloudflare Workers (`VITE_API_URL` → Render) |
| **E** | Windows agent → Render; verify full loop |

**Repo paths that matter:** `apps/api`, `apps/web`, `apps/web/wrangler.jsonc`, `render.yaml`, `.env.example`, `apps/api/sql/neon-schema.sql`.

---

## Who does what

| Task | **You (human)** | **Cursor agent** |
|------|-----------------|------------------|
| Create Neon / Render / Cloudflare accounts | ✓ (sign up, verify email) | ✗ |
| Enter credit card if a platform requires it | ✓ | ✗ |
| Paste secrets in dashboards (`DATABASE_URL`, `XCQC_INGEST_TOKEN`, `VITE_API_URL`) | ✓ | Can tell you exact names/values to use |
| Connect GitHub repo in Render / Cloudflare Workers UI | ✓ | ✗ |
| Run `npm run dev:api` in Codespace | ✓ (or ask agent to run in terminal) | ✓ can run commands in workspace |
| Edit code, docs, `render.yaml`, Workers settings | optional | ✓ |
| Build/run Windows agent on a physical PC | ✓ | ✗ (no WMI on Linux) |
| `git push` to trigger deploys | ✓ | Only if you explicitly ask |

---

## Phase A — Codespace API health (do this first)

### Why `curl http://127.0.0.1:8080/health` failed

`connection refused` means **nothing is listening on port 8080**. Common causes:

1. **API not started** — `npm run dev:api` was never run (or was run in a terminal that exited).
2. **Wrong terminal** — curl ran before the dev server finished starting, or in a fresh shell with no API process.
3. **Install/build incomplete** — `postCreateCommand` failed; shared package not built.
4. **Port mismatch** — API defaults to `8080` (`.env.example`); Render uses `10000` (only relevant after Phase C).

CORS is **not** the issue for curl to `127.0.0.1` — that is same-machine HTTP. CORS only matters when the **browser** on Cloudflare Workers calls Render (Phase D); the API already uses open `cors()` middleware.

### Exact commands (Codespace or local Linux)

**Terminal 1 — start API (leave running):**

```bash
cd /workspaces/CYVRA-XCQC   # or your clone path
cp -n .env.example .env       # skip if .env already exists
npm install
npm run build:shared          # safe if postCreate already ran
npm run dev:api
```

Wait until you see:

```text
[xcqc-api] listening on http://0.0.0.0:8080
```

**Terminal 2 — verify:**

```bash
curl -s http://127.0.0.1:8080/health
```

Expected JSON (shape):

```json
{
  "ok": true,
  "service": "xcqc-api",
  "store": "memory",
  "neonConfigured": false,
  "ingestAuth": true
}
```

Optional: `curl -s http://127.0.0.1:8080/health | jq`

**Optional — web in Codespace (not required for /health):**

```bash
# Terminal 3
npm run dev:web
# Open forwarded port 5173; dev proxy sends /api → :8080
```

### Phase A troubleshooting

| Symptom | Fix |
|---------|-----|
| `connection refused` | Start Terminal 1 with `npm run dev:api`; keep it open |
| `EADDRINUSE` | Another process on 8080 — `pkill -f "tsx watch"` or change `PORT` in `.env` |
| Module not found `@cyvra/xcqc-shared` | `npm run build:shared` from repo root |
| `ingestAuth: false` | Normal if `XCQC_INGEST_TOKEN` empty in `.env`; set it before production |

When Phase A passes, proceed to cloud deploy. You can keep using Codespace for dev; production URLs come from Render/Cloudflare Workers.

---

## Phase B — Neon (database)

Neon gives durable sessions/reports across Render restarts and sleep. Order: **create project → apply schema → save `DATABASE_URL`**.

### B1. Create Neon project

1. Sign in at [https://neon.tech](https://neon.tech) (free tier is enough).
2. **New project** → pick a region near your Render region.
3. Open **Dashboard → Connection details**.
4. Copy the **pooled** connection string (hostname contains `-pooler`). Example:

   ```text
   postgresql://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

5. Store it securely — you will paste it into Render in Phase C (never commit it).

### B2. Apply schema

**Option A — Neon SQL Editor (easiest):**

1. Neon dashboard → **SQL Editor**.
2. Open `apps/api/sql/neon-schema.sql` in the repo.
3. Paste full contents → **Run**.

**Option B — `psql` from Codespace:**

```bash
export DATABASE_URL='postgresql://...'   # your pooled URL
psql "$DATABASE_URL" -f apps/api/sql/neon-schema.sql
```

### B3. Confirm schema

In SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY 1;
```

You should see `test_sessions`, `session_events`, `reports`, `certificates`, `tenants`, `users`, `license_pools`, `device_baselines`.

Keep `DATABASE_URL` handy for Phase C.

More detail: [`NEON-SETUP.md`](./NEON-SETUP.md).

---

## Phase C — Render API

Deploy `apps/api` via root `render.yaml`. Reuse the existing Render project if you have one (`prj-d9svo6k9v7es73fs6oi0` per [`RENDER-DEPLOY.md`](./RENDER-DEPLOY.md)).

### C1. Connect repository

1. [https://dashboard.render.com](https://dashboard.render.com) → your project (or **New → Blueprint**).
2. Connect GitHub repo `Swaruporgaano/CYVRA-XCQC` (or your fork).
3. Render reads `render.yaml` and creates/updates service **`xcqc-api`**.

If not using Blueprint, create a **Web Service** manually with the settings below.

### C2. Service settings (must match repo)

| Setting | Value |
|---------|--------|
| **Root directory** | `.` (repo root) |
| **Runtime** | Node |
| **Build command** | `npm install && npm run build -w @cyvra/xcqc-shared && npm run build -w @cyvra/xcqc-api` |
| **Start command** | `npm run start -w @cyvra/xcqc-api` |
| **Health check path** | `/health` |

These match `render.yaml` and `apps/api/package.json` (`build` → `tsc`, `start` → `node dist/index.js`).

### C3. Environment variables

Set in Render → **xcqc-api** → **Environment**:

| Variable | Required | Value / notes |
|----------|----------|----------------|
| `NODE_VERSION` | recommended | `20` (matches `package.json` `engines`) |
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | `10000` (Render injects this; `render.yaml` sets it) |
| `XCQC_INGEST_TOKEN` | **yes for prod** | Long random secret; same value for agent + optional `VITE_INGEST_TOKEN` |
| `DATABASE_URL` | after Phase B | Pooled Neon URL from Phase B |
| `XCQC_STORE` | optional | `memory` in yaml until Neon; once `DATABASE_URL` is set, API prefers Neon |
| `JWT_SECRET` | future | Not required for MVP demo auth (stub tokens in web) |
| `LICENSE_SIGNING_KEY` | future | Not required for MVP |

From `.env.example` — copy **names**, not dev values:

- `XCQC_INGEST_TOKEN` — **do not** use `dev-ingest-token` in production.
- `DATABASE_URL` — pooled Neon string only.
- `HOST` — not needed on Render (defaults `0.0.0.0`).

### C4. Deploy and verify

1. **Manual Deploy** or push to the connected branch.
2. First deploy may take several minutes; free tier cold start ~1 minute on first request.
3. Note the service URL, e.g. `https://xcqc-api.onrender.com`.

```bash
curl -s https://YOUR-SERVICE.onrender.com/health
```

Expected after Neon wired:

```json
{
  "ok": true,
  "store": "neon",
  "neonConfigured": true,
  "ingestAuth": true
}
```

If `store` is still `memory`, check `DATABASE_URL`, SSL, and that schema was applied (see API logs in Render).

---

## Phase D — Cloudflare Workers web

Host `apps/web` via **Wrangler** static assets (`apps/web/wrangler.jsonc`). Full settings: [`CLOUDFLARE-WORKERS.md`](./CLOUDFLARE-WORKERS.md).

### D1. Create Worker (Git-connected build)

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Workers** → connect Git.
2. Connect the same GitHub repo.
3. Configure build + deploy:

| Setting | Value |
|---------|--------|
| **Root directory** | `.` (repo root) |
| **Build command** | `npm install && npm run build -w @cyvra/xcqc-shared && npm run build -w @cyvra/xcqc-web` |
| **Deploy command** | `npx wrangler deploy -c apps/web/wrangler.jsonc` |
| **Node version** | `20` (`NODE_VERSION=20` in env or `.nvmrc`) |

SPA routing: `wrangler.jsonc` → `"not_found_handling": "single-page-application"` (no custom Worker script required).

Local one-shot: `npm run deploy:web` from repo root (builds shared + web, then `wrangler deploy` in `apps/web`).

### D2. Environment variables (build-time)

Set in the Cloudflare **build** environment (or export locally before `npm run build -w @cyvra/xcqc-web`):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com` (Render URL from Phase C, **no** trailing slash) |
| `VITE_INGEST_TOKEN` | Same as Render `XCQC_INGEST_TOKEN` (only if Operator/Dashboard pages call ingest from browser) |

`VITE_*` vars are baked in at **build** time. After changing them, rebuild and redeploy.

### D3. How the web app calls the API

- **Local dev:** `VITE_API_URL` unset → requests go to `/api` → Vite proxy → `http://127.0.0.1:8080` (`apps/web/vite.config.ts`).
- **Cloudflare Workers prod:** `VITE_API_URL` set → browser calls Render directly (`apps/web/src/auth.tsx`).

### D4. CORS

API uses `app.use(cors())` — any origin including your `*.workers.dev` URL is allowed. No extra CORS config needed for MVP.

If you later restrict CORS, allow your Cloudflare Workers domain explicitly.

### D5. Verify web

1. Open your Worker URL (`https://cyvra-xcqc-web.<account>.workers.dev` or custom domain).
2. **Settings** page should show API base = your Render URL.
3. Log in via demo role (left nav) — tokens `demo-super` / `demo-admin` / `demo-ops`.
4. **Dashboard** / **Sessions** should load data from Render (may be empty until Phase E).

---

## Phase E — Windows agent → Render (end-to-end)

The agent **cannot** run inside Codespace (Linux, no WMI). Run on **Windows 10/11**.

### E1. Build agent (Windows PC)

```powershell
cd apps\agent-windows
dotnet build Xcqc.Agent.sln -c Release
```

### E2. Point at Render

```powershell
$env:XCQC_INGEST_TOKEN = "YOUR-RENDER-INGEST-TOKEN"   # match Render env
dotnet run --project Xcqc.Agent -c Release -- `
  --api https://YOUR-SERVICE.onrender.com `
  --token $env:XCQC_INGEST_TOKEN
```

Or set env vars (see `.env.example`):

- `XCQC_API_BASE_URL=https://YOUR-SERVICE.onrender.com`
- `XCQC_INGEST_TOKEN=...`

Run **Administrator** for full Wave B collectors (SMART, BitLocker, etc.).

### E3. Confirm in cloud

```bash
curl -s https://YOUR-SERVICE.onrender.com/sessions \
  -H "Authorization: Bearer YOUR-INGEST-TOKEN"
```

Or refresh **Sessions** on the Cloudflare Workers site.

### Electron (optional)

```powershell
cd apps\agent-windows\electron
$env:XCQC_API_BASE_URL = "https://YOUR-SERVICE.onrender.com"
npm start
```

---

## Verification checklist

Use this after all phases:

- [ ] **A** — Codespace: `curl http://127.0.0.1:8080/health` → `"ok": true`
- [ ] **B** — Neon: schema tables exist; pooled `DATABASE_URL` saved
- [ ] **C** — Render: `curl https://…onrender.com/health` → `"ok": true`, `"store": "neon"` (if Neon configured)
- [ ] **C** — Render logs show `[xcqc-api] listening` with no DB connection errors
- [ ] **D** — Cloudflare Workers site loads; Settings shows correct `VITE_API_URL`
- [ ] **D** — Demo login works; Dashboard/Sessions API calls succeed (browser Network tab → Render, not 404)
- [ ] **E** — Agent run completes; session appears on Render `/sessions` and Pages Sessions page
- [ ] **Secrets** — `XCQC_INGEST_TOKEN` matches across Render, agent, and optional `VITE_INGEST_TOKEN`

---

## Order of operations (summary)

```text
A. Codespace /health  →  B. Neon + schema  →  C. Render API  →  D. Cloudflare Workers web  →  E. Windows agent test
```

Do **not** skip Phase A — it confirms the API runs before you debug cloud issues.

---

## Related docs

- [`CODESPACE-RUN.md`](./CODESPACE-RUN.md) — daily Codespace dev
- [`NEON-SETUP.md`](./NEON-SETUP.md) — Neon details + troubleshooting
- [`CLOUDFLARE-WORKERS.md`](./CLOUDFLARE-WORKERS.md) — Wrangler deploy, env vars, SPA assets
- [`RENDER-DEPLOY.md`](./RENDER-DEPLOY.md) — existing Render project notes
- [`WINDOWS-AGENT-MVP.md`](./WINDOWS-AGENT-MVP.md) — agent flags and collectors
- [`.env.example`](../.env.example) — all env var names
