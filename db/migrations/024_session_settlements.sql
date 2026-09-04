USE genz_os;

CREATE TABLE IF NOT EXISTS session_settlements (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  method ENUM('CASH','UPI','CARD','RAZORPAY','OTHER') NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  status ENUM('CAPTURED','VOIDED') NOT NULL DEFAULT 'CAPTURED',
  idempotency_key VARCHAR(100) NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_session_settlement_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_session_settlement_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_session_settlement_idem(session_id,idempotency_key),
  INDEX idx_session_settlement_session(session_id,created_at),
  INDEX idx_session_settlement_status(status,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(24,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
