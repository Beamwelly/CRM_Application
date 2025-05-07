-- PostgreSQL schema for CRM application

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('developer', 'admin', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- RBAC Fields
    permissions JSONB DEFAULT '{}'::jsonb, -- Store detailed permissions, default to empty
    created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Link employee to admin
    employee_creation_limit INTEGER -- Limit for admins
);

-- Service type access for users (REMOVED - Handled by permissions)
-- DROP TABLE IF EXISTS user_service_access;

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    aum DECIMAL(15,2),
    company VARCHAR(100),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL,
    last_webinar_date TIMESTAMP WITH TIME ZONE,
    lead_source VARCHAR(30),
    referred_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead service types junction table
CREATE TABLE lead_service_types (
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('training', 'equity', 'insurance', 'mutual_funds', 'pms', 'aif', 'others')),
    PRIMARY KEY (lead_id, service_type)
);

-- Update check constraints to include 'wealth' as a valid service type
ALTER TABLE lead_service_types DROP CONSTRAINT lead_service_types_service_type_check;
ALTER TABLE lead_service_types ADD CONSTRAINT lead_service_types_service_type_check 
    CHECK (service_type IN ('training', 'wealth', 'equity', 'insurance', 'mutual_funds', 'pms', 'aif', 'others'));

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    status VARCHAR(30) NOT NULL,
    batch_no VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    next_renewal TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    review_remarks TEXT,
    payment_type VARCHAR(20) CHECK (payment_type IN ('full_payment', 'installment')),
    payment_status VARCHAR(20) CHECK (payment_status IN ('completed', 'not_completed')),
    dob TIMESTAMP WITH TIME ZONE,
    aum DECIMAL(15,2),
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer service types junction table
CREATE TABLE customer_service_types (
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('training', 'wealth', 'equity', 'insurance', 'mutual_funds', 'pms', 'aif', 'others')),
    PRIMARY KEY (customer_id, service_type)
);

-- Update check constraints to include 'wealth' as a valid service type
ALTER TABLE customer_service_types DROP CONSTRAINT customer_service_types_service_type_check;
ALTER TABLE customer_service_types ADD CONSTRAINT customer_service_types_service_type_check 
    CHECK (service_type IN ('training', 'wealth', 'equity', 'insurance', 'mutual_funds', 'pms', 'aif', 'others'));

-- Customer engagement flags
CREATE TABLE customer_engagement_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    welcome_email BOOLEAN DEFAULT FALSE,
    community BOOLEAN DEFAULT FALSE,
    calls BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Renewal History Table (No explicit table needed, handled within customer service/updates for now)

-- Communication History Table
CREATE TABLE IF NOT EXISTS communication_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'other')),
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    related_follow_up_id UUID, -- Link to a follow-up if applicable
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who logged this communication
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, 
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, 
    
    -- Call specific
    duration INTEGER, -- Duration in seconds
    call_status VARCHAR(20) CHECK (call_status IN ('completed', 'missed', 'cancelled')),
    recording_url TEXT, -- URL/path to the recording
    
    -- Email specific
    email_subject TEXT,
    email_body TEXT,
    
    -- Ensure at least one entity is linked
    CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL)
);

-- Follow Ups Table
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- When the follow-up occurred or was logged
    notes TEXT NOT NULL,
    next_call_date TIMESTAMPTZ NOT NULL, -- When the next action is scheduled
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Who created the follow-up task
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, 
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Ensure it's linked to either a lead OR a customer, but not both (optional constraint)
    CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL),
    CHECK (NOT (lead_id IS NOT NULL AND customer_id IS NOT NULL)) -- Cannot be linked to both
);

-- WhatsApp Messages Table
CREATE TABLE whatsapp_messages (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('sent', 'received')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_users_created_by_admin ON users(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_comm_records_lead_id ON communication_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_comm_records_customer_id ON communication_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_comm_records_created_by ON communication_records(created_by);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON follow_ups(created_by);
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_call_date ON follow_ups(next_call_date);

-- Views

-- Upcoming renewals view
CREATE VIEW upcoming_renewals AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.mobile,
    c.service_type,
    c.next_renewal,
    c.assigned_to,
    u.name as executive_name,
    EXTRACT(DAY FROM (c.next_renewal - CURRENT_DATE)) as days_until_renewal
FROM 
    customers c
JOIN 
    users u ON c.assigned_to = u.id
WHERE 
    c.next_renewal IS NOT NULL
    AND c.next_renewal > CURRENT_DATE
    AND c.next_renewal <= (CURRENT_DATE + INTERVAL '30 days');

-- Overdue renewals view
CREATE VIEW overdue_renewals AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.mobile,
    c.service_type,
    c.next_renewal,
    c.assigned_to,
    u.name as executive_name,
    EXTRACT(DAY FROM (CURRENT_DATE - c.next_renewal)) as days_overdue
FROM 
    customers c
JOIN 
    users u ON c.assigned_to = u.id
WHERE 
    c.next_renewal IS NOT NULL
    AND c.next_renewal < CURRENT_DATE;

-- Active customers by service type
CREATE VIEW active_customers_by_service_type AS
SELECT 
    service_type,
    COUNT(*) as count
FROM 
    customers
GROUP BY 
    service_type;

-- Leads conversion rate
CREATE VIEW lead_conversion_rate AS
SELECT 
    EXTRACT(MONTH FROM l.created_at) as month,
    EXTRACT(YEAR FROM l.created_at) as year,
    l.service_type,
    COUNT(l.id) as total_leads,
    COUNT(c.id) as converted_leads,
    CASE 
        WHEN COUNT(l.id) > 0 THEN ROUND((COUNT(c.id)::NUMERIC / COUNT(l.id)::NUMERIC) * 100, 2)
        ELSE 0
    END as conversion_rate
FROM 
    leads l
LEFT JOIN 
    customers c ON l.id = c.lead_id
GROUP BY 
    EXTRACT(MONTH FROM l.created_at),
    EXTRACT(YEAR FROM l.created_at),
    l.service_type
ORDER BY 
    year, month, service_type;

-- Trigger to update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Set up triggers for all tables with updated_at
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_leads_modtime
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_customers_modtime
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_customer_engagement_flags_modtime
    BEFORE UPDATE ON customer_engagement_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_follow_ups_modtime
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
