import { Router } from 'express';
import { authenticateAdmin, blockAuthenticated } from '../middleware/auth';
import { 
  getDashboard, 
  createBusiness, 
  postLogin
} from '../controllers/admin.controller';

const router = Router();

// Universal login routes
// Admin routes with protection
router.get('/login', blockAuthenticated('admin'), (req, res) => res.render('admin/login'));
router.post('/login', (req, res) => {
  req.body.userType = 'admin';
  return postLogin(req, res);
});

// All admin routes require authentication
router.use(authenticateAdmin);

router.get('/dashboard', getDashboard);
router.post('/business/create', createBusiness);

export default router;
