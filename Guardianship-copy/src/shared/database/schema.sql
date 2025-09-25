-- Main intake tracking table
CREATE TABLE LegalIntakes (
    IntakeId NVARCHAR(50) PRIMARY KEY,
    ClaimantGUID NVARCHAR(50) NOT NULL,
    RepresentativeGUID NVARCHAR(50) NOT NULL,
    CaseProjectId NVARCHAR(100) NOT NULL,
    BlobLocation NVARCHAR(500) NOT NULL,  -- WHERE documents are stored
    DocumentCount INT NOT NULL,
    ProcessedAt DATETIME2 NOT NULL,
    Status NVARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

-- Document location tracking table
CREATE TABLE DocumentReferences (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    IntakeId NVARCHAR(50) NOT NULL,
    DocumentId NVARCHAR(50) NOT NULL,
    OriginalName NVARCHAR(255) NOT NULL,
    StoredName NVARCHAR(500) NOT NULL,    -- EXACT blob path
    BlobUrl NVARCHAR(1000) NOT NULL,      -- DIRECT access URL
    Category NVARCHAR(50) NOT NULL,       -- guardian_id, guardian_relationship
    DocumentType NVARCHAR(100) NOT NULL,  -- Driver's License, Birth Certificate
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (IntakeId) REFERENCES LegalIntakes(IntakeId)
);