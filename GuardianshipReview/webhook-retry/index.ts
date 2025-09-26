// Service Bus Queue Trigger for Webhook Retry with Exponential Backoff

import { app, InvocationContext } from '@azure/functions';
import { ServiceBusClient } from '@azure/service-bus';
import sql from 'mssql';
import axios from 'axios';

// Database connection
let sqlPool: sql.ConnectionPool;

async function getSqlConnection() {
  if (!sqlPool) {
    sqlPool = await sql.connect({
      server: process.env.SQL_SERVER!,
      database: process.env.SQL_DATABASE!,
      user: process.env.SQL_USER!,
      password: process.env.SQL_PASSWORD!,
      options: {
        encrypt: true,
        trustServerCertificate: false
      }
    });
  }
  return sqlPool;
}

// Service Bus client
const serviceBusClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING!);

// Main webhook retry function
async function webhookRetry(retryMessage: unknown, context: InvocationContext): Promise<void> {
  const { 
    uniqueID, 
    webhookUrl, 
    retryCount = 0, 
    maxRetries = 3,
    event,
    data,
    timestamp,
    correlationId,
    lastError
  } = retryMessage as any;
  
  context.log('Webhook retry attempt', retryCount + 1, 'of', maxRetries, 'for', uniqueID);
  context.log('Webhook URL:', webhookUrl);
  context.log('Event:', event);
  context.log('Last Error:', lastError);

  try {
    // Check if we've exceeded max retries
    if (retryCount >= maxRetries) {
      context.log('Webhook retry exhausted for', uniqueID, 'after', retryCount, 'attempts');
      
      await trackWebhookDelivery(context, {
        uniqueID,
        webhookUrl,
        event,
        status: 'failed_permanently',
        attemptCount: retryCount,
        lastError: 'Max retries exceeded'
      });
      
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Max 30 seconds
    context.log('Exponential backoff delay:', delay, 'ms');

    // Add small delay to respect backoff
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000)));

    // Prepare payload for retry
    const payload = {
      event,
      uniqueID,
      status: data?.status || 'retry',
      data,
      timestamp,
      retryAttempt: retryCount,
      correlationId: correlationId || 'unknown'
    };

    context.log('Attempting webhook delivery to:', webhookUrl);

    // Attempt webhook delivery
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LegalDocuments-Webhook-Retry/1.0',
        'X-Webhook-Event': event,
        'X-Unique-ID': uniqueID,
        'X-Retry-Attempt': retryCount.toString(),
        'X-Correlation-ID': correlationId || 'unknown'
      },
      timeout: 15000,
      validateStatus: (status) => status >= 200 && status < 300
    });

    context.log('Webhook retry successful for', uniqueID);
    context.log('Response Status:', response.status);

    // Track successful delivery
    await trackWebhookDelivery(context, {
      uniqueID,
      webhookUrl,
      event,
      status: 'delivered',
      httpStatusCode: response.status,
      responseBody: response.data ? JSON.stringify(response.data).substring(0, 500) : null,
      attemptCount: retryCount + 1
    });

    context.log('Webhook delivery tracked in database');

  } catch (error) {
    context.log('Webhook retry attempt', retryCount + 1, 'failed for', uniqueID, ':', error.message);
    
    // Track failed attempt
    await trackWebhookDelivery(context, {
      uniqueID,
      webhookUrl,
      event,
      status: 'retry_failed',
      httpStatusCode: error.response?.status || null,
      responseBody: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : null,
      attemptCount: retryCount + 1,
      lastError: error.message
    });

    // Check if we should retry again
    if (retryCount < maxRetries - 1) {
      context.log('Queueing next retry attempt for', uniqueID);
      
      // Calculate next retry delay
      const nextDelay = Math.min(Math.pow(2, retryCount + 1) * 1000, 60000); // Max 1 minute
      
      const nextRetryMessage = {
        retryMessage,
        retryCount: retryCount + 1,
        lastError: error.message,
        nextRetryAt: new Date(Date.now() + nextDelay).toISOString()
      };

      // Queue for next retry with delay
      const retrySender = serviceBusClient.createSender('webhook-retry');
      await retrySender.sendMessages([{
        body: nextRetryMessage,
        messageId: `retry-${uniqueID}-${retryCount + 1}`,
        scheduledEnqueueTimeUtc: new Date(Date.now() + nextDelay) // Service Bus message delay
      }]);
      await retrySender.close();

      context.log('Next retry scheduled in', nextDelay, 'ms for', uniqueID);
    } else {
      context.log('All retry attempts exhausted for', uniqueID);
      
      await trackWebhookDelivery(context, {
        uniqueID,
        webhookUrl,
        event,
        status: 'failed_permanently',
        attemptCount: retryCount + 1,
        lastError: error.message
      });
    }
  }
}

// Track webhook delivery attempts in database
async function trackWebhookDelivery(context: InvocationContext, deliveryData: any) {
  try {
    const pool = await getSqlConnection();
    
    await pool.request()
      .input('UniqueID', sql.UniqueIdentifier, deliveryData.uniqueID)
      .input('WebhookUrl', sql.NVarChar, deliveryData.webhookUrl)
      .input('Event', sql.NVarChar, deliveryData.event)
      .input('Status', sql.NVarChar, deliveryData.status)
      .input('HttpStatusCode', sql.Int, deliveryData.httpStatusCode || null)
      .input('ResponseBody', sql.NVarChar, deliveryData.responseBody || null)
      .input('AttemptCount', sql.Int, deliveryData.attemptCount)
      .input('LastError', sql.NVarChar, deliveryData.lastError || null)
      .query(`
        INSERT INTO WebhookDeliveries (
          UniqueID, WebhookUrl, Event, Status, HttpStatusCode, 
          ResponseBody, AttemptCount, LastAttemptAt, CreatedAt
        ) VALUES (
          @UniqueID, @WebhookUrl, @Event, @Status, @HttpStatusCode,
          @ResponseBody, @AttemptCount, GETUTCDATE(), GETUTCDATE()
        )
      `);

    context.log('Webhook delivery tracked:', deliveryData.status);

  } catch (dbError) {
    context.log('Failed to track webhook delivery in database:', dbError);
    // Don't throw - webhook tracking failure shouldn't fail the retry
  }
}

// Register the function
app.serviceBusQueue('webhookRetry', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  queueName: 'webhook-retry',
  handler: webhookRetry
});

export default webhookRetry;