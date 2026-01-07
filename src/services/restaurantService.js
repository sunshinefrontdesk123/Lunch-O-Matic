// OpenStreetMap (Overpass API) integration for Lunch Chooser

// We will fetch nodes with amenity=restaurant/fast_food/cafe

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
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

/**
 * Fetches restaurants using OpenStreetMap Overpass API.
 * @param {Object} location - { lat, lng }
 * @param {string} category - Category filter (optional, we map common ones)
 * @param {number} radius - Search radius in meters (default 8000m / ~5 miles)
 * @param {number} serverIndex - Index of the Overpass server to use
 * @returns {Promise<Array>} - List of restaurant names
 * @throws {Error} if fetch fails or no results found.
 */
export const fetchRestaurants = async (location, category, radius = 8000, serverIndex = 0) => {
  if (!location || !location.lat || !location.lng) {
    throw new Error("Location required for real data search.");
  }

  // Construct Overpass QL query
  let tags = `
    nwr["amenity"~"restaurant|fast_food|cafe"](around:${radius}, ${location.lat}, ${location.lng});
  `;

  // Simple optimization: if specific category, refine query
  if (category) {
    const catLower = category.toLowerCase();
    if (catLower === 'burgers') tags = `nwr["cuisine"="burger"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'pizza') tags = `nwr["cuisine"="pizza"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'asian') tags = `nwr["cuisine"~"asian|chinese|japanese|thai|vietnamese"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'mexican') tags = `nwr["cuisine"="mexican"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'dessert') tags = `nwr["cuisine"~"ice_cream|bakery"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'diner') tags = `nwr["cuisine"="diner"](around:${radius}, ${location.lat}, ${location.lng});`;
    else if (catLower === 'seafood') tags = `nwr["cuisine"="seafood"](around:${radius}, ${location.lat}, ${location.lng});`;
  }

  // Timeout: generous to prevent 504 on server side if possible
  const timeoutVal = 45;

  const query = `
    [out:json][timeout:${timeoutVal}];
    (
      ${tags}
    );
    out center 50; 
  `;

  const serverUrl = SERVERS[serverIndex % SERVERS.length];

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      // Smart Retry Logic for Timeouts (504) or Throttling (429)
      if (response.status === 504 || response.status === 429 || response.status === 502) {
        console.warn(`API Error ${response.status} at radius ${radius} on server ${serverIndex}. Retrying...`);

        // Strategy:
        // 1. Try same radius on backup server
        // 2. Reduce radius on primary server
        // 3. Reduce radius on backup server

        const nextServerIndex = serverIndex + 1;

        // If we haven't tried all servers yet for this radius, switch server
        if (nextServerIndex < SERVERS.length) {
          return fetchRestaurants(location, category, radius, nextServerIndex);
        }

        // Use a smaller radius if we are currently large
        if (radius > 5000) {
          return fetchRestaurants(location, category, 5000, 0); // Reset to primary server, smaller radius
        } else if (radius > 3000) {
          return fetchRestaurants(location, category, 3000, 0);
        }
      }
      throw new Error(`Overpass API Error: ${response.status} from ${serverUrl}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      // If we searched a small area and found nothing, maybe try standard radius if we started small? 
      // User might have passed small radius manually? Assume function calls follow default logic.
      if (radius < 8000) {
        // This block handles the case where we retried down to 3000m and found nothing. 
        // Nothing to do but error out.
      }
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
  "Burgers", "Pizza", "Asian", "Mexican", "Seafood", "Diner", "Dessert"
];
