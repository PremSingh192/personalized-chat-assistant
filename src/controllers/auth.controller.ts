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
  res.render('login');
};

export const postLogin = async (req: Request, res: Response) => {
  try {
    const { email, password, userType } = req.body;
    
    if (!userType || !['admin', 'business'].includes(userType)) {
      return res.status(400).render('login', { error: 'Invalid user type' });
    }
    
    let user: Admin | Business | null = null;
    let isValidPassword = false;
    
    if (userType === 'admin') {
      user = await adminRepository.findOne({ where: { email } });
      if (user) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
    } else {
      user = await businessRepository.findOne({ where: { email } });
      if (user) {
        isValidPassword = await bcrypt.compare(password, user.password);
      }
    }
    
    if (!user || !isValidPassword) {
      return res.status(401).render('login', { 
        error: 'Invalid credentials',
        userType 
      });
    }
    
    const token = jwt.sign({ id: user.id }, config.jwt.secret);
    
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
    res.status(500).render('login', { error: 'Login error' });
  }
};

export const logout = (req: Request, res: Response) => {
  // Clear all authentication cookies
  res.clearCookie('admin_token');
  res.clearCookie('business_token');
  res.redirect('/login');
};
