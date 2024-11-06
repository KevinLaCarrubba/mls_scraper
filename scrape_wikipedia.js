import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the Wikipedia page
  await page.goto(
    "https://en.wikipedia.org/wiki/List_of_municipalities_in_New_Jersey"
  );

  // Extract city and county data from the table
  const cityCountyData = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll(".wikitable.sortable tbody tr")
    );
    const data = {};

    rows.forEach((row) => {
      const cityCell = row.querySelector("td:nth-child(1) a");
      const countyCell = row.querySelector("td:nth-child(3)");

      if (cityCell && countyCell) {
        const city = cityCell.textContent.trim();
        const county = countyCell.textContent.trim();

        if (!data[county]) {
          data[county] = [];
        }

        data[county].push(city);
      }
    });

    return data;
  });

  // Save the data to a JSON file
  fs.writeFileSync(
    "nj_city_county.json",
    JSON.stringify(cityCountyData, null, 2)
  );

  console.log("City and county data saved to nj_city_county.json");

  await browser.close();
})();
