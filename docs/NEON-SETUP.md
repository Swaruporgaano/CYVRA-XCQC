# Neon setup — CYVRA XCQC

Neon is **optional**. The API runs fine with in-memory or file storage for local dev and Codespaces. Enable Neon when you need sessions and reports to survive API restarts, multi-instance deploys (Render), or Wave C device baselines.

## 1. Create a Neon project

1. Sign in at [https://neon.tech](https://neon.tech) and create a project (free tier is enough for MVP).
2. Open **Dashboard → Connection details**.
3. Copy the **pooled** connection string (`-pooler` in the hostname). Example shape:

   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Apply schema

**Apply order (do not skip step 1):**

| Step | File | Phase |
|------|------|-------|
| 1 | `apps/api/sql/neon-schema.sql` | P0 — sessions, tenants, ingest |
| 2 | `apps/api/sql/neon-schema-l1-commercial.sql` | L1 — customers, licenses, devices |

From the repo root (with `psql` or Neon SQL Editor):

```bash
psql "$DATABASE_URL" -f apps/api/sql/neon-schema.sql
psql "$DATABASE_URL" -f apps/api/sql/neon-schema-l1-commercial.sql
```

Or paste each file into the Neon **SQL Editor** and run in order.

## 3. Configure the API

Set `DATABASE_URL` in your environment. The API auto-selects Neon when this variable is present and connectivity succeeds; otherwise it falls back to `XCQC_STORE` (`memory` or `file`).

**Local / `.env`:**

```bash
cp .env.example .env
# Add:
DATABASE_URL=postgresql://...
```

**GitHub Codespaces** — Repository or user secret:

- Name: `DATABASE_URL`
- Value: your pooled Neon URL

**Render** — Web service environment:

- `DATABASE_URL` = pooled URL
- Optional: remove or keep `XCQC_STORE=file` (Neon takes precedence when `DATABASE_URL` is set)

Restart the API and verify:

```bash
curl http://127.0.0.1:8080/health
# "store": "neon", "neonConfigured": true, "neonReachable": true
```

## 4. What gets persisted

| Table | Purpose |
|-------|---------|
| `test_sessions` | Session lifecycle + metadata |
| `session_events` | Module progress / preflight events |
| `reports` | Full `ReportPayload` JSONB |
| `certificates` | MVP certificate stubs |
| `tenants`, `users`, `license_pools` | Admin seed data (manual / future sync) |
| `device_baselines` | Wave C composition baselines (schema ready) |

**L1 commercial tables** (after `neon-schema-l1-commercial.sql`): `customers`, `otp_transactions`, `license_keys`, `download_tokens`, `devices`, `agent_activations`, `device_scans`, `device_components`, `audit_logs`. See [`FREEZE-STATUS.md`](./FREEZE-STATUS.md).

Tenant/user/license admin routes still use in-memory seed state until a later wave wires admin tables to Neon.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `store=memory` despite `DATABASE_URL` | Check URL, SSL, and that schema was applied; see API logs for connect errors |
| Agent finalize 500 | Ensure `reports.session_id` FK exists — session must be created via API first |
| Codespace cannot run Windows agent | Expected — run `Xcqc.Agent.exe` on a Windows PC; point `--api` at Codespace forwarded port or Render |

## Security

- Never commit real `DATABASE_URL` values.
- Use Neon **pooled** URLs for serverless/Render.
- Rotate credentials if leaked.
