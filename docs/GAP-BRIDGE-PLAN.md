# GAP-BRIDGE-PLAN — CYVRA XCQC

**Status:** Frozen 2026-08-11 (all decisions YES — see `FREEZE-STATUS.md`)  
**Date:** 2026-08-11  
**Sources:** `DOC-REVIEW-FINDINGS.md`, Word docs in `docs/_extracted/`, `ARCHITECTURE.md`, `DEPLOY-RENDER-NEON-NETLIFY.md`, `RESUME-HERE.md`, current repo state  
**Audience:** Product owner + Cursor agents + cloud account operators

---

## 1. Executive verdict

### Recommendation: **ADJUST — not a full redo**

| Verdict | Rationale |
|---------|-----------|
| **Keep** | Monorepo layout, Plan 3 stack (Neon → Render → Netlify), Wave A+B WMI collectors (`Xcqc.Collectors`), session ingest protocol (`/sessions` → events → finalize), Electron shell scaffold, operator web shell |
| **Insert as critical path** | Commercial identity layer (Document 01): mobile OTP → 16-digit license → download token → one-device activation → per-device tokens |
| **Refactor** | API route namespace (`/api/v1/*`), Neon schema (additive commercial tables), Electron integration (CLI spawn → Named Pipe IPC), web split (customer portal vs operator) |
| **Rebuild (narrow)** | Auth/licensing API surface, customer-facing web flows, Electron auth UI — not the hardware collectors |
| **Defer** | Native AOT (until post-licensing IPC milestone), broad peripheral collectors, diagnostics matrix, health scoring engine, Windows Service, code signing |

The repo is **Phase 0 / lab ingest** that proved hardware on the right stack. The Word docs define **Phase 1–2 commercial foundation** that must become the **gating milestone** before customer rollout. Wave A+B work is **not wasted** — it stays behind the licensing gate and feeds discovery after activation.

### Sequencing correction

```
CURRENT (repo):     Wave A+B hardware → operator ingest → (license later)
TARGET (Word doc):  Cloud + schema → OTP/license/download/activate → Electron auth → THEN hardware breadth
BRIDGE (this plan): Finish Plan 3 E2E (1 week) → PAUSE new hardware → licensing track → IPC + auth UI → resume hardware on doc order
```

**Dual-track rule after freeze:** Licensing track owns the critical path. Hardware track may only do **maintenance fixes** on Wave A+B (no new collector modules) until Phase L4 (activation E2E) passes.

---

## 2. Target architecture (Word-doc aligned)

```text
                         CYVRA XCQC CLOUD (Neon + Render + Netlify)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            apps/web-portal   apps/web-ops    apps/api
            (customer)        (operator)      /api/v1/*
                    │               │               │
                    └───────────────┴───────────────┘
                                    │ HTTPS (JWT access + refresh)
                                    ▼
                         CUSTOMER WINDOWS PC
                    ┌───────────────────────────────┐
                    │ CYVRA-XCQC.exe (Electron)      │
                    │  • Registration / OTP / key    │
                    │  • Download / install          │
                    │  • Activation / device bind    │
                    │  • Scan UI / certificate view  │
                    └───────────────┬───────────────┘
                                    │ Named Pipe (authenticated, local)
                                    ▼
                    ┌───────────────────────────────┐
                    │ CYVRA.DeviceAgent.exe          │
                    │  (C# / .NET — AOT in Phase H2) │
                    │  • Discovery modules           │
                    │  • Diagnostics engine          │
                    │  • Health engine → JSON        │
                    └───────────────┬───────────────┘
                                    │ optional, Phase S1+
                                    ▼
                    ┌───────────────────────────────┐
                    │ CYVRA.DeviceService.exe        │
                    │  (privileged Windows Service)  │
                    └───────────────────────────────┘
```

### Layer responsibilities

