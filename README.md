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

1. Open the `scraper.js` file in a text editor.

2. Locate the following lines near the beginning of the file:

   ```javascript
   const city = 'Cliffside Park'; // Change this to the desired city
   const county = 'BERGEN';       // Change this to the desired county
   ```

3. Modify the `city` and `county` variables to reflect the location you want to scrape. For example:

   ```javascript
   const city = 'Hoboken';
   const county = 'HUDSON';
   ```

4. Save the `scraper.js` file.

5. Run the scraper using the following command:

   ```bash
   node scraper.js
   ```

6. After the script completes, it will generate a file named `listings.html` in the project directory.

7. Open the `listings.html` file in your web browser to view the collected data.

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
