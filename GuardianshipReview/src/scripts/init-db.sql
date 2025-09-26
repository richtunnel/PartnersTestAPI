CREATE TABLE Guardianships (
  id UNIQUEIDENTIFIER PRIMARY KEY,
  partitionKey NVARCHAR(75),
  guardianName NVARCHAR(100),
  wardName NVARCHAR(100),
  status NVARCHAR(20),
  created_at DATETIME,
  updated_at DATETIME,
  created_by UNIQUEIDENTIFIER,
  guardianEmail NVARCHAR(255),
  guardianPhone NVARCHAR(20)
);

INSERT INTO Guardianships (id, partitionKey, guardianName, wardName, status, created_at, updated_at, created_by, guardianEmail, guardianPhone)
VALUES
(NEWID(), 'Smith & Associates', 'John Smith', 'Jane Doe', 'active', GETUTCDATE(), GETUTCDATE(), NEWID(), 'john@smithlaw.com', '5551234567'),
(NEWID(), 'Smith & Associates', 'Mary Johnson', 'Bob Smith', 'pending', GETUTCDATE(), GETUTCDATE(), NEWID(), 'mary@smithlaw.com', '5559876543');