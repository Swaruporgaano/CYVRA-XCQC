# Agent distribution — CYVRA XCQC

End users run the Windows agent as a **native executable**, not Docker.

## Current (MVP / lab)

| Channel | Notes |
|---------|--------|
| **GitHub Releases** | Temporary: publish `Xcqc.Agent.exe` (and Electron bundle) per tagged release |
| **Local build** | `apps/agent-windows` — see `docs/WINDOWS-AGENT-MVP.md` |

Operators share a release URL with lab technicians. No container runtime required on Windows PCs.

## Planned (production)

| Channel | Notes |
|---------|--------|
| **R2 + cyvoriq.com CDN** | Signed download URLs after L3 license activation |
| **In-app download** | Customer portal authorizes download token → single-use link |

## Not for end users

- Docker images (dev/CI only)
- `npm run dev:api` on customer machines
- Raw repo clones for field technicians

## Related

- L3 download token API — `docs/GAP-BRIDGE-PLAN.md`
- Windows agent MVP — `docs/WINDOWS-AGENT-MVP.md`
- Electron scaffold — `apps/agent-windows/electron/`
