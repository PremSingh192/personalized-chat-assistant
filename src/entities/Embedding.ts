import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { KnowledgeDocument } from './KnowledgeDocument';

@Entity('embeddings')
export class Embedding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  document_id: number;

  @Column({ type: 'text' })
  chunk_text: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, array: true })
  vector: number[];

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => KnowledgeDocument, document => document.embeddings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KnowledgeDocument;
}
