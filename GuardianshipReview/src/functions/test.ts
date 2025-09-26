import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function testFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: { message: 'Hello Milestone Team!' }
  };
}

app.http('test', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'test',
  handler: testFunction
});