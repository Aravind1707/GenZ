USE genz_os;

CREATE TABLE IF NOT EXISTS station_agent_commands (
  id CHAR(36) NOT NULL,
  station_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NULL,
  type ENUM('START_SESSION','PAUSE_SESSION','RESUME_SESSION','LOCK_STATION','SHUTDOWN') NOT NULL,
  payload_json JSON NOT NULL,
  status ENUM('PENDING','CLAIMED','ACKNOWLEDGED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(128) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  claimed_at DATETIME(3) NULL,
  acknowledged_at DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  result_message VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_station_command_idempotency (station_id, idempotency_key),
  KEY idx_station_command_pending (station_id, status, created_at),
  KEY idx_station_command_expiry (status, expires_at),
  CONSTRAINT fk_station_command_station FOREIGN KEY (station_id) REFERENCES stations(id),
  CONSTRAINT fk_station_command_session FOREIGN KEY (session_id) REFERENCES sessions(id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(32,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
