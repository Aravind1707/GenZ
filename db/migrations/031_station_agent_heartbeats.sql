USE genz_os;

CREATE TABLE IF NOT EXISTS station_agent_heartbeats (
  station_id VARCHAR(64) NOT NULL PRIMARY KEY,
  agent_id VARCHAR(128) NOT NULL,
  state ENUM('OFFLINE','IDLE','STARTING','ACTIVE','PAUSED','LOCKED','STOPPING','ERROR') NOT NULL,
  session_id VARCHAR(64) NULL,
  agent_version VARCHAR(64) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  received_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_station_heartbeat_station FOREIGN KEY(station_id) REFERENCES stations(id) ON DELETE CASCADE,
  CONSTRAINT fk_station_heartbeat_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  INDEX idx_station_heartbeat_received(received_at),
  INDEX idx_station_heartbeat_session(session_id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(31,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
