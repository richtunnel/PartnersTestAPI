import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { SettlementSchema } from '@shared/types/settlement';
import { ServiceBusManager } from '@shared/utils/serviceBus';

async function batchSettlement(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
  context.log(`Http function processed request for url "${request.url}"`);
  
  try {
    const requestBody = await request.json() as any;
    const { settlements } = requestBody;
    const MAX_BATCH_SIZE = 100; // Service Bus 256KB limit

    if (!Array.isArray(settlements)) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'Settlements must be an array'
        }
      });
    }

    // Check batch size limit
    if (settlements.length > MAX_BATCH_SIZE) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: `Batch size cannot exceed ${MAX_BATCH_SIZE} settlements`
        }
      });
    }

    // Validate all settlements using your exact field names
    const validatedSettlements = settlements.map((settlement: any) => 
      SettlementSchema.parse(settlement)
    );

    // Calculate estimated message size (rough estimate for 256KB limit)
    const estimatedSize = JSON.stringify(validatedSettlements).length;
    if (estimatedSize > 250000) { // 250KB buffer
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'Batch size exceeds Service Bus message limit'
        }
      });
    }

    const batchId = `batch_${Date.now()}`;
    
    // Send to Service Bus for processing
    const serviceBus = new ServiceBusManager();
    await serviceBus.sendMessage('settlement_processing_fifo', {
      type: 'batch_settlement',
      batch_id: batchId,
      data: validatedSettlements,
      timestamp: new Date().toISOString(),
      count: validatedSettlements.length
    });

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        message: `${validatedSettlements.length} settlements queued for processing`,
        batch_id: batchId,
        estimated_processing_time_minutes: Math.ceil(validatedSettlements.length / 10)
      }
    });
  } catch (error: any) {
    context.log.error('Error processing batch settlements:', error);
    return new HttpResponse({
      status: 400,
      jsonBody: {
        success: false,
        error: 'Settlement validation failed'
      }
    });
  }
}

app.http('batchSettlement', {
  methods: ['POST'],
  route: 'settlements/batch',
  authLevel: 'function',
  handler: batchSettlement
});