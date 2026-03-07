import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';
import { Conversation } from '../entities/Conversation';
import { Visitor } from '../entities/Visitor';
import { Message } from '../entities/Message';
import { config } from '../config/index';
import { v4 as uuidv4 } from 'uuid';

const businessRepository = AppDataSource.getRepository(Business);
const conversationRepository = AppDataSource.getRepository(Conversation);
const messageRepository = AppDataSource.getRepository(Message);
const visitorRepository = AppDataSource.getRepository(Visitor);

export const getLogin = (req: Request, res: Response) => {
  res.render('business/login');
};

export const postLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const business = await businessRepository.findOne({ where: { email } });
    if (!business) {
      return res.status(401).render('business/login', { error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, business.password);
    if (!isPasswordValid) {
      return res.status(401).render('business/login', { error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: business.id }, config.jwt.secret);
    res.cookie('business_token', token);
    res.redirect('/business/dashboard');
  } catch (error) {
    res.status(500).render('business/login', { error: 'Login error' });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.analytics.defaultPageSize;
    const offset = (page - 1) * limit;
    
    // Get paginated conversations
    const conversations = await conversationRepository.find({ 
      where: { business_id: businessId },
      relations: ['visitor', 'messages'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset
    });
    
    // Get total count for pagination
    const totalConversations = await conversationRepository.count({
      where: { business_id: businessId }
    });
    
    const visitors = await visitorRepository.find({ 
      where: { business_id: businessId } 
    });
    
    const messages = await messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.business_id = :businessId', { businessId })
      .getMany();

    // Enhanced analytics - use UTC timestamps
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
    const lastWeekUTC = new Date(todayUTC);
    lastWeekUTC.setUTCDate(lastWeekUTC.getUTCDate() - 7);
    const lastMonthUTC = new Date(todayUTC);
    lastMonthUTC.setUTCMonth(lastMonthUTC.getUTCMonth() - 1);

    // Time-based analytics with UTC
    const todayMessages = messages.filter(m => {
      const msgDate = new Date(m.created_at);
      return msgDate >= todayUTC;
    });
    const yesterdayMessages = messages.filter(m => {
      const msgDate = new Date(m.created_at);
      return msgDate >= yesterdayUTC && msgDate < todayUTC;
    });
    const lastWeekMessages = messages.filter(m => {
      const msgDate = new Date(m.created_at);
      return msgDate >= lastWeekUTC;
    });
    const lastMonthMessages = messages.filter(m => {
      const msgDate = new Date(m.created_at);
      return msgDate >= lastMonthUTC;
    });

    // Conversation analytics - use total counts, not paginated
    const allConversations = await conversationRepository.find({ 
      where: { business_id: businessId },
      relations: ['visitor', 'messages']
    });
    
    const activeConversations = allConversations.filter(c => c.status === 'active');
    const completedConversations = allConversations.filter(c => c.status === 'completed');
    
    // Message analytics
    const visitorMessages = messages.filter(m => m.sender_type === 'visitor');
    const botMessages = messages.filter(m => m.sender_type === 'bot');
    
    // Visitor analytics - fix unique visitor calculation
    const uniqueVisitorsToday = new Set(
      allConversations
        .filter(c => {
          const convDate = new Date(c.created_at);
          return convDate >= todayUTC;
        })
        .map(c => c.visitor_id)
    ).size;
    
    // Average messages per conversation
    const avgMessagesPerConversation = allConversations.length > 0 
      ? (messages.length / allConversations.length).toFixed(1) 
      : 0;
    
    // Response rate (how many visitor messages got AI responses)
    const conversationsWithBotResponse = allConversations.filter(c => 
      c.messages && c.messages.some(m => m.sender_type === 'bot')
    ).length;
    const responseRate = allConversations.length > 0 
      ? ((conversationsWithBotResponse / allConversations.length) * 100).toFixed(1)
      : 0;

    // Peak hours analysis
    const hourlyMessageCounts = new Array(24).fill(0);
    messages.forEach(m => {
      const hour = new Date(m.created_at).getHours();
      hourlyMessageCounts[hour]++;
    });
    
    const peakHour = hourlyMessageCounts.indexOf(Math.max(...hourlyMessageCounts));
    const peakHourMessageCount = Math.max(...hourlyMessageCounts);

    // Device analytics
    const deviceStats: Record<string, number> = visitors.reduce((acc: Record<string, number>, visitor) => {
      const device: string = visitor.user_agent.includes('Mobile') ? 'Mobile' : 'Desktop';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      // Basic stats - use total counts
      totalChats: totalConversations,
      totalVisitors: visitors.length,
      totalMessages: messages.length,
      totalAiResponses: botMessages.length,
      
      // Time-based stats
      todayMessages: todayMessages.length,
      yesterdayMessages: yesterdayMessages.length,
      lastWeekMessages: lastWeekMessages.length,
      lastMonthMessages: lastMonthMessages.length,
      
      // Conversation stats
      activeConversations: activeConversations.length,
      completedConversations: completedConversations.length,
      avgMessagesPerConversation,
      responseRate: `${responseRate}%`,
      
      // Visitor stats
      uniqueVisitorsToday,
      newVisitorsToday: visitors.filter(v => new Date(v.created_at) >= todayUTC).length,
      
      // Peak activity
      peakHour: `${peakHour}:00`,
      peakHourMessageCount,
      
      // Device stats
      deviceStats,
      
      // Growth metrics
      messageGrowth: yesterdayMessages.length > 0 
        ? ((todayMessages.length - yesterdayMessages.length) / yesterdayMessages.length * 100).toFixed(1)
        : 0,
      conversationGrowth: conversations.length > 0
        ? (activeConversations.length / conversations.length * 100).toFixed(1)
        : 0
    };
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalConversations / limit),
      totalItems: totalConversations,
      hasNextPage: page < Math.ceil(totalConversations / limit),
      hasPrevPage: page > 1
    };

    const business = await businessRepository.findOne({ where: { id: businessId } });
    res.render('business/dashboard', {
      business,
      stats,
      conversations,
      pagination,
      widgetConfig: config.widget
    });
  } catch (error) {
    res.status(500).send('Dashboard error');
  }
};

export const getConversationDetails = async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business?.id;
    const conversationId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.analytics.messageHistoryLimit;
    const offset = (page - 1) * limit;
    
    // Get conversation with visitor and messages using query builder
    const conversation = await conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.visitor', 'visitor')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.id = :conversationId AND conversation.business_id = :businessId', { 
        conversationId, 
        businessId 
      })
      .getOne();
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get paginated messages
    const messages = await messageRepository.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
      take: limit,
      skip: offset
    });
    
    // Get message statistics for this conversation
    const messageStats = await messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*) as message_count, COUNT(CASE WHEN sender_type = \'visitor\' THEN 1 END) as visitor_messages, COUNT(CASE WHEN sender_type = \'bot\' THEN 1 END) as bot_messages, MAX(created_at) as last_message_at')
      .where('conversation_id = :conversationId', { conversationId })
      .getRawOne();
    
    // Get total message count
    const totalMessages = await messageRepository.count({
      where: { conversation_id: conversationId }
    });
    
    // Add statistics to conversation object
    const conversationWithStats = {
      ...conversation,
      messageCount: parseInt(messageStats?.message_count || '0'),
      visitorMessages: parseInt(messageStats?.visitor_messages || '0'),
      botMessages: parseInt(messageStats?.bot_messages || '0'),
      lastActivity: messageStats?.last_message_at || conversation.created_at
    };
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalItems: totalMessages,
      hasNextPage: page < Math.ceil(totalMessages / limit),
      hasPrevPage: page > 1
    };
    
    res.json({
      conversation: conversationWithStats,
      messages,
      pagination
    });
  } catch (error) {
    console.error('Error in getConversationDetails:', error);
    res.status(500).json({ error: 'Error fetching conversation details' });
  }
};

