import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';
import { Conversation } from '../entities/Conversation';
import { Message } from '../entities/Message';
import { Visitor } from '../entities/Visitor';

const businessRepository = AppDataSource.getRepository(Business);
const conversationRepository = AppDataSource.getRepository(Conversation);
const messageRepository = AppDataSource.getRepository(Message);
const visitorRepository = AppDataSource.getRepository(Visitor);

export const analyticsService = {
  async getBusinessAnalytics(businessId: number): Promise<any> {
    try {
      const totalConversations = await conversationRepository.count({
        where: { business_id: businessId }
      });

      const totalVisitors = await visitorRepository.count({
        where: { business_id: businessId }
      });

      const totalMessages = await messageRepository
        .createQueryBuilder('message')
        .leftJoin('message.conversation', 'conversation')
        .where('conversation.business_id = :businessId', { businessId })
        .getCount();

      const aiResponses = await messageRepository
        .createQueryBuilder('message')
        .leftJoin('message.conversation', 'conversation')
        .where('conversation.business_id = :businessId', { businessId })
        .andWhere('message.sender_type = :senderType', { senderType: 'bot' })
        .getCount();

      const visitorMessages = await messageRepository
        .createQueryBuilder('message')
        .leftJoin('message.conversation', 'conversation')
        .where('conversation.business_id = :businessId', { businessId })
        .andWhere('message.sender_type = :senderType', { senderType: 'visitor' })
        .getCount();

      return {
        totalConversations,
        totalVisitors,
        totalMessages,
        aiResponses,
        visitorMessages,
        averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
        aiResponseRate: visitorMessages > 0 ? Math.round((aiResponses / visitorMessages) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Error('Failed to get analytics');
    }
  },

  async getGlobalAnalytics(): Promise<any> {
    try {
      const totalBusinesses = await businessRepository.count();
      const totalConversations = await conversationRepository.count();
      const totalVisitors = await visitorRepository.count();
      const totalMessages = await messageRepository.count();

      const aiResponses = await messageRepository.count({
        where: { sender_type: 'bot' }
      });

      return {
        totalBusinesses,
        totalConversations,
        totalVisitors,
        totalMessages,
        aiResponses,
        averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
      };
    } catch (error) {
      console.error('Error getting global analytics:', error);
      throw new Error('Failed to get global analytics');
    }
  },

  async getRecentActivity(businessId: number, limit: number = 10): Promise<any[]> {
    try {
      const recentConversations = await conversationRepository.find({
        where: { business_id: businessId },
        relations: ['visitor', 'messages'],
        order: { created_at: 'DESC' },
        take: limit
      });

      return recentConversations.map(conversation => ({
        id: conversation.id,
        visitorId: conversation.visitor.id,
        visitorDevice: conversation.visitor.device_id.substring(0, 8) + '...',
        messageCount: conversation.messages.length,
        lastActivity: conversation.created_at,
        status: conversation.status
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
};
