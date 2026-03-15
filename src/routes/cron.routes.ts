import { Router } from 'express';
import { getCronStatus, startCronService, stopCronService } from '../controllers/cron.controller';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// All cron routes require admin authentication
router.use(authenticateAdmin);

// Get cron service status
router.get('/status', getCronStatus);

// Start cron service
router.post('/start', startCronService);

// Stop cron service
router.post('/stop', stopCronService);

export default router;
