USE genz_os;

ALTER TABLE session_payment_refunds
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NULL AFTER reference;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='session_payment_refunds' AND index_name='uq_session_refund_idempotency_key');
SET @sql := IF(@idx_exists=0,'ALTER TABLE session_payment_refunds ADD UNIQUE KEY uq_session_refund_idempotency_key(settlement_id,idempotency_key)','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO schema_migrations(version,applied_at) VALUES(34,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
