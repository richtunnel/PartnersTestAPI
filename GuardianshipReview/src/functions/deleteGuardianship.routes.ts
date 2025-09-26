import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { ServiceBusManager } from '@shared/utils/serviceBus';

async function deleteGuardianship(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
  context.log(`Http function processed request for url "${request.url}"`);
  
  try {
    const ClaimantGUID = request.params.ClaimantGUID;

    if (!ClaimantGUID) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'ClaimantGUID parameter required'
        }
      });
    }

    // Send deletion to Service Bus
    const serviceBus = new ServiceBusManager();
    await serviceBus.sendMessage('guardianship_processing_fifo', {
      type: 'single_delete',
      ClaimantGUID: ClaimantGUID,
      timestamp: new Date().toISOString()
    });

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        message: 'Guardianship deletion queued for processing',
        ClaimantGUID: ClaimantGUID
      }
    });
  } catch (error) {
    context.log.error('Error deleting guardianship:', error);
    return new HttpResponse({
      status: 500,
      jsonBody: {
        success: false,
        error: 'Deletion processing failed'
      }
    });
  }
}

app.http('deleteGuardianship', {
  methods: ['DELETE'],
  route: 'guardianship/{ClaimantGUID}',
  authLevel: 'function',
  handler: deleteGuardianship
});