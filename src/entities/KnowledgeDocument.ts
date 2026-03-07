import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Business } from './Business';
import { Embedding } from './Embedding';

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  business_id: number;

  @Column()
  title: string;

  @Column()
  source_type: 'pdf' | 'url' | 'image' | 'text' | 'business_description';

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Business, business => business.knowledgeDocuments)
  business: Business;

  @OneToMany(() => Embedding, embedding => embedding.document)
  embeddings: Embedding[];
}
