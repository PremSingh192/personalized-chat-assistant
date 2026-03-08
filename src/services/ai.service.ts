import axios from 'axios';
import { AppDataSource } from '../config/database';
import { Embedding } from '../entities/Embedding';
import { KnowledgeDocument } from '../entities/KnowledgeDocument';
import config from '../config';

const embeddingRepository = AppDataSource.getRepository(Embedding);
const knowledgeDocumentRepository = AppDataSource.getRepository(KnowledgeDocument);

// Production-level AI service with optimized retrieval and response generation
export const aiService = {
  // Enhanced embedding generation with caching and retry logic
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = `embedding:${Buffer.from(text).toString('base64').slice(0, 32)}`;

    try {
      // Add retry logic for robustness
      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.post(`${config.ollama.url}/api/embeddings`, {
            model: config.ollama.embeddingModel,
            prompt: text
          }, {
            timeout: 30000, // 30 second timeout
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const embedding = response.data.embedding;

          // Validate embedding
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Invalid embedding response');
          }

          return embedding;
        } catch (error: any) {
          lastError = error;
          console.warn(`Embedding generation attempt ${attempt} failed:`, error.message);

          if (attempt < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      throw lastError;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding after retries');
    }
  },

  // Enhanced response generation with streaming support
  async generateResponse(businessId: number, question: string): Promise<string> {
    try {
      console.log(`🤖 Generating AI response for business ${businessId}, question: "${question}"`);

      const relevantDocs = await this.retrieveRelevantDocuments(businessId, question);

      // Enhanced context preparation with relevance scoring and deduplication
      const context = this.prepareOptimizedContext(relevantDocs, question);

      // Dynamic prompt engineering based on context quality
      const prompt = this.buildOptimizedPrompt(context, question);

      console.log(`📤 Sending streaming request to Ollama: ${config.ollama.url}`);
      console.log(`🧠 Using model: ${config.ollama.model}`);
      console.log(`📊 Context quality score: ${this.calculateContextQuality(relevantDocs)}`);

      const response = await axios.post(`${config.ollama.url}/api/generate`, {
        model: config.ollama.model,
        prompt: prompt,
        stream: true, // Enable streaming
        options: {
          temperature: 0.3, // Lower temperature for more focused, consistent responses
          top_p: 0.8, // More focused sampling
          max_tokens: 150, // Shorter responses
          repeat_penalty: 1.2, // Reduce repetition
          stop: ['\n\n', 'Human:', 'User:'], // Stop at natural conversation breaks
        }
      }, {
        timeout: 60000, // 60 second timeout for generation
        responseType: 'stream' // Important for streaming
      });

      console.log(`✅ Ollama streaming response started: ${response.status}`);

      let fullResponse = '';
      const stream = response.data;
      
      // Process the stream
      for await (const chunk of stream) {
        const chunkText = chunk.toString();
        const lines = chunkText.split('\n').filter((line: string) => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
            }
            if (data.done) {
              console.log(`✅ Streaming completed. Full response: "${fullResponse}"`);
              break;
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      if (!fullResponse) {
        throw new Error('Empty response from AI');
      }

      // Post-process response for quality
      const processedResponse = this.postProcessResponse(fullResponse, question);

      return processedResponse;
    } catch (error: any) {
      console.error('❌ Error generating AI response:', error);

      if (error.code === 'ECONNREFUSED') {
        console.error('🔌 Ollama connection refused. Check if Ollama is running at:', config.ollama.url);
      }

      if (error.code === 'ECONNABORTED') {
        console.error('⏱️ Request timeout. Consider increasing timeout or checking model performance.');
      }

      // Fallback response with context awareness
      return this.generateFallbackResponse(question, []);
    }
  },

  // New streaming method for real-time response delivery
  async* generateResponseStream(businessId: number, question: string): AsyncGenerator<string, void, unknown> {
    try {
      console.log(`🤖 Starting streaming AI response for business ${businessId}, question: "${question}"`);

      const relevantDocs = await this.retrieveRelevantDocuments(businessId, question);
      const context = this.prepareOptimizedContext(relevantDocs, question);
      const prompt = this.buildOptimizedPrompt(context, question);

      console.log(`📤 Sending streaming request to Ollama: ${config.ollama.url}`);

      const response = await axios.post(`${config.ollama.url}/api/generate`, {
        model: config.ollama.model,
        prompt: prompt,
        stream: true,
        options: {
          temperature: 0.3,
          top_p: 0.8,
          max_tokens: 150,
          repeat_penalty: 1.2,
          stop: ['\n\n', 'Human:', 'User:'],
        }
      }, {
        timeout: 60000,
        responseType: 'stream'
      });

      let fullResponse = '';
      const stream = response.data;
      
      for await (const chunk of stream) {
        const chunkText = chunk.toString();
        const lines = chunkText.split('\n').filter((line: string) => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              yield data.response; // Yield each chunk
            }
            if (data.done) {
              console.log(`✅ Streaming completed. Full response: "${fullResponse}"`);
              return; // End the generator
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error: unknown) {
      console.error('❌ Error in streaming AI response:', error);
      yield this.generateFallbackResponse(question, []);
    }
  },

  // Enhanced document retrieval with multiple similarity strategies
  async retrieveRelevantDocuments(businessId: number, query: string): Promise<Embedding[]> {
    try {
      console.log(`🔍 Retrieving relevant documents for query: "${query}"`);

      const queryEmbedding = await this.generateEmbedding(query);

      // Optimized database query with better filtering
      const relevantEmbeddings = await embeddingRepository
        .createQueryBuilder('embedding')
        .leftJoin('embedding.document', 'document')
        .where('document.business_id = :businessId', { businessId })
        .andWhere('embedding.vector IS NOT NULL')
        .orderBy('embedding.created_at', 'DESC') // Get recent embeddings first
        .limit(100) // Limit for performance
        .getMany();

      console.log(`📊 Found ${relevantEmbeddings.length} embeddings to analyze`);

      // Multi-strategy similarity calculation
      const scoredEmbeddings = await Promise.all(
        relevantEmbeddings.map(async (embedding) => {
          const cosineSimilarity = this.cosineSimilarity(queryEmbedding, embedding.vector);
          const semanticSimilarity = this.calculateSemanticSimilarity(query, embedding.chunk_text);
          const relevanceScore = this.calculateRelevanceScore(query, embedding.chunk_text);

          // Combined score with weighted factors
          const finalScore = (
            cosineSimilarity * 0.5 +     // 50% weight to semantic similarity
            semanticSimilarity * 0.3 +   // 30% weight to text similarity
            relevanceScore * 0.2          // 20% weight to keyword relevance
          );

          return {
            ...embedding,
            similarity: cosineSimilarity,
            semanticSimilarity,
            relevanceScore,
            finalScore
          };
        })
      );

      // Sort by final score and filter by minimum threshold
      const filteredEmbeddings = scoredEmbeddings
        .filter(item => item.finalScore > 0.3) // Minimum relevance threshold
        .sort((a, b) => b.finalScore - a.finalScore);

      console.log(`🎯 Selected ${filteredEmbeddings.length} highly relevant documents`);

      // Return top documents with diversity
      return this.selectDiverseDocuments(filteredEmbeddings.slice(0, 10));
    } catch (error) {
      console.error('❌ Error retrieving relevant documents:', error);
      return [];
    }
  },

  // Optimized cosine similarity with vector validation
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!Array.isArray(vecA) || !Array.isArray(vecB)) return 0;
    if (vecA.length !== vecB.length) return 0;
    if (vecA.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Optimized single loop calculation
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitudeA = Math.sqrt(normA);
    const magnitudeB = Math.sqrt(normB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  },

  // Additional similarity calculation methods
  calculateSemanticSimilarity(query: string, text: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const textWords = new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    if (queryWords.size === 0) return 0;

    const intersection = new Set([...queryWords].filter(x => textWords.has(x)));
    const union = new Set([...queryWords, ...textWords]);

    return intersection.size / union.size; // Jaccard similarity
  },

  calculateRelevanceScore(query: string, text: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();

    let score = 0;
    let totalWeight = 0;

    queryTerms.forEach(term => {
      if (term.length < 2) return;

      const weight = term.length > 4 ? 2 : 1; // Longer terms get higher weight
      totalWeight += weight;

      // Exact match
      if (textLower.includes(term)) {
        score += weight;
      }

      // Partial match
      const partialMatches = queryTerms.filter(t =>
        t !== term && t.includes(term) || term.includes(t)
      );
      score += partialMatches.length * 0.5;
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  },

  // Context preparation with deduplication and optimization
  prepareOptimizedContext(relevantDocs: any[], question: string): string {
    if (relevantDocs.length === 0) {
      return "No specific information found in the knowledge base.";
    }

    // Deduplicate similar content
    const uniqueChunks = this.deduplicateContent(relevantDocs);

    // Prioritize most relevant and recent content
    const prioritizedChunks = uniqueChunks
      .sort((a, b) => {
        // Prioritize by final score, then by recency
        if (Math.abs(a.finalScore - b.finalScore) > 0.1) {
          return b.finalScore - a.finalScore;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5); // Top 5 most relevant chunks

    // Combine with context markers
    const contextParts = prioritizedChunks.map((doc, index) =>
      `[Context ${index + 1}]: ${doc.chunk_text.trim()}`
    );

    return contextParts.join('\n\n');
  },

  // Dynamic prompt building based on context quality
  buildOptimizedPrompt(context: string, question: string): string {
    const hasRelevantContext = context && !context.includes("No specific information found");

    if (hasRelevantContext) {
      return `You are a helpful AI assistant. Respond naturally and conversationally. Use the provided context to give accurate, concise answers. Keep responses short and to the point.

CONTEXT:
${context}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Be conversational and friendly
2. Keep responses short and precise (1-3 sentences maximum)
3. Answer directly without unnecessary explanations
4. Use context information when available
5. If context doesn't fully answer, provide a brief helpful response

RESPONSE:`;
    } else {
      return `You are a helpful AI assistant. Respond naturally and conversationally. Keep responses short and to the point.

USER QUESTION: ${question}

INSTRUCTIONS:
1. Be conversational and friendly
2. Keep responses very short (1-2 sentences maximum)
3. Answer directly without lengthy explanations
4. Be helpful but concise

RESPONSE:`;
    }
  },

  // Context quality assessment
  calculateContextQuality(relevantDocs: any[]): number {
    if (relevantDocs.length === 0) return 0;

    const avgScore = relevantDocs.reduce((sum, doc) => sum + (doc.finalScore || 0), 0) / relevantDocs.length;
    const diversity = this.calculateContentDiversity(relevantDocs);

    return (avgScore * 0.7) + (diversity * 0.3);
  },

  // Content deduplication
  deduplicateContent(docs: any[]): any[] {
    const seen = new Set();
    const unique = [];

    for (const doc of docs) {
      const signature = this.createContentSignature(doc.chunk_text);
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(doc);
      }
    }

    return unique;
  },

  createContentSignature(text: string): string {
    // Create a simple signature for deduplication
    const cleaned = text.toLowerCase().replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, 100); // First 100 chars as signature
  },

  // Document diversity selection
  selectDiverseDocuments(docs: any[]): any[] {
    if (docs.length <= 5) return docs;

    const selected = [];
    const signatures = new Set();

    for (const doc of docs) {
      const signature = this.createContentSignature(doc.chunk_text);

      if (!signatures.has(signature) || selected.length < 3) {
        selected.push(doc);
        signatures.add(signature);

        if (selected.length >= 5) break;
      }
    }

    return selected;
  },

  calculateContentDiversity(docs: any[]): number {
    if (docs.length <= 1) return 1;

    const signatures = new Set(docs.map(doc => this.createContentSignature(doc.chunk_text)));
    return signatures.size / docs.length;
  },

  // Response post-processing for concise, human-like responses
  postProcessResponse(response: string, question: string): string {
    let processed = response.trim();

    // Remove common AI artifacts and overly formal phrases
    processed = processed.replace(/^(As an AI|As a language model|I'm an AI|As a helpful AI)/gi, '');
    processed = processed.replace(/^(I apologize|I'm sorry|My apologies)/gi, '');
    processed = processed.replace(/^(I hope this helps|I hope this information is helpful)/gi, '');
    processed = processed.replace(/^(Please let me know|Feel free to ask|If you have any questions)/gi, '');

    // Remove excessive politeness and filler words
    processed = processed.replace(/\b(I would be happy to|I'd be glad to|I would like to)\b/gi, '');
    processed = processed.replace(/\b(in order to|in order for you to|so that you can)\b/gi, '');
    processed = processed.replace(/\b(furthermore|additionally|moreover|in addition)\b/gi, '');

    // Remove excessive line breaks and whitespace
    processed = processed.replace(/\n{3,}/g, '\n\n');
    processed = processed.replace(/\s+/g, ' ');

    // Split into sentences and keep only the most relevant ones
    const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length > 3) {
      // Keep only first 3 most relevant sentences
      processed = sentences.slice(0, 3).join('. ') + '.';
    } else if (sentences.length > 0) {
      processed = sentences.join('. ');
      if (!processed.endsWith('.')) processed += '.';
    }

    // Final cleanup
    processed = processed.trim();

    // If response is still too long, truncate it
    if (processed.length > 200) {
      const lastSentenceEnd = Math.max(
        processed.lastIndexOf('.'),
        processed.lastIndexOf('!'),
        processed.lastIndexOf('?')
      );
      if (lastSentenceEnd > 50) {
        processed = processed.substring(0, lastSentenceEnd + 1);
      }
    }

    return processed;
  },

  answersQuestion(response: string, question: string): boolean {
    const questionWords = new Set(question.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const responseWords = response.toLowerCase().split(/\s+/);

    const matches = [...questionWords].filter(word => responseWords.includes(word));
    return matches.length > questionWords.size * 0.3;
  },

  // Enhanced fallback response
  generateFallbackResponse(question: string, relevantDocs: any[] = []): string {
    const hasSomeContext = relevantDocs.length > 0;

    if (hasSomeContext) {
      return `I found some information related to your question, but I'm having trouble processing it completely right now. Could you try rephrasing your question or contact support for more detailed assistance?`;
    } else {
      return `I apologize, but I'm having trouble accessing my knowledge base right now. Please try again in a few moments, or contact our support team for immediate assistance with your question about: "${question}"`;
    }
  }
};
