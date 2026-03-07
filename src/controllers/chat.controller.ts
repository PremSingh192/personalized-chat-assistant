import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';
import { Visitor } from '../entities/Visitor';
import { Conversation } from '../entities/Conversation';
import { Message } from '../entities/Message';

const businessRepository = AppDataSource.getRepository(Business);
const visitorRepository = AppDataSource.getRepository(Visitor);
const conversationRepository = AppDataSource.getRepository(Conversation);
const messageRepository = AppDataSource.getRepository(Message);

export const getConversationHistory = async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const visitorId = req.params.visitorId;
    
    const conversation = await conversationRepository.findOne({
      where: { 
        business_id: business.id, 
        visitor_id: parseInt(visitorId) 
      },
      relations: ['messages']
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching conversation' });
  }
};

export const getVisitorConversations = async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    
    const conversations = await conversationRepository.find({
      where: { business_id: business.id },
      relations: ['visitor', 'messages'],
      order: { created_at: 'DESC' }
    });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching conversations' });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const { visitorId, message, senderType } = req.body;
    
    let conversation = await conversationRepository.findOne({
      where: { 
        business_id: business.id, 
        visitor_id: visitorId 
      }
    });
    
    if (!conversation) {
      conversation = conversationRepository.create({
        business_id: business.id,
        visitor_id: visitorId,
        status: 'active'
      });
      await conversationRepository.save(conversation);
    }
    
    const newMessage = messageRepository.create({
      conversation_id: conversation.id,
      sender_type: senderType,
      message: message
    });
    
    await messageRepository.save(newMessage);
    
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Error creating message' });
  }
};