| Layer | Owns | Must NOT own |
|-------|------|--------------|
| **Neon** | Customers, keys (hashed), download tokens, activations, devices, scans, audit | Scoring secrets, raw 16-digit keys, plaintext OTP |
| **Render API** | Auth, license state machine, device binding policy, ingest, certificates issuance rules | WMI / hardware probes |
| **Customer portal (Netlify)** | Register, OTP, download agent, view reports | Operator RBAC, tenant admin |
| **Operator web (Netlify)** | Sessions, tenants, lab ingest, internal licenses | Customer self-registration |
| **Electron** | UX, cloud auth, IPC client, progress display | Parsing WMI classes, license hashing |
| **DeviceAgent** | Discovery, diagnostics, normalized JSON | Cloud license decisions, OTP |
| **DeviceService** | Elevated ops (future SMART depth, tamper-resistant probes) | UI, cloud calls |

### Auth model (target)

1. **Portal:** mobile → OTP → customer session (JWT).
2. **License:** 16-digit key generated once; stored as `key_hash` + `key_last4` only.
3. **Download:** separate short-lived `download_token` (one-time consume); key stays `AVAILABLE` until activation.
4. **Activation:** mobile + key + OTP → device fingerprint → `ACTIVATED` + bind fingerprint → issue **access + refresh** tokens (key never sent again).
5. **Agent session:** refresh token + device id; ingest uses per-device token, not shared `XCQC_INGEST_TOKEN` (ingest token remains **operator/lab bridge** until cutover).

---

## 3. Phased route (master sequence)

Phases are **ordered**. Do not start a phase until its dependencies show green in the freeze checklist.

| Phase | ID | Name | Depends on | Duration (est.) |
|-------|-----|------|------------|-----------------|
| 0 | P0 | Plan 3 E2E closure | Accounts linked | 2–5 days |
| 1 | L1 | Neon commercial schema | P0 | 2–3 days |
| 2 | L2 | Auth + OTP API | L1 | 5–7 days |
| 3 | L3 | License + download + activate API | L2 | 5–7 days |
| 4 | L4 | Customer portal (web) | L3 | 5–7 days |
| 5 | L5 | Electron auth UI + cloud wiring | L3 | 5–7 days |
| 6 | H1 | Named Pipe IPC + agent split | L5 | 7–10 days |
| 7 | H2 | Native AOT publish | H1 | 3–5 days |
| 8 | D1 | Discovery expansion (peripherals) | H1, L4 | 2–3 weeks |
| 9 | D2 | Diagnostics matrix | D1 | 2–3 weeks |
| 10 | S1 | Health scoring + certificates | D2 | 1–2 weeks |
| 11 | E1 | Windows Service (privileged) | H2, D2 | 1–2 weeks |
| 12 | R1 | Production hardening | S1, E1 | ongoing |

**Total to customer-ready v1 (automated diagnostics + cert):** ~10–14 weeks after freeze (parallel agent + API work).

---

### Phase P0 — Plan 3 E2E closure

**Goal:** Prove existing stack before schema pivot.

**Work:**
- Apply current `neon-schema.sql` to Neon (tenant/session tables — keep).
- Set Render `DATABASE_URL`, verify `/health` → `store: neon`.
- Set Netlify `VITE_API_URL`.
- Windows laptop: agent or Electron → Render session visible in operator web.

**Definition of Done (DoD):**
- [ ] `curl https://<render>/health` → `ok`, `neonConfigured: true`
- [ ] Netlify operator site loads Sessions from Render
- [ ] One full agent run creates session + finalize on Neon
- [ ] `XCQC_INGEST_TOKEN` documented as **lab-only** with cutover date

**GitHub checkpoint:** `docs: Plan 3 verified` (tag optional: `p0-e2e`)

---

### Phase L1 — Neon commercial schema

**Goal:** Add Word-doc tables **without** dropping ingest tables.

**Work:**
- Add migration `apps/api/sql/migrations/002_commercial_identity.sql` (see §5).
- Bridge: `test_sessions.tenant_id` nullable; new scans link `customer_id` + `device_id` when activated.
- Seed script for dev customer + test key (env-only plaintext for local dev).

