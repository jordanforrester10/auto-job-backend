-- Migration: Add recruiter_unlocks table for tracking casual user unlocks
-- File: backend/migrations/add_recruiter_unlocks_table.sql

-- Create the recruiter_unlocks table
CREATE TABLE IF NOT EXISTS recruiter_unlocks (
    id SERIAL PRIMARY KEY,
    recruiter_id INTEGER NOT NULL,
    mongodb_user_id VARCHAR(24) NOT NULL, -- MongoDB ObjectId as string
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add foreign key constraint to recruiters table
    CONSTRAINT fk_recruiter_unlocks_recruiter_id 
        FOREIGN KEY (recruiter_id) 
        REFERENCES recruiters(id) 
        ON DELETE CASCADE,
    
    -- Ensure a user can only unlock a recruiter once
    CONSTRAINT unique_user_recruiter_unlock 
        UNIQUE (recruiter_id, mongodb_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recruiter_unlocks_recruiter_id 
    ON recruiter_unlocks(recruiter_id);

CREATE INDEX IF NOT EXISTS idx_recruiter_unlocks_mongodb_user_id 
    ON recruiter_unlocks(mongodb_user_id);

CREATE INDEX IF NOT EXISTS idx_recruiter_unlocks_unlocked_at 
    ON recruiter_unlocks(unlocked_at);

-- Create composite index for user-recruiter lookups
CREATE INDEX IF NOT EXISTS idx_recruiter_unlocks_user_recruiter 
    ON recruiter_unlocks(mongodb_user_id, recruiter_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_recruiter_unlocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_recruiter_unlocks_updated_at ON recruiter_unlocks;
CREATE TRIGGER trigger_recruiter_unlocks_updated_at
    BEFORE UPDATE ON recruiter_unlocks
    FOR EACH ROW
    EXECUTE FUNCTION update_recruiter_unlocks_updated_at();

-- Add comments for documentation
COMMENT ON TABLE recruiter_unlocks IS 'Tracks which recruiters have been unlocked by casual plan users';
COMMENT ON COLUMN recruiter_unlocks.recruiter_id IS 'ID of the recruiter that was unlocked';
COMMENT ON COLUMN recruiter_unlocks.mongodb_user_id IS 'MongoDB ObjectId of the user who unlocked the recruiter';
COMMENT ON COLUMN recruiter_unlocks.unlocked_at IS 'Timestamp when the recruiter was unlocked';

-- Optional: Add a view for easier querying
CREATE OR REPLACE VIEW user_recruiter_unlocks AS
SELECT 
    ru.id,
    ru.recruiter_id,
    ru.mongodb_user_id,
    ru.unlocked_at,
    r.first_name || ' ' || r.last_name AS recruiter_name,
    r.title AS recruiter_title,
    c.name AS company_name,
    i.name AS industry_name
FROM recruiter_unlocks ru
JOIN recruiters r ON ru.recruiter_id = r.id
LEFT JOIN companies c ON r.current_company_id = c.id
LEFT JOIN industries i ON r.industry_id = i.id
ORDER BY ru.unlocked_at DESC;

COMMENT ON VIEW user_recruiter_unlocks IS 'View that combines unlock data with recruiter information for easier reporting';