import { Router } from 'express';
import { 
  getLogin, 
  postLogin, 
  logout 
} from '../controllers/auth.controller';
import { 
  authenticateAdmin, 
  authenticateBusiness,
  blockAuthenticated 
} from '../middleware/auth';

const router = Router();

// Universal login routes only
router.get('/login', blockAuthenticated('admin'), getLogin);
router.post('/login', postLogin);
router.get('/logout', logout);

export default router;
