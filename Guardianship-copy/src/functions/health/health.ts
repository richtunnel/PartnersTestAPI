import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Health check request received');
  
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    jsonBody: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'unknown'
    }
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'health',
  handler: healthCheck
});
