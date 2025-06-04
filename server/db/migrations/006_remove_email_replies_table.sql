-- Drop the email_replies table and its related objects
DROP TABLE IF EXISTS email_replies CASCADE;

-- Drop the trigger function if it's not used by other tables
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE; 