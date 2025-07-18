-- migrations/add_h1b_sponsor_flag.sql
-- Migration to add H1B sponsor flag to companies table

-- Add the is_h1b_sponsor column with default false
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_h1b_sponsor BOOLEAN DEFAULT FALSE;

-- Add index for fast H1B filtering
CREATE INDEX IF NOT EXISTS idx_companies_h1b_sponsor ON companies(is_h1b_sponsor);

-- Add compound index for H1B filtering with other common filters
CREATE INDEX IF NOT EXISTS idx_companies_h1b_industry ON companies(is_h1b_sponsor, industry_id);

-- Add metadata columns for tracking H1B flag updates
ALTER TABLE companies ADD COLUMN IF NOT EXISTS h1b_flag_updated_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS h1b_matched_company_id VARCHAR(24); -- MongoDB ObjectId reference

-- Add index for tracking updates
CREATE INDEX IF NOT EXISTS idx_companies_h1b_updated ON companies(h1b_flag_updated_at);

-- Update the schema comment
COMMENT ON COLUMN companies.is_h1b_sponsor IS 'Boolean flag indicating if company sponsors H1B visas based on government data';
COMMENT ON COLUMN companies.h1b_flag_updated_at IS 'Timestamp when H1B flag was last updated';
COMMENT ON COLUMN companies.h1b_matched_company_id IS 'Reference to MongoDB H1B company document that matched this company';