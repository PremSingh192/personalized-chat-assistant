import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'chat_widget_db',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  },
  
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'jpg', 'jpeg', 'png']
  },
  
  analytics: {
    timezone: process.env.ANALYTICS_TIMEZONE || 'UTC',
    defaultPageSize: parseInt(process.env.ANALYTICS_DEFAULT_PAGE_SIZE || '10'),
    messageHistoryLimit: parseInt(process.env.ANALYTICS_MESSAGE_HISTORY_LIMIT || '50')
  },
  
  widget: {
    domain: process.env.WIDGET_DOMAIN || 'http://localhost:3000',
    scriptPath: process.env.WIDGET_SCRIPT_PATH || '/widget.js'
  }
};

export default config;
