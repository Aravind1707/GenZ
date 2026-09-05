USE genz_os;

CREATE TABLE IF NOT EXISTS daily_cash_counts (
  business_date DATE NOT NULL PRIMARY KEY,
  counted_cash BIGINT UNSIGNED NOT NULL,
  notes VARCHAR(255) NULL,
  counted_by VARCHAR(64) NULL,
  counted_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_daily_cash_count_staff FOREIGN KEY(counted_by) REFERENCES staff_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(35,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
