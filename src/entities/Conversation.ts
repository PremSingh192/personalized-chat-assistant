import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Business } from './Business';
import { Visitor } from './Visitor';
import { Message } from './Message';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  business_id: number;

  @Column()
  visitor_id: number;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Business, business => business.conversations)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => Visitor, visitor => visitor.conversations)
  @JoinColumn({ name: 'visitor_id' })
  visitor: Visitor;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}
