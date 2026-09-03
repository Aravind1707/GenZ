USE genz_os;
CREATE TABLE IF NOT EXISTS session_groups (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
 created_at DATETIME(3) NOT NULL,
 closed_at DATETIME(3) NULL,
 INDEX idx_session_groups_status(status,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS session_group_members (
 group_id VARCHAR(64) NOT NULL,
 session_id VARCHAR(64) NOT NULL PRIMARY KEY,
 created_at DATETIME(3) NOT NULL,
 CONSTRAINT fk_group_members_group FOREIGN KEY(group_id) REFERENCES session_groups(id) ON DELETE CASCADE,
 CONSTRAINT fk_group_members_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
 INDEX idx_group_members_group(group_id)
) ENGINE=InnoDB;
INSERT INTO schema_migrations(version,applied_at) VALUES(6,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
