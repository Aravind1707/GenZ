USE genz_os;

CREATE TABLE IF NOT EXISTS station_challenges (
  id VARCHAR(64) PRIMARY KEY,
  station_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NULL,
  challenge_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_station_challenge_station FOREIGN KEY (station_id) REFERENCES stations(id),
  CONSTRAINT fk_station_challenge_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  INDEX ix_station_challenge_lookup (station_id, expires_at, used_at),
  INDEX ix_station_challenge_session (session_id)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(23,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
