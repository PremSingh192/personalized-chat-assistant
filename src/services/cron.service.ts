import axios from 'axios';
import config from '../config/index';

class CronService {
  private static instance: CronService;
  private cronJob: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }
    
    // Run immediately on start
    this.pingWidgetDomain();
    
    // Then run every 45 seconds
    this.cronJob = setInterval(() => {
      this.pingWidgetDomain();
    }, 45000); // 45 seconds

    this.isRunning = true;
  }

  public stop(): void {
    if (this.cronJob) {
      clearInterval(this.cronJob);
      this.cronJob = null;
    }
    this.isRunning = false;
  }

  private async pingWidgetDomain(): Promise<void> {
    try {
      const widgetDomain = config.widget.domain;
      const fullUrl = `${widgetDomain}`;

      // Make a lightweight GET request to the widget script endpoint
      const response = await axios.get(fullUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Cron-Health-Check/1.0'
        }
      });

      // Log success silently - no console output

    } catch (error: any) {
      // Silent error handling - no console output
      // This ensures the cron service keeps running even if the widget is temporarily down
    }
  }

  public getStatus(): { isRunning: boolean; nextRunIn: number } {
    return {
      isRunning: this.isRunning,
      nextRunIn: this.cronJob ? 45000 : 0
    };
  }
}

// Export singleton instance
export const cronService = CronService.getInstance();

// Export class for potential testing
export { CronService };
