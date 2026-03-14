import { DataSource } from 'typeorm';
import { Admin } from '../entities/Admin';
import { Business } from '../entities/Business';
import { Visitor } from '../entities/Visitor';
import { Conversation } from '../entities/Conversation';
import { Message } from '../entities/Message';
import { KnowledgeDocument } from '../entities/KnowledgeDocument';
import { Embedding } from '../entities/Embedding';
import { SystemConfig } from '../entities/SystemConfig';
import config from './index';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: false, // Disabled for production
  entities: [Admin, Business, Visitor, Conversation, Message, KnowledgeDocument, Embedding, SystemConfig],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});
