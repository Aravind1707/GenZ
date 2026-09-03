USE genz_os;

CREATE TABLE IF NOT EXISTS booking_deposit_payments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  booking_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  method ENUM('CASH','UPI','CARD','OTHER') NOT NULL,
  status ENUM('CAPTURED','VOIDED','REFUNDED') NOT NULL DEFAULT 'CAPTURED',
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_booking_deposit_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_deposit_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_booking_deposit_booking(booking_id,created_at),
  INDEX idx_booking_deposit_status(status,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(20,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
