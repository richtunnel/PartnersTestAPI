import { Router } from 'express';
import { demographicsController } from '../controllers/demographics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimiter.middleware';
import { 
  CreateDemographicsRequestSchema,
  GetDemographicsQuerySchema,
  BatchSubmitSchema,
  GetDemographicByIdParamsSchema
} from '@shared/types/demographics';

const router = Router();

// POST /api/v1/demographics - Create single demographics record
router.post(
  '/',
  authMiddleware({ requiredScopes: ['demographics:write'] }),
  rateLimitMiddleware({ requestsPerMinute: 100 }),
  idempotencyMiddleware(24),
  validationMiddleware(CreateDemographicsRequestSchema, 'body'),
  demographicsController.create.bind(demographicsController)
);

// POST /api/v1/demographics/batch - Create multiple demographics records
router.post(
  '/batch',
  authMiddleware({ requiredScopes: ['demographics:write'] }),
  rateLimitMiddleware({ requestsPerMinute: 20 }),
  idempotencyMiddleware(48),
  validationMiddleware(BatchSubmitSchema, 'body'),
  demographicsController.createBatch.bind(demographicsController)
);

// GET /api/v1/demographics - List demographics with filtering
router.get(
  '/',
  authMiddleware({ requiredScopes: ['demographics:read'] }),
  rateLimitMiddleware({ requestsPerMinute: 200 }),
  validationMiddleware(GetDemographicsQuerySchema, 'query'),
  demographicsController.list.bind(demographicsController)
);

// GET /api/v1/demographics/:id - Get specific demographics record
router.get(
  '/:id',
  authMiddleware({ requiredScopes: ['demographics:read'] }),
  rateLimitMiddleware({ requestsPerMinute: 200 }),
  validationMiddleware(GetDemographicByIdParamsSchema, 'params'),
  demographicsController.getById.bind(demographicsController)
);

// PUT /api/v1/demographics/:id - Update demographics record
router.put(
  '/:id',
  authMiddleware({ requiredScopes: ['demographics:write'] }),
  rateLimitMiddleware({ requestsPerMinute: 50 }),
  idempotencyMiddleware(24),
  validationMiddleware(GetDemographicByIdParamsSchema, 'params'),
  validationMiddleware(CreateDemographicsRequestSchema.partial(), 'body'),
  demographicsController.update.bind(demographicsController)
);

// DELETE /api/v1/demographics/:id - Soft delete demographics record
router.delete(
  '/:id',
  authMiddleware({ requiredScopes: ['demographics:delete'] }),
  rateLimitMiddleware({ requestsPerMinute: 30 }),
  validationMiddleware(GetDemographicByIdParamsSchema, 'params'),
  demographicsController.delete.bind(demographicsController)
);

export default router;