export const getApiKey = async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business?.id;
    const business = await businessRepository.findOne({ where: { id: businessId } });
    
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    res.json({ api_key: business.api_key });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching API key' });
  }
};

export const getBusinessConversations = async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || config.analytics.defaultPageSize;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions: any = { business_id: businessId };
    if (status && ['active', 'completed', 'inactive'].includes(status)) {
      whereConditions.status = status;
    }
    
    // Get paginated conversations with visitor data
    const conversations = await conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.visitor', 'visitor')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.business_id = :businessId', { businessId })
      .andWhere(status && ['active', 'completed', 'inactive'].includes(status) ? 'conversation.status = :status' : '1=1', { status })
      .orderBy('conversation.created_at', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
    
    console.log('Loaded conversations:', conversations.length);
    console.log('First conversation visitor data:', conversations[0]?.visitor);
    console.log('First conversation messages count:', conversations[0]?.messages?.length);
    
    // Get total count for pagination
    const totalConversations = await conversationRepository.count({
      where: whereConditions
    });
    
    // Get message statistics
    const conversationIds = conversations.map(c => c.id);
    const messageStats = await messageRepository
      .createQueryBuilder('message')
      .select('conversation_id, COUNT(*) as message_count, COUNT(CASE WHEN sender_type = \'visitor\' THEN 1 END) as visitor_messages, COUNT(CASE WHEN sender_type = \'bot\' THEN 1 END) as bot_messages, MAX(created_at) as last_message_at')
      .where('conversation_id IN (:...conversationIds)', { conversationIds })
      .groupBy('conversation_id')
      .getRawMany();
    
    // Merge message stats with conversations
    const conversationsWithStats = conversations.map(conversation => {
      const stats = messageStats.find(s => s.conversation_id === conversation.id);
      const lastMessageAt = stats?.last_message_at || conversation.created_at;
      
      return {
        ...conversation,
        messageCount: parseInt(stats?.message_count || '0'),
        visitorMessages: parseInt(stats?.visitor_messages || '0'),
        botMessages: parseInt(stats?.bot_messages || '0'),
        lastActivity: lastMessageAt
      };
    });
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalConversations / limit),
      totalItems: totalConversations,
      hasNextPage: page < Math.ceil(totalConversations / limit),
      hasPrevPage: page > 1,
      limit,
      offset
    };
    
    res.json({
      conversations: conversationsWithStats,
      pagination,
      filters: { status }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching business conversations' });
  }
};

