import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { GuardianshipSchema } from '@shared/types/guardianship';
import { ServiceBusManager } from '@shared/utils/serviceBus';

// Single claimant with single CaseID - NO BULK SUBMISSION
async function createGuardianship(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
  context.log(`Http function processed request for url "${request.url}"`);
  
  try {
    const requestBody = await request.json() as any;

    // Validate guardianship data using your exact field names
    const validatedGuardianship = GuardianshipSchema.parse(requestBody);

    // Verify ClaimantGUID exists in demographics API
    const claimantExists = await verifyClaimantExists(validatedGuardianship.ClaimantGUID, context);
    if (!claimantExists) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'ClaimantGUID must exist in demographics API before creating guardianship'
        }
      });
    }

    // Send to Service Bus (single submission only)
    const serviceBus = new ServiceBusManager();
    await serviceBus.sendMessage('guardianship_processing_fifo', {
      type: 'single_create',
      data: validatedGuardianship,
      timestamp: new Date().toISOString()
    });

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        message: 'Guardianship queued for processing',
        ClaimantGUID: validatedGuardianship.ClaimantGUID,
        CaseID: validatedGuardianship.CaseID
      }
    });
  } catch (error) {
    context.log.error('Error creating guardianship:', error);
    return new HttpResponse({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Guardianship validation failed'
      }
    });
  }
}

app.http('createGuardianship', {
  methods: ['POST'],
  route: 'guardianship',
  authLevel: 'function',
  handler: createGuardianship
})