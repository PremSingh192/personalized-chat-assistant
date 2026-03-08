import { Router } from 'express';
import { chatHistoryController } from '../controllers/chatHistory.controller';

const router = Router();

// Get chat history with pagination
// GET /api/chat/history?api_key=xxx&device_id=xxx&page=1&limit=50
router.get('/history', chatHistoryController.getChatHistory);

// Get conversation summary
// GET /api/chat/summary?api_key=xxx&device_id=xxx
router.get('/summary', chatHistoryController.getConversationSummary);

export default router;
