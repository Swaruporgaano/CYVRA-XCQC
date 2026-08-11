# P0 — Plan 3 E2E verification checklist

**Phase:** P0 (Plan 3 closure)  
**Depends on:** Neon + Render + Netlify accounts linked to repo  
**Master plan:** [`GAP-BRIDGE-PLAN.md`](./GAP-BRIDGE-PLAN.md) § Phase P0  
**Freeze status:** [`FREEZE-STATUS.md`](./FREEZE-STATUS.md)

**Definition of Done:** Health reports Neon, operator web loads sessions from Render, one Windows agent run persists to Neon.

---

## 1. Neon — base schema (user action)

1. Open [Neon Console](https://console.neon.tech) → your project → **SQL Editor**.
2. Paste and run the full contents of:

   `apps/api/sql/neon-schema.sql`

3. Confirm tables exist: `test_sessions`, `session_events`, `reports`, `certificates`, `tenants`, `users`, `license_pools`, `device_baselines`.

**Alternative (CLI):**

```bash
psql "$DATABASE_URL" -f apps/api/sql/neon-schema.sql
```

---

## 2. Render — API environment (user action)

1. Open [Render Dashboard](https://dashboard.render.com) → service **xcqc-api** (or connect repo per `render.yaml`).
2. **Environment** → add or update:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `DATABASE_URL` | Neon **pooled** connection string | Host contains `-pooler` |
   | `XCQC_INGEST_TOKEN` | Strong random secret | Lab/operator ingest only until L3 |
   | `NODE_ENV` | `production` | Usually set by blueprint |
   | `PORT` | `10000` | Render default in `render.yaml` |

3. **Do not** set `XCQC_STORE=memory` if you want Neon — when `DATABASE_URL` is set, Neon takes precedence.
4. Deploy / **Manual Deploy** → wait for green.

---

## 3. Render — health check (user or agent)

Replace `<render-host>` with your Render URL (e.g. `xcqc-api.onrender.com`).

```bash
curl -s https://<render-host>/health
```

**Expected (all true):**

| Field | Expected |
|-------|----------|
| `ok` | `true` |
| `service` | `xcqc-api` |
| `store` | `neon` |
| `neonConfigured` | `true` |
| `neonReachable` | `true` |

If `store` is `memory` but `neonConfigured` is `true`, check Render logs for Postgres connection errors (wrong URL, schema not applied, SSL).

---

## 4. Netlify — operator web (user action)

1. Open [Netlify](https://app.netlify.com) → site for `apps/web`.
2. **Site configuration → Environment variables:**

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://<render-host>` (no trailing slash) |
   | `VITE_INGEST_TOKEN` | Same as Render `XCQC_INGEST_TOKEN` (optional for UI demos) |

3. Trigger **Deploy** (clear cache if env changed).
4. Open site → Sessions page should call Render (not localhost).

---

## 5. Windows agent — full ingest loop (user action)

On a **physical Windows 10/11 PC** (not Codespace):

```powershell
cd apps\agent-windows
dotnet build Xcqc.Agent.sln -c Release
dotnet run --project Xcqc.Agent -c Release -- `
  --api https://<render-host> `
  --token <XCQC_INGEST_TOKEN>
```

Or use Electron after building `Xcqc.Agent.exe` — see [`WINDOWS-AGENT-MVP.md`](./WINDOWS-AGENT-MVP.md).

**Verify:**

- [ ] Agent completes without HTTP 401 (token matches Render)
- [ ] Operator web **Sessions** list shows new session
- [ ] Session detail shows module events
- [ ] Finalize completes; status `completed` (or equivalent)
- [ ] Neon SQL Editor: row in `test_sessions` + `session_events` (+ `reports` if finalized)

---

## 6. Lab ingest token documentation

- `XCQC_INGEST_TOKEN` is **lab/operator only** until L3 device JWT cutover.
- Do not share with end customers.
- Planned cutover: after L3 + 30 days (see GAP-BRIDGE-PLAN §14 T8).

---

## 7. Local / Codespace smoke (optional before cloud)

```bash
cp -n .env.example .env
# Add DATABASE_URL if testing Neon locally
npm install
npm run build:shared
npm run dev:api
```

```bash
curl -s http://127.0.0.1:8080/health
```

See [`DEPLOY-RENDER-NEON-NETLIFY.md`](./DEPLOY-RENDER-NEON-NETLIFY.md) Phase A.

---

## P0 sign-off

| Check | Pass? |
|-------|-------|
| Neon schema applied | ☐ |
| Render health `store: neon` | ☐ |
| Netlify ops loads sessions | ☐ |
| Windows agent full run on Neon | ☐ |
| Ingest token documented as lab-only | ☐ |

When all pass → proceed to **L1** (`neon-schema-l1-commercial.sql`) then **L2** auth work.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `401 unauthorized` on sessions | Match `--token` / header to Render `XCQC_INGEST_TOKEN` |
| `store: memory` on Render | Set `DATABASE_URL`; check Neon URL and schema |
| Netlify shows empty / network error | `VITE_API_URL` wrong; redeploy after env change |
| Finalize 500 | Session must exist in `test_sessions` before finalize |
| CORS error in browser | API uses open `cors()` — usually wrong API URL |
