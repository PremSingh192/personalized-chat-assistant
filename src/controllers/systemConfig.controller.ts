import { Request, Response } from 'express';
import { SystemConfigService } from '../services/systemConfig.service';
import { SystemConfig } from '../entities/SystemConfig';

export const systemConfigController = {
  // Get all system configurations
  async getAllConfigs(req: Request, res: Response) {
    try {
      const configs = await SystemConfigService.getAllConfigs();
      
      res.json({
        success: true,
        data: configs,
        message: 'System configurations retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching system configs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system configurations'
      });
    }
  },

  // Get configurations by category
  async getConfigsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category parameter is required'
        });
      }

      const configs = await SystemConfigService.getConfigsByCategory(category);
      
      res.json({
        success: true,
        data: configs,
        message: `${category} configurations retrieved successfully`
      });
    } catch (error) {
      console.error('Error fetching configs by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configurations by category'
      });
    }
  },

  // Get single configuration by key
  async getConfigByKey(req: Request, res: Response) {
    try {
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Key parameter is required'
        });
      }

      const config = await SystemConfigService.getConfig(key);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        data: { key, value: config },
        message: 'Configuration retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching config by key:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configuration'
      });
    }
  },

  // Create new configuration
  async createConfig(req: Request, res: Response) {
    try {
      const { key, value, description, type, category } = req.body;

      if (!key || !value) {
        return res.status(400).json({
          success: false,
          message: 'Key and value are required'
        });
      }

      const configData = {
        key,
        value,
        description: description || '',
        type: type || 'string',
        category: category || 'system'
      };

      const newConfig = await SystemConfigService.createConfig(configData);

      res.status(201).json({
        success: true,
        data: newConfig,
        message: 'Configuration created successfully'
      });
    } catch (error) {
      console.error('Error creating config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create configuration'
      });
    }
  },

  // Update existing configuration
  async updateConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      if (!key || !value) {
        return res.status(400).json({
          success: false,
          message: 'Key and value are required'
        });
      }

      const updatedConfig = await SystemConfigService.updateConfig(key, value, description);

      if (!updatedConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration'
      });
    }
  },

  // Delete configuration
  async deleteConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Key parameter is required'
        });
      }

      const deleted = await SystemConfigService.deleteConfig(key);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        message: 'Configuration deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete configuration'
      });
    }
  },

  // Toggle configuration active status
  async toggleConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: 'Key parameter is required'
        });
      }

      const toggledConfig = await SystemConfigService.toggleConfig(key);

      if (!toggledConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        data: toggledConfig,
        message: `Configuration ${toggledConfig.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle configuration'
      });
    }
  },

  // Get current AI configuration
  async getAIConfig(req: Request, res: Response) {
    try {
      const aiConfig = await SystemConfigService.getAIConfigs();

      res.json({
        success: true,
        data: aiConfig,
        message: 'AI configuration retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching AI config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI configuration'
      });
    }
  },

  // Test AI configuration connection
  async testAIConnection(req: Request, res: Response) {
    try {
      const aiConfig = await SystemConfigService.getAIConfigs();
      
      // Test connection to Ollama
      const response = await fetch(`${aiConfig.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Connection failed with status: ${response.status}`);
      }

      const models = await response.json();

      res.json({
        success: true,
        data: {
          baseUrl: aiConfig.baseUrl,
          model: aiConfig.model,
          embeddingModel: aiConfig.embeddingModel,
          availableModels: models.models || []
        },
        message: 'AI connection test successful'
      });
    } catch (error: any) {
      console.error('AI connection test failed:', error);
      res.status(500).json({
        success: false,
        message: `AI connection test failed: ${error.message || 'Unknown error'}`
      });
    }
  },

  // Refresh configuration cache
  async refreshCache(req: Request, res: Response) {
    try {
      await SystemConfigService.refreshCache();

      res.json({
        success: true,
        message: 'Configuration cache refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh configuration cache'
      });
    }
  }
};
