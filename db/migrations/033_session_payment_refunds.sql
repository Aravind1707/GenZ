USE genz_os;

-- A refund is a separate immutable financial reversal linked to the original
-- captured session settlement. The original payment row is never edited.
CREATE TABLE IF NOT EXISTS session_payment_refunds (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  settlement_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  method ENUM('CASH','UPI','CARD','RAZORPAY','OTHER') NOT NULL,
  status ENUM('CAPTURED') NOT NULL DEFAULT 'CAPTURED',
  reference VARCHAR(120) NULL,
  reason VARCHAR(255) NOT NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_session_refund_settlement FOREIGN KEY(settlement_id) REFERENCES session_settlements(id) ON DELETE RESTRICT,
  CONSTRAINT fk_session_refund_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_session_refund_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_session_refund_idempotency(reference,settlement_id),
  INDEX idx_session_refund_session(session_id,created_at),
  INDEX idx_session_refund_settlement(settlement_id,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(33,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
