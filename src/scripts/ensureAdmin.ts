import { AppDataSource } from '../config/database';
import { Admin } from '../entities/Admin';
import bcrypt from 'bcryptjs';

export async function ensureAdminExists() {
  try {
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    const adminRepository = AppDataSource.getRepository(Admin);
    
    // Check if any admin exists
    const adminCount = await adminRepository.count();
    
    if (adminCount === 0) {
      
      // Get admin credentials from environment variables
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@yopmail.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      const adminRole = process.env.ADMIN_ROLE || 'admin';
      
      // Create admin with environment variables
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const defaultAdmin = adminRepository.create({
        email: adminEmail,
        password: hashedPassword,
        role: adminRole
      });
      
      await adminRepository.save(defaultAdmin);
      
    } else {
      // Admin user already exists.
    }
    
  } catch (error) {
    console.error('❌ Error ensuring admin exists:', error);
    throw error;
  } finally {
    // Close connection if we initialized it
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  ensureAdminExists()
    .then(() => {
        process.exit(0);
      })
    .catch((error) => {
        console.error('💥 Admin check failed:', error);
        process.exit(1);
      });
}
