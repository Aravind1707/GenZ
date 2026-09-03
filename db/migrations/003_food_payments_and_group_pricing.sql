USE genz_os;

CREATE TABLE IF NOT EXISTS session_participants (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NULL,
  member_id VARCHAR(64) NULL,
  display_name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_participants_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_participants_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_participants_member FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL,
  INDEX idx_participants_session(session_id,active),
  INDEX idx_participants_customer(customer_id)
) ENGINE=InnoDB;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS participant_id VARCHAR(64) NULL;
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_participant FOREIGN KEY(participant_id) REFERENCES session_participants(id) ON DELETE SET NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status ENUM('UNPAID','PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'UNPAID';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at DATETIME(3) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(80) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(80) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(128) NULL;
ALTER TABLE orders ADD UNIQUE KEY uq_orders_razorpay_order(razorpay_order_id);
ALTER TABLE orders ADD UNIQUE KEY uq_orders_razorpay_payment(razorpay_payment_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  provider ENUM('RAZORPAY','COUNTER') NOT NULL,
  provider_order_id VARCHAR(80) NULL,
  provider_payment_id VARCHAR(80) NULL,
  status ENUM('CREATED','PENDING','CAPTURED','FAILED','REFUNDED') NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  captured_at DATETIME(3) NULL,
  CONSTRAINT fk_payment_order FOREIGN KEY(order_id) REFERENCES orders(id),
  INDEX idx_payment_order(order_id,created_at),
  INDEX idx_payment_provider_order(provider_order_id),
  INDEX idx_payment_provider_payment(provider_payment_id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(3,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
