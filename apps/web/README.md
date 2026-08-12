# CYVRA XCQC Web (Admin + Operator)

Vite + React shell. Calls Render/API for truth.

## Run

```bash
# from repo root
npm install
npm run dev:api
npm run dev:web
# http://127.0.0.1:5173  (proxies /api → :8080)
```

Demo roles in the left nav map to tokens `demo-super` / `demo-admin` / `demo-ops`.

## Deploy

Set `VITE_API_URL` to the Render API URL. Deploy with Wrangler — see [`docs/CLOUDFLARE-WORKERS.md`](../../docs/CLOUDFLARE-WORKERS.md).
