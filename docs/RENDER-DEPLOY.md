# Render deploy notes

1. Reuse existing Render project (`prj-d9svo6k9v7es73fs6oi0`).
2. Connect GitHub repo `Swaruporgaano/CYVRA-XCQC` (push when ready — no auto-commit from agents unless asked).
3. Blueprint / service from `render.yaml` → `xcqc-api`.
4. Set env:
   - `XCQC_INGEST_TOKEN` (required for non-open ingest)
   - `XCQC_STORE=memory` until Neon
   - `NODE_ENV=production`
5. Health check: `/health`
6. Cold start on free plan ~1 minute — ping with GitHub Action if demos matter.

## When to add Neon on Render

Add `DATABASE_URL` and switch store implementation off memory when:

- Sessions must survive sleep/redeploy
- Multiple instances share state
- Wave C device baselines
- Durable certificates / audit

Apply `apps/api/sql/neon-schema.sql` in the Neon SQL editor first.
