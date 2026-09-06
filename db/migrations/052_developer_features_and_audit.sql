USE genz_os;

-- Developer/owner feature controls and operational audit history.
ALTER TABLE staff_users MODIFY COLUMN role ENUM('OWNER','MANAGER','DEVELOPER') NOT NULL;

CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key VARCHAR(100) NOT NULL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(500) NOT NULL,
  updated_by VARCHAR(64) NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_feature_flags_updated(updated_at)
) ENGINE=InnoDB;

INSERT INTO feature_flags(feature_key,enabled,description,updated_by,updated_at) VALUES
('dashboard',TRUE,'Operations dashboard and live cafe overview',NULL,NOW(3)),
('sessions',TRUE,'Gaming session start, extend, pause and end',NULL,NOW(3)),
('bookings',TRUE,'Gaming station booking and check-in',NULL,NOW(3)),
('food_orders',TRUE,'Customer food and beverage ordering',NULL,NOW(3)),
('kitchen',TRUE,'Kitchen order queue and preparation workflow',NULL,NOW(3)),
('inventory',TRUE,'Stock, receiving, stocktake, waste and COGS',NULL,NOW(3)),
('finance',TRUE,'Finance, settlements, reconciliation and daily close',NULL,NOW(3)),
('payments',TRUE,'Payment collection, confirmation and reconciliation',NULL,NOW(3)),
('members',TRUE,'Membership identity, recognition and pricing',NULL,NOW(3)),
('stations',TRUE,'Station inventory, status and heartbeat/agent controls',NULL,NOW(3)),
('receipts',TRUE,'Receipt generation and viewing',NULL,NOW(3)),
('staff_management',TRUE,'Staff account and access lifecycle',NULL,NOW(3)),
('admin_configuration',TRUE,'Catalogue, gaming rates and pricing configuration',NULL,NOW(3)),
('customer_portal',TRUE,'Customer OTP login, pricing, booking and ordering portal',NULL,NOW(3)),
('station_agent',TRUE,'PC/console station agent and lease controls',NULL,NOW(3)),
('otp',TRUE,'Customer OTP authentication',NULL,NOW(3)),
('audit_logs',TRUE,'Operational audit log visibility',NULL,NOW(3))
ON DUPLICATE KEY UPDATE description=VALUES(description);

INSERT INTO schema_migrations(version,applied_at)
VALUES(52,NOW(3))
ON DUPLICATE KEY UPDATE version=VALUES(version);
