# Chat Widget Platform

A production-ready SaaS Chatbot Widget platform similar to Intercom and Tawk.to, built with Node.js, TypeScript, and local AI integration.

## Features

- **Super Admin Panel** - Manage businesses and view global analytics
- **Business Admin Panel** - Manage knowledge base and view chat analytics
- **Real-time Chat** - Socket.io powered live chat functionality
- **AI RAG System** - Local LLM with Retrieval-Augmented Generation
- **Knowledge Training** - Support for PDF, URL, and Image (OCR) uploads
- **Widget SDK** - Easy-to-embed JavaScript widget
- **Visitor Management** - Track and manage guest visitors
- **Analytics Dashboard** - Comprehensive chat and usage metrics

## Tech Stack

### Backend
- Node.js + Express.js + TypeScript
- TypeORM + PostgreSQL
- Socket.io (Real-time communication)
- Redis (Optional caching)

### AI
- Ollama local LLM
- Llama3 model
- nomic-embed-text for embeddings

### Frontend
- Chat widget in vanilla JavaScript
- Admin panels using Express + EJS

## Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v12 or higher)
3. **Ollama** with models installed

### Install Ollama

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Install required models
ollama pull llama3
ollama pull nomic-embed-text

# Start Ollama
ollama run llama3
```

### Database Setup

```sql
-- Create database
CREATE DATABASE chat_widget_db;

-- Create user (optional)
CREATE USER chat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chat_widget_db TO chat_user;
```

### Project Setup

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd chat-widget-project
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database and Ollama configuration
```

3. **Build and run**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=chat_widget_db

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Ollama AI Configuration
OLLAMA_URL=http://localhost:11434

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379
```

## Usage

### Admin Panel

Access the super admin panel at `http://localhost:3000/admin/login`

Default admin credentials need to be created manually in the database:

```sql
INSERT INTO admins (email, password, role) 
VALUES ('admin@example.com', '$2a$10$your_hashed_password', 'admin');
```

### Business Panel

Businesses can access their dashboard at `http://localhost:3000/business/login`

### Widget Integration

Businesses can embed the chat widget using:

```html
<script src="http://localhost:3000/widget/widget.js" 
        data-api-key="YOUR_API_KEY">
</script>
```

#### Widget Options

```html
<script src="http://localhost:3000/widget/widget.js" 
        data-api-key="YOUR_API_KEY"
        data-position="bottom-right"
        data-primary-color="#4facfe"
        data-widget-url="http://localhost:3000/widget">
</script>
```

## API Endpoints

### Admin Routes
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Admin authentication
- `GET /admin/dashboard` - Admin dashboard
- `POST /admin/business/create` - Create new business

### Business Routes
- `GET /business/login` - Business login page
- `POST /business/login` - Business authentication
- `GET /business/dashboard` - Business dashboard
- `GET /business/api-key` - Get API key

### Chat API
- `GET /api/chat/conversations` - Get all conversations
- `GET /api/chat/conversation/:visitorId` - Get conversation history
- `POST /api/chat/message` - Send message

### Knowledge API
- `POST /api/knowledge/upload` - Upload knowledge document
- `GET /api/knowledge/documents` - Get knowledge documents
- `DELETE /api/knowledge/document/:id` - Delete document

### Widget Endpoint
- `GET /widget?api_key=KEY` - Chat widget interface

## Database Schema

### Core Tables
- **admins** - Super admin users
- **businesses** - Business accounts with API keys
- **visitors** - Website visitors tracked by device ID
- **conversations** - Chat sessions
- **messages** - Individual chat messages
- **knowledge_documents** - Training documents
- **embeddings** - Vector embeddings for RAG

## Architecture

```
Customer Website
    ↓
Widget Script
    ↓
Iframe Chat UI
    ↓
Socket.io + REST API
    ↓
Express Backend
    ↓
Services (Chat, AI, Knowledge, Analytics)
    ↓
PostgreSQL + Ollama LLM
```

## Development

### Project Structure

```
src/
├── config/          # Database and Redis configuration
├── entities/         # TypeORM entities
├── controllers/      # Route controllers
├── services/         # Business logic services
├── middleware/       # Authentication middleware
├── routes/          # API routes
├── socket/          # Socket.io handlers
├── views/           # EJS templates
├── public/          # Static assets
└── utils/           # Utility functions
```

### Scripts

```bash
npm run dev          # Start in development mode
npm run build        # Compile TypeScript
npm start           # Start production server
npm run typeorm      # TypeORM CLI commands
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Use HTTPS in production
3. Configure proper CORS origins
4. Set strong JWT secret
5. Use production database credentials
6. Enable Redis for caching

## Security Features

- API key authentication for all requests
- JWT-based admin authentication
- Rate limiting on all endpoints
- CORS protection
- Input validation and sanitization
- SQL injection prevention via TypeORM

## Monitoring

The platform includes built-in analytics:
- Total conversations and messages
- Visitor tracking and analytics
- AI response metrics
- Business usage statistics

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the logs for error details
2. Verify Ollama is running and accessible
3. Ensure database connection is configured
4. Review environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Note**: This platform uses local AI models via Ollama. Ensure you have sufficient computational resources for the LLM models in production.
