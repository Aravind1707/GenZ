USE genz_os;

-- Link a gaming session to a real customer when known. This is nullable for walk-ins.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64) NULL AFTER customer_name;
ALTER TABLE sessions ADD INDEX IF NOT EXISTS idx_sessions_customer_status(customer_id,status);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_customer_credit FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- A session is ENDed when play stops, but the station remains blocked until its bill is settled.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS settlement_status ENUM('NOT_DUE','DUE','PARTIALLY_PAID','CREDIT','SETTLED') NOT NULL DEFAULT 'NOT_DUE' AFTER status;
ALTER TABLE sessions ADD INDEX IF NOT EXISTS idx_sessions_settlement(settlement_status,status);

-- Approved regular customers can accumulate charges and settle periodically.
CREATE TABLE IF NOT EXISTS customer_credit_accounts (
  customer_id VARCHAR(64) NOT NULL PRIMARY KEY,
  status ENUM('ACTIVE','SUSPENDED','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  credit_limit BIGINT UNSIGNED NOT NULL DEFAULT 0,
  billing_cycle ENUM('MONTHLY','MANUAL') NOT NULL DEFAULT 'MONTHLY',
  approved_by VARCHAR(64) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_credit_account_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_account_staff FOREIGN KEY(approved_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_credit_account_status(status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_credit_entries (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  source_type ENUM('SESSION','ADJUSTMENT') NOT NULL,
  source_id VARCHAR(64) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_credit_entry_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_entry_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_credit_entry_source(source_type,source_id),
  INDEX idx_credit_entry_customer_created(customer_id,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_credit_payments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  method ENUM('CASH','UPI','CARD','OTHER') NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  reference VARCHAR(120) NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_credit_payment_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_credit_payment_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_credit_payment_customer_created(customer_id,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(26,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
