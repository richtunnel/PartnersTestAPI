import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { Settlement } from '@shared/types/settlement';

async function getSettlement(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
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

    // Your database query using exact field names
    // const settlements = await db.query('SELECT * FROM settlements WHERE ClaimantGUID = ?', [ClaimantGUID]);
    
    // Mock response using your exact field names
    const mockSettlement: Settlement = {
      ClaimantGUID: ClaimantGUID,
      CaseProjectID: "case-project-123",
      BaseGrossAwardAmount: 100000.00,
      EIFAwardAmount: 5000.00,
      AppealAwardAmount: 2000.00,
      AttorneyFees: [{
        FirmName: "Smith & Associates",
        AttorneyFeeDescription: "Contingency Fee",
        AttorneyFeeAmount: 30000.00,
        AttorneyFeePercentage: 30.0
      }],
      AttorneyCosts: [{
        FirmName: "Smith & Associates", 
        AttorneyCostDescription: "Filing Costs",
        AttorneyCostAmount: 500.00
      }],
      VendorFees: [],
      VendorCosts: []
    };

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        data: mockSettlement
      }
    });
  } catch (error: any) {
    context.log.error('Error getting settlement:', error);
    return new HttpResponse({
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to retrieve settlement'
      }
    });
  }
}

app.http('getSettlement', {
  methods: ['GET'],
  route: 'settlements/{ClaimantGUID}',
  authLevel: 'function',
  handler: getSettlement
});