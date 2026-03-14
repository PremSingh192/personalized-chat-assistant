import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { 
  getDashboard, 
  createBusiness
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication
router.use(authenticateAdmin);

router.get('/dashboard', getDashboard);
router.post('/business/create', createBusiness);

// System configuration page
router.get('/system-config', (req, res) => {
  res.render('admin/system-config');
});

export default router;
