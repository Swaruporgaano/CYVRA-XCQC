# FREEZE-STATUS — CYVRA XCQC

**Freeze date:** 2026-08-11  
**Verdict:** **ADJUST** (not redo) — all freeze questions answered **YES**  
**Master plan:** [`GAP-BRIDGE-PLAN.md`](./GAP-BRIDGE-PLAN.md)  
**Resume pointer:** [`RESUME-HERE.md`](./RESUME-HERE.md)

---

## Frozen decisions (all YES)

| # | Decision | Frozen value |
|---|----------|--------------|
| F1 | ADJUST not redo | Keep Wave A+B, Plan 3 stack, session ingest |
| F2 | Licensing critical path | Pause **new collectors** until L4 (activation E2E) |
| F3 | Two web apps | `apps/web-portal` (customer) + `apps/web` (operator) |
| F4 | Neon customers model | Mobile-centric `customers` table (not tenant-only RBAC) |
| F5 | Device binding | `SAME_DEVICE` policy on fingerprint change |
| F6 | Named Pipe IPC | Required before production (H1) |
| F7 | Native AOT | Deferred to H2 (after IPC) |
| F8 | `XCQC_INGEST_TOKEN` | Lab/operator bridge until L3 device JWT cutover |
| F9 | v1 diagnostics | Automated + operator-assisted (not automated-only) |
| F10 | Windows Service | Deferred to E1 |

**Technical freeze:** API prefix `/api/v1`, agent target `CYVRA.DeviceAgent.exe`, Electron `CYVRA-XCQC`, pipe `\\.\pipe\CYVRA-XCQC-Agent`, 16-digit keys (hashed), OTP 6 digits / 5 min / 5 attempts, download token 15 min single-use.

**Hosting freeze (2026-08-12):** Operator web = **Cloudflare Workers + Wrangler** (`apps/web/wrangler.jsonc`). **Abandoned:** Netlify, Cloudflare Pages-only static deploy. API stays on **Render**; database stays on **Neon**.

---

## Completed so far

| Area | Status | Notes |
|------|--------|-------|
| Monorepo scaffold | Done | `apps/api`, `apps/web`, `apps/agent-windows`, `packages/shared` |
| Plan 3 deploy config | Done | `render.yaml`, `docs/CLOUDFLARE-WORKERS.md`, `.env.example`, deploy runbooks |
| Wave A collectors | Done | WMI inventory, preflight, orchestrator, HTTP upload |
| Wave B collectors | Done | Battery, SMART, security (BitLocker/TPM) |
| SmartCollector fix | Done | WMI path corrections for Wave B |
| Session ingest API | Done | `POST /sessions`, events, finalize → Neon when configured |
| Operator web shell | Done | Vite React IA routes, demo auth |
| Electron scaffold | Done | Spawns native agent (CLI bridge until H1) |
| Neon base schema | Done | `apps/api/sql/neon-schema.sql` (tenant/session tables) |
| Neon store adapter | Done | `NeonSessionStore` with memory/file fallback |
| Doc review | Done | `DOC-REVIEW-FINDINGS.md`, Word doc extraction |
| Gap bridge plan | Done | `GAP-BRIDGE-PLAN.md` (phased route P0 → R1) |
| Accounts linked | Done | Neon, Render, Cloudflare Workers connected to repo (verify P0) |

---

## PENDING checklist by phase

### P0 — Plan 3 E2E closure (NOW)

- [ ] Apply `apps/api/sql/neon-schema.sql` on Neon (SQL Editor or `psql`)
- [ ] Render: set `DATABASE_URL` (pooled Neon URL), redeploy
- [ ] Render: set `XCQC_INGEST_TOKEN` (lab secret)
- [ ] `curl https://<render>/health` → `ok`, `store: neon`, `neonReachable: true`
- [ ] Cloudflare Workers ops: set `VITE_API_URL` to Render API base
- [ ] Windows laptop: agent or Electron → session visible in operator web
- [ ] One full run: create session → events → finalize on Neon
- [ ] Document `XCQC_INGEST_TOKEN` as lab-only (cutover at L3)