**DoD:**
- [ ] Migration applies cleanly on fresh Neon + existing P0 DB
- [ ] All doc tables exist: `customers`, `otp_transactions`, `license_keys`, `download_tokens`, `agent_activations`, `devices`, `device_scans`, `device_components`, `audit_logs`
- [ ] No plaintext OTP or full license key in any column
- [ ] Rollback script documented

**GitHub checkpoint:** `feat(db): commercial identity schema migration`

---

### Phase L2 — Auth + OTP API

**Goal:** `/api/v1/auth/*` with real mobile OTP.

**Work:**
- Mount versioned router: `/api/v1` (keep legacy routes temporarily under `/sessions` with deprecation header).
- Implement: `POST /api/v1/auth/register`, `request-otp`, `verify-otp`, `login`.
- OTP: 6 digits, 5 min TTL, 5 attempts, rate limit per mobile/IP.
- SMS provider: **pluggable** — start with `SMS_PROVIDER=console|twilio|msg91` (console logs OTP in dev).
- Hash OTP at rest (HMAC-SHA256 with `OTP_PEPPER`).

**DoD:**
- [ ] Register + verify OTP creates `customers` row
- [ ] Rate limits return 429 with retry-after
- [ ] Integration tests for happy path + lockout
- [ ] OpenAPI fragment in `docs/api/v1-auth.md`

**Env (Render):** `JWT_SECRET`, `OTP_PEPPER`, `SMS_*` credentials

**GitHub checkpoint:** `feat(api): v1 auth and OTP`

---

### Phase L3 — License + download + activate API

**Goal:** Full Document 01 state machine on backend.

**Work:**
- `POST /api/v1/license/issue` (admin/internal or post-registration auto-issue)
- `GET /api/v1/license/status`
- `POST /api/v1/license/download-authorize` → short-lived token
- `GET /api/v1/license/download` (Bearer download token, streams installer placeholder)
- `POST /api/v1/license/activate` (mobile, key, OTP, fingerprint JSON)
- `POST /api/v1/agent/bootstrap`, `heartbeat` (post-activation tokens)
- Key generation: 16 digits, Luhn or format check, `key_hash = HMAC-SHA256(LICENSE_PEPPER, key)`
- States: `AVAILABLE` → download consumed → still `AVAILABLE` until activate → `ACTIVATED` (one device)
- Device fingerprint: accept multi-signal JSON; backend computes canonical hash; policy `SAME_DEVICE` default per doc
- Audit every state transition in `audit_logs`

**DoD:**
- [ ] Cannot activate twice on different fingerprints without admin recovery flow
- [ ] Download token single-use + expiry (e.g. 15 min)
- [ ] Key never returned after initial display/email
- [ ] Legacy `/sessions` accepts **either** ingest token **or** device JWT (feature flag)

**GitHub checkpoint:** `feat(api): license lifecycle and device binding`

---

### Phase L4 — Customer portal (web)

**Goal:** Netlify-hosted **customer** self-service (not operator admin).

**Recommended structure:** **Two apps, one monorepo**

```text
apps/
  web-portal/     ← NEW: customer (register, OTP, download, reports)
  web/            ← RENAME intent: operator/admin (existing pages)
```

Alternative (if user wants single deploy): `apps/web` with route prefixes `/portal/*` vs `/ops/*` and separate Netlify sites pointing at different `base` paths — **not recommended** (bundle bloat, auth confusion).

**Portal screens (MVP):**
1. Welcome / Register (mobile)
2. OTP verify
3. Dashboard (license status, download button)
4. Download page (one-time, explains consumed policy)
5. Reports list (post-activation, read-only)

**DoD:**
- [ ] Second Netlify site `xcqc-portal` (or subdomain) with `VITE_API_URL`
- [ ] Customer can register → receive key (display once) → authorize download
- [ ] Operator `apps/web` unchanged for lab/tenant use
- [ ] CORS allows both Netlify origins

