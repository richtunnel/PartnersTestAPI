// HTTP Trigger - Main entry point for guardianship requests
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ServiceBusClient } from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { GuardianshipIntake, GuardianshipIntakeSchema, ProcessedDocument, ProcessedIntake, allowedTypes } from '@/shared/types/guardianship';

// Configuration
const config = {
  serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
  storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  queueName: process.env.QUEUE_NAME || 'legal-documents-queue',
  containerName: process.env.BLOB_CONTAINER_NAME || 'legal-documents',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
};

// CORS helper
function getCorsHeaders(request: HttpRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (config.allowedOrigins.includes('*') || (origin && config.allowedOrigins.includes(origin))) {
    corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
  }
  
  return corsHeaders;
}

export async function guardianshipIntake(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Guardianship intake request received');
  
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Handle preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return { status: 200, headers: corsHeaders };
    }
    
    if (request.method !== 'POST') {
      return {
        status: 405,
        headers: corsHeaders,
        jsonBody: { error: 'Method not allowed' }
      };
    }
    
    // Get form data
    const formData = await request.formData();
    const intakeDataStr = formData.get('intakeData') as string;
    
    if (!intakeDataStr) {
      return {
        status: 400,
        headers: corsHeaders,
        jsonBody: { error: 'Missing intakeData field' }
      };
    }
    
    // Validate intake data
    let intakeData: GuardianshipIntake;
    try {
      intakeData = GuardianshipIntakeSchema.parse(JSON.parse(intakeDataStr));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          status: 400,
          headers: corsHeaders,
          jsonBody: { error: 'Validation error', details: error.errors }
        };
      }
      throw error;
    }
    
    // Get files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'documents' && value instanceof File) {
        files.push(value);
      }
    }
    
    if (!files || files.length === 0) {
      return {
        status: 400,
        headers: corsHeaders,
        jsonBody: { error: 'No documents uploaded' }
      };
    }
    
    if (files.length !== intakeData.documentation.length) {
      return {
        status: 400,
        headers: corsHeaders,
        jsonBody: { error: 'Mismatch between documentation array and uploaded files' }
      };
    }
    

  
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return {
          status: 400,
          headers: corsHeaders,
          jsonBody: { 
            error: 'Invalid file type',
            message: `File ${file.name} has unsupported type: ${file.type}`
          }
        };
      }
      
      if (file.size > 50 * 1024 * 1024) {
        return {
          status: 400,
          headers: corsHeaders,
          jsonBody: { 
            error: 'File too large',
            message: `File ${file.name} exceeds 50MB limit`
          }
        };
      }
    }
    
    // Process the intake
    const intakeId = uuidv4();
    const timestamp = new Date().toISOString();

    // Check if we have valid Azure connection strings
    const hasValidStorageConnection = config.storageConnectionString && 
      config.storageConnectionString !== '' && 
      config.storageConnectionString.startsWith('DefaultEndpointsProtocol=');

    const hasValidServiceBusConnection = config.serviceBusConnectionString && 
      config.serviceBusConnectionString !== '' &&
      config.serviceBusConnectionString.startsWith('Endpoint=sb://');
      
    const isLocalTesting = process.env.NODE_ENV === 'development' || 
      !hasValidStorageConnection || 
      !hasValidServiceBusConnection;

    let processedDocuments: ProcessedDocument[] = [];

    if (isLocalTesting) {
      // MOCK MODE: Simulate document processing
      context.log('MOCK MODE: Simulating document upload and processing');
      context.log(`Storage connection valid: ${hasValidStorageConnection}`);
      context.log(`Service Bus connection valid: ${hasValidServiceBusConnection}`);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const docInfo = intakeData.documentation[i];
        
        if (!file || !docInfo) {
          return {
            status: 400,
            headers: corsHeaders,
            jsonBody: { error: `File or documentation info missing at index ${i}` }
          };
        }
        
        const documentId = uuidv4();
        const fileExtension = file.name?.split('.').pop() || 'bin';
        const storedName = `${intakeId}/${docInfo.category}/${documentId}.${fileExtension}`;
        
        // Mock processed document
        processedDocuments.push({
          originalName: file.name || 'unknown',
          storedName,
          blobUrl: `https://mockblob.blob.core.windows.net/legal-documents/${storedName}`,
          documentId,
          category: docInfo.category,
          documentType: docInfo.documentType,
          uploadTimestamp: timestamp
        });
        
        context.log(`MOCK: Processed file ${file.name} as ${storedName}`);
      }
      
      context.log(`MOCK: Would send message to Service Bus with intake ID: ${intakeId}`);
      
    } else {
      // Production: Actual Azure processing
      context.log('Prod Mode: Using actual Azure services');
      
      // Initialize Azure services
      const blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString);
      const containerClient = blobServiceClient.getContainerClient(config.containerName);
      await containerClient.createIfNotExists();
      
      //using this to process documents one by one for now
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const docInfo = intakeData.documentation[i];
        
        if (!file) {
          return {
            status: 400,
            headers: corsHeaders,
            jsonBody: { error: `File at index ${i} is missing` }
          };
        }
        
        if (!docInfo) {
          return {
            status: 400,
            headers: corsHeaders,
            jsonBody: { error: `Documentation info at index ${i} is missing` }
          };
        }
        
        //Stores each document individually 
        const documentId = uuidv4();
        const fileExtension = file.name?.split('.').pop() || 'bin';
        const storedName = `${intakeId}/${docInfo.category}/${documentId}.${fileExtension}`;
        
        const blockBlobClient = containerClient.getBlockBlobClient(storedName);
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
          blobHTTPHeaders: { blobContentType: file.type },
          metadata: {
            originalName: file.name || 'unknown',
            intakeId,
            category: docInfo.category,
            documentId,
            uploadTimestamp: timestamp
          }
        });
        
        //build the array of process documents
        processedDocuments.push({
          originalName: file.name || 'unknown',
          storedName,
          blobUrl: blockBlobClient.url,
          documentId,
          category: docInfo.category,
          documentType: docInfo.documentType,
          uploadTimestamp: timestamp
        });
      }

    }
    
    // Create processed intake
    const processedIntake: ProcessedIntake = {
      ...intakeData,
      intakeId,
      processedDocuments,
      timestamp,
      status: 'processed',
      blobStorageLocation: `${config.containerName}/${intakeId}`
    };

    // Send to Service Bus only in real mode
    if (!isLocalTesting) {
      const serviceBusClient = new ServiceBusClient(config.serviceBusConnectionString);
      const sender = serviceBusClient.createSender(config.queueName);
      
      //Queue for pickup: Message sent to MilestoneDB processor
      await sender.sendMessages({
        body: processedIntake, // ← ALL TRACKING INFO INCLUDED
        messageId: intakeId,
        contentType: 'application/json'
      });
      
      await sender.close();
      await serviceBusClient.close();
    }
    
    context.log(`Successfully processed intake ${intakeId} with ${processedDocuments.length} documents`);
    
    return {
      status: 201,
      headers: corsHeaders,
      jsonBody: {
        success: true,
        intakeId,
        timestamp,
        documentsProcessed: processedDocuments.length,
        blobStorageLocation: processedIntake.blobStorageLocation,
        message: isLocalTesting 
          ? 'MOCK: Guardianship intake processed successfully (simulated)' 
          : 'Guardianship intake processed successfully and queued for milestone database pickup'
      }
    };
    
  } catch (error) {
    context.error('Error processing guardianship intake:', error);
    
    return {
      status: 500,
      headers: corsHeaders,
      jsonBody: {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An error occurred'
      }
    };
  }
}

app.http('guardianship-review/{}', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'function',
  route:  "{*segments}",
  handler: guardianshipIntake
});