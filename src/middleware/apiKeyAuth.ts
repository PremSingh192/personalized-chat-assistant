import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Business } from '../entities/Business';

interface AuthRequest extends Request {
  business?: Business;
}

export const authenticateApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.header('X-API-Key') || req.query.api_key as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required.' });
    }

    const businessRepository = AppDataSource.getRepository(Business);
    const business = await businessRepository.findOne({ where: { api_key: apiKey } });

    if (!business) {
      return res.status(401).json({ error: 'Invalid API key.' });
    }

    req.business = business;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error.' });
  }
};
