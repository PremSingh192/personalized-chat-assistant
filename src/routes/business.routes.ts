import { Router } from 'express';
import { authenticateBusiness, blockAuthenticated } from '../middleware/auth';
import { 
  getDashboard, 
  getApiKey, 
  postLogin,
  getBusinessConversations,
  getConversationDetails,
  getVisitorConversations,
  getVisitorDetailedHistory
} from '../controllers/business.controller';

const router = Router();


// Business routes with protection
router.get('/login', blockAuthenticated('business'), (req, res) => res.render('business/login'));
router.post('/login', (req, res) => {
  req.body.userType = 'business';
  return postLogin(req, res);
});

// All business routes require authentication
router.use(authenticateBusiness);

router.get('/dashboard', getDashboard);
router.get('/api-key', getApiKey);

// Conversation APIs
router.get('/conversations', getBusinessConversations);
router.get('/conversations/:id', getConversationDetails);
router.get('/visitors/:visitorId/conversations', getVisitorConversations);
router.get('/visitors/:visitorId/history', getVisitorDetailedHistory);

export default router;
