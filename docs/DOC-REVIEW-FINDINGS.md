# DOC-REVIEW-FINDINGS — August 2026

**Review date:** 2026-08-11  
**Reviewer:** Cursor agent (retry after `resource_exhausted`)  
**Extraction method:** Python `zipfile` + `word/document.xml` parse (no `python-docx`; fastest path)  
**Compared against:** Windows .NET Wave A+B, Electron shell, `apps/api`, `apps/web`, Plan 3 (Neon → Render → Cloudflare Pages)

---

## 1. Documents reviewed

| File | Size | Extracted | Status |
|------|------|-----------|--------|
| `CYVORIQ Device Intelligence Architecture.docx` | 34,683 B | `docs/_extracted/CYVORIQ Device Intelligence Architecture.txt` (23,821 chars, 418 paragraphs) | **Done** |
| `CYVRA XCQC Native Agent Architecture Decision.docx` | 22,111 B | `docs/_extracted/CYVRA XCQC Native Agent Architecture Decision.txt` (19,531 chars, 343 paragraphs) | **Done** |

**Also referenced (markdown, not re-extracted):** `DOCX-ALIGNMENT.md`, `ARCHITECTURE.md`, `WINDOWS-AGENT-MVP.md`, `DEPLOY-RENDER-NEON-NETLIFY.md`, `FREE-STACK.md`, `RESUME-HERE.md`.

**Not found in `docs/`:** `CYVRA XCQC — Technical Feasibility & Architecture Document.docx` (referenced in `DOCX-ALIGNMENT.md` only).

---

## 2. Executive summaries

### 2.1 CYVORIQ Device Intelligence Architecture

A **development-ready SaaS + desktop specification** for CYVRA XCQC Device Intelligence Agent.

**Product intent:** Cloud-connected Windows agent to identify, inspect, diagnose, and certify laptops/desktops/servers for ITAD, refurbishment, resale, and corporate audit.

**Target stack (locked in doc):**

- **Web:** React + TypeScript + Tailwind on **Cloudflare Pages** (customer portal: registration, OTP, license, download, reports)
- **API:** Node.js + TypeScript on **Render** (Fastify or NestJS suggested)
- **DB:** **Neon PostgreSQL** (customers, license_keys, download_tokens, agent_activations, devices, device_scans, device_components, audit_logs)
- **Desktop:** **Electron** (UI, auth, progress, certificate) + **C#/.NET Native AOT** (hardware engine)
- **IPC:** Local authenticated API / Named Pipes — Electron must **not** shell out to `wmic`/`powershell` per operation

**Core security model:**

- **16-digit one-time license key** — hashed at rest (HMAC/KDF, not plain SHA-256 alone); never store raw key
- **Download authorization** separate from **activation** (download consumed once; key activated once on one device)
- **Mobile OTP** (5 min expiry, 5 attempts, rate limited)
- **Device fingerprint** from multiple signals (manufacturer, model, serial, UUID, BIOS, primary storage, TPM) — backend is sole authority
- **Access + refresh tokens** after activation; 16-digit key never re-transmitted

**Hardware scope (full product):**

- Discovery: system, firmware/SMBIOS, CPU, RAM modules, storage, GPU, display, camera, audio, keyboard, touchpad, Wi-Fi, Ethernet, Bluetooth, USB, TPM, Secure Boot, drivers
- Separation: **Discovery** (“what exists”) vs **Diagnostics** (“does it work”) vs **Health** (“condition”)
- Result model per component: `present`, `detected`, `functional`, `health`, `status`, `raw_data`, `test_data`, `timestamp`
- Functional tests: storage health, battery, network, camera, audio, display, keyboard, USB, thermal — with explicit `AUTOMATED_PASS | AUTOMATED_FAIL | NOT_TESTED | OPERATOR_VERIFIED | NOT_SUPPORTED`

**API surface (doc):** `/api/v1/auth/*`, `/api/v1/license/*`, `/api/v1/agent/*`, `/api/v1/device/*`, `/api/v1/reports/*`

**Development order (doc §30 — “LOCKED RECOMMENDATION”):**

1. GitHub monorepo → Neon schema → Render API
2. **Registration → OTP → 16-digit license → download auth → Electron install → one-time activation**
3. **Only then:** C# discovery modules, diagnostics, health scoring, certificates

**First milestone is explicitly NOT the hardware scanner** — it is the licensing/identity foundation.

---

### 2.2 CYVRA XCQC Native Agent Architecture Decision (Addendum A)

**Confirms and freezes** the split architecture from the main doc.

**Technology freeze:**

