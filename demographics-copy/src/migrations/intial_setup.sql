-- Switch to the PartnersDB database
USE PartnersDB;
GO

-- LawFirm table with API keys
CREATE TABLE LawFirm (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    partitionKey NVARCHAR(75) NOT NULL,
    name NVARCHAR(75) NOT NULL UNIQUE,
    contact_name NVARCHAR(100),
    contact_email NVARCHAR(75) NOT NULL,
    contact_phone NVARCHAR(20),
    address1 NVARCHAR(75),
    address2 NVARCHAR(75),
    city NVARCHAR(55),
    state NVARCHAR(2),
    zipcode NVARCHAR(25),
    country NVARCHAR(55),
    api_key UNIQUEIDENTIFIER NOT NULL UNIQUE, -- Links to ApiKeys.key_id as a reference
    created_by UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Indexes for performance
    INDEX IX_LawFirm_Name (name),
    INDEX IX_LawFirm_PartitionKey (partitionKey),
    INDEX IX_LawFirm_Status (status)
);

-- Add foreign key relationship to ApiKeys (optional, for referential integrity)
ALTER TABLE LawFirm
ADD CONSTRAINT FK_LawFirm_ApiKey
FOREIGN KEY (api_key)
REFERENCES ApiKeys (id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Insert mock law firm data with API keys
INSERT INTO LawFirm (partitionKey, name, contact_name, contact_email, contact_phone, address1, city, state, zipcode, country, api_key, created_by, status)
VALUES 
('LawFirm1', 'Smith & Associates', 'John Smith', 'john@smithlaw.com', '5551234567', '123 Main St', 'Austin', 'TX', '78701', 'USA', NEWID(), NEWID(), 'active'),
('LawFirm2', 'Doe Legal Group', 'Jane Doe', 'jane@doelegal.com', '5559876543', '456 Oak Ave', 'Houston', 'TX', '77002', 'USA', NEWID(), NEWID(), 'active');

-- Update ApiKeys with corresponding entries (manual mapping for demo)
INSERT INTO ApiKeys (id, partitionKey, key_id, key_hash, name, description, law_firm, created_by, rate_limits, scopes, status, created_at, updated_at)
VALUES 
(NEWID(), 'LawFirm1', 'API_KEY_001', HASHBYTES('SHA2_256', 'milestone-secret-key'), 'Smith & Associates API', 'API key for Smith & Associates', 'Smith & Associates', NEWID(), '{"limit": 1000, "window": "1h"}', '["read", "write"]', 'active', GETUTCDATE(), GETUTCDATE()),
(NEWID(), 'LawFirm2', 'API_KEY_002', HASHBYTES('SHA2_256', 'milestone-secret-key'), 'Doe Legal Group API', 'API key for Doe Legal Group', 'Doe Legal Group', NEWID(), '{"limit": 500, "window": "1h"}', '["read"]', 'active', GETUTCDATE(), GETUTCDATE());

-- Link LawFirm.api_key to ApiKeys.id (update with actual IDs from above inserts)
UPDATE LawFirm
SET api_key = (SELECT id FROM ApiKeys WHERE name = 'Smith & Associates API')
WHERE name = 'Smith & Associates';

UPDATE LawFirm
SET api_key = (SELECT id FROM ApiKeys WHERE name = 'Doe Legal Group API')
WHERE name = 'Doe Legal Group';