USE genz_os;

CREATE TABLE IF NOT EXISTS booking_deposit_applications (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_booking_deposit_app_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_deposit_app_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_deposit_app_payment FOREIGN KEY(payment_id) REFERENCES booking_deposit_payments(id) ON DELETE RESTRICT,
  INDEX idx_booking_deposit_app_booking(booking_id,created_at),
  INDEX idx_booking_deposit_app_session(session_id),
  INDEX idx_booking_deposit_app_payment(payment_id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(23,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
