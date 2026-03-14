import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';
import { Visitor } from '../entities/Visitor';
import { Conversation } from '../entities/Conversation';
import { Message } from '../entities/Message';
import { aiService } from './ai.service';

const businessRepository = AppDataSource.getRepository(Business);
const visitorRepository = AppDataSource.getRepository(Visitor);
const conversationRepository = AppDataSource.getRepository(Conversation);
const messageRepository = AppDataSource.getRepository(Message);

export const chatService = {
  async findOrCreateVisitor(businessId: number, deviceId: string, userAgent: string): Promise<Visitor> {
    let visitor = await visitorRepository.findOne({ 
      where: { device_id: deviceId } 
    });
    
    if (!visitor) {
      visitor = visitorRepository.create({
        business_id: businessId,
        device_id: deviceId,
        user_agent: userAgent
      });
      await visitorRepository.save(visitor);
    }
    
    return visitor;
  },

  async findOrCreateConversation(businessId: number, visitorId: number): Promise<Conversation> {
    let conversation = await conversationRepository.findOne({
      where: { 
        business_id: businessId, 
        visitor_id: visitorId,
        status: 'active'
      }
    });
    
    if (!conversation) {
      conversation = conversationRepository.create({
        business_id: businessId,
        visitor_id: visitorId,
        status: 'active'
      });
      await conversationRepository.save(conversation);
    }
    
    return conversation;
  },

  async saveMessage(conversationId: number, senderType: 'visitor' | 'bot' | 'agent', message: string): Promise<Message> {
    
    const newMessage = messageRepository.create({
      conversation_id: conversationId,
      sender_type: senderType,
      message: message
    });
    
    const savedMessage = await messageRepository.save(newMessage);
    
    return savedMessage;
  },

  async getConversationHistory(conversationId: number): Promise<Message[]> {
    return await messageRepository.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' }
    });
  },

  async processVisitorMessage(
  businessId: number, 
  visitorId: number, 
  message: string,
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
    try {
      const conversation = await this.findOrCreateConversation(businessId, visitorId);
      
      await this.saveMessage(conversation.id, 'visitor', message);
      
      // Use streaming if callback provided, otherwise use regular method
      if (onStreamChunk) {
        let fullResponse = '';
        const stream = aiService.generateResponseStream(businessId, message);
        
        for await (const chunk of stream) {
          fullResponse += chunk;
          onStreamChunk(chunk); // Send chunk to client
        }
        
        await this.saveMessage(conversation.id, 'bot', fullResponse);
        
        return fullResponse;
      } else {
        // Fallback to non-streaming
        const aiResponse = await aiService.generateResponse(businessId, message);
        
        await this.saveMessage(conversation.id, 'bot', aiResponse);
        
        return aiResponse;
      }
    } catch (error) {
      console.error('Error processing visitor message:', error);
      throw new Error('Failed to process visitor message');
    }
  },
};
