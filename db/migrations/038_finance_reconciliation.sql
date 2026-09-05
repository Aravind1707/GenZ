USE genz_os;

CREATE TABLE IF NOT EXISTS finance_reconciliations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  finance_transaction_id VARCHAR(64) NOT NULL,
  external_provider VARCHAR(80) NOT NULL,
  external_reference VARCHAR(160) NOT NULL,
  external_amount BIGINT UNSIGNED NOT NULL,
  status ENUM('MATCHED','EXCEPTION') NOT NULL DEFAULT 'MATCHED',
  notes VARCHAR(500) NULL,
  reconciled_by VARCHAR(64) NULL,
  reconciled_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_recon_finance FOREIGN KEY(finance_transaction_id) REFERENCES finance_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_recon_staff FOREIGN KEY(reconciled_by) REFERENCES staff_users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_recon_finance(finance_transaction_id),
  UNIQUE KEY uq_recon_external(external_provider,external_reference),
  INDEX idx_recon_status(status,reconciled_at)
) ENGINE=InnoDB;

INSERT INTO schema_migrations(version,applied_at) VALUES(38,NOW(3)) ON DUPLICATE KEY UPDATE applied_at=applied_at;
