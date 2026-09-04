USE genz_os;

ALTER TABLE orders
  ADD COLUMN client_idempotency_hash CHAR(64) NULL AFTER client_idempotency_key;

INSERT INTO schema_migrations(version,applied_at)
VALUES(22,NOW(3))
ON DUPLICATE KEY UPDATE applied_at=applied_at;
