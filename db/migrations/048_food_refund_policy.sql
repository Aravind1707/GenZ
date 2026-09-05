USE genz_os;

CREATE TABLE IF NOT EXISTS food_order_refunds (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  max_amount BIGINT UNSIGNED NOT NULL,
  policy_percent TINYINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NOT NULL,
  method ENUM('ADMIN_DESK_CASH') NOT NULL DEFAULT 'ADMIN_DESK_CASH',
  status ENUM('ELIGIBLE','PAID','VOID') NOT NULL DEFAULT 'ELIGIBLE',
  paid_by VARCHAR(64) NULL,
  paid_at DATETIME(3) NULL,
  reference VARCHAR(120) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_food_refund_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_food_refund_staff FOREIGN KEY(paid_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_food_refund_amount CHECK(amount<=max_amount),
  CONSTRAINT chk_food_refund_policy CHECK(policy_percent IN (50,100)),
  UNIQUE KEY uq_food_refund_order(order_id),
  INDEX idx_food_refund_status(status,created_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(48,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
