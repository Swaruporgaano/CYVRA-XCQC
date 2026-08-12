# API v1 — Auth (L2)

Base path: `/api/v1/auth`

Requires Render env: `JWT_SECRET`, `OTP_PEPPER`. For dev without SMS: `OTP_DEV_MODE=true` or `SMS_PROVIDER=console`.

## POST /api/v1/auth/register

Create a customer (mobile required, email optional) and send OTP.

```json
{ "mobile": "9876543210", "email": "you@example.com", "name": "Ada" }
```

**201** — `{ customer, otp: { otpId, expiresAt, devOtp? }, message }`  
**409** — `mobile_exists` or `email_exists`

## POST /api/v1/auth/request-otp

Request a new OTP for an existing customer.

```json
{ "mobile": "9876543210" }
```

**200** — `{ otp: { otpId, expiresAt, devOtp? } }`  
**429** — `rate_limited` (max 5/hour per mobile)

## POST /api/v1/auth/verify-otp

Verify OTP and receive JWT.

```json
{ "mobile": "9876543210", "otp": "123456", "otpId": "uuid-optional" }
```

**200** — `{ token, customer }`  
**401** — `otp_invalid`  
**410** — `otp_expired` or `otp_locked`

## POST /api/v1/auth/login

Shorthand login: mobile only → issues OTP; mobile + otp → same as verify-otp.

```json
{ "mobile": "9876543210" }
```

or

```json
{ "mobile": "9876543210", "otp": "123456", "otpId": "uuid" }
```

## GET /api/v1/auth/me

`Authorization: Bearer <customer-jwt>`

**200** — `{ customer }`

## CORS

Set `CORS_ORIGINS` on Render (comma-separated). Defaults allow `*.workers.dev` and `*.cyvoriq.com`.

## OTP rules

- 6 digits, 5 minute TTL, 5 verify attempts per transaction
- Hashed at rest with HMAC-SHA256 (`OTP_PEPPER`)
- `devOtp` only returned when `OTP_DEV_MODE=true` or `SMS_PROVIDER=console`