**GitHub checkpoint:** `feat(web-portal): customer registration and download`

---

### Phase L5 — Electron auth UI + cloud wiring

**Goal:** Desktop app implements Word-doc activation flow (still may spawn CLI **temporarily** until H1).

**Work:**
- Rename window title path toward `CYVRA-XCQC` (branding)
- Screens: Welcome → Mobile → OTP → 16-digit key → Activating → Ready to scan
- Store refresh token in OS credential vault (Windows Credential Manager via `keytar` or equivalent)
- On success, enable "Run scan" (still spawn `Xcqc.Agent.exe` with **device token** until H1)
- Installer stub: electron-builder pipeline (unsigned OK for dev)

**DoD:**
- [ ] Fresh install → activate against Render staging → tokens persisted
- [ ] Cannot scan without activation
- [ ] Deactivated / revoked license shows blocking screen
- [ ] No 16-digit key in logs or local files

**GitHub checkpoint:** `feat(electron): activation and auth UI`

---

### Phase H1 — Named Pipe IPC + agent split

**Goal:** Replace CLI spawn with doc-compliant IPC.

**Work:**
- New project: `CYVRA.DeviceAgent` (rename from `Xcqc.Agent` — **alias both names** during transition)
- Pipe name: `\\.\pipe\CYVRA-XCQC-Agent` (or GUID-suffixed per install)
- Message contract in `packages/shared` or new `packages/agent-contracts` (JSON-RPC or length-prefixed JSON)
- Commands: `ping`, `getIdentity`, `startScan`, `getProgress`, `getResult`, `cancel`
- Electron: long-running agent process (spawn once at startup, not per scan)
- Auth: pipe ACL limited to same user SID + random install secret exchanged at first launch
- Deprecate `--api`/`--token` on CLI for production builds (keep for lab/debug flag)

**DoD:**
- [ ] Electron never shells out per collector operation
- [ ] Scan progress streams over pipe to UI
- [ ] Agent runs headless without console window
- [ ] Contract version field in every message

**GitHub checkpoint:** `feat(agent): Named Pipe IPC and headless DeviceAgent`

---

### Phase H2 — Native AOT adoption

**Goal:** `PublishAot` for `CYVRA.DeviceAgent.exe` per Addendum A.

**Timing:** **After H1** (IPC contract stable). **Not** before licensing — avoids AOT trim/reflection churn during rapid auth work.

**Work:**
- Enable `<PublishAot>true</PublishAot>` in agent csproj
- Replace reflection-heavy WMI patterns with source-generated or AOT-safe APIs
- CI: `dotnet publish -r win-x64 -c Release` artifact
- Measure: cold start, binary size, WMI module pass rate vs non-AOT

**Risks (Windows):**
| Risk | Mitigation |
|------|------------|
| WMI/COM trimming breaks collectors | `[DynamicDependency]`, test matrix on 2+ machines |
| Publish time / CI size | Cache NuGet; AOT only on release branch |
| Debugging harder | Keep `DEBUG` non-AOT config for dev |
| Third-party packages incompatible | Audit `Xcqc.Collectors` deps before switch |

**DoD:**
- [ ] AOT binary passes Wave A+B collector suite on reference laptop
- [ ] Size ≤ 2× current single-file (document actual)
- [ ] Startup ≤ 3s to first `ping` on pipe

**GitHub checkpoint:** `feat(agent): Native AOT publish target`

---

### Phase D1 — Discovery expansion (peripherals)

**Goal:** Camera, audio, display, USB topology, GPU, Bluetooth, keyboard, touchpad — **after** licensing gate.

**Order (per doc §30 steps 13–18):**
1. GPU (DXGI)
2. Display (EDID / WMI)
3. USB topology (PnP)
4. Network adapters (extend existing)
5. Bluetooth
6. Camera (enumeration first, capture later in D2)
7. Audio endpoints
8. Input devices (keyboard, touchpad)

