import { chromium } from "playwright";
import fs from "fs";
import { city, county } from "./config.js";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Define the city and county you want to search for

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
    // Wait for the page to load and check for listings or no results message
    try {
      await page.waitForSelector(".card.text-left.details2", { timeout: 10000 });
    } catch (error) {
      // Check if there's a "no results" message or if the page structure is different
      const pageContent = await page.content();
      console.log("No listings found with expected selector. Checking page content...");
      
      // Check for common "no results" indicators
      const noResultsIndicators = [
        'no results',
        'no listings',
        'no properties',
        'not found',
        'no matches'
      ];
      
      const hasNoResults = noResultsIndicators.some(indicator => 
        pageContent.toLowerCase().includes(indicator)
      );
      
      if (hasNoResults) {
        console.log("No listings found for this location.");
        return [];
      }
      
      // Log page title and part of content for debugging
      const pageTitle = await page.title();
      console.log("Page title:", pageTitle);
      console.log("Timeout waiting for listings. This might mean:");
      console.log("1. No listings available for this location");
      console.log("2. Website structure has changed"); 
      console.log("3. Page is loading slowly");
      
      throw error;
    }

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
    return listings;
  }

  // Scrape the first page
  try {
    const firstPageListings = await scrapeCurrentPage();
    if (firstPageListings && firstPageListings.length === 0) {
      console.log("No listings found on first page. Generating empty results page.");
    }
  } catch (error) {
    console.error("Error scraping first page:", error.message);
    console.log("Generating error results page.");
    
    // Generate error HTML
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Scraping Error</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          .error { color: #d32f2f; margin: 20px 0; }
          .suggestion { color: #666; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Scraping Error</h1>
        <div class="error">No listings could be found for ${city}, ${county}</div>
        <div class="suggestion">
          This could mean:
          <ul style="text-align: left; display: inline-block;">
            <li>No properties are currently listed in this area</li>
            <li>The city/county combination might not be available</li>
            <li>The website structure may have changed</li>
          </ul>
        </div>
        <div class="suggestion">Try a different city or county combination.</div>
      </body>
      </html>
    `;
    
    fs.writeFileSync("listings.html", errorHtml);
    console.log("Error HTML file created: listings.html");
    await browser.close();
    return;
  }

  // Find the total number of pages by counting the <li> elements in the pagination
  const totalPages = await page.evaluate(() => {
    return document.querySelectorAll("#pagelist .page-item.pagenumbers").length;
  });

  // Loop through all pages and scrape data
  for (let i = 2; i <= totalPages; i++) {
    // Click on the page number link
    await page.click(`#pagelist .page-item.pagenumbers:nth-child(${i}) a`);

    // Wait for the new page to load
    await page.waitForTimeout(2000); // Adjust if necessary

    // Scrape the current page
    await scrapeCurrentPage();
  }

  // Get the total number of results
  const totalResults = allListings.length;

  // Generate the HTML content with modern design
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Real Estate Listings - ${city}, ${county}</title>
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
        }
        
        .header {
          background: white;
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        
        .header h1 {
          background: linear-gradient(45deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 2.5rem;
          font-weight: 300;
          margin-bottom: 15px;
        }
        
        .header .location {
          color: #666;
          font-size: 1.3rem;
          margin-bottom: 10px;
        }
        
        .header .results-count {
          color: #667eea;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .back-button {
          display: inline-block;
          margin-top: 15px;
          padding: 12px 25px;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          text-decoration: none;
          border-radius: 25px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .back-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .filters-container {
          background: white;
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .filter-label {
          color: #555;
          font-weight: 500;
        }
        
        .filter-select, .search-input {
          padding: 8px 12px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
        }
        
        .filter-select:focus, .search-input:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .listings-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 25px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .listing-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .listing-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .listing-images {
          position: relative;
          height: 250px;
          overflow: hidden;
          background: #f8f9fa;
        }
        
        .image-carousel {
          display: flex;
          transition: transform 0.3s ease;
          height: 100%;
        }
        
        .listing-image {
          min-width: 100%;
          height: 100%;
          object-fit: cover;
          background: #f0f0f0;
        }
        
        .image-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.3s ease;
          opacity: 0;
        }
        
        .listing-card:hover .image-nav {
          opacity: 1;
        }
        
        .image-nav:hover {
          background: rgba(0, 0, 0, 0.9);
        }
        
        .image-nav.prev {
          left: 10px;
        }
        
        .image-nav.next {
          right: 10px;
        }
        
        .image-counter {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 0.8rem;
        }
        
        .listing-content {
          padding: 25px;
        }
        
        .listing-price {
          font-size: 2rem;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .listing-address {
          color: #666;
          font-size: 1.1rem;
          line-height: 1.5;
          margin-bottom: 15px;
        }
        
        .listing-mls {
          display: inline-block;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .no-images {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
          font-size: 1.2rem;
        }
        
        .pagination-container {
          text-align: center;
          margin: 40px 0;
        }
        
        .pagination-info {
          color: white;
          margin-bottom: 20px;
          font-size: 1.1rem;
        }
        
        .pagination-controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .page-btn {
          padding: 10px 15px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .page-btn:hover, .page-btn.active {
          background: #667eea;
          color: white;
          transform: translateY(-1px);
        }
        
        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .loading-placeholder {
          display: none;
          text-align: center;
          padding: 40px;
          color: white;
          font-size: 1.2rem;
        }
        
        /* Photo Gallery Modal */
        .photo-gallery-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.95);
          z-index: 10000;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.3s ease;
        }
        
        .photo-gallery-modal.open {
          display: flex;
          flex-direction: column;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 30px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
        }
        
        .gallery-title {
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .gallery-info {
          color: #ccc;
          font-size: 1rem;
        }
        
        .close-gallery {
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          padding: 10px;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .close-gallery:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }
        
        .gallery-content {
          flex: 1;
          overflow-y: auto;
          padding: 30px;
        }
        
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .gallery-photo {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: 15px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #333;
        }
        
        .gallery-photo:hover {
          transform: scale(1.05);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        
        .gallery-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.3s ease;
        }
        
        .gallery-photo:hover img {
          transform: scale(1.1);
        }
        
        .photo-index {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        /* Lightbox for individual photo viewing */
        .photo-lightbox {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.98);
          z-index: 10001;
          backdrop-filter: blur(10px);
        }
        
        .photo-lightbox.open {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .lightbox-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 10px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 24px;
          transition: all 0.3s ease;
        }
        
        .lightbox-nav:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-50%) scale(1.1);
        }
        
        .lightbox-nav.prev {
          left: -80px;
        }
        
        .lightbox-nav.next {
          right: -80px;
        }
        
        .lightbox-close {
          position: absolute;
          top: -60px;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.3s ease;
        }
        
        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }
        
        .lightbox-counter {
          position: absolute;
          bottom: -50px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 1.1rem;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .listings-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .header h1 {
            font-size: 2rem;
          }
          
          .filters-container {
            flex-direction: column;
            align-items: stretch;
          }
          
          .pagination-controls {
            gap: 5px;
          }
          
          .page-btn {
            padding: 8px 12px;
            font-size: 0.9rem;
          }
          
          /* Mobile gallery styles */
          .photo-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            padding: 0 10px;
          }
          
          .gallery-header {
            padding: 15px 20px;
          }
          
          .gallery-title {
            font-size: 1.3rem;
          }
          
          .gallery-content {
            padding: 20px 15px;
          }
          
          .lightbox-nav {
            width: 50px;
            height: 50px;
            font-size: 20px;
          }
          
          .lightbox-nav.prev {
            left: -60px;
          }
          
          .lightbox-nav.next {
            right: -60px;
          }
          
          .lightbox-close {
            top: -50px;
            width: 45px;
            height: 45px;
            font-size: 18px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Real Estate Listings</h1>
        <div class="location">${city}, ${county}</div>
        <div class="results-count">${totalResults} Properties Found</div>
        <a href="/" class="back-button">← New Search</a>
      </div>
      
      <div class="filters-container">
        <span class="filter-label">Sort by:</span>
        <select class="filter-select" id="sortFilter">
          <option value="default">Default Order</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
        
        <span class="filter-label">Search:</span>
        <input type="text" class="search-input" id="searchInput" placeholder="Search by address...">
      </div>
      
      <div class="pagination-container">
        <div class="pagination-info" id="paginationInfo"></div>
        <div class="pagination-controls" id="paginationControls"></div>
      </div>
      
      <div class="listings-container" id="listingsContainer">
        <!-- Listings will be inserted here by JavaScript -->
      </div>
      
      <div class="pagination-container">
        <div class="pagination-controls" id="paginationControlsBottom"></div>
      </div>
      
      <div class="loading-placeholder" id="loadingPlaceholder">
        Loading more listings...
      </div>
      
      <!-- Photo Gallery Modal -->
      <div class="photo-gallery-modal" id="photoGalleryModal">
        <div class="gallery-header">
          <div>
            <div class="gallery-title" id="galleryTitle">Property Photos</div>
            <div class="gallery-info" id="galleryInfo"></div>
          </div>
          <button class="close-gallery" onclick="closePhotoGallery()">×</button>
        </div>
        <div class="gallery-content">
          <div class="photo-grid" id="photoGrid">
            <!-- Photos will be inserted here -->
          </div>
        </div>
      </div>
      
      <!-- Photo Lightbox -->
      <div class="photo-lightbox" id="photoLightbox">
        <div class="lightbox-content">
          <img class="lightbox-image" id="lightboxImage" src="" alt="Property Photo">
          <button class="lightbox-nav prev" onclick="navigateLightbox(-1)">‹</button>
          <button class="lightbox-nav next" onclick="navigateLightbox(1)">›</button>
          <button class="lightbox-close" onclick="closeLightbox()">×</button>
          <div class="lightbox-counter" id="lightboxCounter"></div>
        </div>
      </div>
  `;

  // Add JavaScript data and functionality
  htmlContent += `
      <script>
        // Listings data
        const listingsData = ${JSON.stringify(allListings)};
        const itemsPerPage = 12;
        let currentPage = 1;
        let filteredListings = [...listingsData];
        let currentGalleryImages = [];
        let currentLightboxIndex = 0;
        
        // Price parsing function
        function parsePrice(priceString) {
          if (!priceString) return 0;
          const cleanPrice = priceString.replace(/[^0-9]/g, '');
          return parseInt(cleanPrice) || 0;
        }
        
        // Sort functions
        function sortListings(criteria) {
          switch(criteria) {
            case 'price-low':
              filteredListings.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
              break;
            case 'price-high':
              filteredListings.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
              break;
            default:
              filteredListings = [...listingsData];
          }
          currentPage = 1;
          updateDisplay();
        }
        
        // Search function
        function searchListings(query) {
          if (!query.trim()) {
            filteredListings = [...listingsData];
          } else {
            filteredListings = listingsData.filter(listing => 
              listing.address && listing.address.toLowerCase().includes(query.toLowerCase())
            );
          }
          currentPage = 1;
          updateDisplay();
        }
        
        // Create listing card HTML
        function createListingCard(listing, index) {
          const images = listing.imageUrls && listing.imageUrls.length > 0 ? 
            listing.imageUrls.filter(url => url && url.trim() !== '') : [];
          
          const imageSection = images.length > 0 ? \`
            <div class="listing-images">
              <div class="image-carousel" id="carousel-\${index}">
                \${images.map(url => \`<img src="\${url}" alt="Property Image" class="listing-image" loading="lazy">\`).join('')}
              </div>
              \${images.length > 1 ? \`
                <button class="image-nav prev" onclick="navigateImage(\${index}, -1)">‹</button>
                <button class="image-nav next" onclick="navigateImage(\${index}, 1)">›</button>
                <div class="image-counter">
                  <span id="counter-\${index}">1</span> / \${images.length}
                </div>
              \` : ''}
            </div>
          \` : \`
            <div class="listing-images">
              <div class="no-images">No Images Available</div>
            </div>
          \`;
          
          return \`
            <div class="listing-card" data-index="\${index}" onclick="openPhotoGallery(\${index})">
              \${imageSection}
              <div class="listing-content">
                <div class="listing-price">\${listing.price || 'Price not available'}</div>
                <div class="listing-address">\${listing.address || 'Address not available'}</div>
                \${listing.mlsNumber ? \`<div class="listing-mls">MLS: \${listing.mlsNumber}</div>\` : ''}
              </div>
            </div>
          \`;
        }
        
        // Image navigation
        window.navigateImage = function(listingIndex, direction) {
          event.stopPropagation(); // Prevent opening the gallery
          const carousel = document.getElementById(\`carousel-\${listingIndex}\`);
          const counter = document.getElementById(\`counter-\${listingIndex}\`);
          const listing = filteredListings[listingIndex];
          const imageCount = listing.imageUrls.filter(url => url && url.trim() !== '').length;
          
          if (!carousel.currentIndex) carousel.currentIndex = 0;
          
          carousel.currentIndex += direction;
          if (carousel.currentIndex < 0) carousel.currentIndex = imageCount - 1;
          if (carousel.currentIndex >= imageCount) carousel.currentIndex = 0;
          
          carousel.style.transform = \`translateX(-\${carousel.currentIndex * 100}%)\`;
          counter.textContent = carousel.currentIndex + 1;
        };
        
        // Update pagination
        function updatePagination() {
          const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
          const paginationInfo = document.getElementById('paginationInfo');
          const paginationControls = document.getElementById('paginationControls');
          const paginationControlsBottom = document.getElementById('paginationControlsBottom');
          
          const startItem = (currentPage - 1) * itemsPerPage + 1;
          const endItem = Math.min(currentPage * itemsPerPage, filteredListings.length);
          
          paginationInfo.innerHTML = \`Showing \${startItem}-\${endItem} of \${filteredListings.length} properties\`;
          
          const paginationHTML = \`
            <button class="page-btn" onclick="changePage(1)" \${currentPage === 1 ? 'disabled' : ''}>First</button>
            <button class="page-btn" onclick="changePage(\${currentPage - 1})" \${currentPage === 1 ? 'disabled' : ''}>Previous</button>
            \${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return \`<button class="page-btn \${page === currentPage ? 'active' : ''}" onclick="changePage(\${page})">\${page}</button>\`;
            }).join('')}
            <button class="page-btn" onclick="changePage(\${currentPage + 1})" \${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            <button class="page-btn" onclick="changePage(\${totalPages})" \${currentPage === totalPages ? 'disabled' : ''}>Last</button>
          \`;
          
          paginationControls.innerHTML = paginationHTML;
          paginationControlsBottom.innerHTML = paginationHTML;
        }
        
        // Change page
        window.changePage = function(page) {
          const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
          if (page >= 1 && page <= totalPages) {
            currentPage = page;
            updateDisplay();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        };
        
        // Update display
        function updateDisplay() {
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const currentListings = filteredListings.slice(startIndex, endIndex);
          
          const container = document.getElementById('listingsContainer');
          container.innerHTML = currentListings.map((listing, index) => 
            createListingCard(listing, startIndex + index)
          ).join('');
          
          updatePagination();
        }
        
        // Photo Gallery Functions
        window.openPhotoGallery = function(listingIndex) {
          event.stopPropagation();
          const listing = filteredListings[listingIndex];
          const images = listing.imageUrls && listing.imageUrls.length > 0 ? 
            listing.imageUrls.filter(url => url && url.trim() !== '') : [];
          
          if (images.length === 0) {
            alert('No photos available for this listing');
            return;
          }
          
          currentGalleryImages = images;
          
          // Update gallery header
          document.getElementById('galleryTitle').textContent = \`Property Photos\`;
          document.getElementById('galleryInfo').textContent = \`\${listing.address || 'Address not available'} • \${images.length} photos\`;
          
          // Create photo grid
          const photoGrid = document.getElementById('photoGrid');
          photoGrid.innerHTML = images.map((imageUrl, index) => \`
            <div class="gallery-photo" onclick="openLightbox(\${index})">
              <img src="\${imageUrl}" alt="Property Photo \${index + 1}" loading="lazy">
              <div class="photo-index">\${index + 1}</div>
            </div>
          \`).join('');
          
          // Show modal
          document.getElementById('photoGalleryModal').classList.add('open');
          document.body.style.overflow = 'hidden';
        };
        
        window.closePhotoGallery = function() {
          document.getElementById('photoGalleryModal').classList.remove('open');
          document.body.style.overflow = 'auto';
        };
        
        // Lightbox Functions
        window.openLightbox = function(imageIndex) {
          event.stopPropagation();
          currentLightboxIndex = imageIndex;
          updateLightbox();
          document.getElementById('photoLightbox').classList.add('open');
        };
        
        window.closeLightbox = function() {
          document.getElementById('photoLightbox').classList.remove('open');
        };
        
        window.navigateLightbox = function(direction) {
          currentLightboxIndex += direction;
          if (currentLightboxIndex < 0) currentLightboxIndex = currentGalleryImages.length - 1;
          if (currentLightboxIndex >= currentGalleryImages.length) currentLightboxIndex = 0;
          updateLightbox();
        };
        
        function updateLightbox() {
          const lightboxImage = document.getElementById('lightboxImage');
          const lightboxCounter = document.getElementById('lightboxCounter');
          
          lightboxImage.src = currentGalleryImages[currentLightboxIndex];
          lightboxCounter.textContent = \`\${currentLightboxIndex + 1} of \${currentGalleryImages.length}\`;
        }
        
        // Keyboard event handlers
        document.addEventListener('keydown', function(event) {
          const galleryModal = document.getElementById('photoGalleryModal');
          const lightboxModal = document.getElementById('photoLightbox');
          
          if (event.key === 'Escape') {
            if (lightboxModal.classList.contains('open')) {
              closeLightbox();
            } else if (galleryModal.classList.contains('open')) {
              closePhotoGallery();
            }
          }
          
          if (lightboxModal.classList.contains('open')) {
            if (event.key === 'ArrowLeft') {
              navigateLightbox(-1);
            } else if (event.key === 'ArrowRight') {
              navigateLightbox(1);
            }
          }
        });
        
        // Prevent image navigation clicks from triggering gallery open
        window.addEventListener('click', function(event) {
          if (event.target.classList.contains('image-nav')) {
            event.stopPropagation();
          }
        });
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
          updateDisplay();
          
          // Event listeners
          document.getElementById('sortFilter').addEventListener('change', function() {
            sortListings(this.value);
          });
          
          let searchTimeout;
          document.getElementById('searchInput').addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => searchListings(this.value), 300);
          });
        });
      </script>
    </body>
    </html>
  `;

  // Write the HTML content to a file
  fs.writeFileSync("listings.html", htmlContent);

  console.log("HTML file created: listings.html");

  await browser.close();
})();
