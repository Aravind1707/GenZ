USE genz_os;

CREATE TABLE IF NOT EXISTS payment_provider_events (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  event_id VARCHAR(160) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error VARCHAR(500) NULL,
  received_at DATETIME(3) NOT NULL,
  processed_at DATETIME(3) NULL,
  UNIQUE KEY uq_provider_event(provider,event_id),
  INDEX idx_provider_events_received(provider,received_at),
  INDEX idx_provider_events_processed(provider,processed,received_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_provider_imports (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  import_type ENUM('PAYMENTS','REFUNDS','SETTLEMENTS') NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  external_reference VARCHAR(200) NULL,
  external_amount BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  external_status VARCHAR(60) NOT NULL,
  local_type ENUM('PAYMENT','REFUND','SETTLEMENT') NOT NULL,
  local_id VARCHAR(64) NULL,
  match_status ENUM('UNMATCHED','MATCHED','EXCEPTION','IGNORED') NOT NULL DEFAULT 'UNMATCHED',
  match_reason VARCHAR(500) NULL,
  payload JSON NULL,
  occurred_at DATETIME(3) NULL,
  imported_at DATETIME(3) NOT NULL,
  matched_by VARCHAR(64) NULL,
  matched_at DATETIME(3) NULL,
  UNIQUE KEY uq_provider_import(provider,import_type,external_id),
  INDEX idx_provider_import_status(provider,match_status,imported_at),
  INDEX idx_provider_import_local(local_type,local_id),
  CONSTRAINT fk_provider_import_staff FOREIGN KEY(matched_by) REFERENCES staff_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_reconciliation_history (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  import_id VARCHAR(64) NOT NULL,
  action ENUM('MATCH','EXCEPTION','IGNORE','UNMATCH') NOT NULL,
  previous_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NOT NULL,
  notes VARCHAR(500) NULL,
  staff_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_recon_history_import FOREIGN KEY(import_id) REFERENCES payment_provider_imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_recon_history_staff FOREIGN KEY(staff_id) REFERENCES staff_users(id) ON DELETE RESTRICT,
  INDEX idx_recon_history_import(import_id,created_at),
  INDEX idx_recon_history_created(created_at)
) ENGINE=InnoDB;

ALTER TABLE payment_transactions ADD COLUMN provider_status VARCHAR(60) NULL;
ALTER TABLE payment_transactions ADD COLUMN provider_updated_at DATETIME(3) NULL;
ALTER TABLE payment_transactions ADD COLUMN provider_payload JSON NULL;

INSERT INTO schema_migrations(version,applied_at) VALUES(45,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
