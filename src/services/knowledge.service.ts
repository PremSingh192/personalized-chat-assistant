import pdfParse from 'pdf-parse';
import { load } from 'cheerio';
import axios from 'axios';
import { createWorker } from 'tesseract.js';
import { AppDataSource } from '../config/database';
import { KnowledgeDocument } from '../entities/KnowledgeDocument';
import { Embedding } from '../entities/Embedding';
import { aiService } from './ai.service';

const knowledgeDocumentRepository = AppDataSource.getRepository(KnowledgeDocument);
const embeddingRepository = AppDataSource.getRepository(Embedding);

// Production-level knowledge service with optimized extraction and processing
export const knowledgeService = {
  // Enhanced PDF extraction with error handling and optimization
  async extractPDFText(buffer: Buffer): Promise<string> {
    try {
      
      const data = await pdfParse(buffer);
      
      let extractedText = data.text || '';
      
      // Post-process extracted text for quality
      extractedText = this.postProcessExtractedText(extractedText);
      
      if (extractedText.length < 50) {
        console.warn('⚠️ Very little text extracted from PDF');
      }
      
      return extractedText;
    } catch (error: any) {
      console.error('❌ Error extracting PDF text:', error);
      
      // Enhanced error messages
      if (error.message?.includes('password')) {
        throw new Error('PDF is password protected. Please provide an unprotected PDF.');
      } else if (error.message?.includes('corrupted')) {
        throw new Error('PDF file appears to be corrupted. Please try a different file.');
      } else {
        throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF document.');
      }
    }
  },

  // Enhanced web scraping with better content extraction and error handling
  async scrapeWebContent(url: string): Promise<string> {
    try {
      
      // Validate URL format
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
      }
      
      const response = await axios.get(url, {
        timeout: 15000, // 15 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        maxRedirects: 3, // Allow some redirects
      });
      
      const $ = load(response.data);
      
      // Remove unwanted elements with better selectors
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .menu').remove();
      
      // Extract content from multiple selectors for better coverage
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '#content',
        '.post-content',
        '.entry-content',
        'body'
      ];
      
      let extractedContent = '';
      
      for (const selector of contentSelectors) {
        const content = $(selector).text().trim();
        if (content.length > extractedContent.length) {
          extractedContent = content;
        }
      }
      
      // Fallback to body if no content found
      if (extractedContent.length === 0) {
        extractedContent = $('body').text().trim();
      }
      
      // Post-process extracted content
      extractedContent = this.postProcessExtractedText(extractedContent);
      
      if (extractedContent.length < 100) {
        console.warn('⚠️ Very little content extracted from webpage');
      }
      
      return extractedContent;
    } catch (error: any) {
      console.error('❌ Error scraping web content:', error);
      
      if (error.code === 'ENOTFOUND') {
        throw new Error('Website not found. Please check the URL and try again.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. The website may be down or blocking requests.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. The website took too long to respond.');
      } else if (error.message?.includes('Invalid URL')) {
        throw new Error('Invalid URL format. Please provide a valid web address.');
      } else {
        throw new Error('Failed to scrape web content. Please try a different URL or check if the website is accessible.');
      }
    }
  },

  // Enhanced OCR with better error handling and optimization
  async extractImageText(buffer: Buffer): Promise<string> {
    let worker: any = null;
    
    try {
      
      // Validate image buffer
      if (buffer.length < 1000) {
        throw new Error('Image file is too small or empty.');
      }
      
      worker = await createWorker();
      
      // Configure worker for better accuracy
      await worker.setParameters({
        tessedit_ocr_engine_mode: 3, // LSTM OCR engine
        tessedit_pageseg_mode: 6, // Assume uniform text block
        preserve_interword_spaces: '1',
      });
      
      const { data: { text } } = await worker.recognize(buffer, 'eng', {
        tessedit_ocr_engine_mode: 3,
      });
      
      // Clean up OCR text
      let extractedText = text || '';
      extractedText = this.postProcessExtractedText(extractedText);
      
      if (extractedText.length < 10) {
        console.warn('⚠️ Very little text extracted from image');
      }
      
      return extractedText;
    } catch (error: any) {
      console.error('❌ Error extracting image text:', error);
      
      if (error.message?.includes('not a valid image')) {
        throw new Error('Invalid image file. Please provide a valid image (JPG, PNG, etc.).');
      } else if (error.message?.includes('too small')) {
        throw new Error('Image file is too small. Please provide a larger image with readable text.');
      } else {
        throw new Error('Failed to extract text from image. Please ensure the image contains clear, readable text.');
      }
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  },

  // Enhanced text chunking with better overlap and context preservation
  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Pre-process text
    const cleanedText = this.preProcessText(text);
    
    // Split into sentences first for better context preservation
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
    
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      // If adding this sentence would exceed chunk size and we have content, save current chunk
      if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap from previous chunk
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.min(overlap, words.length));
        currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }
    
    // Add remaining content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    // Filter out very small chunks
    const filteredChunks = chunks.filter(chunk => chunk.length >= 50);
    
    return filteredChunks;
  },

  // Enhanced document processing with batch processing and error recovery
  async processDocument(document: KnowledgeDocument): Promise<void> {
    try {
      
      // Clean up existing embeddings for this document
      await this.deleteDocumentEmbeddings(document.id);
      
      // Validate document content
      if (!document.content || document.content.trim().length === 0) {
        throw new Error('Document content is empty');
      }
      
      // Generate chunks with optimized parameters
      const chunks = this.chunkText(document.content, 400, 30); // Smaller chunks for better relevance
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks could be generated from document content');
      }
      
      // Process chunks in batches to avoid overwhelming the system
      const batchSize = 5;
      let processedCount = 0;
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Process batch concurrently
        const batchPromises = batch.map(async (chunk: string, index: number) => {
          try {
            const embedding = await aiService.generateEmbedding(chunk);
            
            const embeddingRecord = embeddingRepository.create({
              document_id: document.id,
              chunk_text: chunk,
              vector: embedding
            });
            
            const savedEmbedding = await embeddingRepository.save(embeddingRecord);
            
            return savedEmbedding;
          } catch (error: any) {
            console.error(`❌ Error processing chunk ${i + index}:`, error);
            throw error;
          }
        });
        
        try {
          await Promise.all(batchPromises);
          processedCount += batch.length;
          
          // Add delay between batches to prevent overwhelming the embedding service
          if (i + batchSize < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        } catch (error) {
          console.error(`❌ Batch processing failed at chunk ${i}:`, error);
          throw error;
        }
      }
      
      // Verify embeddings were actually saved
      const savedEmbeddings = await embeddingRepository.find({
        where: { document_id: document.id }
      });
      
      if (savedEmbeddings.length === 0) {
        console.error('❌ CRITICAL: No embeddings were saved despite processing completion!');
      }
      
      // Update document status or metadata if needed
      document.updated_at = new Date();
      await knowledgeDocumentRepository.save(document);
      
    } catch (error: any) {
      console.error('❌ Error processing document:', error);
      
      // Clean up partial embeddings on failure
      await this.deleteDocumentEmbeddings(document.id);
      
      throw new Error(`Failed to process document: ${error?.message || 'Unknown error'}`);
    }
  },

  // Enhanced embedding cleanup with better error handling
  async deleteDocumentEmbeddings(documentId: number): Promise<void> {
    try {
      const result = await embeddingRepository.delete({ document_id: documentId });
    } catch (error: any) {
      console.error(`❌ Error deleting embeddings for document ${documentId}:`, error);
      throw new Error(`Failed to delete embeddings: ${error?.message || 'Unknown error'}`);
    }
  },

  // Text pre-processing for better chunking quality
  preProcessText(text: string): string {
    return text
      // Normalize whitespace while preserving sentence structure
      .replace(/\s+/g, ' ')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Fix common OCR issues
      .replace(/\|/g, 'I') // Common OCR mistake
      .replace(/0/g, 'O') // Context-dependent, might need refinement
      .trim();
  },

  // Post-processing for extracted text
  postProcessExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove common web artifacts
      .replace(/javascript:/gi, '')
      .replace(/onclick[^>]*>/gi, '>')
      // Remove excessive punctuation
      .replace(/([.!?])\1{2,}/g, '$1')
      // Clean up quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();
  },

  // Document quality assessment
  assessDocumentQuality(content: string): {
    wordCount: number;
    sentenceCount: number;
    avgWordsPerSentence: number;
    readabilityScore: number;
    quality: 'low' | 'medium' | 'high';
  } {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    
    // Simple readability score based on average sentence length
    const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 2));
    
    let quality: 'low' | 'medium' | 'high' = 'medium';
    if (wordCount < 50 || readabilityScore < 30) {
      quality = 'low';
    } else if (wordCount > 200 && readabilityScore > 70) {
      quality = 'high';
    }
    
    return {
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      readabilityScore,
      quality
    };
  },

  // Enhanced content validation
  validateContent(content: string, sourceType: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Length validation
    if (content.length < 50) {
      issues.push('Content is very short');
      suggestions.push('Consider adding more detailed information');
    }
    
    if (content.length > 100000) {
      issues.push('Content is very long');
      suggestions.push('Consider splitting into smaller documents');
    }
    
    // Content quality checks
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) {
      issues.push('No complete sentences found');
      suggestions.push('Ensure content has proper sentence structure');
    }
    
    // Source-specific validations
    if (sourceType === 'url') {
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const urls = content.match(urlPattern);
      if (urls && urls.length > 5) {
        issues.push('Too many URLs in content');
        suggestions.push('Consider cleaning up the extracted content');
      }
    }
    
    if (sourceType === 'image') {
      const hasMeaningfulText = content.split(/\s+/).filter(w => w.length > 4).length > 10;
      if (!hasMeaningfulText) {
        issues.push('Limited meaningful text detected');
        suggestions.push('Ensure the image contains clear, readable text');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
};
