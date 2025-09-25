IF NOT EXISTS (SELECT [name] FROM sys.databases WHERE [name] = N'PartnersDB')
BEGIN
    CREATE DATABASE PartnersDB;
    PRINT 'Database PartnersDB created successfully';
END
ELSE
BEGIN
    PRINT 'Database PartnersDB already exists';
END
GO

-- Switch to the new database
USE PartnersDB;
GO

-- Demographics table with all fields from your specification
CREATE TABLE Demographics (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    partitionKey NVARCHAR(75) NOT NULL,
    
    -- Basic Information
    law_firm_approval NVARCHAR(20), -- enum('Approved', 'Hold')
    firstname NVARCHAR(55) NOT NULL,
    lastname NVARCHAR(75) NOT NULL,
    sf_id NVARCHAR(50),
    ml_id NVARCHAR(50),
    law_firm_client_id NVARCHAR(50),
    otherid NVARCHAR(50),
    primarylawfirm NVARCHAR(75) NOT NULL,
    claimanttype NVARCHAR(35) NOT NULL, -- enum
    
    -- Legal Status
    liensfinal NVARCHAR(1), -- enum('Y', 'N')
    bankruptcy NVARCHAR(1), -- enum('Y', 'N')
    bankruptcycleared NVARCHAR(50), -- enum
    probate NVARCHAR(1), -- enum('Y', 'N')
    probatecleared NVARCHAR(1), -- enum('Y', 'N')
    pathway_opt_in_status NVARCHAR(1), -- enum('Y', 'N')
    dod DATETIME2,
    
    -- Service Information
    serviceoptions NVARCHAR(75),
    disbursementcount NVARCHAR(35),
    milestonedisbursementid NVARCHAR(50),
    paygroupid NVARCHAR(50),
    
    -- Personal Information
    honorific NVARCHAR(10),
    genderidentity NVARCHAR(20), -- enum
    pronouns NVARCHAR(20), -- enum
    
    -- Address Information
    address1 NVARCHAR(75),
    address2 NVARCHAR(75),
    careof NVARCHAR(75),
    city NVARCHAR(55),
    state NVARCHAR(2),
    region NVARCHAR(50),
    zipcode NVARCHAR(25),
    country NVARCHAR(55),
    
    -- Personal Details
    dob DATETIME2,
    ssn NVARCHAR(11),
    
    -- Contact Information
    claimantpersonalemail NVARCHAR(75),
    claimantbusinessemail NVARCHAR(75),
    claimantotheremail NVARCHAR(75),
    claimantmobilephone NVARCHAR(20),
    claimanthomephone NVARCHAR(20),
    sms_opt_in NVARCHAR(1), -- enum('Y', 'N')
    
    -- Alternate Claimant Information
    altclaimanttype NVARCHAR(50), -- enum
    alternateclaimantsf_id NVARCHAR(50),
    alternateclaimantml_id NVARCHAR(50),
    alternateclaimantdob NVARCHAR(10),
    alternateclaimantssn NVARCHAR(11),
    alternateclaimantfirstname NVARCHAR(55),
    alternateclaimantlastname NVARCHAR(75),
    alternateclaimanthonorific NVARCHAR(10),
    alternateclaimantaddress1 NVARCHAR(75),
    alternateclaimantaddress2 NVARCHAR(75),
    alternateclaimantcity NVARCHAR(55),
    alternateclaimantstate NVARCHAR(2),
    alternateclaimantregion NVARCHAR(50),
    alternateclaimantzipcode NVARCHAR(25),
    alternateclaimantcountry NVARCHAR(55),
    alternateclaimantpersonalemail NVARCHAR(75),
    alternateclaimantpersonalphonenumber NVARCHAR(20),
    
    -- Financial Information
    basegrossaward DECIMAL(15,4),
    eifawardamount DECIMAL(15,4),
    appealaward DECIMAL(15,4),
    totalgrossaward DECIMAL(15,4),
    commonbenefit DECIMAL(10,4),
    commonbenefittotal DECIMAL(15,4),
    commonbenefitattorneyshare DECIMAL(10,4),
    commonbenefitattorneyshareamount DECIMAL(15,4),
    commonbenefitclaimantshare DECIMAL(10,4),
    commonbenefitclaimantshareamount DECIMAL(15,4),
    
    -- Attorney Fee Information
    attorneyfeecalcmethod NVARCHAR(20), -- enum('Gross', 'Net Cost')
    grosscontingencyfeeperc DECIMAL(10,4),
    grosscontingencyfeeamount DECIMAL(15,4),
    grossattorneyfeeperc DECIMAL(10,4),
    grossattorneyfeeamount DECIMAL(15,4),
    attorneyfeereduction DECIMAL(15,4),
    attorneycostreduction DECIMAL(15,4),
    attorneyfeeholdbackamount DECIMAL(15,4),
    totalnetattorneyfee DECIMAL(15,4),
    totalnetattorneycost DECIMAL(15,4),
    totaladmincost DECIMAL(15,4),
    othertotalliens DECIMAL(15,4),
    holdbackamount DECIMAL(15,4),
    otherholdbackamount DECIMAL(15,4),
    totalmedicalliens DECIMAL(15,4),
    previouspaymentstoclaimant DECIMAL(15,4),
    netclaimantpayment DECIMAL(15,4),
    generalcaseexpenses DECIMAL(15,4),
    
    -- Attorney Information (10 attorneys)
    attorney1name NVARCHAR(75),
    attorney1feepercent DECIMAL(10,4),
    attorney1fees DECIMAL(15,4),
    attorney1costamount DECIMAL(15,4),
    attorney2name NVARCHAR(75),
    attorney2feepercent DECIMAL(10,4),
    attorney2fees DECIMAL(15,4),
    attorney2costamount DECIMAL(15,4),
    attorney3name NVARCHAR(75),
    attorney3feepercent DECIMAL(10,4),
    attorney3fees DECIMAL(15,4),
    attorney3costamount DECIMAL(15,4),
    attorney4name NVARCHAR(75),
    attorney4feepercent DECIMAL(10,4),
    attorney4fees DECIMAL(15,4),
    attorney4costamount DECIMAL(15,4),
    attorney5name NVARCHAR(75),
    attorney5feepercent DECIMAL(10,4),
    attorney5fees DECIMAL(15,4),
    attorney5costamount DECIMAL(15,4),
    attorney6name NVARCHAR(75),
    attorney6feepercent DECIMAL(10,4),
    attorney6fees DECIMAL(15,4),
    attorney6costamount DECIMAL(15,4),
    attorney7name NVARCHAR(75),
    attorney7feepercent DECIMAL(10,4),
    attorney7fees DECIMAL(15,4),
    attorney7costamount DECIMAL(15,4),
    attorney8name NVARCHAR(75),
    attorney8feepercent DECIMAL(10,4),
    attorney8fees DECIMAL(15,4),
    attorney8costamount DECIMAL(15,4),
    attorney9name NVARCHAR(75),
    attorney9feepercent DECIMAL(10,4),
    attorney9fees DECIMAL(15,4),
    attorney9costamount DECIMAL(15,4),
    attorney10name NVARCHAR(75),
    attorney10feepercent DECIMAL(10,4),
    attorney10fees DECIMAL(15,4),
    attorney10costamount DECIMAL(15,4),
    
    -- Vendor Expenses
    vendorexpenseqsfadmin DECIMAL(15,4),
    vendorexpenseqsfadminname NVARCHAR(55),
    vendorexpenseclaimsadmin DECIMAL(15,4),
    vendorexpenseclaimsadminname NVARCHAR(55),
    vendorexpenselraholdback DECIMAL(15,4),
    vendorexpenselraholdbackname NVARCHAR(55),
    vendorexpenselrafinal DECIMAL(15,4),
    vendorexpenselrafinalname NVARCHAR(55),
    vendorexpensespecialmaster DECIMAL(15,4),
    vendorexpensespecialmastername NVARCHAR(55),
    vendorexpenseeifappeal DECIMAL(15,4),
    vendorexpenseeifappealname NVARCHAR(55),
    vendorexpensebankruptcycounsel DECIMAL(15,4),
    vendorexpensebankruptcycounselname NVARCHAR(55),
    vendorexpenseprobatecounsel DECIMAL(15,4),
    vendorexpenseprobatecounselname NVARCHAR(55),
    vendorother DECIMAL(15,4),
    vendorothername NVARCHAR(55),
    
    -- Medical Liens (6 liens)
    medicallien1name NVARCHAR(55),
    lienid1 NVARCHAR(55),
    lientype1 NVARCHAR(35), -- enum
    medicallien1 DECIMAL(15,4),
    medicallien2name NVARCHAR(55),
    lienid2 NVARCHAR(55),
    lientype2 NVARCHAR(35), -- enum
    medicallien2 DECIMAL(15,4),
    medicallien3name NVARCHAR(55),
    lienid3 NVARCHAR(55),
    lientype3 NVARCHAR(35), -- enum
    medicallien3 DECIMAL(15,4),
    medicallien4name NVARCHAR(55),
    lienid4 NVARCHAR(55),
    lientype4 NVARCHAR(35), -- enum
    medicallien4 DECIMAL(15,4),
    medicallien5name NVARCHAR(55),
    lienid5 NVARCHAR(55),
    lientype5 NVARCHAR(35), -- enum
    medicallien5 DECIMAL(15,4),
    medicallien6name NVARCHAR(55),
    lienid6 NVARCHAR(55),
    lientype6 NVARCHAR(35), -- enum
    medicallien6 DECIMAL(15,4),
    
    -- Other Liens
    otherlien1name NVARCHAR(55),
    otherlien1amount DECIMAL(15,4),
    otherlien2name NVARCHAR(55),
    otherlien2amount DECIMAL(15,4),
    
    -- Attorney Cost Details (10 attorneys)
    attorney1name_cost NVARCHAR(75),
    attorney1_costdetailname NVARCHAR(128),
    attorney1_costdetailamount DECIMAL(15,4),
    attorney2name_cost NVARCHAR(75),
    attorney2_costdetailname NVARCHAR(128),
    attorney2_costdetailamount DECIMAL(15,4),
    attorney3name_cost NVARCHAR(75),
    attorney3_costdetailname NVARCHAR(128),
    attorney3_costdetailamount DECIMAL(15,4),
    attorney4name_cost NVARCHAR(75),
    attorney4_costdetailname NVARCHAR(128),
    attorney4_costdetailamount DECIMAL(15,4),
    attorney5name_cost NVARCHAR(75),
    attorney5_costdetailname NVARCHAR(128),
    attorney5_costdetailamount DECIMAL(15,4),
    attorney6name_cost NVARCHAR(75),
    attorney6_costdetailname NVARCHAR(128),
    attorney6_costdetailamount DECIMAL(15,4),
    attorney7name_cost NVARCHAR(75),
    attorney7_costdetailname NVARCHAR(128),
    attorney7_costdetailamount DECIMAL(15,4),
    attorney8name_cost NVARCHAR(75),
    attorney8_costdetailname NVARCHAR(128),
    attorney8_costdetailamount DECIMAL(15,4),
    attorney9name_cost NVARCHAR(75),
    attorney9_costdetailname NVARCHAR(128),
    attorney9_costdetailamount DECIMAL(15,4),
    attorney10name_cost NVARCHAR(75),
    attorney10_costdetailname NVARCHAR(128),
    attorney10_costdetailamount DECIMAL(15,4),
    
    -- Notes and System Fields
    lawfirmnote NVARCHAR(1000),
    created_at DATETIME2 NOT NULL,
    updated_at DATETIME2 NOT NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Indexes for performance
    INDEX IX_Demographics_PartitionKey (partitionKey),
    INDEX IX_Demographics_PrimaryLawFirm (primarylawfirm),
    INDEX IX_Demographics_CreatedAt (created_at),
    INDEX IX_Demographics_FirstnameLastname (firstname, lastname),
    INDEX IX_Demographics_ClaimantType (claimanttype),
    INDEX IX_Demographics_Status (status)
);

