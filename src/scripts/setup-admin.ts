import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { Admin } from '../entities/Admin';

const createAdmin = async () => {
  try {
    await AppDataSource.initialize();
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminRepository = AppDataSource.getRepository(Admin);
    
    const existingAdmin = await adminRepository.findOne({ where: { email: 'admin@example.com' } });
    
    if (!existingAdmin) {
      const admin = adminRepository.create({
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminRepository.save(admin);
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: admin123');
      console.log('🌐 Admin Panel: http://localhost:3000/admin/login');
    } else {
      console.log('⚠️  Admin user already exists');
    }
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
};

createAdmin();
