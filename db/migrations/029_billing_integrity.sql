USE genz_os;

ALTER TABLE session_settlements ADD COLUMN IF NOT EXISTS voided_at DATETIME(3) NULL AFTER status;
ALTER TABLE session_settlements ADD COLUMN IF NOT EXISTS voided_by VARCHAR(64) NULL AFTER created_by;
ALTER TABLE session_settlements ADD COLUMN IF NOT EXISTS void_reason VARCHAR(255) NULL AFTER voided_by;
SET @fk_exists := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name='session_settlements' AND constraint_name='fk_session_settlement_void_staff');
SET @sql := IF(@fk_exists=0,'ALTER TABLE session_settlements ADD CONSTRAINT fk_session_settlement_void_staff FOREIGN KEY(voided_by) REFERENCES staff_users(id) ON DELETE SET NULL','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS billing_adjustments (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 session_id VARCHAR(64) NOT NULL,
 kind ENUM('DISCOUNT','SURCHARGE','ROUNDING','MANUAL') NOT NULL,
 amount BIGINT NOT NULL,
 reason VARCHAR(255) NOT NULL,
 created_by VARCHAR(64) NULL,
 created_at DATETIME(3) NOT NULL,
 CONSTRAINT fk_billing_adjustment_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_billing_adjustment_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
 INDEX idx_billing_adjustment_session(session_id,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(29,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
