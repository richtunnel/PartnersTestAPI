import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ServiceBusClient } from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { GuardianshipIntakeSchema, ProcessedDocument, ProcessedIntake, allowedTypes } from '@shared/types/guardianship';

export class GuardianshipController {
  private config = {
    serviceBusConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '',
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    queueName: process.env.QUEUE_NAME || 'legal-documents-queue',
    containerName: process.env.BLOB_CONTAINER_NAME || 'legal-documents',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
  };

  async guardianshipIntake(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const startTime = Date.now();
    context.log('Guardianship intake request received');
    
    const corsHeaders = this.getCorsHeaders(request);
    
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
      const intakeData = GuardianshipIntakeSchema.parse(JSON.parse(intakeDataStr));
      
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
      
      // Validate files
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
      const processedDocuments = await this.processDocuments(files, intakeData, intakeId, timestamp);
      
      // Create processed intake
      const processedIntake: ProcessedIntake = {
        ...intakeData,
        intakeId,
        processedDocuments,
        timestamp,
        status: 'processed',
        blobStorageLocation: `${this.config.containerName}/${intakeId}`
      };

      // Send to Service Bus for MilestoneDB processing
      await this.sendToServiceBus(processedIntake);
      
      const processingTime = Date.now() - startTime;
      
      return {
        status: 201,
        headers: corsHeaders,
        jsonBody: {
          success: true,
          intakeId,
          timestamp,
          documentsProcessed: processedDocuments.length,
          blobStorageLocation: processedIntake.blobStorageLocation,
          message: 'Guardianship intake processed successfully and queued for milestone database pickup',
          processingTime
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

  private getCorsHeaders(request: HttpRequest) {
    const origin = request.headers.get('origin');
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (this.config.allowedOrigins.includes('*') || (origin && this.config.allowedOrigins.includes(origin))) {
      corsHeaders['Access-Control-Allow-Origin'] = origin || '*';
    }
    
    return corsHeaders;
  }

  private async processDocuments(
    files: File[], 
    intakeData: any, 
    intakeId: string, 
    timestamp: string
  ): Promise<ProcessedDocument[]> {
    const processedDocuments: ProcessedDocument[] = [];
    
    // Check if we have valid Azure connection strings
    const hasValidStorageConnection = this.config.storageConnectionString && 
      this.config.storageConnectionString.startsWith('DefaultEndpointsProtocol=');

    if (!hasValidStorageConnection) {
      // Mock mode for development
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const docInfo = intakeData.documentation[i];
        
        const documentId = uuidv4();
        const fileExtension = file.name?.split('.').pop() || 'bin';
        const storedName = `${intakeId}/${docInfo.category}/${documentId}.${fileExtension}`;
        
        processedDocuments.push({
          originalName: file.name || 'unknown',
          storedName,
          blobUrl: `https://mockblob.blob.core.windows.net/legal-documents/${storedName}`,
          documentId,
          category: docInfo.category,
          documentType: docInfo.documentType,
          uploadTimestamp: timestamp
        });
      }
    } else {
      // Production: Actual Azure processing
      const blobServiceClient = BlobServiceClient.fromConnectionString(this.config.storageConnectionString);
      const containerClient = blobServiceClient.getContainerClient(this.config.containerName);
      await containerClient.createIfNotExists();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const docInfo = intakeData.documentation[i];
        
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
    
    return processedDocuments;
  }

  private async sendToServiceBus(processedIntake: ProcessedIntake): Promise<void> {
    if (!this.config.serviceBusConnectionString) {
      console.log('MOCK: Would send message to Service Bus with intake ID:', processedIntake.intakeId);
      return;
    }

    const serviceBusClient = new ServiceBusClient(this.config.serviceBusConnectionString);
    const sender = serviceBusClient.createSender(this.config.queueName);
    
    await sender.sendMessages({
      body: processedIntake,
      messageId: processedIntake.intakeId,
      contentType: 'application/json'
    });
    
    await sender.close();
    await serviceBusClient.close();
  }
}

export const guardianshipController = new GuardianshipController();