-- CYVRA XCQC — L1 commercial identity schema (additive migration)
-- Apply AFTER apps/api/sql/neon-schema.sql (P0 base schema).
-- See docs/GAP-BRIDGE-PLAN.md §5 and docs/FREEZE-STATUS.md
--
-- Apply order:
--   1. neon-schema.sql
--   2. neon-schema-l1-commercial.sql (this file)
--
-- Rollback (manual — only if L1 applied before any commercial data):
--   DROP TABLE IF EXISTS device_components, device_scans, audit_logs,
--     agent_activations, download_tokens, license_keys, otp_transactions,
--     devices, customers CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- customers (mobile-centric, Word-doc aligned)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|active|suspended
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_mobile_created ON otp_transactions(mobile, created_at DESC);

CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  key_hash TEXT NOT NULL UNIQUE,
  key_last4 CHAR(4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available|activated|revoked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_license_keys_customer ON license_keys(customer_id);

CREATE TABLE IF NOT EXISTS download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  license_id UUID NOT NULL REFERENCES license_keys(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_download_tokens_license ON download_tokens(license_id);

CREATE TABLE IF NOT EXISTS devices (
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
CREATE INDEX IF NOT EXISTS idx_devices_customer ON devices(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);

CREATE TABLE IF NOT EXISTS agent_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  license_id UUID NOT NULL REFERENCES license_keys(id),
  device_id UUID NOT NULL REFERENCES devices(id),
  agent_version TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active|revoked|suspended
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_activations_license ON agent_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_agent_activations_device ON agent_activations(device_id);

CREATE TABLE IF NOT EXISTS device_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id),
  session_id UUID REFERENCES test_sessions(session_id), -- bridge to P0 ingest
  agent_version TEXT,
  scan_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'in_progress' -- in_progress|completed|failed
);
CREATE INDEX IF NOT EXISTS idx_device_scans_device ON device_scans(device_id);
CREATE INDEX IF NOT EXISTS idx_device_scans_session ON device_scans(session_id);

CREATE TABLE IF NOT EXISTS device_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES device_scans(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  present BOOLEAN,
  detected BOOLEAN,
  functional TEXT, -- AUTOMATED_PASS|AUTOMATED_FAIL|NOT_TESTED|OPERATOR_VERIFIED|NOT_SUPPORTED
  health TEXT,
  status TEXT,
  raw_data JSONB,
  test_data JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_device_components_scan ON device_components(scan_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  event TEXT NOT NULL,
  ip INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_customer ON audit_logs(customer_id, created_at DESC);

-- Bridge: optional customer link on lab sessions (nullable — lab ingest unchanged)
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON test_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON test_sessions(device_id);
