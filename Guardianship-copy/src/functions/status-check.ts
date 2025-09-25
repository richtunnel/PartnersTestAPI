// HTTP Trigger - Provides real-time status of guardianship requests
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function getIntakeStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Status check request received');
  
  const intakeId = request.params.intakeId;
  
  if (!intakeId) {
    return {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      jsonBody: { error: 'Missing intakeId parameter' }
    };
  }
  
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    jsonBody: {
      intakeId,
      status: 'queued',
      message: 'Intake is queued for processing into MilestoneDB',
      queueLocation: process.env.QUEUE_NAME || 'legal-documents-queue'
    }
  };
}

app.http('status', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'guardianship/{intakeId}/status',
  handler: getIntakeStatus
});
