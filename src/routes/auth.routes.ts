import { Router } from 'express';
import { 
  getLogin, 
  postLogin, 
  logout 
} from '../controllers/auth.controller';

const router = Router();

// Universal login route only
router.get('/login', getLogin);
router.post('/login', postLogin);
router.get('/logout', logout);

export default router;
