import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { SettlementSchema } from '@/shared/types/settlement';
import { ServiceBusManager } from '@shared/utils/serviceBus';

async function updateSettlement(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
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

    // Validate settlement data using your exact field names
    const validatedSettlement = SettlementSchema.parse({
      ...requestBody,
      ClaimantGUID: ClaimantGUID
    });

    // Send to Service Bus for processing
    const serviceBus = new ServiceBusManager();
    await serviceBus.sendMessage('settlement_processing_fifo', {
      type: 'single_update',
      data: validatedSettlement,
      timestamp: new Date().toISOString()
    });

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        message: 'Settlement queued for processing',
        ClaimantGUID: ClaimantGUID
      }
    });
  } catch (error: any) {
    context.log.error('Error updating settlement:', error);
    return new HttpResponse({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Settlement validation failed'
      }
    });
  }
}

app.http('updateSettlement', {
  methods: ['PUT'],
  route: 'settlements/{ClaimantGUID}',
  authLevel: 'function',
  handler: updateSettlement
});
