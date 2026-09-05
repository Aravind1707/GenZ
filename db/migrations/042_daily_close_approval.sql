USE genz_os;

ALTER TABLE daily_cash_counts ADD COLUMN status ENUM('OPEN','APPROVED') NOT NULL DEFAULT 'OPEN' AFTER counted_cash;
ALTER TABLE daily_cash_counts ADD COLUMN approved_by VARCHAR(64) NULL AFTER counted_by;
ALTER TABLE daily_cash_counts ADD COLUMN approved_at DATETIME(3) NULL AFTER counted_at;

ALTER TABLE daily_cash_counts
  ADD CONSTRAINT fk_daily_cash_count_approved_staff FOREIGN KEY(approved_by) REFERENCES staff_users(id) ON DELETE SET NULL;

INSERT INTO schema_migrations(version,applied_at) VALUES(42,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
