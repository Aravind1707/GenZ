USE genz_os;

ALTER TABLE customer_credit_payments
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NULL AFTER reference;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='customer_credit_payments' AND index_name='uq_credit_payment_idempotency');
SET @sql := IF(@idx_exists=0,'ALTER TABLE customer_credit_payments ADD UNIQUE KEY uq_credit_payment_idempotency(customer_id,idempotency_key)','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO schema_migrations(version,applied_at) VALUES(30,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
