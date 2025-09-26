import { app, HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { Guardianship } from '@shared/types/guardianship';


async function getGuardianship(request: HttpRequest, context: InvocationContext): Promise<HttpResponse> {
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

    // First verify ClaimantGUID exists in demographics
    const claimantExists = await verifyClaimantExists(ClaimantGUID, context);
    if (!claimantExists) {
      return new HttpResponse({
        status: 400,
        jsonBody: {
          success: false,
          error: 'ClaimantGUID must exist in demographics API before accessing guardianship'
        }
      });
    }

    // Your database query using exact field names
    // const guardianships = await db.query('SELECT * FROM guardianship WHERE ClaimantGUID = ?', [ClaimantGUID]);
    
    // Mock response using your exact field names
    const mockGuardianship: Guardianship = {
      ClaimantGUID: ClaimantGUID,
      CaseID: "case-123", // Single CaseID, not array
      GuardianName: "Jane Smith",
      GuardianType: "Parent",
      CourtOrderDate: new Date("2024-01-15"),
      CourtName: "Dallas County Court",
      DocumentPath: "/documents/court-order-123.pdf"
    };

    return new HttpResponse({
      status: 200,
      jsonBody: {
        success: true,
        data: mockGuardianship
      }
    });
  } catch (error) {
    context.log.error('Error getting guardianship:', error);
    return new HttpResponse({
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to retrieve guardianship'
      }
    });
  }
}

app.http('getGuardianship', {
  methods: ['GET'],
  route: 'guardianship/{ClaimantGUID}',
  authLevel: 'function',
  handler: getGuardianship
});