USE genz_os;
CREATE TABLE IF NOT EXISTS session_pause_periods (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  started_at DATETIME(3) NOT NULL,
  ended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_pause_period_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_pause_period_session(session_id,started_at,ended_at)
) ENGINE=InnoDB;
INSERT INTO schema_migrations(version,applied_at) VALUES(12,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
