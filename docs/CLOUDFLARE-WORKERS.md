# Cloudflare Workers — CYVRA XCQC ops web

Host `apps/web` (operator/admin shell) on **Cloudflare Workers** using **Wrangler** static assets. Netlify is deprecated for this repo.

Config lives in **`apps/web/wrangler.jsonc`** (not repo root) so `npx wrangler deploy` does not hit the npm-workspace auto-detect error.

## Dashboard settings (Workers Builds / CI)

Connect the GitHub repo in [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Workers** → connect Git (or use **Workers Builds** on an existing Worker).

| Setting | Value |
|---------|--------|
| **Production branch** | `main` |
| **Root directory** | `.` (repo root) |
| **Build command** | `npm install && npm run build -w @cyvra/xcqc-shared && npm run build -w @cyvra/xcqc-web` |
| **Deploy command** | `npx wrangler deploy -c apps/web/wrangler.jsonc` |
| **Node version** | `22` (`.nvmrc` or `NODE_VERSION=22`) — **required** for Wrangler 4.x deploy |

**Working directory matters:** always pass `-c apps/web/wrangler.jsonc` when deploying from repo root. Alternatively:

```bash
cd apps/web && npx wrangler deploy
```

Do **not** run bare `npx wrangler deploy` from repo root without `-c` — Wrangler may auto-detect the npm workspace and fail without a config.

## Local deploy

From repo root (after `npm install`):

```bash
npm run deploy:web
```

Or step by step:

```bash
npm run build -w @cyvra/xcqc-shared && npm run build -w @cyvra/xcqc-web
npx wrangler deploy -c apps/web/wrangler.jsonc
```

Authenticate once: `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` in CI).

## Environment variables (build-time)

Set in the Cloudflare build environment (or locally before `npm run build -w @cyvra/xcqc-web`):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com` (Render API, **no** trailing slash) |
| `VITE_INGEST_TOKEN` | Same as Render `XCQC_INGEST_TOKEN` (optional; only if browser calls ingest) |

`VITE_*` values are baked in at **build** time. After changing them, rebuild and redeploy.

## SPA routing

`apps/web/wrangler.jsonc` sets:

```jsonc
"not_found_handling": "single-page-application"
```

This serves `index.html` for unknown paths (client-side React Router). `apps/web/public/_redirects` is optional (Netlify legacy); Workers assets config covers SPA behavior.

## Local smoke test (build only)

```bash
npm install && npm run build -w @cyvra/xcqc-shared && npm run build -w @cyvra/xcqc-web
```

Output: `apps/web/dist/`.

Preview locally with Vite: `npm run dev:web` (proxies `/api` → local Render).

## Common errors

| Symptom | Fix |
|---------|-----|
| Build OK, deploy fails: `EBADENGINE` / wrangler requires `node >=22` | Set Cloudflare **Node version** to `22` (or env `NODE_VERSION=22`); retry deploy |
| Workspace / monorepo auto-detect error | Deploy with `-c apps/web/wrangler.jsonc` or `cd apps/web` |
| `'tsc' is not recognized` | Run `npm install` from repo root before build |
| `dist` missing on deploy | Run shared + web build before `wrangler deploy` |
| API calls fail in browser | Fix `VITE_API_URL` → rebuild and redeploy |
| 404 on client routes | Confirm `not_found_handling: single-page-application` in `wrangler.jsonc` |

## Related

- [`DEPLOY-RENDER-NEON-NETLIFY.md`](./DEPLOY-RENDER-NEON-NETLIFY.md) — full Plan 3 runbook (Phase D = Cloudflare Workers)
- [`CLOUDFLARE-PAGES.md`](./CLOUDFLARE-PAGES.md) — **deprecated** Pages-only notes
- [`RENDER-DEPLOY.md`](./RENDER-DEPLOY.md) — Render API notes
