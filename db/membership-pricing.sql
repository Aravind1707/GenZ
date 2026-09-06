USE genz_os;

-- Legacy helper SQL kept for reference. The live schema is migration-driven.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS government_id_type VARCHAR(40) NULL AFTER mobile,
  ADD COLUMN IF NOT EXISTS government_id_number VARCHAR(120) NULL AFTER government_id_type,
  MODIFY COLUMN expires_at DATE NULL;
ALTER TABLE members DROP COLUMN IF EXISTS tier;
ALTER TABLE session_participants DROP COLUMN IF EXISTS member_tier;
DROP TABLE IF EXISTS member_price_rules;
