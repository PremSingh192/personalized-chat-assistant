import { Router } from 'express';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { 
  uploadKnowledge, 
  getKnowledgeDocuments, 
  deleteKnowledgeDocument,
  saveBusinessDescription 
} from '../controllers/knowledge.controller';

const router = Router();

router.use(authenticateApiKey);

router.post('/upload', uploadKnowledge);
router.post('/business-description', saveBusinessDescription);
router.get('/documents', getKnowledgeDocuments);
router.delete('/document/:id', deleteKnowledgeDocument);

export default router;
