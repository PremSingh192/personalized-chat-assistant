import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Admin } from '../entities/Admin';
import { Business } from '../entities/Business';
import config from '../config';

interface AuthRequest extends Request {
  admin?: Admin;
  business?: Business;
  user?: Admin | Business;
  userType?: 'admin' | 'business';
}

export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check both Authorization header and cookies
    const authHeader = req.header('Authorization')?.replace('Bearer ', '');
    const adminCookie = req.cookies?.admin_token;
    const businessCookie = req.cookies?.business_token;
    
    console.log('Auth header:', authHeader);
    console.log('Admin cookie:', adminCookie);
    console.log('Business cookie:', businessCookie);
    console.log('All cookies:', req.cookies);
    
    // Try admin token first
    let token = authHeader || adminCookie || businessCookie;
    let userType: 'admin' | 'business' = 'admin';
    
    if (adminCookie) {
      token = adminCookie;
      userType = 'admin';
    } else if (businessCookie) {
      token = businessCookie;
      userType = 'business';
    }
    
    if (!token) {
      // For web requests, redirect to appropriate login
      if (req.accepts('html')) {
        return res.redirect('/login');
      }
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    if (userType === 'admin') {
      const adminRepository = AppDataSource.getRepository(Admin);
      const admin = await adminRepository.findOne({ where: { id: decoded.id } });
      
      if (!admin) {
        if (req.accepts('html')) {
          return res.redirect('/admin/login');
        }
        return res.status(401).json({ error: 'Invalid admin token.' });
      }
      
      req.admin = admin;
      req.user = admin;
      req.userType = 'admin';
    } else {
      const businessRepository = AppDataSource.getRepository(Business);
      const business = await businessRepository.findOne({ where: { id: decoded.id } });
      
      if (!business) {
        if (req.accepts('html')) {
          return res.redirect('/business/login');
        }
        return res.status(401).json({ error: 'Invalid business token.' });
      }
      
      req.business = business;
      req.user = business;
      req.userType = 'business';
    }
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    // For web requests, redirect to appropriate login
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin-specific middleware
export const authenticateAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.admin_token;
    
    if (!token) {
      if (req.accepts('html')) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'Admin access denied.' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({ where: { id: decoded.id } });

    if (!admin) {
      if (req.accepts('html')) {
        return res.redirect('/admin/login');
      }
      return res.status(401).json({ error: 'Invalid admin token.' });
    }

    req.admin = admin;
    req.user = admin;
    req.userType = 'admin';
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }
    res.status(401).json({ error: 'Invalid admin token.' });
  }
};

// Business-specific middleware
export const authenticateBusiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.business_token;
    
    if (!token) {
      if (req.accepts('html')) {
        return res.redirect('/business/login');
      }
      return res.status(401).json({ error: 'Business access denied.' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const businessRepository = AppDataSource.getRepository(Business);
    const business = await businessRepository.findOne({ where: { id: decoded.id } });

    if (!business) {
      if (req.accepts('html')) {
        return res.redirect('/business/login');
      }
      return res.status(401).json({ error: 'Invalid business token.' });
    }

    req.business = business;
    req.user = business;
    req.userType = 'business';
    next();
  } catch (error) {
    console.error('Business auth error:', error);
    if (req.accepts('html')) {
      return res.redirect('/business/login');
    }
    res.status(401).json({ error: 'Invalid business token.' });
  }
};

// Middleware to block authenticated users from login pages
export const blockAuthenticated = (userType: 'admin' | 'business') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const token = userType === 'admin' ? req.cookies?.admin_token : req.cookies?.business_token;
      
      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        if (userType === 'admin') {
          const adminRepository = AppDataSource.getRepository(Admin);
          const admin = await adminRepository.findOne({ where: { id: decoded.id } });
          if (admin) {
            return res.redirect(`/${userType}/dashboard`);
          }
        } else {
          const businessRepository = AppDataSource.getRepository(Business);
          const business = await businessRepository.findOne({ where: { id: decoded.id } });
          if (business) {
            return res.redirect(`/${userType}/dashboard`);
          }
        }
      }
      
      next();
    } catch (error) {
      next(); // Allow access if token is invalid
    }
  };
};
