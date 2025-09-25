import { app, InvocationContext } from '@azure/functions';

export async function processLegalDocuments(message: unknown, context: InvocationContext): Promise<void> {
  context.log('Service Bus queue trigger function processed message:', message);
      const processedIntake = message as any;

  try {
    
    if (!processedIntake.intakeId) {
      context.error('Invalid message format - missing intakeId');
      return;
    }
    
    context.log(`Processing intake ${processedIntake.intakeId} for MilestoneDB integration`);
    
    // Transform data for MilestoneDB
    const milestoneData = {
      intakeId: processedIntake.intakeId,
      claimantGUID: processedIntake.claimantGUID,
      representativeGUID: processedIntake.representativeGUID,
      caseProjectId: processedIntake.caseProjectId,
      documentCount: processedIntake.processedDocuments.length,
      blobLocation: processedIntake.blobStorageLocation,
      processedAt: new Date().toISOString(),
      status: 'ready_for_milestone'
    };
    
    context.log('Transformed data for MilestoneDB:', JSON.stringify(milestoneData, null, 2));
    
    // In production: await milestoneDbService.createIntake(milestoneData);
    
    context.log(`Successfully processed intake ${processedIntake.intakeId} for MilestoneDB`);
        context.log(`Documents available at: ${milestoneData.blobLocation}`);
    context.log(`Document references created: ${milestoneData.documentCount}`);
  } catch (error) {
    context.error('Error processing message for MilestoneDB:', error);
    throw error;
  }
}

/* Comment out the function for local testing */

if (process.env.AZURE_SERVICE_BUS_CONNECTION_STRING && process.env.NODE_ENV !== 'development') {

app.serviceBusQueue('processLegalDocuments', {
  connection: 'AZURE_SERVICE_BUS_CONNECTION_STRING',
  queueName: 'legal-documents-queue',
  handler: processLegalDocuments
});
}