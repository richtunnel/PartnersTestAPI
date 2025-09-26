import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { GuardianshipSchema } from '@shared/types/guardianship';
import { ServiceBusManager } from '@shared/utils/serviceBus';

async function updateGuardianship(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
  context.log(`Http function processed request for url "${request.url}"`);
  
  try {
    const ClaimantGUID = request.params.ClaimantGUID;
    const requestBody = await request.json() as any;

    if (!ClaimantGUID) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'ClaimantGUID parameter required'
        }
      });
    }

    // Validate guardianship update using your exact field names
    const validatedGuardianship = GuardianshipSchema.parse({
      ...requestBody,
      ClaimantGUID: ClaimantGUID
    });

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

    // Send to Service Bus
    const serviceBus = new ServiceBusManager();
    await serviceBus.sendMessage('guardianship_processing_fifo', {
      type: 'single_update',
      data: validatedGuardianship,
      timestamp: new Date().toISOString()
    });

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        message: 'Guardianship update queued for processing',
        ClaimantGUID: ClaimantGUID
      }
    });
  } catch (error) {
    context.log.error('Error updating guardianship:', error);
    return new HttpResponse({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Guardianship validation failed'
      }
    });
  }
}

app.http('updateGuardianship', {
  methods: ['PUT'],
  route: 'guardianship/{ClaimantGUID}',
  authLevel: 'function',
  handler: updateGuardianship
});