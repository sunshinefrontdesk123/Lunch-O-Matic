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
export const fetchRestaurants = async (location, category, radius = 16000) => {
  if (!location || !location.lat || !location.lng) {
    throw new Error("Location required for real data search.");
  }

  // Construct Overpass QL query
  // radius defaults to 16000 (10 miles), retries will pass smaller values.

  let tags = `
    nwr["amenity"~"restaurant|fast_food|cafe"](around:${radius}, ${location.lat}, ${location.lng});
  `;

  // Simple optimization: if specific category, refine query?
  if (category) {
    const catLower = category.toLowerCase();
    if (catLower === 'burgers') tags = `nwr["cuisine"="burger"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'pizza') tags = `nwr["cuisine"="pizza"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'asian') tags = `nwr["cuisine"~"asian|chinese|japanese|thai|vietnamese"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'mexican') tags = `nwr["cuisine"="mexican"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'dessert') tags = `nwr["cuisine"~"ice_cream|bakery"](around:${radius}, ${location.lat}, ${location.lng});`;
  }

  // Timeout: If radius is large, give more time. If small retry, fail fast.
  const timeoutVal = radius > 5000 ? 60 : 25;

  const query = `
    [out:json][timeout:${timeoutVal}];
    (
      ${tags}
    );
    out center 50; 
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      // Smart Retry Logic for Timeouts (504) or Throttling (429)
      if (response.status === 504 || response.status === 429) {
        console.warn(`API Error ${response.status} at radius ${radius}. Retrying with smaller radius...`);

        if (radius > 5000) {
          // Retry with ~3 miles (5000m)
          return fetchRestaurants(location, category, 5000);
        } else if (radius > 3000) {
          // Last ditch retry with ~1.8 miles (3000m)
          return fetchRestaurants(location, category, 3000);
        }
      }
      throw new Error(`Overpass API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      // If no results and we are searching a small area, maybe we shouldn't fail hard?
      // But for now, let's just throw.
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
    throw err;
  }
};

export const getCategories = () => [
  "Burgers", "Pizza", "Asian", "Mexican", "Diner", "Dessert"
];
