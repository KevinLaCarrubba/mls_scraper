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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        
        h1 {
          color: #333;
          margin-bottom: 30px;
          font-size: 2.5rem;
          font-weight: 300;
          background: linear-gradient(45deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .form-group {
          margin-bottom: 25px;
          text-align: left;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
          font-size: 1.1rem;
        }
        
        select {
          width: 100%;
          padding: 15px;
          border: 2px solid #e1e5e9;
          border-radius: 12px;
          font-size: 1rem;
          background: white;
          color: #333;
          transition: all 0.3s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23666' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 15px center;
          background-size: 12px;
        }
        
        select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        select:disabled {
          background-color: #f8f9fa;
          color: #999;
          cursor: not-allowed;
        }
        
        .submit-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 10px;
        }
        
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .submit-btn:active {
          transform: translateY(0);
        }
        
        .loading-container {
          display: none;
          margin-top: 30px;
          text-align: center;
        }
        
        .loading-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 15px;
        }
        
        .loading-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .loading-text {
          color: #667eea;
          font-size: 1.1rem;
          font-weight: 500;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 1.1rem;
          line-height: 1.6;
        }
        
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            padding: 30px 20px;
          }
          
          h1 {
            font-size: 2rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>NJMLS Scraper</h1>
        <p class="subtitle">Select a New Jersey county and city to scrape real estate listings</p>
        
        <form id="scrape-form" action="/scrape" method="post">
          <div class="form-group">
            <label for="county">County</label>
            <select id="county" name="county" required onchange="updateCities()">
              <option value="" disabled selected>Select a county</option>
              ${countyOptions}
            </select>
          </div>
          
          <div class="form-group">
            <label for="city">City</label>
            <select id="city" name="city" required>
              <option value="" disabled selected>Select a city</option>
              <!-- Cities will be dynamically loaded based on selected county -->
            </select>
          </div>
          
          <button type="submit" class="submit-btn">Start Scraping</button>
        </form>
        
        <div id="loading" class="loading-container">
          <div class="loading-icon">
            <img src="/loading.gif" alt="Loading..." />
          </div>
          <div class="loading-text">Scraping listings, please wait...</div>
        </div>
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
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scraping Complete - NJMLS Scraper</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          
          .success-icon {
            font-size: 4rem;
            color: #28a745;
            margin-bottom: 20px;
          }
          
          h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2rem;
            font-weight: 300;
          }
          
          .view-btn {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 10px;
          }
          
          .view-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }
          
          .back-btn {
            display: inline-block;
            padding: 15px 30px;
            background: #6c757d;
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 10px;
          }
          
          .back-btn:hover {
            background: #5a6268;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Scraping Complete!</h1>
          <p style="margin-bottom: 30px; color: #666; font-size: 1.1rem;">
            Your real estate listings have been successfully scraped and are ready to view.
          </p>
          <a href="/listings.html" class="view-btn">View Listings</a>
          <a href="/" class="back-btn">Start New Search</a>
        </div>
      </body>
      </html>
    `);
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
