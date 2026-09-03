USE genz_os;

CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  tier ENUM('REGULAR','GOLD','VIP') NOT NULL DEFAULT 'REGULAR',
  expires_at DATE NOT NULL,
  wallet_balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_members_mobile_active (mobile,active),
  INDEX idx_members_expiry (expires_at)
) ENGINE=InnoDB;

INSERT INTO member_price_rules(id,member_tier,category,discount_percent,active)
VALUES ('RULE-REGULAR-ALL','REGULAR','ALL',0,TRUE),('RULE-GOLD-ALL','GOLD','ALL',10,TRUE),('RULE-VIP-ALL','VIP','ALL',15,TRUE)
ON DUPLICATE KEY UPDATE discount_percent=VALUES(discount_percent),active=VALUES(active);
