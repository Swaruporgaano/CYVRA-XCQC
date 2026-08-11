# Free stack — timing & wiring

Target: **Netlify (later) + Render free web service (+ optional KV) + Neon (when needed) + GitHub Codespaces/Actions**.

## Render (now)

- Reuse existing Render project.
- Deploy `apps/api` via `render.yaml` (`xcqc-api`).
- Expect cold starts on free plan (~1 min first request).
- Use `XCQC_STORE=memory` for Wave A demo (sessions lost on sleep/restart).
- Optional later: Render Key Value for rate limits / short-lived session cache.

## Neon (create when…)

Create a Neon project **only when one of these is true**:

1. You need sessions/reports to survive Render free sleep/redeploy.
2. You run more than one API instance / preview and need a shared system of record.
3. You start **Wave C** parts-change baselines (serial fingerprint history per chassis).
4. You issue certificates that must be queryable as durable audit trail.
5. You enable admin analytics / multi-tenant RBAC persistence.

Until then: `XCQC_STORE=memory` or `file` is enough to unblock the Windows agent.

When creating Neon: set `DATABASE_URL` (pooled) on Render; migrate off MemorySessionStore.

## Netlify (create when…)

`apps/web` admin/operator shell is scaffolded now. Create the Netlify **site** when you want a public URL:

- Live session view / certificates / licenses
- Set `VITE_API_URL` → Render API
- Use root `netlify.toml`

Local `npm run dev:web` is enough until then. Prefer all scoring/business logic on the Render API.

## Codespaces

- Use for API + shared TypeScript (`Node 20+`).
- Windows agent **must** be built/run on a Windows host for real WMI validation.
- Codespaces can edit `.cs` files; hardware truth requires physical Windows + admin.

## Secrets (user-provided)

| Secret | When |
|--------|------|
| `XCQC_INGEST_TOKEN` | Before any non-local deploy |
| `DATABASE_URL` | When Neon is created |
| `JWT_SECRET` / license keys | Before real auth/licenses |
| Code signing cert | Before production agent distribution |
| Netlify `VITE_API_URL` | When web app exists |
