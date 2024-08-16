import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Define the city and county you want to search for
  const city = "ringwood";
  const county = "Passaic";

  // Construct the URL with the city and county
  const searchURL = `https://www.njmls.com/listings/index.cfm?action=dsp.results&city=${encodeURIComponent(
    city
  )}&state=NJ&county=${encodeURIComponent(
    county
  )}&getBack=home&proptype=1%2C2%2C3&openhouse=`;

  // Navigate to the constructed URL
  await page.goto(searchURL);

  let allListings = [];

  // Function to scrape listings on the current page
  async function scrapeCurrentPage() {
    // Wait for the listings to load
    await page.waitForSelector(".card.text-left.details2");

    // Extract the listings information
    const listings = await page.evaluate(() => {
      const listingElements = document.querySelectorAll(
        ".card.text-left.details2"
      );
      return Array.from(listingElements).map((listing) => {
        // Extract all image URLs
        const imageElements = listing.querySelectorAll(".owl-stage img");
        const imageUrls = Array.from(imageElements).map(
          (img) => img.src || img.dataset.src
        );

        const mlsNumberElement = listing.querySelector(".text-primary a");
        const mlsNumber = mlsNumberElement
          ? mlsNumberElement.textContent.trim()
          : null;

        const addressElement = listing.querySelector(
          'a[href^="http://maps.google.com/maps"]'
        );
        const address = addressElement
          ? addressElement.textContent.trim()
          : null;

        const priceElement = listing.querySelector("h4");
        const price = priceElement ? priceElement.textContent.trim() : null;

        return {
          imageUrls,
          mlsNumber,
          address,
          price,
        };
      });
    });

    // Add the current page listings to the main array
    allListings = allListings.concat(listings);
  }

  // Scrape the first page
  await scrapeCurrentPage();

  // Find the total number of pages
  const totalPages = await page.evaluate(() => {
    const paginationItems = document.querySelectorAll(
      "#pagelist .page-item.pagenumbers"
    );
    return paginationItems.length;
  });

  // Loop through all pages and scrape data
  for (let i = 2; i <= totalPages; i++) {
    // Click on the next page number
    await page.click(`#pagelist .page-item.pagenumbers:nth-child(${i}) a`);

    // Wait for the new page to load
    await page.waitForTimeout(2000); // Adjust if necessary

    // Scrape the current page
    await scrapeCurrentPage();
  }

  // Get the total number of results
  const totalResults = allListings.length;

  // Generate the HTML content
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Listings</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .listing { margin-bottom: 40px; }
        .listing h2 { margin-bottom: 10px; }
        .listing p { margin-bottom: 10px; }
        .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; margin-bottom: 20px; }
        .images img { width: 100%; height: auto; border-radius: 5px; }
        hr { border: 1px solid #ddd; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Listings for ${city}, ${county}</h1>
      <p>Scraped ${totalResults} results</p>
  `;

  allListings.forEach((listing) => {
    htmlContent += `
      <div class="listing">
        <h2>${listing.price}</h2>
        <p>${listing.address}</p>
        <div class="images">
          ${listing.imageUrls
            .map((url) => `<img src="${url}" alt="Listing Image">`)
            .join("")}
        </div>
        <hr/>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  // Write the HTML content to a file
  fs.writeFileSync("listings.html", htmlContent);

  console.log("HTML file created: listings.html");

  await browser.close();
})();
