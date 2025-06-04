-- Remove call_status column from communication_records table
ALTER TABLE communication_records DROP COLUMN IF EXISTS call_status; 