-- API Keys table 
CREATE TABLE ApiKeys (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    partitionKey NVARCHAR(75) NOT NULL,
    key_id NVARCHAR(50) NOT NULL UNIQUE,
    key_hash NVARCHAR(64) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    law_firm NVARCHAR(75) NOT NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,
    rate_limits NVARCHAR(MAX) NOT NULL, -- JSON string
    scopes NVARCHAR(MAX) NOT NULL, -- JSON array
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    last_used_at DATETIME2,
    last_used_ip NVARCHAR(45),
    usage_count INT NOT NULL DEFAULT 0,
    expires_at DATETIME2,
    created_at DATETIME2 NOT NULL,
    updated_at DATETIME2 NOT NULL,
    allowed_ips NVARCHAR(MAX), -- JSON array
    allowed_domains NVARCHAR(MAX), -- JSON array
    environment NVARCHAR(20),
    
    INDEX IX_ApiKeys_KeyHash (key_hash),
    INDEX IX_ApiKeys_PartitionKey (partitionKey),
    INDEX IX_ApiKeys_LawFirm (law_firm),
    INDEX IX_ApiKeys_Status (status),
    INDEX IX_ApiKeys_ExpiresAt (expires_at)
);

CREATE TABLE idempotency_records (
  law_firm NVARCHAR(75) NOT NULL,
  idempotency_key UNIQUEIDENTIFIER NOT NULL,
  method NVARCHAR(10) NOT NULL,
  path NVARCHAR(500) NOT NULL,
  request_hash NVARCHAR(64) NOT NULL,
  response_status INT NOT NULL,
  response_body NVARCHAR(MAX) NOT NULL,
  expires_at DATETIME2 NOT NULL,
  PRIMARY KEY (law_firm, idempotency_key)
);

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

