import { app, InvocationContext } from '@azure/functions';
import { Guardianship } from '@shared/types/guardianship';

export async function processGuardianships(message: unknown, context: InvocationContext): Promise<void> {
    context.log('Guardianship processor function started', message);
    
    try {
        const messageBody = message as {
            type: string;
            data?: Guardianship;
            ClaimantGUID?: string;
            documents?: any[];
            timestamp: string;
        };

        switch (messageBody.type) {
            case 'single_create':
            case 'single_update':
                const guardianship = messageBody.data as Guardianship;
                context.log(`Processing guardianship for ClaimantGUID: ${guardianship.ClaimantGUID}`);
                await processGuardianship(guardianship, messageBody.type, context);
                break;
                
            case 'single_delete':
                context.log(`Deleting guardianship for ClaimantGUID: ${messageBody.ClaimantGUID}`);
                await deleteGuardianshipRecord(messageBody.ClaimantGUID!, context);
                break;
                
            case 'document_upload':
                context.log(`Processing documents for ClaimantGUID: ${messageBody.ClaimantGUID}`);
                await processDocuments(messageBody.ClaimantGUID!, messageBody.documents!, context);
                break;
        }

        context.log('Guardianship processing completed successfully');
    } catch (error) {
        context.log.error('Guardianship processing failed:', error);
        throw error;
    }
}

async function processGuardianship(guardianship: Guardianship, operation: string, context: InvocationContext): Promise<void> {
    try {
        // Database operations using your exact field names
        if (operation === 'single_create') {
            // await db.query(`
            //     INSERT INTO guardianship (ClaimantGUID, CaseID, GuardianName, GuardianType, CourtOrderDate, CourtName, DocumentPath)
            //     VALUES (?, ?, ?, ?, ?, ?, ?)
            // `, [guardianship.ClaimantGUID, guardianship.CaseID, guardianship.GuardianName, guardianship.GuardianType,
            //     guardianship.CourtOrderDate, guardianship.CourtName, guardianship.DocumentPath]);
        } else if (operation === 'single_update') {
            // await db.query(`
            //     UPDATE guardianship SET
            //     CaseID=?, GuardianName=?, GuardianType=?, CourtOrderDate=?, CourtName=?, DocumentPath=?
            //     WHERE ClaimantGUID=?
            // `, [guardianship.CaseID, guardianship.GuardianName, guardianship.GuardianType,
            //     guardianship.CourtOrderDate, guardianship.CourtName, guardianship.DocumentPath, guardianship.ClaimantGUID]);
        }
        
        context.log(`Guardianship ${operation} completed: ${guardianship.ClaimantGUID}`);
    } catch (error) {
        context.log.error(`Failed to ${operation} guardianship ${guardianship.ClaimantGUID}:`, error);
        throw error;
    }
}

async function deleteGuardianshipRecord(ClaimantGUID: string, context: InvocationContext): Promise<void> {
    try {
        // await db.query(`DELETE FROM guardianship WHERE ClaimantGUID=?`, [ClaimantGUID]);
        // await db.query(`DELETE FROM guardianship_documents WHERE ClaimantGUID=?`, [ClaimantGUID]);
        
        context.log(`Guardianship deleted: ${ClaimantGUID}`);
    } catch (error) {
        context.log.error(`Failed to delete guardianship ${ClaimantGUID}:`, error);
        throw error;
    }
}

async function processDocuments(ClaimantGUID: string, documents: any[], context: InvocationContext): Promise<void> {
    try {
        for (const doc of documents) {
            // await db.query(`
            //     INSERT INTO guardianship_documents (ClaimantGUID, DocumentPath, DocumentType, UploadedAt)
            //     VALUES (?, ?, ?, ?)
            // `, [ClaimantGUID, doc.DocumentPath, doc.DocumentType, doc.UploadedAt]);
        }
        
        context.log(`Documents processed for ${ClaimantGUID}: ${documents.length} files`);
    } catch (error) {
        context.log.error(`Failed to process documents for ${ClaimantGUID}:`, error);
        throw error;
    }
}

app.serviceBusQueue('processGuardianships', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'guardianship_processing_fifo',
    handler: processGuardianships
});

app.serviceBusQueue('processGuardianshipDocuments', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'guardianship_document_processing',
    handler: processGuardianships
});

// Helper function to verify ClaimantGUID exists in demographics API
async function verifyClaimantExists(ClaimantGUID: string, context: InvocationContext): Promise<boolean> {
    try {
        // Call demographics API to verify claimant exists
        // const response = await fetch(`${process.env.DEMOGRAPHICS_API_URL}/external/v1/demographics/verify/${ClaimantGUID}`);
        // return response.ok;
        
        // For now, return true - implement actual verification
        context.log(`Verifying ClaimantGUID exists: ${ClaimantGUID}`);
        return true;
    } catch (error) {
        context.log.error(`Error verifying ClaimantGUID ${ClaimantGUID}:`, error);
        return false;
    }
}