# Resume here — CYVRA XCQC

Use this file when you come back to the project after a break.

## Start here (post-freeze 2026-08-11)

| Doc | Purpose |
|-----|---------|
| [**FREEZE-STATUS.md**](./FREEZE-STATUS.md) | Frozen decisions, completed work, **PENDING** by phase, **NEXT** actions |
| [**GAP-BRIDGE-PLAN.md**](./GAP-BRIDGE-PLAN.md) | Master phased route P0 → R1 |
| [**P0-VERIFICATION-CHECKLIST.md**](./P0-VERIFICATION-CHECKLIST.md) | Plan 3 E2E — what to click in Neon / Render / Netlify |

**Next action:** **P0** (dashboard verification + one agent run) → **L1** (apply `neon-schema-l1-commercial.sql`).

**Rule:** No new hardware collectors until **L4** (licensing E2E) passes.

---

## Open the project next time

**Option A — GitHub Codespace (API + web dev)**

1. Open the repo: [https://github.com/Swaruporgaano/CYVRA-XCQC](https://github.com/Swaruporgaano/CYVRA-XCQC)
2. **Code → Codespaces → Create codespace on `main`**
3. In the terminal, confirm you are in the repo root **`CYVRA-XCQC`**. Run `pwd` — it should end with `/CYVRA-XCQC`.
4. Follow [`CODESPACE-RUN.md`](./CODESPACE-RUN.md) to start API and web.

**Option B — Local (Windows + Cursor)**

1. Clone or pull: `git clone https://github.com/Swaruporgaano/CYVRA-XCQC.git`
2. In Cursor: **File → Open Folder** → select the `CYVRA-XCQC` directory.
3. API/web: root [`README.md`](../README.md). Windows agent: [`WINDOWS-AGENT-MVP.md`](./WINDOWS-AGENT-MVP.md).

---

## Where we left off

| Done | Next (you + agent) |
|------|---------------------|
| Freeze all YES — ADJUST, licensing critical path | **P0:** Apply `neon-schema.sql`, set Render `DATABASE_URL`, verify `/health` |
| Wave A+B, Plan 3 scaffold, GAP-BRIDGE plan | **P0:** Netlify `VITE_API_URL`, Windows agent → Neon session |
| L1 migration file in repo | **L1:** Run `neon-schema-l1-commercial.sql` after P0 |
| | **L2:** Auth + OTP API (not started) |

---

## Key docs

| Doc | Purpose |
|-----|---------|
| [`DEPLOY-RENDER-NEON-NETLIFY.md`](./DEPLOY-RENDER-NEON-NETLIFY.md) | Plan 3 deploy runbook |
| [`NEON-SETUP.md`](./NEON-SETUP.md) | Neon Postgres + schema apply order |
| [`DOC-REVIEW-FINDINGS.md`](./DOC-REVIEW-FINDINGS.md) | Word doc vs repo gap analysis |
| [`CODESPACE-RUN.md`](./CODESPACE-RUN.md) | Run API + web in Codespace |
| [`WINDOWS-AGENT-MVP.md`](./WINDOWS-AGENT-MVP.md) | Build/run Windows agent against cloud API |

---

## Secrets (do not commit)

Store only in platform dashboards or local `.env`:

- Neon `DATABASE_URL` (pooled)
- Render `XCQC_INGEST_TOKEN`, `JWT_SECRET`, `OTP_PEPPER`, `LICENSE_PEPPER` (L2+)
- Netlify `VITE_API_URL`

Copy names from [`.env.example`](../.env.example).

---

## Neon SQL apply order

```text
1. apps/api/sql/neon-schema.sql
2. apps/api/sql/neon-schema-l1-commercial.sql
```