**Module contract:** each returns `{ present, detected, functional: null, health: null, status, raw_data, timestamp }` — functional filled in D2.

**DoD:**
- [ ] Each module behind `I*Discovery` interface
- [ ] Orchestrator emits `module.*` events compatible with existing ingest
- [ ] Partial completeness when driver missing

**GitHub checkpoint:** per module PRs (`feat(collector): gpu discovery`, etc.)

---

### Phase D2 — Diagnostics matrix

**Goal:** Functional tests with explicit result enums.

**Result states (required on every test):**
`AUTOMATED_PASS` | `AUTOMATED_FAIL` | `NOT_TESTED` | `OPERATOR_VERIFIED` | `NOT_SUPPORTED`

**v1 automated (ship first):**
| Component | Test |
|-----------|------|
| Storage | SMART thresholds (existing) |
| Battery | wear % thresholds |
| Network | ping gateway + DNS |
| TPM / Secure Boot | presence checks |

**v1 operator-assisted (Electron UI prompts):**
| Component | Test |
|-----------|------|
| Display | color / dead pixel checklist |
| Keyboard | key capture wizard |
| Camera | preview + capture sample |
| Audio | play tone + mic level |
| USB | insert-detect prompt |

**DoD:**
- [ ] `docs/diagnostics/MATRIX.md` lists every component × test × automation level
- [ ] API stores `test_data` per component in `device_components`
- [ ] Electron shows operator verification UI where needed

**GitHub checkpoint:** `feat(diagnostics): functional test matrix v1`

---

### Phase S1 — Health scoring + certificates

**Goal:** Replace API certificate stub with engine-driven grades.

**Work:**
- `HealthEngine` in C#: per-component score + overall score
- Weighting config in API (tenant/customer level later) — not in agent
- Certificate: signed PDF or JSON + `grade_band` + `grade_score` from engine output
- Link `certificates` table to `device_scans` (migrate from session-only model)

**DoD:**
- [ ] Score reproducible from stored component JSON
- [ ] Certificate viewable in portal and operator web
- [ ] `LICENSE_SIGNING_KEY` or cert signing key in Render only

**GitHub checkpoint:** `feat(health): scoring engine and certificate issuance`

---

### Phase E1 — Windows Service (privileged)

**Goal:** `CYVRA.DeviceService.exe` for least-privilege elevation.

**Deferred until:** H2 + at least D2 automated storage/network tests stable.

**Work:**
- Service installs via elevated installer hook
- Pipe from DeviceAgent → Service for SMART, BitLocker depth, future tamper checks
- Service runs as `LOCAL SERVICE` or dedicated account — not interactive user

**DoD:**
- [ ] Agent detects service; falls back to partial mode if absent
- [ ] Installer registers / uninstalls service
- [ ] Documented threat model in `docs/security/windows-service.md`

**GitHub checkpoint:** `feat(service): privileged Windows Service`

---

## 4. KEEP / REFACTOR / REBUILD / DEFER

| Asset | Action | Notes |
|-------|--------|-------|
| `apps/agent-windows/Xcqc.Collectors` (Wave A+B) | **KEEP** | Extend in D1/D2; no rewrite |
| `apps/agent-windows/Xcqc.Agent` | **REFACTOR** → `CYVRA.DeviceAgent` | Add pipe server mode; CLI becomes debug entry |
| `apps/agent-windows/electron` | **REFACTOR** | Auth UI + IPC client; drop per-scan spawn |
| `apps/api` Express app | **REFACTOR** | Add `/api/v1`, Neon stores, keep legacy routes temporarily |
| `apps/api/sql/neon-schema.sql` | **REFACTOR** | Additive migrations; don't drop session tables |
| `apps/web` | **KEEP** as operator | Do not morph into customer portal |
| `apps/web-portal` | **BUILD NEW** | Customer self-service |
| `packages/shared` | **KEEP + EXTEND** | Add agent IPC + API DTOs |
| `render.yaml`, `netlify.toml` | **REFACTOR** | Second Netlify site config; Render env vars |
| Session ingest protocol | **KEEP** | Map activated device → session owner |
| `XCQC_INGEST_TOKEN` | **KEEP TEMP** | Lab/operator only until L3 cutover flag |
| Tenant RBAC (`tenants`, `users`) | **KEEP** | Parallel track for B2B lab; map `tenant_id` ↔ `customer_id` later if needed |
| `device_baselines` | **KEEP** | Wave C after D1 |
| Android agent | **DEFER** | Unchanged |
| Code signing / installer | **DEFER** | Wave R1 |
| iOS | **DEFER** | Per doc |