-- Create ApiKeys first and capture IDs
-- Update ApiKeys schema
ALTER TABLE ApiKeys
ALTER COLUMN key_hash NVARCHAR(64) NOT NULL;

-- Create ApiKeys
DECLARE @apikey1 UNIQUEIDENTIFIER = NEWID();
DECLARE @apikey2 UNIQUEIDENTIFIER = NEWID();
DECLARE @createdBy1 UNIQUEIDENTIFIER = NEWID();
DECLARE @createdBy2 UNIQUEIDENTIFIER = NEWID();

INSERT INTO ApiKeys (id, partitionKey, key_id, key_hash, name, description, law_firm, created_by, rate_limits, scopes, status, created_at, updated_at)
VALUES 
(@apikey1, 'LawFirm1', 'API_KEY_001', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ms_milestone-secret-key'), 1), 'Smith & Associates API', 'API key for Smith & Associates', 'Smith & Associates', @createdBy1, '{"requests_per_minute": 60, "requests_per_hour": 3600, "requests_per_day": 86400, "burst_limit": 100}', '["read", "write", "demographics:read", "demographics:write"]', 'active', GETUTCDATE(), GETUTCDATE()),
(@apikey2, 'LawFirm2', 'API_KEY_002', CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ms_milestone-secret-key2'), 1), 'Doe Legal Group API', 'API key for Doe Legal Group', 'Doe Legal Group', @createdBy2, '{"requests_per_minute": 60, "requests_per_hour": 3600, "requests_per_day": 86400, "burst_limit": 100}', '["read", "demographics:read"]', 'active', GETUTCDATE(), GETUTCDATE());

-- Now insert LawFirm with the correct api_key references
INSERT INTO LawFirm (partitionKey, name, contact_name, contact_email, contact_phone, address1, city, state, zipcode, country, api_key, created_by, status)
VALUES 
('LawFirm1', 'Smith & Associates', 'John Smith', 'john@smithlaw.com', '5551234567', '123 Main St', 'Austin', 'TX', '78701', 'USA', @apikey1, @createdBy1, 'active'),
('LawFirm2', 'Doe Legal Group', 'Jane Doe', 'jane@doelegal.com', '5559876543', '456 Oak Ave', 'Houston', 'TX', '77002', 'USA', @apikey2, @createdBy2, 'active');

-- Insert mock data into Demographics (corrected columns; using minimal required fields + examples for contact)
-- Adjust/add more columns as needed (e.g., claimantpersonalemail for email, claimantmobilephone for phone)
INSERT INTO Demographics (id, partitionKey, firstname, lastname, primarylawfirm, claimanttype, created_at, updated_at, created_by, status, claimantpersonalemail, claimantmobilephone)
VALUES
(NEWID(), 'Test Firm', 'John', 'Doe', 'Test Firm', 'Adult', GETUTCDATE(), GETUTCDATE(), NEWID(), 'active', 'john@test.com', '5551234567'),
(NEWID(), 'Test Firm', 'Jane', 'Smith', 'Test Firm', 'Minor', GETUTCDATE(), GETUTCDATE(), NEWID(), 'active', 'jane@test.com', '5559876543');
GO