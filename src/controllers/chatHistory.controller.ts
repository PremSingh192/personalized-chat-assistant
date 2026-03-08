import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Visitor } from '../entities/Visitor';
import { Conversation } from '../entities/Conversation';
import { Message } from '../entities/Message';
import { Business } from '../entities/Business';

const businessRepository = AppDataSource.getRepository(Business);
const visitorRepository = AppDataSource.getRepository(Visitor);
const conversationRepository = AppDataSource.getRepository(Conversation);
const messageRepository = AppDataSource.getRepository(Message);

export const chatHistoryController = {
  // Get chat history with pagination
  async getChatHistory(req: Request, res: Response) {
    try {
      const { api_key, device_id } = req.query;
      
      // Validate required parameters
      if (!api_key || !device_id) {
        return res.status(400).json({
          success: false,
          message: 'API key and device ID are required'
        });
      }

      // Validate API key
      const business = await businessRepository.findOne({ 
        where: { 
          api_key: api_key as string,
          // Ensure API key is not null
        } 
      });
      
      if (!business) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }

      // Find visitor by device ID
      const visitor = await visitorRepository.findOne({ 
        where: { 
          device_id: device_id as string,
          business_id: business.id 
        }
      });
      
      if (!visitor) {
        return res.status(200).json({
          success: true,
          data: {
            messages: [],
            pagination: {
              page: 1,
              limit: 50,
              total: 0,
              totalPages: 0
            }
          }
        });
      }

      // Find active conversation
      const conversation = await conversationRepository.findOne({
        where: {
          business_id: business.id,
          visitor_id: visitor.id,
          status: 'active'
        }
      });

      if (!conversation) {
        return res.status(200).json({
          success: true,
          data: {
            messages: [],
            pagination: {
              page: 1,
              limit: 50,
              total: 0,
              totalPages: 0
            }
          }
        });
      }

      // Pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      // Get total message count
      const totalCount = await messageRepository.count({
        where: { conversation_id: conversation.id }
      });

      // Get paginated messages (newest first for better UX)
      const messages = await messageRepository.find({
        where: { conversation_id: conversation.id },
        order: { created_at: 'DESC' },
        skip: offset,
        take: limit
      });

      // Reverse to show oldest first (chronological order)
      const chronologicalMessages = messages.reverse();

      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json({
        success: true,
        data: {
          messages: chronologicalMessages.map(msg => ({
            id: msg.id,
            sender_type: msg.sender_type,
            message: msg.message,
            created_at: msg.created_at,
            conversation_id: msg.conversation_id
          })),
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        }
      });

    } catch (error: unknown) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chat history'
      });
    }
  },

  // Get conversation summary
  async getConversationSummary(req: Request, res: Response) {
    try {
      const { api_key, device_id } = req.query;
      
      if (!api_key || !device_id) {
        return res.status(400).json({
          success: false,
          message: 'API key and device ID are required'
        });
      }

      const business = await businessRepository.findOne({ 
        where: { 
          api_key: api_key as string,
          // Ensure API key is not null
        } 
      });
      
      if (!business) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }

      const visitor = await visitorRepository.findOne({ 
        where: { 
          device_id: device_id as string,
          business_id: business.id 
        }
      });
      
      if (!visitor) {
        return res.status(200).json({
          success: true,
          data: {
            totalMessages: 0,
            lastMessageAt: null,
            conversationId: null
          }
        });
      }

      const conversation = await conversationRepository.findOne({
        where: {
          business_id: business.id,
          visitor_id: visitor.id,
          status: 'active'
        }
      });

      if (!conversation) {
        return res.status(200).json({
          success: true,
          data: {
            totalMessages: 0,
            lastMessageAt: null,
            conversationId: null
          }
        });
      }

      const [totalMessages, lastMessage] = await Promise.all([
        messageRepository.count({
          where: { conversation_id: conversation.id }
        }),
        messageRepository.findOne({
          where: { conversation_id: conversation.id },
          order: { created_at: 'DESC' }
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalMessages,
          lastMessageAt: lastMessage?.created_at || null,
          conversationId: conversation.id
        }
      });

    } catch (error: unknown) {
      console.error('Error fetching conversation summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation summary'
      });
    }
  }
};
