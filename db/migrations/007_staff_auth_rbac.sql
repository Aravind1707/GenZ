CREATE TABLE IF NOT EXISTS staff_users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('OWNER','MANAGER','CASHIER','KITCHEN','FLOOR') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_staff_active_role(active,role)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS staff_sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  staff_id VARCHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_staff_sessions_staff FOREIGN KEY(staff_id) REFERENCES staff_users(id) ON DELETE CASCADE,
  INDEX idx_staff_sessions_staff(staff_id),
  INDEX idx_staff_sessions_expiry(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  staff_id VARCHAR(64) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id VARCHAR(64) NULL,
  details JSON NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_audit_staff FOREIGN KEY(staff_id) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_audit_created(created_at),
  INDEX idx_audit_staff(staff_id),
  INDEX idx_audit_entity(entity_type,entity_id)
) ENGINE=InnoDB;
INSERT INTO schema_migrations(version,applied_at) VALUES(7,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
