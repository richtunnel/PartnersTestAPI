import { app, InvocationContext } from '@azure/functions';
import { ConnectionPool, config as sqlConfig } from 'mssql';

// Milestone Database connection configuration
const milestoneDbConfig: sqlConfig = {
  user: process.env.MILESTONE_DB_USER!,
  password: process.env.MILESTONE_DB_PASSWORD!,
  server: process.env.MILESTONE_DB_SERVER!,
  database: process.env.MILESTONE_DB_NAME!,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// Database service for database operations
class MilestoneDbService {
  private pool: ConnectionPool;

  constructor() {
    this.pool = new ConnectionPool(milestoneDbConfig);
  }

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async createIntake(intakeData: any): Promise<void> {
    const request = this.pool.request();

    // insert into Database - Main intake record
    await request
      .input('intakeId', intakeData.intakeId)
      .input('claimantGUID', intakeData.claimantGUID)
      .input('representativeGUID', intakeData.representativeGUID)
      .input('caseProjectId', intakeData.caseProjectId)
      .input('blobLocation', intakeData.blobLocation)
      .input('documentCount', intakeData.documentCount)
      .input('processedAt', intakeData.processedAt)
      .input('status', intakeData.status)
      .query(`
        INSERT INTO LegalIntakes (
          IntakeId, ClaimantGUID, RepresentativeGUID, CaseProjectId,
          BlobLocation, DocumentCount, ProcessedAt, Status
        ) VALUES (
          @intakeId, @claimantGUID, @representativeGUID, @caseProjectId,
          @blobLocation, @documentCount, @processedAt, @status
        )
      `);

    // INSERT document tracking records
    for (const doc of intakeData.documentReferences) {
      await request
        .input('docIntakeId', intakeData.intakeId)
        .input('documentId', doc.documentId)
        .input('originalName', doc.originalName)
        .input('storedName', doc.storedName)
        .input('blobUrl', doc.blobUrl)
        .input('category', doc.category)
        .input('documentType', doc.documentType)
        .query(`
          INSERT INTO DocumentReferences (
            IntakeId, DocumentId, OriginalName, StoredName, 
            BlobUrl, Category, DocumentType
          ) VALUES (
            @docIntakeId, @documentId, @originalName, @storedName,
            @blobUrl, @category, @documentType
          )
        `);
    }
  }

  async updateStatus(intakeId: string, status: string): Promise<void> {
    const request = this.pool.request();
    await request
      .input('intakeId', intakeId)
      .input('status', status)
      .input('updatedAt', new Date())
      .query(`
        UPDATE LegalIntakes 
        SET Status = @status, UpdatedAt = @updatedAt 
        WHERE IntakeId = @intakeId
      `);
  }

  async close(): Promise<void> {
    await this.pool.close();
  }
}

export async function processLegalDocuments(message: unknown, context: InvocationContext): Promise<void> {
  context.log('Service Bus queue trigger function processed message:', message);
  
  const milestoneDb = new MilestoneDbService();
      const processedIntake = message as any;

  
  try {
    
    if (!processedIntake.intakeId) {
      context.error('Invalid message format - missing intakeId');
      return;
    }
    
    context.log(`Processing intake ${processedIntake.intakeId} for MilestoneDB integration`);
    
    // Connect to MilestoneDB
    await milestoneDb.connect();
    
    // TRANSFORM DATA FOR MILESTONE - Complete mapping
    const milestoneData = {
      intakeId: processedIntake.intakeId,
      claimantGUID: processedIntake.claimantGUID,
      representativeGUID: processedIntake.representativeGUID,
      caseProjectId: processedIntake.caseProjectId,
      otherId1: processedIntake.otherId1,
      otherId2: processedIntake.otherId2,
      signingPriority: processedIntake.guardianInformation.signingPriority,
      blobLocation: processedIntake.blobStorageLocation,
      documentCount: processedIntake.processedDocuments.length,
      processedAt: new Date().toISOString(),
      status: 'imported_to_milestone',
      
      // DOCUMENT LOCATION TRACKING - Full details for each document
      documentReferences: processedIntake.processedDocuments.map((doc: any) => ({
        documentId: doc.documentId,
        originalName: doc.originalName,
        storedName: doc.storedName,        // EXACT BLOB LOCATION
        blobUrl: doc.blobUrl,              // DIRECT ACCESS URL
        category: doc.category,            // guardian_id or guardian_relationship
        documentType: doc.documentType,    //  Driver's License, Birth Certificate, etc.
        uploadTimestamp: doc.uploadTimestamp
      }))
    };
    
    context.log('Transformed data for MilestoneDB:', JSON.stringify(milestoneData, null, 2));
    
    // SAVE TO MILESTONEDB - Complete integration
    await milestoneDb.createIntake(milestoneData);
    
    context.log(`Successfully imported intake ${processedIntake.intakeId} into MilestoneDB`);
    context.log(`Documents available at: ${milestoneData.blobLocation}`);
    context.log(`Document references created: ${milestoneData.documentCount}`);
    
  } catch (error) {
    context.error('Error processing message for MilestoneDB:', error);
    
    // Update status to failed
    if (processedIntake?.intakeId) {
      try {
        await milestoneDb.updateStatus(processedIntake.intakeId, 'import_failed');
      } catch (statusError) {
        context.error('Failed to update status:', statusError);
      }
    }
    
    throw error; // This will move message to dead letter queue
  } finally {
    await milestoneDb.close();
  }
}

// Register the Service Bus trigger
app.serviceBusQueue('processLegalDocuments', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName: 'legal-documents-queue',
  handler: processLegalDocuments
});

// Status lookup function for Milestone Database
export async function getMilestoneStatus(intakeId: string): Promise<any> {
  const milestoneDb = new MilestoneDbService();
  
  try {
    await milestoneDb.connect();
    
    const request = milestoneDb['pool'].request();
    const result = await request
      .input('intakeId', intakeId)
      .query(`
        SELECT 
          i.*,
          COUNT(d.DocumentId) as DocumentCount,
          STRING_AGG(d.DocumentType, ', ') as DocumentTypes
        FROM LegalIntakes i
        LEFT JOIN DocumentReferences d ON i.IntakeId = d.IntakeId
        WHERE i.IntakeId = @intakeId
        GROUP BY i.IntakeId, i.ClaimantGUID, i.RepresentativeGUID, 
                 i.CaseProjectId, i.Status, i.ProcessedAt
      `);
    
    return result.recordset[0] || null;
    
  } finally {
    await milestoneDb.close();
  }
}