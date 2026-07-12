import { chromium } from "playwright";
import type { ScrapedLead, Scraper } from "./index";

export class GoogleMapsScraper implements Scraper {
  source = "GOOGLE_MAPS";

  async scrape(query: string, location?: string): Promise<ScrapedLead[]> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const searchQuery = location ? `${query} di ${location}` : query;
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`,
      { waitUntil: "networkidle" }
    );

    // Wait for results
    await page.waitForSelector('[role="article"]', { timeout: 15000 }).catch(() => {});

    // Scroll to load more
    for (let i = 0; i < 4; i++) {
      const feed = page.locator('[role="feed"]');
      await feed.evaluate((el) => (el.scrollTop = el.scrollHeight));
      await page.waitForTimeout(2000);
    }

    const results = await page.$$eval('[role="article"]', (cards) => {
      return cards.map((card) => {
        const name = card.querySelector(".qBF1Pd")?.textContent?.trim() ||
          card.querySelector('[class*="fontHeadline"]')?.textContent?.trim() || "";

        const allText = card.textContent || "";

        // Extract phone — look for patterns
        const phoneMatch = allText.match(/(?:\+62|0)\d{8,12}/);
        const phone = phoneMatch ? phoneMatch[0].replace(/\s/g, "") : "";

        // Extract address — usually the last text block
        const textBlocks = card.querySelectorAll(".W4Efsd");
        const address = textBlocks.length > 0
          ? textBlocks[textBlocks.length - 1].textContent?.trim() || ""
          : "";

        // Try to parse city from address
        const cityMatch = address.match(/(?:Jakarta|Bandung|Surabaya|Medan|Semarang|Yogya\w*|Bali|Makassar|Malang|Bogor|Depok|Tangerang|Bekasi)/i);
        const city = cityMatch ? cityMatch[0] : "";

        const linkEl = card.querySelector('a[href*="maps/place"]');
        const sourceUrl = linkEl?.getAttribute("href") || "";

        // Try to get rating
        const ratingEl = card.querySelector('[class*="fontBodyMedium"]');
        const rating = ratingEl?.textContent?.trim() || "";

        return {
          name,
          phone,
          address,
          city,
          sourceUrl,
          sourceRaw: { rating },
        };
      });
    });

    await browser.close();

    return results.filter((r) => r.name && r.phone);
  }
}