import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Admin } from '../entities/Admin';
import { Business } from '../entities/Business';
import config from '../config';

const adminRepository = AppDataSource.getRepository(Admin);
const businessRepository = AppDataSource.getRepository(Business);

export const getLogin = (req: Request, res: Response) => {
  res.render('login-new');
};

export const postLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).render('login-new', { error: 'Email and password are required' });
    }
    
    let user: Admin | Business | null = null;
    let isValidPassword = false;
    let userType: 'admin' | 'business' | null = null;
    
    // Try admin first
    const admin = await adminRepository.findOne({ where: { email } });
    if (admin) {
      user = admin;
      isValidPassword = await bcrypt.compare(password, admin.password);
      userType = 'admin';
    }
    
    // If not admin, try business
    if (!user) {
      const business = await businessRepository.findOne({ where: { email } });
      if (business) {
        user = business;
        isValidPassword = await bcrypt.compare(password, business.password);
        userType = 'business';
      }
    }
    
    if (!user || !isValidPassword) {
      return res.status(401).render('login-new', { 
        error: 'Invalid credentials',
        email 
      });
    }
    
    const token = jwt.sign({ id: user.id, type: userType }, config.jwt.secret);
    
    // Set appropriate cookie based on user type
    const cookieName = userType === 'admin' ? 'admin_token' : 'business_token';
    
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Redirect to appropriate dashboard
    res.redirect(`/${userType}/dashboard`);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('login-new', { error: 'Login error' });
  }
};

export const logout = (req: Request, res: Response) => {
  // Clear all authentication cookies
  res.clearCookie('admin_token');
  res.clearCookie('business_token');
  res.redirect('/login');
};
