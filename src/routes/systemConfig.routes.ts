import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { systemConfigController } from '../controllers/systemConfig.controller';

const router = Router();

// All system config routes require admin authentication
router.use(authenticateAdmin);

// Get all configurations
router.get('/', systemConfigController.getAllConfigs);

// Get configurations by category
router.get('/category/:category', systemConfigController.getConfigsByCategory);

// Get single configuration by key
router.get('/key/:key', systemConfigController.getConfigByKey);

// Get AI configuration specifically
router.get('/ai', systemConfigController.getAIConfig);

// Test AI connection
router.get('/test-connection', systemConfigController.testAIConnection);

// Refresh configuration cache
router.post('/refresh-cache', systemConfigController.refreshCache);

// Create new configuration
router.post('/', systemConfigController.createConfig);

// Update configuration
router.put('/key/:key', systemConfigController.updateConfig);

// Toggle configuration active status
router.patch('/key/:key/toggle', systemConfigController.toggleConfig);

// Delete configuration
router.delete('/key/:key', systemConfigController.deleteConfig);

export default router;
