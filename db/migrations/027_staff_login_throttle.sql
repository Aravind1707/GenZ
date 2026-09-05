USE genz_os;

-- Persistent username-based staff login throttling. This is deliberately 027:
-- migration 022 is already the customer-order idempotency fingerprint migration.
CREATE TABLE IF NOT EXISTS staff_login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  succeeded BOOLEAN NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_staff_login_attempts_username_created(username,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at)
VALUES(27,NOW(3))
ON DUPLICATE KEY UPDATE applied_at=applied_at;