---

## 5. Neon schema evolution plan

### Principle: additive migrations, no big-bang rewrite

**Current tables (keep):** `tenants`, `users`, `license_pools`, `test_sessions`, `session_events`, `reports`, `certificates`, `device_baselines`

**New tables (L1 migration):**

```sql
-- customers (mobile-centric, doc-aligned)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|active|suspended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_mobile_created ON otp_transactions(mobile, created_at DESC);

CREATE TABLE license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  key_hash TEXT NOT NULL UNIQUE,
  key_last4 CHAR(4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available|activated|revoked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  license_id UUID NOT NULL REFERENCES license_keys(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  manufacturer TEXT,
  model TEXT,
  serial_hash TEXT,
  uuid_hash TEXT,
  device_fingerprint TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  license_id UUID NOT NULL REFERENCES license_keys(id),
  device_id UUID NOT NULL REFERENCES devices(id),
  agent_version TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE device_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id),
  session_id UUID REFERENCES test_sessions(session_id), -- bridge to ingest
  agent_version TEXT,
  scan_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE device_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES device_scans(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  present BOOLEAN,
  detected BOOLEAN,
  functional TEXT, -- enum string
  health TEXT,
  status TEXT,
  raw_data JSONB,
  test_data JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  event TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Bridge strategy (ingest ↔ commercial)

| Concern | Bridge |
|---------|--------|
| Sessions without customer | Allowed (lab); `tenant_id` populated, `customer_id` null |
| Activated agent scan | `test_sessions` row + `device_scans.session_id` FK |
| Certificates | Phase S1: prefer `device_scans.id`; keep `certificates.session_id` for backward compat |
| Tenant vs customer | Phase 1: separate models; optional `customers.tenant_id` FK later for B2B |

### Migration execution

1. P0: apply `neon-schema.sql` if not done.
2. L1: `002_commercial_identity.sql` via Neon SQL Editor or `psql`.
3. Each phase: forward-only migration files; no `DROP TABLE` without explicit rollback window.

---

## 6. Web: customer portal vs operator

### Recommendation: **two Netlify sites, two apps**

| App | Path | Audience | Auth |
|-----|------|----------|------|
| `apps/web-portal` | `portal.cyvra.app` or `xcqc-portal.netlify.app` | End customer | Mobile + OTP + JWT |
| `apps/web` (existing) | `ops.cyvra.app` or existing Netlify | Lab, tenant admin, operators | Email/demo → future SSO |

**Why not one app:** Different auth flows, RBAC models, and release cadence. Operator demo tokens must not ship in customer bundle.

**Shared code:** Extract `packages/ui` or share Tailwind tokens via `packages/shared` if duplication hurts.

**netlify.toml:** Split into `netlify.portal.toml` + `netlify.ops.toml` or monorepo two-site docs in DEPLOY.

---

## 7. Electron Named Pipe + auth UI milestone

Single milestone **L5 + H1** (can overlap: L5 uses CLI bridge; H1 swaps transport).

### L5 deliverables (auth UI)
- Screen flow matches doc § Phase 3
- Credential vault for tokens
- Block scan until `agent_activations.status = active`

### H1 deliverables (IPC)
- `CYVRA.DeviceAgent.exe` pipe server
- Electron `AgentClient` module in preload
- Install secret + ACL documented

### Acceptance demo (record for stakeholder)
1. Register on portal → get key
2. Download installer via one-time token
3. Install → Electron → enter mobile + key + OTP
4. Activation succeeds on Render
5. Run scan → session in Neon linked to `device_id`
6. (H1) No new `spawn()` per module in Process Explorer

---

## 8. Native AOT adoption timing

| When | What |
|------|------|
| **Now → H1** | Standard `net8.0-windows` publish; single-file self-contained OK |
| **H1 complete** | Spike: one collector AOT-published; run WMI smoke test |
| **H2** | Full agent AOT if spike green |
| **Never block licensing on AOT** | Licensing is Node + Electron + Neon |

---

## 9. Diagnostics matrix + collectors roadmap (post-licensing)

```text
L4/L5 complete (licensing E2E)
        ↓
