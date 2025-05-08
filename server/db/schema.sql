CREATE TYPE user_role AS ENUM (
  'developer',
  'admin',
  'relationship_manager',
  'operations_executive',
  'accountant',
  'senior_sales_manager',
  'junior_sales_manager'
);

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'developer', 'admin', 'employee'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_admin_id UUID REFERENCES users(id),
  employee_creation_limit INTEGER,
  logo_url VARCHAR(255), -- Used for admin logos
  position VARCHAR(255),
  google_id VARCHAR(255), -- For Google authentication
  permissions JSONB
);

-- Leads Table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'new', 'not_connected', 'follow_up', etc.
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  aum NUMERIC, -- Assets Under Management (for 'training' service type)
  company VARCHAR(255),
  lead_source VARCHAR(50), -- 'walk_in', 'reference'
  referred_by VARCHAR(255),
  last_webinar_date TIMESTAMP
);

-- Lead Service Types Table
CREATE TABLE lead_service_types (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  service_type VARCHAR(50), -- 'training', 'wealth', 'equity', etc.
  PRIMARY KEY (lead_id, service_type)
);

-- Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_date TIMESTAMP,
  lead_id UUID REFERENCES leads(id),
  payment_type VARCHAR(100),
  payment_status VARCHAR(50), -- 'completed', 'not_completed'
  aum NUMERIC,
  next_renewal TIMESTAMP,
  next_review TIMESTAMP,
  review_remarks TEXT,
  batch_no VARCHAR(100),
  dob TIMESTAMP,
  address TEXT,
  company VARCHAR(255),
  engagement_flags JSONB -- For storing 'welcomeEmail', 'community', 'calls' flags
);

-- Customer Service Types Table
CREATE TABLE customer_service_types (
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_type VARCHAR(50),
  PRIMARY KEY (customer_id, service_type)
);

-- Follow-ups Table
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP NOT NULL,
  notes TEXT,
  next_call_date TIMESTAMP,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_entity_reference CHECK (
    (lead_id IS NULL AND customer_id IS NOT NULL) OR
    (lead_id IS NOT NULL AND customer_id IS NULL)
  )
);

-- Renewal History Table
CREATE TABLE renewal_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  amount NUMERIC,
  status VARCHAR(50) NOT NULL, -- 'pending', 'renewed', 'cancelled', 'expired'
  notes TEXT,
  next_renewal_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communication Records Table
CREATE TABLE communication_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'EMAIL_SENT', 'CALL_LOGGED', 'REMARK_ADDED', 'STATUS_UPDATED', 'LEAD_CREATED'
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT, -- For remarks, call notes, email body snippet
  duration INTEGER, -- For calls
  recording_url TEXT, -- For call recordings
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- User who initiated or is associated with the event
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  made_by UUID REFERENCES users(id) ON DELETE SET NULL,
  call_status VARCHAR(20),
  recording_data BYTEA,
  email_subject VARCHAR(255),
  email_body TEXT,
  remarks_text TEXT,
  CONSTRAINT single_entity_reference CHECK (
    (lead_id IS NULL AND customer_id IS NOT NULL) OR
    (lead_id IS NOT NULL AND customer_id IS NULL)
  )
);

-- Service Types Reference Table
CREATE TABLE service_types (
  id VARCHAR(50) PRIMARY KEY, -- 'training', 'wealth', etc.
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create Views

-- Active customers by service type
CREATE OR REPLACE VIEW active_customers_by_service_type AS
SELECT 
  st.service_type,
  COUNT(DISTINCT c.id) AS customer_count
FROM customers c
JOIN customer_service_types st ON c.id = st.customer_id
WHERE c.status = 'active'
GROUP BY st.service_type;

-- Lead conversion rate
CREATE OR REPLACE VIEW lead_conversion_rate AS
SELECT 
  DATE_TRUNC('month', l.created_at) AS month,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT c.id) AS converted_leads,
  CASE 
    WHEN COUNT(DISTINCT l.id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT c.id)::NUMERIC / COUNT(DISTINCT l.id)::NUMERIC) * 100, 2)
  END AS conversion_rate
FROM leads l
LEFT JOIN customers c ON l.id = c.lead_id
GROUP BY DATE_TRUNC('month', l.created_at)
ORDER BY month DESC;

-- Overdue renewals
CREATE OR REPLACE VIEW overdue_renewals AS
SELECT 
  c.*,
  u.name AS assigned_to_name,
  u.email AS assigned_to_email,
  array_agg(DISTINCT cst.service_type) AS service_types
FROM customers c
LEFT JOIN users u ON c.assigned_to = u.id
LEFT JOIN customer_service_types cst ON c.id = cst.customer_id
WHERE c.next_renewal < CURRENT_DATE
GROUP BY c.id, u.name, u.email
ORDER BY c.next_renewal ASC;

-- Upcoming renewals (within 30 days)
CREATE OR REPLACE VIEW upcoming_renewals AS
SELECT 
  c.*,
  u.name AS assigned_to_name,
  u.email AS assigned_to_email,
  array_agg(DISTINCT cst.service_type) AS service_types,
  (c.next_renewal - CURRENT_DATE) AS days_until_renewal
FROM customers c
LEFT JOIN users u ON c.assigned_to = u.id
LEFT JOIN customer_service_types cst ON c.id = cst.customer_id
WHERE c.next_renewal BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
GROUP BY c.id, u.name, u.email
ORDER BY c.next_renewal ASC;

-- Create Trigger Function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at column
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

CREATE TRIGGER update_follow_ups_modtime
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_renewal_history_modtime
    BEFORE UPDATE ON renewal_history
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_communication_records_modtime
    BEFORE UPDATE ON communication_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Insert default service types
INSERT INTO service_types (id, display_name, description, is_active)
VALUES 
('training', 'Training', 'Training services for wealth management', true),
('wealth', 'Wealth Management', 'Wealth management consulting services', true),
('equity', 'Equity', 'Equity investment services', true),
('insurance', 'Insurance', 'Insurance advisory services', true),
('mutual_funds', 'Mutual Funds', 'Mutual funds investment services', true),
('pms', 'Portfolio Management', 'Portfolio management services', true),
('aif', 'Alternative Investment Fund', 'AIF investment services', true),
('others', 'Other Services', 'Miscellaneous services', true);

