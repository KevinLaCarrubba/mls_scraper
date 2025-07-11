# NJMLS Scraper

This is a Node.js-based web scraper that collects real estate listing data from the NJMLS website based on the specified city and county. The scraper gathers information such as the listing price, address, and images, and generates an HTML file (`listings.html`) that displays the collected data.

## Requirements

- Node.js (version 14 or later)
- npm (Node Package Manager)

## Installation

1. Clone the repository:

   ```bash
   git clone <your-repository-url>
   cd <your-repository-directory>
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

## Usage

To run the scraper, follow these steps:

1. Start the web server:

   ```bash
   node server.js
   ```

2. Open your web browser and navigate to:

   ```
   http://localhost:3000
   ```

3. On the web interface:
   - Select your desired **County** from the dropdown menu
   - Select your desired **City** from the dropdown menu (cities will populate based on your county selection)
   - Click **"Start Scraping"** to begin the process

4. Wait for the scraping process to complete. A loading indicator will show progress.

5. Once complete, click **"View Listings"** to see the scraped real estate data in your browser.

The web interface provides an easy way to select from available New Jersey counties and cities without manually editing configuration files.

## Output

The scraper generates an HTML file (`listings.html`) that includes:

- **Total Results**: The number of listings scraped from the NJMLS website.
- **Price**: The price of each listing.
- **Address**: The address of each listing.
- **Images**: A grid of images associated with each listing.

## Troubleshooting

- Ensure that the city and county names are spelled correctly and match the format used on the NJMLS website.
- If the script fails to find listings, it may be due to the lack of available listings for the specified location.

## License

This project is licensed under the MIT License.
