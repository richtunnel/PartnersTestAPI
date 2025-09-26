import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { ServiceBusManager } from '@shared/utils/serviceBus';
import logger from '@shared/utils/logger';

// multiple documents per claimant (but still single claimant submission)
async function uploadDocuments(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
  context.log(`Http function processed request for url "${request.url}"`);
  
  try {
    const ClaimantGUID = request.params.ClaimantGUID;
    const requestBody = await request.json() as any;
    const { documents } = requestBody; // array of document metadata

    if (!ClaimantGUID) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'ClaimantGUID parameter required'
        }
      });
    }

    if (!Array.isArray(documents)) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'Documents must be an array'
        }
      });
    }

    // Verify ClaimantGUID exists
    const claimantExists = await verifyClaimantExists(ClaimantGUID, context);
    if (!claimantExists) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'ClaimantGUID must exist in demographics API'
        }
      });
    }

    // Process multiple documents for single claimant
    const documentProcessing = documents.map((doc: any) => ({
      ClaimantGUID: ClaimantGUID,
      DocumentPath: doc.DocumentPath,
      DocumentType: doc.DocumentType || 'CourtOrder',
      UploadedAt: new Date().toISOString()
    }));

    // Send to Service Bus for document processing
    const serviceBus = new ServiceBusManager();
    await serviceBus.sendMessage('guardianship_document_processing', {
      type: 'document_upload',
      ClaimantGUID: ClaimantGUID,
      documents: documentProcessing,
      timestamp: new Date().toISOString()
    });

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        message: `${documents.length} documents queued for processing`,
        ClaimantGUID: ClaimantGUID,
        document_count: documents.length
      }
    });
  } catch (error: any) {
    logger.error('Error uploading documents:', error);
    return new HttpResponse({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Document processing failed'
      }
    });
  }
}

app.http('uploadDocuments', {
  methods: ['POST'],
  route: 'guardianship/{ClaimantGUID}/documents',
  authLevel: 'function',
  handler: uploadDocuments
});