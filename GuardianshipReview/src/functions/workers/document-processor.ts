// Service Bus Queue Trigger - Processes documents and uploads to blob storage
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function getDocumentTypes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Document types request received');
  
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    jsonBody: {
      guardianIdDocuments: [
        'Valid Drivers License',
        'Valid State-Issued ID',
        'Valid US Passport',
        'Valid US Military ID'
      ],
      guardianRelationshipDocuments: [
        'Birth Certificate',
        'Custodial Document',
        'Adoption Order',
        'Guardianship Document',
        'Other Guardian Document'
      ]
    }
  };
}

app.http('documentTypes', {
  methods: ['GET'],
  authLevel: 'function',
  route: "{*segments}",
  handler: getDocumentTypes
});