H1 IPC stable
        ↓
D1 peripherals (2–3 weeks, parallel modules)
        ↓
D2 diagnostics matrix (automated first, then operator UI)
        ↓
S1 scoring + certificates
```

**Collector priority after Wave A+B (frozen):**

1. GPU → Display → USB → Bluetooth → Camera → Audio → Input  
2. Automated: storage, battery, network  
3. Operator: display, keyboard, camera, audio, USB hotplug  

**Explicitly out of v1:** thermal stress, DOS/bootable environment, macOS/Linux agents.

---

## 10. Scoring / certificates phase (S1)

- **Input:** `device_components` with `functional` + `health` populated
- **Engine location:** C# `HealthEngine` computes raw scores; API applies business rules (grade bands)
- **Output:** `certificates` row + downloadable artifact in portal
- **Stub cutover:** Replace `createCertificatesRouter` placeholder logic; gate on `scan.status = completed`

---

## 11. Windows Service phase (E1)

- **Trigger:** Customer needs Full SMART/BitLocker without "Run as administrator" on every launch
- **Architecture:** DeviceAgent (user) → Service (elevated) via second named pipe or same pipe with elevation handshake
- **Install:** Bundled in signed installer (R1); until then, manual `sc create` for dev
- **Not required for:** MVP activation, OTP, or basic inventory

---

## 12. GitHub push checkpoints

Push after each phase DoD. Suggested branch strategy: `main` protected; feature branches → PR → merge.

| Checkpoint | Branch/tag | Deploy |
|------------|------------|--------|
| P0 E2E verified | merge to `main` | Render + Netlify auto |
| L1 schema | `feat/commercial-schema` | Apply migration manually on Neon |
| L2 auth | `feat/v1-auth` | Render staging env |
| L3 license | `feat/v1-license` | Render staging |
| L4 portal | `feat/web-portal` | New Netlify site |
| L5 electron auth | `feat/electron-auth` | Manual installer build |
| H1 IPC | `feat/named-pipe-ipc` | Manual agent build |
| H2 AOT | `feat/native-aot` | CI artifact |
| D1/D2/S1/E1 | per-module PRs | continuous |

**Pre-freeze:** Only this plan file lands locally (`docs/GAP-BRIDGE-PLAN.md`). **Post-freeze:** User approves → push plan → begin P0/L1.

---

## 13. Risks and rollback

| Risk | Impact | Mitigation | Rollback |
|------|--------|------------|----------|
| Schema migration breaks P0 ingest | Lab down | Additive only; test on Neon branch DB | Skip migration; stay on session-only tables |
| SMS provider cost/abuse | OTP spam | Rate limits + captcha on register | `SMS_PROVIDER=console` dev-only |
| Dual auth confusion | Security hole | Feature flag `XCQC_LEGACY_INGEST=1` explicit | Re-enable ingest token only |
| AOT breaks WMI | Agent useless | H2 only after tests | Ship non-AOT build |
| Two Netlify sites complexity | Deploy drift | Document env vars per site | Single portal first, ops local-only |
| Fingerprint false positives | Support burden | `SAME_DEVICE` policy + admin rebind API | Manual `agent_activations` reset |
| Render free tier sleep | Bad first customer UX | Upgrade or cron ping | Accept for dev |
| Scope creep on D2 | Delays v1 | Ship automated-only first | Defer operator UI tests |

**Rollback rule:** Each migration has a `down` note (even if manual). Keep `Xcqc.Agent.exe` CLI path behind `--legacy-cli` until H1 proven for 2 weeks.

---

## 14. Freeze checklist (user signs yes/no)

Answer **before** implementation starts. Cursor agents treat unchecked items as blockers.

### Product decisions

| # | Question | Recommended default |
|---|----------|---------------------|
| F1 | Accept **ADJUST** (not redo)? | Yes |
| F2 | Licensing track is **critical path**; pause new collectors until L4? | Yes |
| F3 | **Two web apps** (portal + operator)? | Yes |
| F4 | **Mobile-centric `customers` table** (not map onto tenant-only RBAC)? | Yes |
| F5 | Device binding policy: **`SAME_DEVICE`** on RAM/disk change? | Yes |
| F6 | **Named Pipe IPC** required before production (H1)? | Yes |
| F7 | **Native AOT** deferred to H2 (after IPC)? | Yes |
| F8 | **`XCQC_INGEST_TOKEN`** remains for lab until L3 device JWT cutover? | Yes |
| F9 | v1 diagnostics: **automated + operator-assisted** (not automated-only)? | Yes |
| F10 | Windows Service **deferred** to E1? | Yes |

### Accounts and secrets (user confirms ready)

| # | Item | Ready? |
|---|------|--------|
| A1 | Neon project + pooled `DATABASE_URL` | ☐ |
| A2 | Render `xcqc-api` connected to GitHub | ☐ |
| A3 | Netlify ops site + `VITE_API_URL` | ☐ |
| A4 | Netlify portal site (new) planned | ☐ |
| A5 | SMS provider chosen (or console dev OK for L2) | ☐ |
| A6 | `JWT_SECRET`, `OTP_PEPPER`, `LICENSE_PEPPER` generated | ☐ |
| A7 | Windows 10/11 test laptop available | ☐ |
| A8 | GitHub push approval after freeze | ☐ |

### Technical freeze

| # | Item | Frozen value |
|---|------|--------------|
| T1 | API version prefix | `/api/v1` |
| T2 | Agent executable name (target) | `CYVRA.DeviceAgent.exe` |
| T3 | Electron product name | `CYVRA-XCQC` |
| T4 | Pipe name | `\\.\pipe\CYVRA-XCQC-Agent` |
| T5 | Key format | 16-digit numeric, hashed at rest |
| T6 | OTP | 6 digits, 5 min, 5 attempts |
| T7 | Download token TTL | 15 minutes, single use |
| T8 | Legacy route sunset | After L3 + 30 days |

---

## 15. Document deliverables (specs to write during execution)

| Doc | Phase | Owner |
|-----|-------|-------|
| `docs/specs/01-auth-license-device-binding.md` | L2 (before code) | Agent |
| `docs/api/v1-openapi.yaml` | L2–L3 | Agent |
| `docs/diagnostics/MATRIX.md` | D2 | Agent |
| `docs/security/fingerprint-policy.md` | L3 | User + agent |
| `docs/DEPLOY-PORTAL.md` | L4 | Agent |

---

## 16. Immediate next steps after freeze

1. User completes §14 checklist (yes/no + accounts).
2. Push `docs/GAP-BRIDGE-PLAN.md` to GitHub (user request).
3. Agent executes **P0** (Plan 3 E2E) — 2–5 days.
4. Agent executes **L1** migration on Neon branch.
5. Parallel spec: Document 01 in `docs/specs/01-auth-license-device-binding.md`.
6. **Stop** new hardware collectors until L4 DoD green.

---

*This plan closes all 10 gaps from `DOC-REVIEW-FINDINGS.md` §5. Implementation begins only after user freeze.*
