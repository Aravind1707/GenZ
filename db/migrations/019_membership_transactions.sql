USE genz_os;

CREATE TABLE IF NOT EXISTS membership_transactions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  member_id VARCHAR(64) NOT NULL,
  type ENUM('NEW','RENEWAL') NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  method ENUM('CASH','UPI','CARD','RAZORPAY','OTHER') NOT NULL,
  status ENUM('CAPTURED','REFUNDED') NOT NULL DEFAULT 'CAPTURED',
  previous_expires_at DATE NULL,
  new_expires_at DATE NOT NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_membership_tx_member FOREIGN KEY(member_id) REFERENCES members(id),
  CONSTRAINT fk_membership_tx_staff FOREIGN KEY(created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  INDEX idx_membership_tx_member(member_id,created_at),
  INDEX idx_membership_tx_created(created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(19,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
