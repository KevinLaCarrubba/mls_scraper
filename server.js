import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const port = 3000;

// Serve static files (e.g., JavaScript, JSON)
app.use(express.static(path.join(process.cwd(), "public")));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve the form page with dynamic counties
app.get("/", (req, res) => {
  const cityCountyData = JSON.parse(
    fs.readFileSync("nj_city_county.json", "utf-8")
  );
  const counties = Object.keys(cityCountyData).sort(); // Alphabetize the counties

  const countyOptions = counties
    .map((county) => `<option value="${county}">${county}</option>`)
    .join("");

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NJMLS Scraper</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .loading-icon {
          display: none;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>NJMLS Scraper</h1>
      <form id="scrape-form" action="/scrape" method="post">
        <div class="form-group">
          <label for="county">County:</label><br>
          <select id="county" name="county" required onchange="updateCities()">
            <option value="" disabled selected>Select County</option>
            ${countyOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="city">City:</label><br>
          <select id="city" name="city" required>
            <option value="" disabled selected>Select City</option>
            <!-- Cities will be dynamically loaded based on selected county -->
          </select>
        </div>
        <input type="submit" value="Start Scraping">
      </form>
      <div id="loading" class="loading-icon">
        <img src="/loading.gif" alt="Loading..." />
      </div>
      <script src="/script.js"></script>
    </body>
    </html>
  `);
});

// Handle form submission and run the scraper
app.post("/scrape", (req, res) => {
  const city = req.body.city;
  const county = req.body.county;

  // Update the config.js file with the new city and county
  const configContent = `
    const city = '${city}';
    const county = '${county}';
    export { city, county };
  `;
  fs.writeFileSync("config.js", configContent);

  // Run the scraper
  exec("node scraper.js", (error, stdout, stderr) => {
    if (error) {
      res.send(`<p>Error: ${error.message}</p>`);
      return;
    }
    if (stderr) {
      res.send(`<p>Error: ${stderr}</p>`);
      return;
    }
    res.send(
      `<p>Scraping complete! <a href="/listings.html">View Listings</a></p>`
    );
  });
});

// Serve the generated HTML file
app.get("/listings.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "listings.html"));
});

// Serve the city and county JSON data
app.get("/nj_city_county.json", (req, res) => {
  res.sendFile(path.join(process.cwd(), "nj_city_county.json"));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
