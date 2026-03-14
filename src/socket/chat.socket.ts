import { Server, Socket } from 'socket.io';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';
import { chatService } from '../services/chat.service';
import { getRedisClient } from '../config/redis';

const businessRepository = AppDataSource.getRepository(Business);
const redisClient = getRedisClient();

interface AuthenticatedSocket extends Socket {
  business?: Business;
  visitorId?: number;
  conversationId?: number;
}

export const chatSocket = (io: Server) => {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const apiKey = socket.handshake.query.api_key as string;
      
      if (!apiKey) {
        return next(new Error('API key required'));
      }

      const business = await businessRepository.findOne({ 
        where: { 
          api_key: apiKey,
          // Ensure API key is not null
        } 
      });
      
      if (!business) {
        return next(new Error('Invalid API key'));
      }

      socket.business = business;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {

    socket.on('join_chat', async (data: { deviceId: string; userAgent: string }) => {
      try {
        const { deviceId, userAgent } = data;
        
        const visitor = await chatService.findOrCreateVisitor(
          socket.business!.id,
          deviceId,
          userAgent
        );
        
        const conversation = await chatService.findOrCreateConversation(
          socket.business!.id,
          visitor.id
        );
        
        socket.visitorId = visitor.id;
        socket.conversationId = conversation.id;
        
        // Store socket ID in Redis for this visitor
        if (redisClient) {
          const redisKey = `visitor:${socket.business!.id}:${visitor.id}:socket`;
          await redisClient.set(redisKey, socket.id, { EX: 3600 }); // 1 hour expiry
        }
        
        socket.join(`conversation_${conversation.id}`);
        
        // Don't emit chat history through socket anymore
        // Frontend will fetch it via REST API
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    socket.on('message', async (data: { message: string }) => {
      try {
        
        if (!socket.visitorId || !socket.conversationId) {
          return socket.emit('error', { message: 'Not in a conversation' });
        }

        const { message } = data;
        
        // Emit visitor message to business dashboard (other clients in room)
        socket.to(`conversation_${socket.conversationId}`).emit('message', {
          sender_type: 'visitor',
          message: message,
          timestamp: new Date()
        });

        // Start streaming response
        const streamCallback = (chunk: string) => {
          
          // Send chunk to visitor
          if (redisClient && socket.visitorId) {
            const redisKey = `visitor:${socket.business!.id}:${socket.visitorId}:socket`;
            
            // Emit to visitor socket (async Redis operation)
            redisClient.get(redisKey).then((socketId: string | null) => {
              if (socketId) {
                io.to(socketId).emit('ai_chunk', {
                  chunk: chunk,
                  timestamp: new Date()
                });
              } else {
                socket.emit('ai_chunk', {
                  chunk: chunk,
                  timestamp: new Date()
                });
              }
            }).catch((error: unknown) => {
              console.error('Redis get error:', error);
              socket.emit('ai_chunk', {
                chunk: chunk,
                timestamp: new Date()
              });
            });
          } else {
            socket.emit('ai_chunk', {
              chunk: chunk,
              timestamp: new Date()
            });
          }
        };

        // Process message with streaming
        const fullResponse = await chatService.processVisitorMessage(
          socket.business!.id,
          socket.visitorId,
          message,
          streamCallback
        );

        // Send completion signal
        if (redisClient && socket.visitorId) {
          const redisKey = `visitor:${socket.business!.id}:${socket.visitorId}:socket`;
          
          redisClient.get(redisKey).then((socketId: string | null) => {
            if (socketId) {
              io.to(socketId).emit('ai_complete', {
                message: fullResponse,
                timestamp: new Date()
              });
            } else {
              socket.emit('ai_complete', {
                message: fullResponse,
                timestamp: new Date()
              });
            }
          }).catch((error: unknown) => {
            console.error('Redis get error in completion:', error);
            socket.emit('ai_complete', {
              message: fullResponse,
              timestamp: new Date()
            });
          });
        } else {
          socket.emit('ai_complete', {
            message: fullResponse,
            timestamp: new Date()
          });
        }
        
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'Failed to process message' });
        
        // Send error signal for streaming
        socket.emit('ai_error', {
          error: 'Failed to process message',
          timestamp: new Date()
        });
      }
    });

    socket.on('typing', () => {
      if (socket.conversationId) {
        socket.to(`conversation_${socket.conversationId}`).emit('typing', {
          isTyping: true
        });
      }
    });

    socket.on('stop_typing', () => {
      if (socket.conversationId) {
        socket.to(`conversation_${socket.conversationId}`).emit('typing', {
          isTyping: false
        });
      }
    });

    socket.on('disconnect', () => {
      
      // Clean up Redis entry for this visitor
      if (redisClient && socket.visitorId && socket.business) {
        const redisKey = `visitor:${socket.business.id}:${socket.visitorId}:socket`;
        redisClient.del(redisKey).then(() => {
          // Redis entry cleaned up
        }).catch((err: any) => {
          console.error('Error cleaning up Redis entry:', err);
        });
      }
    });
  });
};
