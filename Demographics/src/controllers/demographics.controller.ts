// src/controllers/demographics.controller.ts
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  Demographics,
  CreateDemographicsRequest,
  GetDemographicsQuery,
} from '@shared/types/demographics';
import { AuthenticatedRequest } from '@shared/types/express-extensions';
import { databaseService } from '@shared/database/database.service';
import { fifoQueueService } from '@shared/services/fifoQueue.service';
import { logger } from '@shared/utils/logger';

export class DemographicsController {
  /**
   * POST /api/v1/demographics
   * Create single demographics record
   */
  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Demographics creation started', {
        requestId: req.requestId,
        lawFirm: req.auth.lawFirm,
        keyId: req.auth.keyId,
      });

      const demographicsData: CreateDemographicsRequest = req.body;
      const now = new Date().toISOString();

      const demographics: Demographics = {
        id: uuidv4(),
        partitionKey: req.auth.lawFirm,
        ...demographicsData,
        law_firm: req.auth.lawFirm,
        created_at: now,
        updated_at: now,
        created_by: req.auth.apiKey.created_by,
        status: 'active'
      };

      // Save to database
      await databaseService.createDemographic(demographics);

      // Queue for processing
      await fifoQueueService.addDemographicsMessage(req.auth.lawFirm, {
        id: demographics.id,
        action: 'process',
        data: demographics,
      }, 5);

      // Queue webhook notification
      await fifoQueueService.addWebhookMessage(req.auth.lawFirm, {
        event: 'demographics.created',
        data: {
          id: demographics.id,
          sf_id: demographics.sf_id,
          law_firm: demographics.law_firm,
          created_at: demographics.created_at,
        },
        metadata: {
          apiKeyId: req.auth.keyId,
          requestId: req.requestId!,
        },
      });

      const processingTime = Date.now() - startTime;
      
      logger.info('Demographics created successfully', {
        requestId: req.requestId,
        demographicsId: demographics.id,
        lawFirm: demographics.law_firm,
        processingTime,
      });

      res.status(201).json({
        success: true,
        message: 'Demographics submitted successfully',
        data: {
          id: demographics.id,
          sf_id: demographics.sf_id,
          status: 'accepted',
          created_at: demographics.created_at,
        },
        requestId: req.requestId,
        processingTime,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/demographics/batch
   * Create multiple demographics records
   */
  async createBatch(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const { demographics, webhook_url, webhook_events, batch_options } = req.body;
      const correlationId = uuidv4();

      logger.info('Batch demographics creation started', {
        requestId: req.requestId,
        lawFirm: req.auth.lawFirm,
        batchSize: demographics.length,
        correlationId
      });

      const results = [];
      const now = new Date().toISOString();

      for (let i = 0; i < demographics.length; i++) {
        const demographicsData = demographics[i];

        try {
          const demographic: Demographics = {
            id: uuidv4(),
            partitionKey: req.auth.lawFirm,
            law_firm: req.auth.lawFirm,
            ...demographicsData,
            created_at: now,
            updated_at: now,
            created_by: req.auth.apiKey.created_by,
            status: 'active'
          };

          await databaseService.createDemographic(demographic);

          await fifoQueueService.addDemographicsMessage(
            req.auth.lawFirm,
            {
              id: demographic.id,
              action: 'process',
              data: demographic,
              batch_info: {
                correlation_id: correlationId,
                batch_size: demographics.length,
                batch_index: i,
              },
            },
            batch_options?.priority ?? 5,
          );

          results.push({
            index: i,
            id: demographic.id,
            sf_id: demographic.sf_id,
            status: 'accepted' as const,
            created_at: demographic.created_at,
          });
        } catch (itemError) {
          logger.error('Batch item processing failed', {
            error: itemError,
            index: i,
            requestId: req.requestId,
          });

          results.push({
            index: i,
            status: 'failed' as const,
            error: itemError instanceof Error ? itemError.message : 'Processing failed',
          });
        }
      }

      // Send completion webhook if requested
      if (webhook_url && batch_options?.notify_on_completion) {
        await fifoQueueService.addWebhookMessage(req.auth.lawFirm, {
          event: 'demographics.batch_completed',
          data: {
            correlation_id: correlationId,
            batch_size: demographics.length,
            successful_count: results.filter(r => r.status === 'accepted').length,
            failed_count: results.filter(r => r.status === 'failed').length,
            webhook_url,
          },
        });
      }

      const successCount = results.filter(r => r.status === 'accepted').length;
      const processingTime = Date.now() - startTime;

      res.status(202).json({
        success: true,
        message: `Accepted ${successCount} of ${demographics.length} records for processing`,
        data: results,
        metadata: {
          correlation_id: correlationId,
          batch_size: demographics.length,
          successful_count: successCount,
          failed_count: demographics.length - successCount,
          processing_time: processingTime,
        },
        requestId: req.requestId,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/demographics
   * Retrieve demographics with filtering and pagination
   */
  async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const query: GetDemographicsQuery = req.query;
      const { limit = 50, offset = 0, filter_claimanttype, filter_status, search } = query;

      logger.info('Demographics retrieval started', {
        requestId: req.requestId,
        lawFirm: req.auth.lawFirm,
        filters: { limit, offset, filter_claimanttype, filter_status, search },
      });

      const demographics = await databaseService.getDemographicsByLawFirm(
        req.auth.lawFirm,
        limit,
        offset,
        {
          claimanttype: filter_claimanttype,
          status: filter_status,
          search,
        },
      );

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: demographics,
        pagination: {
          limit,
          offset,
          count: demographics.length,
          has_more: demographics.length === limit,
        },
        requestId: req.requestId,
        processingTime,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/demographics/:id
   * Get specific demographics record by ID
   */
  async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const { id } = req.params;
      
      const demographic = await databaseService.getDemographicById(id, req.auth.lawFirm);

      if (!demographic) {
        res.status(404).json({
          success: false,
          error: 'Demographic record not found',
          code: 'DEMOGRAPHIC_NOT_FOUND',
          requestId: req.requestId,
        });
        return;
      }

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: demographic,
        requestId: req.requestId,
        processingTime,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/demographics/:id
   * Update demographics record
   */
  async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if record exists and belongs to law firm
      const existingDemographic = await databaseService.getDemographicById(id, req.auth.lawFirm);
      if (!existingDemographic) {
        res.status(404).json({
          success: false,
          error: 'Demographic record not found',
          code: 'DEMOGRAPHIC_NOT_FOUND',
          requestId: req.requestId,
        });
        return;
      }

      // Update the record
      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      await databaseService.updateDemographic(id, updatePayload);

      // Queue update notification
      await fifoQueueService.addWebhookMessage(req.auth.lawFirm, {
        event: 'demographics.updated',
        data: {
          id,
          sf_id: existingDemographic.sf_id,
          updated_fields: Object.keys(updateData),
          updated_at: updatePayload.updated_at,
        },
      });

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        message: 'Demographics record updated successfully',
        data: {
          id,
          updated_at: updatePayload.updated_at,
        },
        requestId: req.requestId,
        processingTime,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/demographics/:id
   * Soft delete demographics record
   */
  async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const { id } = req.params;

      // Check if record exists
      const existingDemographic = await databaseService.getDemographicById(id, req.auth.lawFirm);
      if (!existingDemographic) {
        res.status(404).json({
          success: false,
          error: 'Demographic record not found',
          code: 'DEMOGRAPHIC_NOT_FOUND',
          requestId: req.requestId,
        });
        return;
      }

      // Soft delete
      await databaseService.softDeleteDemographic(id, req.auth.lawFirm);

      // Queue deletion notification
      await fifoQueueService.addWebhookMessage(req.auth.lawFirm, {
        event: 'demographics.deleted',
        data: {
          id,
          sf_id: existingDemographic.sf_id,
          deleted_at: new Date().toISOString(),
        },
      });

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        message: 'Demographics record deleted successfully',
        data: {
          id,
          deleted_at: new Date().toISOString(),
        },
        requestId: req.requestId,
        processingTime,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const demographicsController = new DemographicsController();