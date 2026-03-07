import { Router } from 'express';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { 
  getConversationHistory, 
  getVisitorConversations, 
  createMessage 
} from '../controllers/chat.controller';

const router = Router();

router.use(authenticateApiKey);

router.get('/conversations', getVisitorConversations);
router.get('/conversation/:visitorId', getConversationHistory);
router.post('/message', createMessage);

export default router;
