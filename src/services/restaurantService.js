// OpenStreetMap (Overpass API) integration for Lunch Chooser

// We will fetch nodes with amenity=restaurant/fast_food/cafe
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Helper to calculate bounding box (roughly) for 10 miles (approx 16km)
// 1 deg lat ~= 69 miles. 10 miles ~= 0.145 degrees.
// 1 deg lng ~= 69 miles * cos(lat).
const RADIUS_DEGREES = 0.15;

/**
 * Fetches restaurants using OpenStreetMap Overpass API.
 * @param {Object} location - { lat, lng }
 * @param {string} category - Category filter (optional, we map common ones)
 * @returns {Promise<Array>} - List of restaurant names
 * @throws {Error} if fetch fails or no results found.
 */
export const fetchRestaurants = async (location, category) => {
  if (!location || !location.lat || !location.lng) {
    throw new Error("Location required for real data search.");
  }

  // Construct Overpass QL query
  // We search nicely inside a box to be faster than "around" on huge datasets, 
  // but "around" is simpler for a radius. Let's use "around".
  // 16000 meters ~ 10 miles.

  // Mapping categories to OSM tags if possible
  // Common: amenity=restaurant, amenity=fast_food, amenity=cafe
  // If category is "Pizza", we could add [cuisine=pizza].

  let tags = `
    nwr["amenity"~"restaurant|fast_food|cafe"](around:16000, ${location.lat}, ${location.lng});
  `;

  // Simple optimization: if specific category, refine query?
  // OSM `cuisine` tag is messy. Let's precise key mappings:
  if (category) {
    const catLower = category.toLowerCase();
    if (catLower === 'burgers') tags = `nwr["cuisine"="burger"](around:16000, ${location.lat}, ${location.lng});`;
    else if (catLower === 'pizza') tags = `nwr["cuisine"="pizza"](around:16000, ${location.lat}, ${location.lng});`;
    else if (catLower === 'asian') tags = `nwr["cuisine"~"asian|chinese|japanese|thai|vietnamese"](around:16000, ${location.lat}, ${location.lng});`;
    else if (catLower === 'mexican') tags = `nwr["cuisine"="mexican"](around:16000, ${location.lat}, ${location.lng});`;
    else if (catLower === 'dessert') tags = `nwr["cuisine"~"ice_cream|bakery"](around:16000, ${location.lat}, ${location.lng});`;
    // For "Diner", it's hard. Default to generic restaurant.
  }

  const query = `
    [out:json][timeout:60];
    (
      ${tags}
    );
    out center 50; 
  `;
  // Limit to 50 results to keep the slot machine reel manageable.

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      throw new Error("No places found nearby! Try a different category?");
    }

    // Extract names, filtering out those without names
    const names = data.elements
      .filter(el => el.tags && el.tags.name)
      .map(el => el.tags.name);

    if (names.length === 0) {
      throw new Error("Found places but they have no names. Spooky.");
    }

    // Remove duplicates
    return [...new Set(names)];

  } catch (err) {
    console.error("Fetch failed:", err);
    throw err; // Propagate error to App.jsx to show user message
  }
};

export const getCategories = () => [
  "Burgers", "Pizza", "Asian", "Mexican", "Diner", "Dessert"
];
