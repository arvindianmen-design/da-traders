// scrape-rates.js
// Run daily via GitHub Actions. Scrapes kisandeals.com mandi price tables
// for all five D.A. Traders commodities and writes public/rates.json.
//
// Setup:
//   npm install node-fetch cheerio
//   node scrape-rates.js
//
// URL pattern confirmed working: kisandeals.com/mandiprices/{SLUG}/KERALA/ALL
// Each page renders a table with columns:
//   Commodity | Variety | State | District | Mandi/Market | Min Price | Modal Price | Max Price | Arrival Date
// Prices in the table are per QUINTAL (100 kg) — we divide by 100 to store ₹/kg.

import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";

const OUTPUT_PATH = "./public/rates.json";

const COMMODITY_SLUGS = {
  pepper: "BLACK-PEPPER",
    cardamom: "CARDAMOM",
      rubber: "RUBBER",
        coffee: "COFFEE",
          areca: "ARECANUT(BETELNUT-SUPARI)",
          };

          async function scrapeCommodity(slug) {
            const url = `https://www.kisandeals.com/mandiprices/${encodeURIComponent(slug)}/KERALA/ALL`;
              try {
                  const res = await fetch(url, {
                        headers: { "User-Agent": "Mozilla/5.0 (compatible; DATradersRateBot/1.0)" },
                            });
                                const html = await res.text();
                                    const $ = cheerio.load(html);

                                        const modalPrices = [];
                                            let latestDate = null;

                                                $("table tr").each((_, tr) => {
                                                      const cells = $(tr)
                                                              .find("td")
                                                                      .map((_, td) => $(td).text().trim())
                                                                              .get();

                                                                                    if (cells.length >= 9) {
                                                                                            const modal = parseFloat(cells[6].replace(/[₹,\s]/g, ""));
                                                                                                    const date = cells[8];
                                                                                                            if (!isNaN(modal) && modal > 0) {
                                                                                                                      modalPrices.push(modal);
                                                                                                                                latestDate = latestDate || date;
                                                                                                                                        }
                                                                                                                                              }
                                                                                                                                                  });
                                                                                                                                                  
                                                                                                                                                      if (modalPrices.length === 0) {
                                                                                                                                                            console.warn(`${slug}: no rows parsed — page structure may have changed`);
                                                                                                                                                                  return null;
                                                                                                                                                                      }
                                                                                                                                                                      
                                                                                                                                                                          const avgPerQuintal = modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length;
                                                                                                                                                                              const pricePerKg = Math.round((avgPerQuintal / 100) * 100) / 100;
                                                                                                                                                                              
                                                                                                                                                                                  return {
                                                                                                                                                                                        price: pricePerKg,
                                                                                                                                                                                              date: latestDate,
                                                                                                                                                                                                    marketsReporting: modalPrices.length,
                                                                                                                                                                                                          source: "kisandeals.com Kerala mandi average",
                                                                                                                                                                                                              };
                                                                                                                                                                                                                } catch (e) {
                                                                                                                                                                                                                    console.error(`${slug} scrape failed:`, e.message);
                                                                                                                                                                                                                        return null;
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          
                                                                                                                                                                                                                          async function main() {
                                                                                                                                                                                                                            const output = {
                                                                                                                                                                                                                                updatedAt: new Date().toISOString(),
                                                                                                                                                                                                                                  };
                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                    for (const [cropKey, slug] of Object.entries(COMMODITY_SLUGS)) {
                                                                                                                                                                                                                                        console.log(`Scraping ${cropKey} (${slug})...`);
                                                                                                                                                                                                                                            const result = await scrapeCommodity(slug);
                                                                                                                                                                                                                                                console.log(`${cropKey} result:`, result);
                                                                                                                                                                                                                                                    output[cropKey] = result;
                                                                                                                                                                                                                                                        await new Promise((r) => setTimeout(r, 1500));
                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                            mkdirSync("./public", { recursive: true });
                                                                                                                                                                                                                                                              writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
                                                                                                                                                                                                                                                                console.log("Wrote", OUTPUT_PATH);
                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                main();
                                                                                                                                                                                                                                                                
