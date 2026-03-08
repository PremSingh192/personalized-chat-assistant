import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Visitor } from './Visitor';
import { Conversation } from './Conversation';
import { KnowledgeDocument } from './KnowledgeDocument';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ 
  type: 'varchar',
  unique: true, 
  nullable: true 
})
api_key: string | null;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  domain: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Visitor, visitor => visitor.business)
  visitors: Visitor[];

  @OneToMany(() => Conversation, conversation => conversation.business)
  conversations: Conversation[];

  @OneToMany(() => KnowledgeDocument, doc => doc.business)
  knowledgeDocuments: KnowledgeDocument[];
}
