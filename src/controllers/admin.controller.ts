import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Admin } from '../entities/Admin';
import { Business } from '../entities/Business';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

const adminRepository = AppDataSource.getRepository(Admin);
const businessRepository = AppDataSource.getRepository(Business);

export const getLogin = (req: Request, res: Response) => {
  res.render('admin/login');
};

export const postLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const admin = await adminRepository.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).render('admin/login', { error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).render('admin/login', { error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id }, config.jwt.secret);
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.redirect('/admin/dashboard');
  } catch (error) {
    res.status(500).render('admin/login', { error: 'Login error' });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const businesses = await businessRepository.find();
    const stats = {
      totalBusinesses: businesses.length,
      totalConversations: 0,
      totalMessages: 0
    };
    
    res.render('admin/dashboard', { businesses, stats });
  } catch (error) {
    res.status(500).send('Dashboard error');
  }
};

export const createBusiness = async (req: Request, res: Response) => {
  try {
    const { name, email, domain } = req.body;
    
    const existingBusiness = await businessRepository.findOne({ where: { email } });
    if (existingBusiness) {
      return res.status(400).json({ error: 'Business already exists' });
    }

    const apiKey = uuidv4();
    const defaultPassword = 'changeme123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const business = businessRepository.create({
      name,
      email,
      domain,
      api_key: apiKey,
      password: hashedPassword
    });

    await businessRepository.save(business);
    
    res.status(201).json({ 
      business: { ...business, password: undefined },
      defaultPassword 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating business' });
  }
};
