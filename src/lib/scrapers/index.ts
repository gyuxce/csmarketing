export interface ScrapedLead {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  sourceUrl?: string;
  sourceRaw?: Record<string, unknown>;
}

export interface Scraper {
  source: string;
  scrape(query: string, location?: string): Promise<ScrapedLead[]>;
}

export * from "./google-maps";
export * from "./normalize";