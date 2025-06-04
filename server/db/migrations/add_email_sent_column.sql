-- Add email_sent column to communication_records table
ALTER TABLE communication_records ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- Update existing email records to mark them as sent
UPDATE communication_records SET email_sent = TRUE WHERE type = 'email'; 