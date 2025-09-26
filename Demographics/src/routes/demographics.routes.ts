import { Router } from 'express';
import { DemographicsController } from '../controllers/demographics.controller';

const router = Router();
const demographicsController = new DemographicsController();

// External API routes
router.get('/external/v1/demographics/:sf_id', demographicsController.getById.bind(demographicsController));
router.put('/external/v1/demographics/update', demographicsController.updateBatch.bind(demographicsController));

// Internal API routes  
router.put('/api/v1/demographics/:sf_id', demographicsController.updateSingle.bind(demographicsController));

export { router as demographicsRoutes };