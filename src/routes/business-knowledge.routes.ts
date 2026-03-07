import { Router } from 'express';
import { authenticateBusiness } from '../middleware/auth';
import { 
  uploadKnowledge, 
  getKnowledgeDocuments, 
  deleteKnowledgeDocument,
  saveBusinessDescription 
} from '../controllers/knowledge.controller';

const router = Router();

// Use business session authentication instead of API key authentication
router.use(authenticateBusiness);

router.post('/upload', uploadKnowledge);
router.post('/business-description', saveBusinessDescription);
router.get('/documents', getKnowledgeDocuments);
router.delete('/document/:id', deleteKnowledgeDocument);

export default router;
