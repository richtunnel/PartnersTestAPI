import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@shared/types/express-extensions';
import { blobSasService } from '@shared/services/blobSas.service';
import { logger } from '@shared/utils/logger';

export class DocumentsController {
  /**
   * POST /api/v1/documents/upload-url
   * Generate SAS URL for single document upload
   */
  async generateUploadUrl(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Generate upload URL started', {
        requestId: req.requestId,
        lawFirm: req.auth.lawFirm,
        keyId: req.auth.keyId
      });

      const uploadRequest = req.body;
      const sasResponse = await blobSasService.generateUploadSasUrl({
        fileName: uploadRequest.fileName,
        contentType: uploadRequest.contentType,
        lawFirm: req.auth.lawFirm,
        demographicsId: uploadRequest.demographicsId,
        documentType: uploadRequest.documentType,
        maxFileSizeMB: uploadRequest.maxFileSizeMB
      });

      const processingTime = Date.now() - startTime;
      
      res.status(200).json({
        success: true,
        message: 'Upload URL generated successfully',
        data: {
          uploadUrl: sasResponse.uploadUrl,
          blobName: sasResponse.blobName,
          correlationId: sasResponse.correlationId,
          expiresAt: sasResponse.expiresAt.toISOString(),
          maxFileSizeMB: uploadRequest.maxFileSizeMB
        },
        instructions: {
          method: 'PUT',
          headers: {
            'x-ms-blob-type': 'BlockBlob',
            'Content-Type': uploadRequest.contentType
          },
          note: 'Upload file directly to uploadUrl using PUT method'
        },
        requestId: req.requestId,
        processingTime
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/documents/batch-upload-urls
   * Generate multiple SAS URLs for batch document upload
   */
  async generateBatchUploadUrls(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { documents, maxFileSizeMB } = req.body;
      const correlationId = require('uuid').v4();
      
      logger.info('Batch upload URLs generation started', {
        requestId: req.requestId,
        lawFirm: req.auth.lawFirm,
        documentCount: documents.length,
        correlationId
      });

      const uploadUrls = [];
      const errors = [];

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        
        try {
          const sasResponse = await blobSasService.generateUploadSasUrl({
            fileName: document.fileName,
            contentType: document.contentType,
            lawFirm: req.auth.lawFirm,
            demographicsId: document.demographicsId,
            documentType: document.documentType,
            maxFileSizeMB
          });

          uploadUrls.push({
            index: i,
            fileName: document.fileName,
            uploadUrl: sasResponse.uploadUrl,
            blobName: sasResponse.blobName,
            correlationId: sasResponse.correlationId,
            expiresAt: sasResponse.expiresAt.toISOString(),
            status: 'ready'
          });
        } catch (docError) {
          errors.push({
            index: i,
            fileName: document.fileName,
            error: docError instanceof Error ? docError.message : 'URL generation failed',
            status: 'failed'
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const successCount = uploadUrls.length;

      res.status(200).json({
        success: true,
        message: `Generated ${successCount} upload URLs out of ${documents.length} requested`,
        data: {
          upload_urls: uploadUrls,
          errors: errors,
          batch_correlation_id: correlationId,
          success_count: successCount,
          error_count: errors.length,
          total_count: documents.length
        },
        requestId: req.requestId,
        processingTime
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents/:correlationId/status
   * Get document processing status
   */
  async getDocumentStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { correlationId } = req.params;
      const status = await blobSasService.getDocumentStatus(correlationId);
      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          correlation_id: correlationId,
          ...status
        },
        requestId: req.requestId,
        processingTime
      });
    } catch (error) {
      next(error);
    }
  }
}

export const documentsController = new DocumentsController();