document.getElementById("scrape-form").addEventListener("submit", function () {
  document.getElementById("loading").style.display = "block";
});

// Load the city and county data from the JSON file
fetch("/nj_city_county.json")
  .then((response) => response.json())
  .then((data) => {
    window.citiesByCounty = data; // Store the data globally for use
    console.log("Loaded city and county data:", window.citiesByCounty);
  })
  .catch((error) =>
    console.error("Error loading city and county data:", error)
  );

function updateCities() {
  const countySelect = document.getElementById("county");
  const citySelect = document.getElementById("city");
  const selectedCounty = countySelect.value;

  // Clear the existing options in the city select
  citySelect.innerHTML =
    '<option value="" disabled selected>Select City</option>';

  // Populate city select based on selected county and sort alphabetically
  if (window.citiesByCounty[selectedCounty]) {
    const sortedCities = window.citiesByCounty[selectedCounty].sort();
    sortedCities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.text = city;
      citySelect.appendChild(option);
    });
  }
}
