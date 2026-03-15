import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import cookieParser from 'cookie-parser';

import { AppDataSource } from './config/database';
import { connectRedis } from './config/redis';
import { Business } from './entities/Business';
import config from './config';

import adminRoutes from './routes/admin.routes';
import businessRoutes from './routes/business.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import businessKnowledgeRoutes from './routes/business-knowledge.routes';
import chatHistoryRoutes from './routes/chatHistory.routes';
import systemConfigRoutes from './routes/systemConfig.routes';
import cronRoutes from './routes/cron.routes';

import { chatSocket } from './socket/chat.socket';
import { ensureAdminExists } from './scripts/ensureAdmin';
import { SystemConfigService } from './services/systemConfig.service';
import { cronService } from './services/cron.service';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for widget embedding
    methods: ["GET", "POST"]
  }
});

// Check if admin exists in production
if (process.env.NODE_ENV === 'production') {
  ensureAdminExists()
    .then(() => {
      // Admin check completed successfully
    })
    .catch((error) => {
      console.error('❌ Admin check failed:', error);
      process.exit(1);
    });
}

app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development to allow iframe embedding
}));

// Configure CORS to allow all origins
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(cors({
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));
app.use((req, res, next) => {
    // Allow iframe embedding
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    next();
});
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use('/business', businessRoutes);
app.use('/business/knowledge', businessKnowledgeRoutes);
app.use(authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat', chatHistoryRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/cron', cronRoutes);

// Widget JavaScript file route
app.get('/widget.js', (req, res) => {
  // Set CORS headers for widget.js
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  const widgetPath = path.join(__dirname, 'public', 'widget', 'widget.js');
  res.sendFile(widgetPath, (err) => {
    if (err) {
      console.error('Error serving widget.js:', err);
      res.status(404).send('Widget script not found');
    } else {
      // Widget.js served successfully
    }
  });
});

// Root route - serve landing page
app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/widget', async (req, res) => {
  // Set headers for iframe embedding
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  
  const apiKey = req.query.api_key as string;
  if (!apiKey) {
    return res.status(400).send('API key required');
  }
  
  try {
    // Validate API key against database
    const businessRepository = AppDataSource.getRepository(Business);
    const business = await businessRepository.findOne({ where: { api_key: apiKey } });
    
    if (!business) {
      return res.status(401).send('Invalid API key');
    }
    
    // API key is valid, render widget
    res.render('widget', { apiKey });
  } catch (error) {
    console.error('Widget API key validation error:', error);
    res.status(500).send('Server error');
  }
});

chatSocket(io);

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    
    // Initialize default system configurations
    await SystemConfigService.initializeDefaults();
    
    await connectRedis();

    server.listen(config.server.port, () => {
      // Server running successfully
    });

    // Start cron service for widget health checks
    cronService.start();
    
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  cronService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  cronService.stop();
  process.exit(0);
});

startServer();
