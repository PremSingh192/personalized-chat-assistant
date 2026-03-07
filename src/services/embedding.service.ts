import { AppDataSource } from '../config/database';
import { Embedding } from '../entities/Embedding';
import { KnowledgeDocument } from '../entities/KnowledgeDocument';
import { aiService } from './ai.service';

const embeddingRepository = AppDataSource.getRepository(Embedding);

export const embeddingService = {
  async createEmbedding(documentId: number, chunkText: string): Promise<Embedding> {
    try {
      const vector = await aiService.generateEmbedding(chunkText);
      
      const embedding = embeddingRepository.create({
        document_id: documentId,
        chunk_text: chunkText,
        vector: vector
      });
      
      return await embeddingRepository.save(embedding);
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw new Error('Failed to create embedding');
    }
  },

  async searchSimilarEmbeddings(businessId: number, query: string, limit: number = 5): Promise<Embedding[]> {
    try {
      const queryEmbedding = await aiService.generateEmbedding(query);
      
      const embeddings = await embeddingRepository
        .createQueryBuilder('embedding')
        .leftJoin('embedding.document', 'document')
        .where('document.business_id = :businessId', { businessId })
        .getMany();

      const similarities = embeddings.map(embedding => ({
        ...embedding,
        similarity: this.calculateCosineSimilarity(queryEmbedding, embedding.vector)
      }));

      similarities.sort((a, b) => b.similarity - a.similarity);
      
      return similarities.slice(0, limit);
    } catch (error) {
      console.error('Error searching embeddings:', error);
      return [];
    }
  },

  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  },

  async deleteEmbeddingsByDocument(documentId: number): Promise<void> {
    try {
      await embeddingRepository.delete({ document_id: documentId });
    } catch (error) {
      console.error('Error deleting embeddings:', error);
      throw new Error('Failed to delete embeddings');
    }
  }
};
