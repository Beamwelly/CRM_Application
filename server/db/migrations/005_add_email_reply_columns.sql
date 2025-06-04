-- Add columns for email reply handling
ALTER TABLE communication_records
ADD COLUMN parent_email_id UUID REFERENCES communication_records(id),
ADD COLUMN email_thread_id VARCHAR(255),
ADD COLUMN email_message_id VARCHAR(255),
ADD COLUMN email_in_reply_to VARCHAR(255),
ADD COLUMN email_references TEXT[],
ADD COLUMN is_reply BOOLEAN DEFAULT FALSE;

-- Create index for faster email thread lookups
CREATE INDEX idx_communication_records_email_thread_id ON communication_records(email_thread_id);
CREATE INDEX idx_communication_records_parent_email_id ON communication_records(parent_email_id); 