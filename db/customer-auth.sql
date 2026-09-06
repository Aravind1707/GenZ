USE genz_os;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NULL,
  member_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_customers_member (member_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_otp_challenges (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_otp_mobile_created (mobile,created_at),
  INDEX idx_otp_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_customer_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_sessions_customer (customer_id),
  INDEX idx_customer_sessions_expiry (expires_at)
) ENGINE=InnoDB;

-- Current pricing is stored in gaming_rates and gaming_price_packages by migration 049.
