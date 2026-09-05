USE genz_os;

ALTER TABLE session_payment_refunds
  ADD COLUMN IF NOT EXISTS provider VARCHAR(80) NULL AFTER method,
  ADD COLUMN IF NOT EXISTS external_reference VARCHAR(160) NULL AFTER provider,
  ADD COLUMN IF NOT EXISTS provider_status ENUM('NOT_SENT','PENDING','SUCCEEDED','FAILED') NOT NULL DEFAULT 'NOT_SENT' AFTER external_reference;

CREATE INDEX idx_session_refund_provider ON session_payment_refunds(provider,provider_status,created_at);

INSERT INTO schema_migrations(version,applied_at) VALUES(41,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
