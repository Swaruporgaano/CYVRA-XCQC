# Architecture summary (CYVRA XCQC)

```
[Android Agent — later]     [Windows Agent .NET Wave A+]
[Kotlin collectors]         [WMI collectors + Electron UI shell]
            \                       /
             \                     /
              ▼                   ▼
         HTTPS JSON ReportPayload + live session events
                          │
                          ▼
              Render free web service (apps/api)
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
         memory/file   Neon (later)  optional KV
              │
              ▼
         Netlify apps/web (admin / operator windows onto truth)
```

## Principles

1. Agents are dumb collectors (no scoring / pricing secrets).
2. API owns truth (ingest, licenses, certificates, RBAC).
3. Web is windows onto truth.
4. Authenticity is structured confidence — not absolute teardown claims.

## Windows collector waves

| Wave | Status in this build |
|------|----------------------|
| A Inventory | **Implemented** (native .NET) |
| B Battery/SMART/TPM depth | Not yet |
| C Parts composition diff | Needs Neon baselines |
| D Live/guided | Partial (events + Electron progress log) |
| E Harden / sign / service | Not yet |

## Electron

Added **after** Wave A: operator preflight UI that **spawns** `Xcqc.Agent.exe`. Diagnostics remain native.
