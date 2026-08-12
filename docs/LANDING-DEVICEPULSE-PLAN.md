# CYVORIQ DevicePulse — Landing Page Plan

**Status:** EXECUTED (2026-08-12)  
**Source doc:** [`docs/CYVORIQ DevicePulse.docx`](./CYVORIQ%20DevicePulse.docx)  
**Extracted text:** [`docs/_extracted/CYVORIQ DevicePulse.txt`](./_extracted/CYVORIQ%20DevicePulse.txt)  
**Date:** 2026-08-12

---

## 1. Source document

| Item | Value |
|------|--------|
| **Primary file** | `docs/CYVORIQ DevicePulse.docx` |
| **Title in doc** | *CYVORIQ DevicePulse — Complete Landing Page Content & Structure* |
| **Related (not landing)** | `docs/_extracted/CYVORIQ Device Intelligence Architecture.txt` (XCQC agent/SaaS architecture) |
| **Related (not landing)** | `CYVRA XCQC — Status Report.docx`, `XCQC Arc.docx` (root — architecture/status, not marketing copy) |

No separate “Device Plus” filename was found; **DevicePulse** is the marketing product name in the doc.

---

## 2. Brand & positioning summary

### Brand hierarchy (frozen in doc §23)

```
CYVORIQ Solutions Pvt Ltd.          ← company
└── CYVORIQ DevicePulse             ← product (Device Health & Intelligence Platform)
    ├── DevicePulse Personal        ← Laptop · Desktop · Mobile · Tablet
    ├── DevicePulse Infrastructure  ← Server · IoT
    └── DevicePulse Enterprise      ← Enterprise endpoints · IT assets · lifecycle
```

| Field | Value |
|-------|--------|
| **Brand line** | Know. Check. Understand. Trust Your Device. |
| **Hero H1** | Know the Health of Every Device. |
| **Value prop H2** | One Platform. Every Device. Clearer Decisions. |
| **SEO title** | CYVORIQ DevicePulse \| Device Health & Diagnostics Platform |
| **Meta description** | Assess laptop, desktop, mobile, tablet, server, IoT and enterprise device health with structured reports. |

### DevicePulse vs CYVRA XCQC

| | **CYVORIQ DevicePulse** | **CYVRA XCQC** |
|---|-------------------------|----------------|
| **Role** | Customer-facing brand, marketing, multi-device platform story | Technical product: Windows native agent + Electron shell + cloud ingest |
| **Audience** | Individuals, IT teams, refurbishers, ITAD, resellers, enterprises | Operators, lab ingest, licensed Windows diagnostics |
| **Scope** | All device categories (laptop → IoT → enterprise) — aspirational roadmap | Windows 10/11/Server hardware discovery, diagnostics, certification (built today) |
| **Relationship** | DevicePulse is the **umbrella**; XCQC is the **Windows intelligence engine** behind “Laptop/Desktop/Server” assessments today |

Landing copy should lead with **DevicePulse**; mention XCQC only where Windows agent depth is relevant (e.g. “Powered by CYVRA XCQC on Windows” in a trust/tech strip — optional, confirm with stakeholder).

---

## 3. Content outline (from doc)

Use as section order for `/` landing page.

