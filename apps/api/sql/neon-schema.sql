-- CYVRA XCQC — Neon schema stub (apply when DATABASE_URL exists)
-- Do NOT require Neon for Wave A MVP (memory/file store is enough).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(tenant_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS license_pools (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(tenant_id),
  credits_remaining INT NOT NULL DEFAULT 0,
  credits_total INT NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'mvp-demo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  operator_id TEXT,
  status TEXT NOT NULL,
  profile TEXT,
  platform TEXT,
  agent_version TEXT,
  completeness TEXT,
  certificate_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES test_sessions(session_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  module_id TEXT,
  percent INT,
  message TEXT,
  data JSONB,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  report_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES test_sessions(session_id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  payload_sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certificates (
  certificate_id TEXT PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES test_sessions(session_id),
  report_id UUID NOT NULL,
  completeness TEXT NOT NULL,
  grade_band TEXT,
  grade_score NUMERIC,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wave C: component serial baselines per chassis
CREATE TABLE IF NOT EXISTS device_baselines (
  chassis_serial TEXT PRIMARY KEY,
  tenant_id TEXT,
  fingerprint JSONB NOT NULL,
  last_session_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated ON test_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id, ts);
