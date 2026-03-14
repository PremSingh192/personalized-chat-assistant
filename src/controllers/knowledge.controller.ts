import { Request, Response } from 'express';
import multer from 'multer';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';
import { KnowledgeDocument } from '../entities/KnowledgeDocument';
import { knowledgeService } from '../services/knowledge.service';

const businessRepository = AppDataSource.getRepository(Business);
const knowledgeDocumentRepository = AppDataSource.getRepository(KnowledgeDocument);

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const uploadKnowledge = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const business = (req as any).business;
      const { title, sourceType, url, textContent } = req.body;
      
      let content = '';
      
      if (sourceType === 'pdf' && req.file) {
        content = await knowledgeService.extractPDFText(req.file.buffer);
      } else if (sourceType === 'url') {
        content = await knowledgeService.scrapeWebContent(url);
      } else if (sourceType === 'image' && req.file) {
        content = await knowledgeService.extractImageText(req.file.buffer);
      } else if (sourceType === 'text') {
        content = textContent;
      }
      
      const document = knowledgeDocumentRepository.create({
        business_id: business.id,
        title: title || 'Untitled Document',
        source_type: sourceType,
        content: content
      });
      
      await knowledgeDocumentRepository.save(document);
      
      await knowledgeService.processDocument(document);
      
      res.status(201).json({ document });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Error uploading knowledge document' });
    }
  }
];

export const saveBusinessDescription = async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const { description } = req.body;
    
    // Check if business description already exists
    let existingDoc = await knowledgeDocumentRepository.findOne({
      where: { business_id: business.id, source_type: 'business_description' }
    });
    
    if (existingDoc) {
      // Update existing description
      existingDoc.content = description;
      existingDoc.updated_at = new Date();
      await knowledgeDocumentRepository.save(existingDoc);
    } else {
      // Create new business description document
      const document = knowledgeDocumentRepository.create({
        business_id: business.id,
        title: 'Business Description',
        source_type: 'business_description',
        content: description
      });
      
      await knowledgeDocumentRepository.save(document);
      await knowledgeService.processDocument(document);
    }
    
    res.json({ message: 'Business description saved successfully' });
  } catch (error) {
    console.error('Business description error:', error);
    res.status(500).json({ error: 'Error saving business description' });
  }
};

export const getKnowledgeDocuments = async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    
    const documents = await knowledgeDocumentRepository.find({
      where: { business_id: business.id },
      relations: ['embeddings'],
      order: { created_at: 'DESC' }
    });
    
    return res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching knowledge documents:', error);
    res.status(500).json({ error: 'Error fetching knowledge documents' });
  }
};

export const deleteKnowledgeDocument = async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const documentId = req.params.id;
    
    const document = await knowledgeDocumentRepository.findOne({
      where: { id: parseInt(documentId), business_id: business.id }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // First delete all associated embeddings
    await knowledgeService.deleteDocumentEmbeddings(document.id);
    
    // Then delete the document
    await knowledgeDocumentRepository.remove(document);
    
    res.json({ message: 'Document and its embeddings deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    res.status(500).json({ error: 'Error deleting document' });
  }
};
