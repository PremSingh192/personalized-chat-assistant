import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';

const systemConfigRepository = AppDataSource.getRepository(SystemConfig);

export class SystemConfigService {
  private static configCache: Map<string, string> = new Map();
  private static cacheTimeout: NodeJS.Timeout | null = null;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Initialize default configs
  static async initializeDefaults(): Promise<void> {
    const defaultConfigs = [
      {
        key: 'ollama_base_url',
        value: 'http://localhost:11434',
        description: 'Ollama API base URL for AI model connections',
        type: 'url',
        category: 'ai'
      },
      {
        key: 'ollama_model',
        value: 'qwen2.5:1.5b',
        description: 'AI model used for chat response generation',
        type: 'string',
        category: 'ai'
      },
      {
        key: 'ollama_embedding_model',
        value: 'nomic-embed-text',
        description: 'Embedding model used for vector search',
        type: 'string',
        category: 'ai'
      }
    ];

    for (const config of defaultConfigs) {
      const existing = await systemConfigRepository.findOne({ where: { key: config.key } });
      if (!existing) {
        const newConfig = systemConfigRepository.create(config);
        await systemConfigRepository.save(newConfig);
      }
    }
  }

  // Get configuration value with caching
  static async getConfig(key: string): Promise<string | null> {
    // Check cache first
    if (this.configCache.has(key)) {
      return this.configCache.get(key) || null;
    }

    // Load from database
    const config = await systemConfigRepository.findOne({ 
      where: { key, isActive: true } 
    });

    if (config) {
      this.configCache.set(key, config.value);
      this.scheduleCacheRefresh();
      return config.value;
    }

    return null;
  }

  // Get all configurations
  static async getAllConfigs(): Promise<SystemConfig[]> {
    return await systemConfigRepository.find({ 
      order: { category: 'ASC', key: 'ASC' } 
    });
  }

  // Get configurations by category
  static async getConfigsByCategory(category: string): Promise<SystemConfig[]> {
    return await systemConfigRepository.find({ 
      where: { category, isActive: true },
      order: { key: 'ASC' }
    });
  }

  // Update configuration
  static async updateConfig(key: string, value: string, description?: string): Promise<SystemConfig | null> {
    const config = await systemConfigRepository.findOne({ where: { key } });
    
    if (!config) {
      return null;
    }

    config.value = value;
    if (description) {
      config.description = description;
    }

    const updatedConfig = await systemConfigRepository.save(config);
    
    // Update cache immediately
    this.configCache.set(key, value);
    this.scheduleCacheRefresh();
    
    return updatedConfig;
  }

  // Create new configuration
  static async createConfig(configData: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = systemConfigRepository.create(configData);
    const savedConfig = await systemConfigRepository.save(config);
    
    // Update cache
    this.configCache.set(config.key, config.value);
    this.scheduleCacheRefresh();
    
    return savedConfig;
  }

  // Delete configuration
  static async deleteConfig(key: string): Promise<boolean> {
    const config = await systemConfigRepository.findOne({ where: { key } });
    
    if (!config) {
      return false;
    }

    await systemConfigRepository.remove(config);
    
    // Remove from cache
    this.configCache.delete(key);
    this.scheduleCacheRefresh();
    
    return true;
  }

  // Toggle configuration active status
  static async toggleConfig(key: string): Promise<SystemConfig | null> {
    const config = await systemConfigRepository.findOne({ where: { key } });
    
    if (!config) {
      return null;
    }

    config.isActive = !config.isActive;
    const updatedConfig = await systemConfigRepository.save(config);
    
    // Update cache
    if (config.isActive) {
      this.configCache.set(key, config.value);
    } else {
      this.configCache.delete(key);
    }
    this.scheduleCacheRefresh();
    
    return updatedConfig;
  }

  // Refresh cache
  static async refreshCache(): Promise<void> {
    const configs = await systemConfigRepository.find({ where: { isActive: true } });
    
    this.configCache.clear();
    configs.forEach(config => {
      this.configCache.set(config.key, config.value);
    });
    
  }

  // Schedule cache refresh
  private static scheduleCacheRefresh(): void {
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
    }
    
    this.cacheTimeout = setTimeout(() => {
      this.refreshCache();
    }, this.CACHE_DURATION);
  }

  // Clear cache (for testing or manual refresh)
  static clearCache(): void {
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = null;
    }
    this.configCache.clear();
  }

  // Get AI configurations specifically
  static async getAIConfigs(): Promise<{ baseUrl: string; model: string; embeddingModel: string }> {
    const baseUrl = await this.getConfig('ollama_base_url') || 'http://localhost:11434';
    const model = await this.getConfig('ollama_model') || 'qwen2.5:1.5b';
    const embeddingModel = await this.getConfig('ollama_embedding_model') || 'nomic-embed-text';

    return { baseUrl, model, embeddingModel };
  }
}
