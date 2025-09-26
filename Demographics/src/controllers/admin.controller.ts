import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '@shared/types/express-extensions';
import { apiKeyService } from '@shared/services/apiKey.service';
import { logger } from '@shared/utils/logger';

export class AdminController {
  /**
   * POST /api/v1/admin/api-keys
   * Create new API key
   */
  async createApiKey(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('API key creation started', { 
        requestId: req.requestId,
        environment: process.env.NODE_ENV 
      });

      let lawFirm: string;
      let createdBy: string;

      if (process.env.NODE_ENV === 'production') {
        lawFirm = req.auth.lawFirm;
        createdBy = req.auth.apiKey.created_by;
      } else {
        lawFirm = req.body.law_firm;
        createdBy = uuidv4();
      }

      const createRequest = req.body;
      const { apiKey, plainTextKey } = await apiKeyService.createApiKey(
        createRequest,
        lawFirm,
        createdBy
      );

      const processingTime = Date.now() - startTime;

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: {
          apiKey: {
            id: apiKey.id,
            key_id: apiKey.key_id,
            name: apiKey.name,
            description: apiKey.description,
            scopes: apiKey.scopes,
            rate_limits: apiKey.rate_limits,
            expires_at: apiKey.expires_at,
            created_at: apiKey.created_at,
            law_firm: apiKey.law_firm,
          },
          key: plainTextKey,
        },
        warning: 'Store this API key securely. It will not be shown again.',
        requestId: req.requestId,
        processingTime
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/api-keys
   * List API keys for law firm
   */
  async listApiKeys(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Implementation for listing API keys
      // This would require a new database service method
      
      const processingTime = Date.now() - startTime;
      
      res.status(200).json({
        success: true,
        data: [],
        message: 'API key listing - to be implemented',
        requestId: req.requestId,
        processingTime
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();