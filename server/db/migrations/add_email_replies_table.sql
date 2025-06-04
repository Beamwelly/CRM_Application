-- Create email_replies table
CREATE TABLE IF NOT EXISTS email_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_email_id UUID REFERENCES communication_records(id),
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_replies_original_email_id ON email_replies(original_email_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_from_email ON email_replies(from_email);
CREATE INDEX IF NOT EXISTS idx_email_replies_to_email ON email_replies(to_email);
CREATE INDEX IF NOT EXISTS idx_email_replies_received_at ON email_replies(received_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_replies_updated_at
    BEFORE UPDATE ON email_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 