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

CREATE TABLE IF NOT EXISTS gaming_rates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  station_type ENUM('PC','PS5','MOZA') NOT NULL,
  pc_tier ENUM('NORMAL','PREMIUM') NULL,
  label VARCHAR(100) NOT NULL,
  specs TEXT NULL,
  regular_price BIGINT UNSIGNED NOT NULL,
  member_price BIGINT UNSIGNED NOT NULL,
  unit_label VARCHAR(40) NOT NULL DEFAULT 'per hour',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_gaming_rates_active (active,station_type,pc_tier)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS member_price_rules (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  member_tier ENUM('REGULAR','GOLD','VIP') NOT NULL,
  category VARCHAR(100) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_member_price_rule (member_tier,category)
) ENGINE=InnoDB;
