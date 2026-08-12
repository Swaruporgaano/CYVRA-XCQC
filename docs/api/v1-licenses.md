# API v1 — Licenses (L3)

Base path: `/api/v1/license` and `/api/v1/agent`

Requires Render env: `JWT_SECRET`, `OTP_PEPPER`, `LICENSE_PEPPER`. Dev helpers: `OTP_DEV_MODE=true`, `LICENSE_DEV_MODE=true`.

## GET /api/v1/license/status

`Authorization: Bearer <customer-jwt>`

**200** — `{ licenses: [{ id, keyLast4, status, activation? }], policy: "SAME_DEVICE", downloadTokenTtlMinutes: 15 }`

## POST /api/v1/license/issue

Issue a new 16-digit license key for the authenticated customer.

`Authorization: Bearer <customer-jwt>`

**201** — `{ license, licenseKey, message, displayOnce? }`  
Key is shown once at issue time. With `LICENSE_DEV_MODE=true`, `licenseKey` is always returned.

## POST /api/v1/license/download-authorize

Create a single-use download token (15 min TTL). License stays `available` until activation.

```json
{ "licenseId": "uuid" }
```

`Authorization: Bearer <customer-jwt>`

**200** — `{ downloadToken, expiresAt, downloadUrl, message }`

## GET /api/v1/license/download

`Authorization: Bearer <download-token>` (not customer JWT)

Streams installer placeholder (`CYVRA-XCQC-setup-stub.exe`). Token is consumed on first use.

**410** — `download_token_consumed` or `download_token_expired`

## POST /api/v1/license/activate

Activate license on a device (mobile + key + OTP + fingerprint). Enforces one-device / SAME_DEVICE policy.

```json
{
  "mobile": "9876543210",
  "licenseKey": "1234567890123456",
  "otp": "123456",
  "fingerprint": {
    "manufacturer": "Dell",
    "model": "Latitude 7420",
    "chassisSerial": "ABC123",
    "systemUuid": "uuid-here"
  },
  "agentVersion": "0.1.0"
}
```

**201** — `{ activation, device, deviceToken, refreshToken, message }`  
**409** — `license_already_activated` (different device)

### Device fingerprint

Backend hashes best-effort signals (chassis serial, board serial, system UUID, CPU id, disk serial). Policy: `SAME_DEVICE` — re-activation on same fingerprint allowed; different fingerprint blocked.

## POST /api/v1/agent/bootstrap

Refresh device access token after app restart.

```json
{ "refreshToken": "...", "deviceId": "uuid" }
```

**200** — `{ deviceToken, refreshToken, activation }`

## POST /api/v1/agent/heartbeat

`Authorization: Bearer <device-jwt>`

```json
{ "agentVersion": "0.1.0" }
```

**200** — `{ ok: true, deviceId, lastSeenAt }`

## Session ingest (device JWT cutover)

`POST /sessions` accepts **either**:

- `XCQC_INGEST_TOKEN` (lab/operator bridge), or
- `Authorization: Bearer <device-jwt>` (post-activation)

Disable device JWT ingest with `XCQC_DEVICE_JWT_INGEST=0`.

## Audit

State transitions logged to `audit_logs`: `license.issued`, `download.authorized`, `download.consumed`, `license.activated`, `agent.heartbeat`.

## Testing after Render redeploy

```bash
# Wake API
curl -s https://cyvra-xcqc.onrender.com/health
# Expect phase: "L3", licenseConfigured: true

# Register + OTP (see v1-auth.md), then:
curl -s -H "Authorization: Bearer $CUSTOMER_JWT" \
  https://cyvra-xcqc.onrender.com/api/v1/license/issue -X POST

# Cloudflare Worker UI: https://cyvra-xcqc.orgaanoagrolab.workers.dev/account
```

Future customer portal: **cyvoriq.com** subdomain (documented only — no DNS in repo).