| Layer | Choice |
|-------|--------|
| UI shell | Electron + TypeScript/React |
| Hardware engine | C# + modern .NET **Native AOT** |
| Privileged ops | Optional small **Windows Service** (least privilege) |
| IPC | **Named Pipes** (preferred over unrestricted local HTTP) |
| Future | Rust/C++ only for specialized modules (v2.x) |

**Process model:**

1. `CYVRA-XCQC.exe` — Electron (auth, OTP, license, UI, cloud)
2. `CYVRA.DeviceAgent.exe` — headless Native AOT agent (discovery + diagnostics + health)
3. `CYVRA.DeviceService.exe` — optional privileged service

**Module map:** Core, Contracts, Security, DeviceIdentity, SystemDiscovery, FirmwareDiscovery, Cpu/Memory/Storage/Battery/Network/Usb/Display/Camera/Audio/Input/Driver/Security Discovery, Diagnostics, HealthEngine — each behind interfaces (`IStorageDiscovery`, etc.)

**Normalized JSON** returned to Electron; Electron does not parse WMI classes.

**Next doc specified:** “Document 01 — Authentication, License, One-Time Key, Download Authorization & Device Binding Specification” — **before** hardware modules.

---

## 3. Comparison to current CYVRA XCQC repo

| Area | Word docs | Current repo | Alignment |
|------|-----------|--------------|-----------|
| **Cloud stack** | Cloudflare Pages + Render + Neon | Plan 3 runbook; `render.yaml`, `docs/CLOUDFLARE-PAGES.md`, `neon-schema.sql` | **Strong** |
| **API framework** | Fastify or NestJS | Express + TypeScript | Minor delta |
| **API routes** | `/api/v1/auth`, `/license`, `/device/scan` | `/sessions`, `/events`, `/finalize`, stub `/auth/login`, `/licenses` | **Different model** |
| **DB schema** | Customer + mobile + 16-digit keys + download tokens | Tenant RBAC + `test_sessions` + `device_baselines` (Wave C) | **Different model** |
| **Web app role** | Customer self-service portal | Operator/admin shell (`apps/web`) | **Different audience** |
| **Auth** | Mobile OTP + 16-digit key lifecycle | Demo email login + `XCQC_INGEST_TOKEN` | **Not built** |
| **Dev sequencing** | License/OTP **before** hardware | Wave A+B hardware **before** license system | **Inverted** |
| **Electron role** | Full product UI + auth + cloud | Spawns `Xcqc.Agent.exe` CLI (`child_process.spawn`) | **Partial** |
| **IPC** | Named Pipes, controlled commands | CLI args + stdout | **Gap** |
| **Native agent name** | `CYVRA.DeviceAgent.exe` | `Xcqc.Agent.exe` | Naming only |
| **.NET deployment** | Native AOT | `net8.0-windows`, optional single-file publish | **Gap** |
| **Wave A inventory** | System, BIOS, CPU, RAM, disk, TPM, Secure Boot | Implemented per `WINDOWS-AGENT-MVP.md` | **On path** |
| **Wave B health** | Battery, SMART, TPM, BitLocker + broader health | Battery, SMART, Security collectors | **Partial / on path** |
| **Discovery breadth** | Camera, audio, display, USB topology, keyboard, touchpad, GPU, Bluetooth | Not in current collectors | **Future** |
| **Diagnostics engine** | Functional tests + operator-verified states | Event progress only; no functional test matrix | **Not built** |
| **Health scoring** | Per-component + overall score | Certificate grade stub in API | **Stub** |
| **Privileged service** | Optional Windows Service | Not implemented (admin elevation only) | Wave E |
| **Device binding** | Fingerprint + backend SAME_DEVICE policy | `device_baselines` JSONB for Wave C | **Partial** |
| **Signing / installer** | Signed installer pipeline | Documented as Wave E / future | **Deferred** |

---

## 4. Verdict

### **NEEDS ADJUSTMENT**

The repo is **architecturally on the right path** for stack choice (Electron shell + .NET collectors + Render API + Neon + Cloudflare Pages) and for **Windows-first Wave A+B inventory/health**. It is **not a full redo**.

However, the Word docs define a **customer-facing SaaS licensing product** with a **strict build order** (identity/licensing before hardware). The repo has optimized for **operator ingest MVP** and **hardware proof** first. That is a deliberate freeze choice (see `DOCX-ALIGNMENT.md`, `FREE-STACK.md`) but it **diverges from the Word doc’s locked milestone #1**.

**Do not treat the repo as wrong** — treat it as **Phase 0 / lab ingest** that must be **merged** with the doc’s **Phase 1–2 commercial foundation** before production customer rollout.

