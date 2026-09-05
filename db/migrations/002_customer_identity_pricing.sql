USE genz_os;

CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) NOT NULL PRIMARY KEY,name VARCHAR(120) NOT NULL,mobile VARCHAR(20) NOT NULL UNIQUE,
  tier ENUM('REGULAR','GOLD','VIP') NOT NULL DEFAULT 'REGULAR',expires_at DATE NOT NULL,wallet_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,created_at DATETIME(3) NOT NULL,updated_at DATETIME(3) NOT NULL,
  INDEX idx_members_mobile_active(mobile,active),INDEX idx_members_expiry(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,mobile VARCHAR(20) NOT NULL UNIQUE,name VARCHAR(120) NULL,member_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,updated_at DATETIME(3) NOT NULL,INDEX idx_customers_member(member_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS customer_otp_challenges (
  id VARCHAR(64) NOT NULL PRIMARY KEY,mobile VARCHAR(20) NOT NULL,otp_hash CHAR(64) NOT NULL,expires_at DATETIME(3) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,consumed_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL,
  INDEX idx_otp_mobile_created(mobile,created_at),INDEX idx_otp_expiry(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS customer_sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,customer_id VARCHAR(64) NOT NULL,session_token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,last_seen_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_customer_sessions_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_sessions_customer(customer_id),INDEX idx_customer_sessions_expiry(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS gaming_rates (
  id VARCHAR(64) NOT NULL PRIMARY KEY,station_type ENUM('PC','PS5','PS4','PSVR','MOZA') NOT NULL,pc_tier ENUM('NORMAL','PREMIUM') NULL,
  label VARCHAR(100) NOT NULL,specs TEXT NULL,image_url VARCHAR(500) NULL,regular_price BIGINT UNSIGNED NOT NULL,member_price BIGINT UNSIGNED NOT NULL,
  unit_label VARCHAR(40) NOT NULL DEFAULT 'per hour',active BOOLEAN NOT NULL DEFAULT TRUE,created_at DATETIME(3) NOT NULL,updated_at DATETIME(3) NOT NULL,
  INDEX idx_gaming_rates_active(active,station_type,pc_tier)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS member_price_rules (
  id VARCHAR(64) NOT NULL PRIMARY KEY,member_tier ENUM('REGULAR','GOLD','VIP') NOT NULL,category VARCHAR(100) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,active BOOLEAN NOT NULL DEFAULT TRUE,UNIQUE KEY uq_member_price_rule(member_tier,category)
) ENGINE=InnoDB;
INSERT INTO member_price_rules(id,member_tier,category,discount_percent,active)
VALUES('RULE-REGULAR-ALL','REGULAR','ALL',0,TRUE),('RULE-GOLD-ALL','GOLD','ALL',10,TRUE),('RULE-VIP-ALL','VIP','ALL',15,TRUE)
ON DUPLICATE KEY UPDATE discount_percent=VALUES(discount_percent),active=VALUES(active);
INSERT INTO schema_migrations(version,applied_at) VALUES(2,NOW(3)) ON DUPLICATE KEY UPDATE version=VALUES(version);
