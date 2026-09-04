USE genz_os;

CREATE TABLE IF NOT EXISTS booking_deposit_applications (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_bda_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bda_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bda_payment FOREIGN KEY(payment_id) REFERENCES booking_deposit_payments(id) ON DELETE RESTRICT,
  INDEX idx_bda_booking(booking_id,created_at),
  INDEX idx_bda_session(session_id,created_at),
  INDEX idx_bda_payment(payment_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_deposit_refunds (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  method ENUM('CASH','UPI','CARD','OTHER') NOT NULL,
  status ENUM('CAPTURED','VOIDED') NOT NULL DEFAULT 'CAPTURED',
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_bdr_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bdr_payment FOREIGN KEY(payment_id) REFERENCES booking_deposit_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bdr_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_bdr_booking(booking_id,created_at),
  INDEX idx_bdr_payment(payment_id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(23,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
