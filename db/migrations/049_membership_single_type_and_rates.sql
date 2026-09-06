USE genz_os;

-- Membership is one product: there are no customer membership tiers and no required expiry date.
UPDATE members SET tier='REGULAR' WHERE tier IS NULL OR tier NOT IN ('REGULAR','GOLD','VIP');
ALTER TABLE members MODIFY COLUMN expires_at DATE NULL;

SET @has_gov_type := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='members' AND column_name='government_id_type');
SET @sql := IF(@has_gov_type=0,'ALTER TABLE members ADD COLUMN government_id_type VARCHAR(40) NULL AFTER mobile','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_gov_number := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='members' AND column_name='government_id_number');
SET @sql := IF(@has_gov_number=0,'ALTER TABLE members ADD COLUMN government_id_number VARCHAR(120) NULL AFTER government_id_type','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_gov_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='members' AND index_name='uq_members_government_id');
SET @sql := IF(@has_gov_index=0,'ALTER TABLE members ADD UNIQUE KEY uq_members_government_id(government_id_type,government_id_number)','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_tier := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='members' AND column_name='tier');
SET @sql := IF(@has_tier=1,'ALTER TABLE members DROP COLUMN tier','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_participant_tier := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='session_participants' AND column_name='member_tier');
SET @sql := IF(@has_participant_tier=1,'ALTER TABLE session_participants DROP COLUMN member_tier','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
DROP TABLE IF EXISTS member_price_rules;

CREATE TABLE IF NOT EXISTS gaming_price_packages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  station_group VARCHAR(100) NOT NULL,
  label VARCHAR(120) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  regular_price BIGINT UNSIGNED NOT NULL,
  member_price BIGINT UNSIGNED NOT NULL,
  extra_player_surcharge BIGINT UNSIGNED NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_gaming_package(station_group,label,duration_minutes),
  INDEX idx_gaming_package_active(station_group,active,sort_order)
) ENGINE=InnoDB;

INSERT INTO gaming_price_packages(id,station_group,label,duration_minutes,regular_price,member_price,extra_player_surcharge,active,sort_order,created_at,updated_at) VALUES
('PKG-240-PC-1','PC240_MULTI','240Hz PC / PS5 Multi',60,120,90,0,TRUE,10,NOW(3),NOW(3)),
('PKG-240-PC-2','PC240_MULTI','240Hz PC / PS5 Multi',120,240,140,0,TRUE,20,NOW(3),NOW(3)),
('PKG-240-PC-3','PC240_MULTI','240Hz PC / PS5 Multi',180,360,180,0,TRUE,30,NOW(3),NOW(3)),
('PKG-240-PC-4','PC240_MULTI','240Hz PC / PS5 Multi',240,480,240,0,TRUE,40,NOW(3),NOW(3)),
('PKG-240-PC-5','PC240_MULTI','240Hz PC / PS5 Multi',300,600,300,0,TRUE,50,NOW(3),NOW(3)),
('PKG-240-PC-6','PC240_MULTI','240Hz PC / PS5 Multi',360,720,360,0,TRUE,60,NOW(3),NOW(3)),
('PKG-240-PC-7','PC240_MULTI','240Hz PC / PS5 Multi',420,840,420,0,TRUE,70,NOW(3),NOW(3)),
('PKG-240-PC-8','PC240_MULTI','240Hz PC / PS5 Multi',480,960,480,0,TRUE,80,NOW(3),NOW(3)),
('PKG-165-PC-1','PC165_MULTI','165Hz PC / PS4 Multi',60,90,80,0,TRUE,10,NOW(3),NOW(3)),
('PKG-165-PC-2','PC165_MULTI','165Hz PC / PS4 Multi',120,180,130,0,TRUE,20,NOW(3),NOW(3)),
('PKG-165-PC-3','PC165_MULTI','165Hz PC / PS4 Multi',180,270,160,0,TRUE,30,NOW(3),NOW(3)),
('PKG-165-PC-4','PC165_MULTI','165Hz PC / PS4 Multi',240,360,230,0,TRUE,40,NOW(3),NOW(3)),
('PKG-165-PC-5','PC165_MULTI','165Hz PC / PS4 Multi',300,450,290,0,TRUE,50,NOW(3),NOW(3)),
('PKG-165-PC-6','PC165_MULTI','165Hz PC / PS4 Multi',360,540,330,0,TRUE,60,NOW(3),NOW(3)),
('PKG-165-PC-7','PC165_MULTI','165Hz PC / PS4 Multi',420,630,390,0,TRUE,70,NOW(3),NOW(3)),
('PKG-165-PC-8','PC165_MULTI','165Hz PC / PS4 Multi',480,720,400,0,TRUE,80,NOW(3),NOW(3)),
('PKG-PS4-SOLO-1','PS4_SOLO','PS4 Solo',60,120,100,0,TRUE,10,NOW(3),NOW(3)),
('PKG-PS4-SOLO-2','PS4_SOLO','PS4 Solo',120,240,190,0,TRUE,20,NOW(3),NOW(3)),
('PKG-PS4-SOLO-3','PS4_SOLO','PS4 Solo',180,360,280,0,TRUE,30,NOW(3),NOW(3)),
('PKG-PS4-SOLO-4','PS4_SOLO','PS4 Solo',240,480,370,0,TRUE,40,NOW(3),NOW(3)),
('PKG-PS4-SOLO-5','PS4_SOLO','PS4 Solo',300,600,460,0,TRUE,50,NOW(3),NOW(3)),
('PKG-PS5-SOLO-1','PS5_SOLO','PS5 Solo',60,150,120,0,TRUE,10,NOW(3),NOW(3)),
('PKG-PS5-SOLO-2','PS5_SOLO','PS5 Solo',120,300,210,0,TRUE,20,NOW(3),NOW(3)),
('PKG-PS5-SOLO-3','PS5_SOLO','PS5 Solo',180,450,300,0,TRUE,30,NOW(3),NOW(3)),
('PKG-PS5-SOLO-4','PS5_SOLO','PS5 Solo',240,600,390,0,TRUE,40,NOW(3),NOW(3)),
('PKG-PS5-SOLO-5','PS5_SOLO','PS5 Solo',300,750,480,0,TRUE,50,NOW(3),NOW(3)),
('PKG-PSVR2-1','PSVR2_SIM','PS VR 2 Sim / Moza R5 F1 Sim',30,200,150,50,TRUE,10,NOW(3),NOW(3)),
('PKG-PSVR2-2','PSVR2_SIM','PS VR 2 Sim / Moza R5 F1 Sim',60,400,250,50,TRUE,20,NOW(3),NOW(3)),
('PKG-PSVR2-3','PSVR2_SIM','PS VR 2 Sim / Moza R5 F1 Sim',90,600,350,50,TRUE,30,NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE regular_price=VALUES(regular_price),member_price=VALUES(member_price),extra_player_surcharge=VALUES(extra_player_surcharge),active=VALUES(active),sort_order=VALUES(sort_order),updated_at=NOW(3);

INSERT INTO schema_migrations(version,applied_at) VALUES(49,NOW(3)) ON DUPLICATE KEY UPDATE version=VALUES(version);