---

## 5. Top gaps (priority order)

1. **Commercial identity layer missing** — No mobile OTP, 16-digit key generation, key hashing, download-token vs activation split, or one-device binding API.
2. **Development sequencing conflict** — Docs: license first; repo: hardware Waves A+B first. Needs explicit product decision on whether lab ingest continues in parallel or pauses.
3. **Web portal audience** — Docs: customer self-registration; repo: tenant admin/operator. May need **two web surfaces** or a phased merge.
4. **Electron integration depth** — Docs: Named Pipe IPC + auth flows; repo: spawn CLI with `--api`/`--token`. Functional for lab, not production architecture.
5. **Native AOT not adopted** — Still standard .NET 8; doc freezes Native AOT for deployment footprint and startup.
6. **Neon schema mismatch** — Current schema fits session ingest + RBAC; doc schema needs `license_keys`, `download_tokens`, `agent_activations`, `customers` (mobile-centric).
7. **Diagnostics / functional test matrix** — Not implemented; doc expects PASS/FAIL/NOT_TESTED/OPERATOR_VERIFIED per component.
8. **Broad hardware modules** — Camera, audio, display, input devices, USB topology, GPU, Bluetooth — documented but not in collectors.
9. **API versioning & route structure** — `/api/v1/*` commercial routes vs current flat ingest routes.
10. **Certificate / health scoring** — Stubs exist; doc expects structured health engine output driving certificates.

---

## 6. Extraction notes (for transparency)

| Item | Detail |
|------|--------|
| Initial attempt | Shell `Get-ChildItem -Recurse` on full repo timed out (~342s); `Grep` interrupted |
| Blocker | Not file lock or huge files — **environment slowness** on broad recursive scans |
| `python-docx` | **Not installed** — used zip+xml extraction instead (~11s, successful) |
| Pending | **None** — both `.docx` files extracted |

---

## 7. Interactive questions (answer to steer next work)

Use these to decide whether to **pivot toward doc order**, **continue Wave C+ hardware**, or **run dual tracks**.

1. **Sequencing:** Should we **pause new hardware modules** and implement **Document 01** (OTP + 16-digit key + download auth + device binding) on Render/Neon **now**, or keep **Wave C / broader discovery** on the critical path while licensing is a parallel track?

2. **Portal model:** Is `apps/web` intended to become the **customer portal** (registration, mobile OTP, agent download), or should we add a **separate customer app** while keeping the current operator/admin UI for internal/lab use?

3. **Tenant vs customer schema:** Should Neon evolve to the **doc’s mobile-customer model** (`customers`, `license_keys`, `download_tokens`), or should we **map** 16-digit keys onto the existing **tenant/license_pool** RBAC model for B2B lab customers?

4. **Electron IPC:** For the next Electron milestone, do you want **Named Pipe IPC** (as frozen in Addendum A) or is **CLI spawn** acceptable until licensing UI ships?

5. **Native AOT:** Should the next agent publish target switch to **Native AOT** (`PublishAot`) now, or stay on **single-file self-contained** `net8.0` until Wave B is validated on your laptop?

6. **Ingest auth bridge:** Until full OTP exists, is **`XCQC_INGEST_TOKEN`** an acceptable **operator/lab** auth mode with a planned cutover to per-device tokens after activation?

7. **Hardware breadth:** After Wave B on your physical PC, what is the **next collector priority** — **Wave C baselines** (parts diff), or **peripheral discovery** (camera/audio/display/USB) from the main architecture doc?

8. **Diagnostics:** Which functional tests matter for **v1 customer value** — automated only (network ping, storage SMART), or **operator-verified** flows (keyboard, display, camera) in the first release?

9. **Device binding tolerance:** When RAM or storage is replaced, should the backend default to **SAME_DEVICE** (doc tolerance policy) or **require manual re-bind** for any fingerprint drift?

10. **Plan 3 deploy:** With Neon/Render/Cloudflare Pages accounts linked, should the **immediate next step** be **end-to-end agent → Render** verification, or **schema migration** to support license tables before any public customer onboarding?

---

## 8. Recommended immediate actions (no code — decision only)

| If priority is… | Do this next |
|-----------------|--------------|
| **Match Word doc commercial path** | Spec + implement Document 01 auth/license; extend Neon schema; Electron auth screens |
| **Match current repo momentum** | Finish Plan 3 E2E (agent → Render); validate Wave B on laptop; then Wave C baselines |
| **Balanced** | Plan 3 E2E **this week**; start Document 01 API routes **in parallel** without blocking hardware |

---

*Generated from extracted text in `docs/_extracted/`. No git commit requested.*
