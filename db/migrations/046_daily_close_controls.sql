USE genz_os;

CREATE TABLE IF NOT EXISTS daily_close_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  business_date DATE NOT NULL,
  action ENUM('CASH_COUNT','APPROVE','REOPEN') NOT NULL,
  staff_id VARCHAR(64) NULL,
  previous_status ENUM('OPEN','APPROVED') NULL,
  new_status ENUM('OPEN','APPROVED') NULL,
  counted_cash BIGINT UNSIGNED NULL,
  cash_variance BIGINT NULL,
  reconciliation_difference BIGINT NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_daily_close_event_staff FOREIGN KEY(staff_id) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_daily_close_events_date(business_date,created_at),
  INDEX idx_daily_close_events_staff(staff_id,created_at)
) ENGINE=InnoDB;

ALTER TABLE daily_cash_counts
  ADD COLUMN IF NOT EXISTS reopen_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER approved_at;

DROP TRIGGER IF EXISTS trg_finance_txn_closed_insert;
DROP TRIGGER IF EXISTS trg_finance_txn_closed_update;
DROP TRIGGER IF EXISTS trg_finance_txn_closed_delete;

CREATE TRIGGER trg_finance_txn_closed_insert BEFORE INSERT ON finance_transactions
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM daily_cash_counts WHERE business_date=DATE(NEW.created_at) AND status='APPROVED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DAILY_CLOSE_PERIOD_LOCKED';
  END IF;
END;

CREATE TRIGGER trg_finance_txn_closed_update BEFORE UPDATE ON finance_transactions
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM daily_cash_counts WHERE business_date=DATE(OLD.created_at) AND status='APPROVED')
     OR EXISTS (SELECT 1 FROM daily_cash_counts WHERE business_date=DATE(NEW.created_at) AND status='APPROVED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DAILY_CLOSE_PERIOD_LOCKED';
  END IF;
END;

CREATE TRIGGER trg_finance_txn_closed_delete BEFORE DELETE ON finance_transactions
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM daily_cash_counts WHERE business_date=DATE(OLD.created_at) AND status='APPROVED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DAILY_CLOSE_PERIOD_LOCKED';
  END IF;
END;

INSERT INTO schema_migrations(version,applied_at) VALUES(46,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
