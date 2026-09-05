USE genz_os;

CREATE TABLE IF NOT EXISTS realtime_events (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  type VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  data JSON NOT NULL,
  INDEX idx_realtime_created(created_at,id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(39,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
