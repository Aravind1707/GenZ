USE genz_os;

ALTER TABLE daily_cash_counts
  ADD COLUMN IF NOT EXISTS status ENUM('OPEN','APPROVED') NOT NULL DEFAULT 'OPEN' AFTER counted_cash,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64) NULL AFTER counted_by,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME(3) NULL AFTER counted_at;

ALTER TABLE daily_cash_counts
  ADD CONSTRAINT fk_daily_cash_count_approved_staff FOREIGN KEY(approved_by) REFERENCES staff_users(id) ON DELETE SET NULL;

INSERT INTO schema_migrations(version,applied_at) VALUES(42,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
