import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController';

const router = Router();
const settlementController = new SettlementController();

// External API routes - batch processing up to ~100 records
router.post('/external/v1/settlements/batch', settlementController.processBatch.bind(settlementController));
router.get('/external/v1/settlements/:ClaimantGUID', settlementController.getByClaimantGUID.bind(settlementController));
router.put('/external/v1/settlements/:ClaimantGUID', settlementController.updateByClaimantGUID.bind(settlementController));

// Status monitoring routes
router.get('/api/settlements/batch/:batch_id/status', settlementController.getBatchStatus.bind(settlementController));

export { router as settlementRoutes };