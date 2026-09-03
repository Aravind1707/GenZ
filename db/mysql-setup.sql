-- Run this ONCE as a MySQL administrator on the GenZ admin PC.
-- Keep MySQL bound to localhost (127.0.0.1) when the web app is the only MySQL client.
-- Replace the placeholder password before running. Never commit the real password.

CREATE DATABASE IF NOT EXISTS genz_os
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'genz_app'@'localhost'
  IDENTIFIED BY 'CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD';

ALTER USER 'genz_app'@'localhost'
  IDENTIFIED BY 'CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD';

-- Runtime permissions only. Schema installation/migrations should be performed
-- by an administrator, not by the application account.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON genz_os.* TO 'genz_app'@'localhost';

FLUSH PRIVILEGES;

-- Recommended network posture:
--   MySQL: 127.0.0.1:3306 only
--   GenZ OS: expose the Next.js server to the café LAN
-- Do NOT open TCP/3306 in the Windows firewall for café clients.
