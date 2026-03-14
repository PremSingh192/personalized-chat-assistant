// Fallback Redis configuration for compatibility
try {
  var redis = require('redis');
} catch (e) {
  console.error('Redis module not found, using fallback configuration');
  redis = null;
}

import config from './index';

let redisClient: any;

if (redis) {
  redisClient = redis.createClient({
    url: config.redis.url,
    connectTimeout: 5000,
    lazyConnect: true
  });

  redisClient.on('error', (err: any) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    // Redis Client Connected
  });

  redisClient.on('ready', () => {
    // Redis Client Ready
  });
}

export const getRedisClient = () => {
  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  try {
    if (redisClient && !redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    console.error('Redis disconnection error:', error);
  }
};
