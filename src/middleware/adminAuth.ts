import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Admin } from '../entities/Admin';
import config from '../config';

interface AuthRequest extends Request {
  admin?: Admin;
}

export const authenticateAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check both Authorization header and cookie
    const authHeader = req.header('Authorization')?.replace('Bearer ', '');
    const cookieToken = req.cookies?.admin_token;
    console.log('Auth header:', authHeader);
    console.log('Cookie token:', cookieToken);
    console.log('All cookies:', req.cookies);
    const token = authHeader || cookieToken;
    
    if (!token) {
      // For web requests, redirect to login instead of JSON
      if (req.accepts('html')) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({ where: { id: decoded.id } });

    if (!admin) {
      // For web requests, redirect to login instead of JSON
      if (req.accepts('html')) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    // For web requests, redirect to login instead of JSON
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    res.status(401).json({ error: 'Invalid token.' });
  }
};
