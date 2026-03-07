import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Business } from './Business';
import { Conversation } from './Conversation';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  business_id: number;

  @Column({ unique: true })
  device_id: string;

  @Column({ type: 'text' })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Business, business => business.visitors)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => Conversation, conversation => conversation.visitor)
  conversations: Conversation[];
}
