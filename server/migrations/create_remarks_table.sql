-- Create remarks table
CREATE TABLE IF NOT EXISTS remarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    entity_type VARCHAR(10) NOT NULL CHECK (entity_type IN ('lead', 'customer')),
    entity_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_remarks_entity_type ON remarks(entity_type);
CREATE INDEX IF NOT EXISTS idx_remarks_entity_id ON remarks(entity_id);
CREATE INDEX IF NOT EXISTS idx_remarks_created_by ON remarks(created_by);
CREATE INDEX IF NOT EXISTS idx_remarks_created_at ON remarks(created_at);

-- Add foreign key constraints
ALTER TABLE remarks
    ADD CONSTRAINT fk_remarks_leads
    FOREIGN KEY (entity_id)
    REFERENCES leads(id)
    ON DELETE CASCADE
    WHEN (entity_type = 'lead');

ALTER TABLE remarks
    ADD CONSTRAINT fk_remarks_customers
    FOREIGN KEY (entity_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
    WHEN (entity_type = 'customer'); 