| # | Section | Key copy / elements |
|---|---------|---------------------|
| 1 | **Header** | Logo `CYVORIQ DevicePulse`; nav: Home, How It Works, Devices, What We Check, Reports, For Business, FAQ; CTAs: Login, **Get DevicePulse** (sticky, lightweight) |
| 2 | **Hero** (full-bleed) | H1 + subhead (multi-device assessment); primary **Get DevicePulse**, secondary **See How It Works**; trust line “Powered by CYVORIQ Solutions Pvt Ltd.”; visual: device orbit around **DEVICE HEALTH 92/100** + category chips (Hardware, Performance, Battery, Storage, Connectivity, System, Security) |
| 3 | **Core value** | CHECK → ANALYZE → SCORE → REPORT → DECIDE (5-step flow) |
| 4 | **Device ecosystem** | 7 cards: Laptop, Desktop, Mobile, Tablet, Server, IoT, Enterprise — each with “Explore … Assessment →” |
| 5 | **What we check** | 8 categories: Hardware, Performance, Battery & Power, Storage, Display & Input, Connectivity, System & Software, Security Indicators (no false cybersecurity claims) |
| 6 | **Health score** | Example 92/100, sub-scores, “Recommended for Continued Use”; **transparent methodology**, not unexplained “AI score” |
| 7 | **Findings** | Status language: Healthy / Attention / Warning / Information |
| 8 | **How it works** | 8 steps: Register → Verify → Select device → Download/Access → Run → Analyze → Review → Report |
| 9 | **Sample report** | Device overview, overall score, key findings, recommended action |
| 10 | **User zone** | Register → verify → KYC (where required) → assess → history |
| 11 | **Dashboard preview** | My Devices, scores, reports, download, account (can link to existing `/account`) |
| 12 | **Enterprise** | Inventory, standardized assessment, health visibility, reports, lifecycle, API (future) |
| 13 | **Lifecycle** | USE → CHECK → ANALYZE → SERVICE → REDEPLOY → RESALE → REFURBISH → RETIRE |
| 14 | **Why DevicePulse** | One platform, structured assessment, understandable results, traceable reports, scale, lifecycle-ready |
| 15 | **Who it’s for** | Individuals, businesses, IT, refurbishers, ITAD, resellers, service providers |
| 16 | **Privacy** | What we collect / why / user controls / honest limits |
| 17 | **FAQ** | 8 Q&As from doc (accordion) |
| 18 | **Final CTA** | “Know Your Device Before You Decide Its Future.” — Get DevicePulse / Register / Login |
| 19 | **Footer** | Product, Platform, Business, Company, Legal, Support columns |
| 20 | **SEO** | Single H1; H2/H3 hierarchy per doc §21; JSON-LD: Organization, SoftwareApplication, WebSite, BreadcrumbList (FAQ rich results not a goal) |

### Primary CTAs (throughout)

- **Get DevicePulse** → `/account/register` (or dedicated signup flow)
- **Login** → `/account/login`
- **See How It Works** → `#how-it-works` anchor
- Device cards → `#devices` or future deep links (can stub to same page sections initially)

---

## 4. Design direction

### Doc visual spec (§23)

- **Palette:** Primary navy, bright tech blue, background `#F4F6F8`, white cards, dark navy/charcoal text; success green, attention amber, warning red.
- **Language:** Device silhouettes, diagnostic rings, health scores, data cards, subtle grid, controlled gradients.
- **Avoid:** Cyber/hacker neon, generic stock clutter, excessive animation, “antivirus” aesthetic.
- **Final CTA block:** “dramatic but clean blue-gradient section.”

### Adaptation for build (user frontend rules)

The doc describes a **light enterprise SaaS** look. Current `apps/web` operator shell uses a **dark forest-green** theme (`--accent: #3dcf8e`, DM Sans). For the **public landing only**:

| Principle | Direction |
|-----------|-------------|
| **Brand first** | Lead with CYVORIQ DevicePulse wordmark + tagline; XCQC as sub-brand in footer/tech strip only if approved |
| **No purple-AI-slop** | No violet gradients, no “AI sparkle” stock; health score is **methodology-based**, not magic |
| **Expressive typography** | Pair a distinctive display face for headlines (e.g. **Instrument Sans**, **Sora**, or **Plus Jakarta Sans**) with a readable body (e.g. **Source Sans 3** or keep **DM Sans** for continuity with app) |
| **Atmospheric background** | Full-bleed hero: soft navy-to-slate gradient + subtle grid/noise + faint diagnostic ring SVG (not flat `#F4F6F8` only) |
| **Full-bleed hero** | Edge-to-edge hero; content max-width ~1200px inside |
| **Scoped styles** | Landing CSS module or `landing.css` — do **not** change operator `/app` dark theme globals |

**Recommended landing tokens (starting point):**

```css
--dp-navy: #0b1f3a;
--dp-blue: #1a6fd4;
--dp-bg: #f4f6f8;
--dp-surface: #ffffff;
--dp-text: #1a2332;
--dp-muted: #5c6b7a;
--dp-success: #1f8f5f;
--dp-attention: #c98a1a;
--dp-warning: #c94a4a;
```

Hero can invert to **dark navy full-bleed** with light text for drama; body sections alternate white / light grey bands per doc.

---

## 5. Where it lives in the monorepo

### Current routing (`apps/web/src/App.tsx`)

| Path | Today |
|------|--------|
| `/` | Operator dashboard (shell) |
| `/operator`, `/sessions`, … | Operator IA |
| `/account/*` | Customer auth + account (L2/L3) |

### Recommendation: **integrate into `apps/web`**

Prefer a **single Worker deploy** with route split:

