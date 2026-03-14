import { Router } from 'express';
import { authenticateBusiness } from '../middleware/auth';
import { 
  getDashboard, 
  getApiKey, 
  regenerateApiKey,
  updateApiKey,
  deleteApiKey,
  getBusinessConversations,
  getConversationDetails,
  getVisitorConversations,
  getVisitorDetailedHistory
} from '../controllers/business.controller';

const router = Router();

// All business routes require authentication
router.use(authenticateBusiness);

router.get('/dashboard', getDashboard);
router.get('/api-key', getApiKey);
router.post('/api-key/regenerate', regenerateApiKey);
router.put('/api-key', updateApiKey);
router.delete('/api-key', deleteApiKey);

// Conversation APIs
router.get('/conversations', getBusinessConversations);
router.get('/conversations/:id', getConversationDetails);
router.get('/visitors/:visitorId/conversations', getVisitorConversations);
router.get('/visitors/:visitorId/history', getVisitorDetailedHistory);

export default router;
