import { Request, Response } from 'express';
import { cronService } from '../services/cron.service';

export const getCronStatus = async (req: Request, res: Response) => {
  try {
    const status = cronService.getStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        widgetDomain: process.env.WIDGET_DOMAIN || 'http://localhost:3000',
        widgetScriptPath: process.env.WIDGET_SCRIPT_PATH || '/widget.js',
        interval: '45 seconds',
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error getting cron status:', error);
    res.status(500).json({
      error: 'Error fetching cron status',
      details: error?.message || 'Unknown error'
    });
  }
};

export const startCronService = async (req: Request, res: Response) => {
  try {
    cronService.start();
    
    res.json({
      success: true,
      message: 'Cron service started successfully',
      data: cronService.getStatus()
    });
  } catch (error: any) {
    console.error('Error starting cron service:', error);
    res.status(500).json({
      error: 'Error starting cron service',
      details: error?.message || 'Unknown error'
    });
  }
};

export const stopCronService = async (req: Request, res: Response) => {
  try {
    cronService.stop();
    
    res.json({
      success: true,
      message: 'Cron service stopped successfully',
      data: {
        isRunning: false,
        nextRunIn: 0
      }
    });
  } catch (error: any) {
    console.error('Error stopping cron service:', error);
    res.status(500).json({
      error: 'Error stopping cron service',
      details: error?.message || 'Unknown error'
    });
  }
};