export const getVisitorConversations = async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business?.id;
    const visitorId = parseInt(req.params.visitorId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    // Verify visitor belongs to this business
    const visitor = await visitorRepository.findOne({
      where: { id: visitorId, business_id: businessId }
    });
    
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    
    // Get visitor's conversations
    const conversations = await conversationRepository.find({
      where: { business_id: businessId, visitor_id: visitorId },
      relations: ['messages'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset
    });
    
    // Get total count for pagination
    const totalConversations = await conversationRepository.count({
      where: { business_id: businessId, visitor_id: visitorId }
    });
    
    // Get all messages for this visitor (for detailed history)
    const allMessages = await messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.business_id = :businessId AND conversation.visitor_id = :visitorId', { 
        businessId, 
        visitorId 
      })
      .orderBy('message.created_at', 'DESC')
      .getMany();
    
    // Calculate visitor statistics
    const totalMessages = allMessages.length;
    const visitorMessages = allMessages.filter(m => m.sender_type === 'visitor').length;
    const botMessages = allMessages.filter(m => m.sender_type === 'bot').length;
    
    // Get first and last activity
    const firstActivity = allMessages.length > 0 ? allMessages[allMessages.length - 1].created_at : null;
    const lastActivity = allMessages.length > 0 ? allMessages[0].created_at : null;
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalConversations / limit),
      totalItems: totalConversations,
      hasNextPage: page < Math.ceil(totalConversations / limit),
      hasPrevPage: page > 1,
      limit,
      offset
    };
    
    res.json({
      visitor: {
        id: visitor.id,
        device_id: visitor.device_id,
        user_agent: visitor.user_agent,
        created_at: visitor.created_at
      },
      conversations,
      allMessages,
      statistics: {
        totalConversations,
        totalMessages,
        visitorMessages,
        botMessages,
        firstActivity,
        lastActivity,
        avgMessagesPerConversation: totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : 0
      },
      pagination
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching visitor conversations' });
  }
};

export const getVisitorDetailedHistory = async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business?.id;
    const visitorId = parseInt(req.params.visitorId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    // Verify visitor belongs to this business
    const visitor = await visitorRepository.findOne({
      where: { id: visitorId, business_id: businessId }
    });
    
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    
    // Get all messages for this visitor with pagination
    const messages = await messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.business_id = :businessId AND conversation.visitor_id = :visitorId', { 
        businessId, 
        visitorId 
      })
      .orderBy('message.created_at', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
    
    // Get total message count
    const totalMessages = await messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.business_id = :businessId AND conversation.visitor_id = :visitorId', { 
        businessId, 
        visitorId 
      })
      .getCount();
    
    // Get conversation summaries
    const conversationSummaries = await messageRepository
      .createQueryBuilder('message')
      .select('conversation_id, MIN(created_at) as started_at, MAX(created_at) as last_message_at, COUNT(*) as message_count')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.business_id = :businessId AND conversation.visitor_id = :visitorId', { 
        businessId, 
        visitorId 
      })
      .groupBy('conversation_id')
      .orderBy('started_at', 'DESC')
      .getRawMany();
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalItems: totalMessages,
      hasNextPage: page < Math.ceil(totalMessages / limit),
      hasPrevPage: page > 1,
      limit,
      offset
    };
    
    res.json({
      visitor: {
        id: visitor.id,
        device_id: visitor.device_id,
        user_agent: visitor.user_agent,
        created_at: visitor.created_at
      },
      messages,
      conversationSummaries,
      pagination
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching visitor detailed history' });
  }
};