**Checklist doc:** [`P0-VERIFICATION-CHECKLIST.md`](./P0-VERIFICATION-CHECKLIST.md)

### L1 — Neon commercial schema (STARTED in repo)

- [x] Migration file `apps/api/sql/neon-schema-l1-commercial.sql`
- [ ] Apply L1 migration on Neon (after P0 base schema)
- [ ] Verify all tables on fresh + existing P0 DB
- [ ] Rollback notes documented in migration file
- [ ] Update NEON-SETUP apply order

### L2 — Auth + OTP API

- [ ] Mount `/api/v1` router
- [ ] `POST /api/v1/auth/register`, `request-otp`, `verify-otp`, `login`
- [ ] OTP hashing (`OTP_PEPPER`), rate limits, SMS provider plug-in
- [ ] Render env: `JWT_SECRET`, `OTP_PEPPER`, `SMS_*`
- [ ] Spec: `docs/specs/01-auth-license-device-binding.md`
- [ ] Integration tests + `docs/api/v1-auth.md`

### L3 — License + download + activate API

- [ ] License state machine (`AVAILABLE` → `ACTIVATED`)
- [ ] Download token (15 min, single-use)
- [ ] Device fingerprint + `SAME_DEVICE` binding
- [ ] `POST /api/v1/license/*`, `/api/v1/agent/bootstrap`, `heartbeat`
- [ ] Legacy `/sessions` accepts ingest token OR device JWT (feature flag)
- [ ] Render env: `LICENSE_PEPPER`

### L4 — Customer portal

- [ ] New `apps/web-portal` (second Cloudflare Workers project `xcqc-portal`)
- [ ] Register → OTP → key display → download authorize
- [ ] CORS for both Worker origins (ops + portal)
- [ ] **Gate:** no new hardware collectors until L4 DoD green

### L5 — Electron auth UI

- [ ] Welcome → Mobile → OTP → key → Activating → Ready
- [ ] Credential vault for refresh token
- [ ] Block scan without activation

### H1 — Named Pipe IPC

- [ ] `CYVRA.DeviceAgent` pipe server
- [ ] Electron `AgentClient`, no per-scan `spawn()`

### H2 — Native AOT

- [ ] After H1 stable; WMI AOT smoke tests

### D1 / D2 / S1 / E1 / R1

- [ ] D1: peripheral discovery (GPU, display, USB, …)
- [ ] D2: diagnostics matrix
- [ ] S1: health scoring + real certificates
- [ ] E1: Windows Service (privileged)
- [ ] R1: production hardening, signing

---

## Accounts still to confirm (dashboard clicks)

| Item | Where | Ready? |
|------|-------|--------|
| A1 Neon `DATABASE_URL` | Neon → Connection details (pooled) | User |
| A2 Render deploy + env | Render → xcqc-api | User |
| A3 Cloudflare Workers ops `VITE_API_URL` | Worker build env / local build | User |
| A4 Cloudflare Workers portal project | New Worker project (L4) | Planned |
| A5 SMS provider | Render (L2) or `console` dev | L2 |
| A6 `JWT_SECRET`, `OTP_PEPPER`, `LICENSE_PEPPER` | Render + local `.env` | L2 prep in `.env.example` |
| A7 Windows test laptop | Physical PC | User |
| A8 GitHub push | `main` | This session |

---

## NEXT (immediate)

1. **P0** — User applies Neon schema + Render/Cloudflare Workers env; verify health and one agent run (see P0 checklist).
2. **L1** — User runs `neon-schema-l1-commercial.sql` after P0 base schema; agent continues L2 spec work.
3. **Stop** new collector modules until L4 passes.

---

## SQL apply order (Neon)

```text
1. apps/api/sql/neon-schema.sql          (P0 — required first)
2. apps/api/sql/neon-schema-l1-commercial.sql   (L1 — additive)
```

Do not skip step 1. L1 is forward-only; no drops of session tables.

---

*Updated at freeze — 2026-08-11. Agents treat unchecked P0/L1 items as blockers for L2+.*
