# CYVRA XCQC Android Agent (stub)

Kotlin agent lands here in a later phase. Windows Wave A validates the shared `ReportPayload` + live session protocol first.

## Planned layout

```
apps/agent-android/
  README.md          ← you are here
  app/               ← Android Studio module (future)
  collectors/        ← inventory, battery, sensors, guided UX
```

## Privilege modes (from DOCX)

- Consumer — best-effort identifiers
- Enterprise-MDM — reliable IMEI/serial where policy allows
- OEM-partner — authenticity APIs where available

## Do not

- Put scoring / pricing rules in the APK
- Promise silent IMEI on all consumer Play builds

Wire to the same API: `POST /sessions` → events → `finalize` with `ReportPayload` v1.
