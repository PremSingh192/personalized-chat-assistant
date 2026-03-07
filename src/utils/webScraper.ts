import axios from 'axios';
import { load } from 'cheerio';

export const scrapeWebContent = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = load(response.data);
    
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar').remove();
    
    const title = $('title').text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    
    if (title) {
      return `${title}\n\n${bodyText}`;
    }
    
    return bodyText;
  } catch (error) {
    console.error('Error scraping web content:', error);
    throw new Error(`Failed to scrape content from ${url}`);
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