| Path | After landing ship |
|------|-------------------|
| `/` | **Public marketing landing** (DevicePulse) |
| `/app/*` | Operator console (current dashboard, sessions, etc.) |
| `/account/*` | Customer portal (unchanged) |

**Why not a new `apps/landing` or `apps/web-portal` yet**

- User preference: integrate at `/`.
- Customer flows already live at `/account/*` on the same app.
- `FREEZE-STATUS.md` F3 mentions `apps/web-portal` — treat that as **deferred** until landing + `/app` split proves insufficient (e.g. separate `portal.cyvoriq.com` subdomain).

### Implementation sketch (when approved)

```
apps/web/src/
  pages/
    landing/
      LandingPage.tsx      # composes sections
      sections/            # Hero, Ecosystem, FAQ, etc.
      landing.css          # scoped tokens
  App.tsx                  # Route "/" → LandingPage; "/app/*" → OperatorShell
```

- Redirect or nav link: operator users bookmark `/app` (add “Operator console” in footer for internal use).
- `index.html` title/meta updated for DevicePulse SEO on landing route (React Helmet or Vite HTML per-route if SSR added later).

### Deploy

- Same Cloudflare Worker (`apps/web/wrangler.jsonc`); no second project for v1.
- Production domain (documented): subdomain of **cyvoriq.com** (`FREEZE-STATUS.md`).

---

## 6. Logo status

| Asset | Status |
|-------|--------|
| CYVORIQ logo (png/svg) | **DONE** — `apps/web/public/brand/cyvoriq-logo.png` |
| DevicePulse wordmark | CSS typographic lockup on landing |
| Favicon | **NOT FOUND** (`apps/web/public/` has only `_redirects`) |

**Action for parent / user:** Upload brand assets before visual polish:

```
apps/web/public/brand/
  cyvoriq-logo.svg          # company mark
  devicepulse-wordmark.svg  # product lockup (optional)
  favicon.svg
```

Until upload: use typographic wordmark **CYVORIQ** + **DevicePulse** (doc header style) with CSS only.

---

## 7. Build phases (after freeze)

1. **Route split** — `/` landing shell, `/app/*` operator (no content yet).
2. **Hero + header + footer** — CTAs wired to `/account/register` and `/account/login`.
3. **Content sections** — static copy from doc; anchor nav.
4. **Visual polish** — rings, score mock, device silhouettes (SVG, no stock photos).
5. **SEO** — meta, OG, JSON-LD.
6. **Mobile** — sticky header, section stacking, Core Web Vitals pass.

---

## 8. Three freeze questions (answered 2026-08-12)

1. **Brand on landing vs operator:** **Only DevicePulse** on public marketing — no CYVRA name on landing. Operator console says "DevicePulse Console". Package/backend names stay XCQC.

2. **Theme:** **Light navy landing** (scoped `landing.css`) + **dark operator** at `/app/*` unchanged.

3. **Route & portal split:** **`/` = marketing landing** + **`/app` = operator** on same `apps/web` Worker. `apps/web-portal` deferred to L4.

---

## 8a. Original freeze questions (archived)

1. **Brand on landing vs operator:** Should the public site say **only “CYVORIQ DevicePulse”**, or also surface **“CYVRA XCQC”** as the Windows agent name (e.g. in hero subcopy or a “Technology” strip)? This affects copy and footer architecture.

2. **Theme:** Doc specifies **light navy/blue enterprise SaaS**; operator app is **dark green**. Confirm landing uses the **doc light theme** (scoped) while `/app` stays dark — or unify under one CYVORIQ palette for both.

3. **Route & portal split:** Confirm **`/` = marketing landing** + **`/app` = operator** on the same `apps/web` Worker (overriding freeze F3 `apps/web-portal`), **or** insist on a separate `apps/web-portal` deploy before any landing work.

---

## 9. Quick reference — hero copy (ready to paste)

**Headline:** Know the Health of Every Device.

**Subheadline:** CYVORIQ DevicePulse is a device health and intelligence platform that assesses laptops, desktops, mobiles, tablets, servers, IoT devices and enterprise technology assets—helping you understand device condition, performance and readiness.

**Primary CTA:** Get DevicePulse  
**Secondary CTA:** See How It Works  
**Trust:** Powered by CYVORIQ Solutions Pvt Ltd.

---

*Generated from `docs/CYVORIQ DevicePulse.docx`. Implementation intentionally deferred per team direction.*
