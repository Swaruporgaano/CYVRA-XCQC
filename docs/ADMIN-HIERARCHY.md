# Admin hierarchy (from architecture DOCX)

Server must enforce `roleRank` on every privileged route. UI only hides buttons.

```
PLATFORM_SUPER          ← CYVRA internal (all tenants)
  └── PLATFORM_SUPPORT
        └── TENANT_OWNER
              └── TENANT_ADMIN
                    └── SUPERVISOR
                          └── OPERATOR
                                └── AUDITOR
```

Ranks are mirrored in `@cyvra/xcqc-shared` (`ADMIN_ROLES` / `ROLE_RANK`).

## Report families (same raw telemetry)

1. Post Production Testing  
2. OQC & IQC  
3. Business Reporting  
4. Device Standardisation & Compliance  

Admin IA (later Netlify): `/admin/tenants`, `/sessions`, `/session/:id`, certificates, exports.

Wave A MVP does **not** ship the web admin — only API storage of sessions + finalized `ReportPayload`.
