// Country coordinates (latitude, longitude) for major territories
// Used to place markers on the globe
export const COUNTRY_COORDINATES = {
  // North America
  US: { lat: 37.0902, lng: -95.7129, name: 'United States' },
  CA: { lat: 56.1304, lng: -106.3468, name: 'Canada' },
  MX: { lat: 23.6345, lng: -102.5528, name: 'Mexico' },

  // Europe
  GB: { lat: 55.3781, lng: -3.436, name: 'United Kingdom' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  FR: { lat: 46.2276, lng: 2.2137, name: 'France' },
  IT: { lat: 41.8719, lng: 12.5674, name: 'Italy' },
  ES: { lat: 40.4637, lng: -3.7492, name: 'Spain' },
  NL: { lat: 52.1326, lng: 5.2913, name: 'Netherlands' },
  SE: { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
  NO: { lat: 60.472, lng: 8.4689, name: 'Norway' },
  DK: { lat: 56.2639, lng: 9.5018, name: 'Denmark' },
  FI: { lat: 61.9241, lng: 25.7482, name: 'Finland' },
  PL: { lat: 51.9194, lng: 19.1451, name: 'Poland' },
  BE: { lat: 50.5039, lng: 4.4699, name: 'Belgium' },
  AT: { lat: 47.5162, lng: 14.5501, name: 'Austria' },
  CH: { lat: 46.8182, lng: 8.2275, name: 'Switzerland' },
  PT: { lat: 39.3999, lng: -8.2245, name: 'Portugal' },
  IE: { lat: 53.4129, lng: -8.2439, name: 'Ireland' },
  GR: { lat: 39.0742, lng: 21.8243, name: 'Greece' },

  // Asia
  JP: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  KR: { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
  CN: { lat: 35.8617, lng: 104.1954, name: 'China' },
  IN: { lat: 20.5937, lng: 78.9629, name: 'India' },
  SG: { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  TH: { lat: 15.87, lng: 100.9925, name: 'Thailand' },
  MY: { lat: 4.2105, lng: 101.9758, name: 'Malaysia' },
  ID: { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  PH: { lat: 12.8797, lng: 121.774, name: 'Philippines' },
  VN: { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  TW: { lat: 23.6978, lng: 120.9605, name: 'Taiwan' },
  HK: { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },

  // Oceania
  AU: { lat: -25.2744, lng: 133.7751, name: 'Australia' },
  NZ: { lat: -40.9006, lng: 174.886, name: 'New Zealand' },

  // South America
  BR: { lat: -14.235, lng: -51.9253, name: 'Brazil' },
  AR: { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  CL: { lat: -35.6751, lng: -71.543, name: 'Chile' },
  CO: { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  PE: { lat: -9.19, lng: -75.0152, name: 'Peru' },

  // Middle East
  AE: { lat: 23.4241, lng: 53.8478, name: 'United Arab Emirates' },
  SA: { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  IL: { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  TR: { lat: 38.9637, lng: 35.2433, name: 'Turkey' },

  // Africa
  ZA: { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
  NG: { lat: 9.082, lng: 8.6753, name: 'Nigeria' },
  EG: { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  KE: { lat: -0.0236, lng: 37.9062, name: 'Kenya' },

  // Eastern Europe
  RU: { lat: 61.524, lng: 105.3188, name: 'Russia' },
  UA: { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
  CZ: { lat: 49.8175, lng: 15.473, name: 'Czech Republic' },
  HU: { lat: 47.1625, lng: 19.5033, name: 'Hungary' },
  RO: { lat: 45.9432, lng: 24.9668, name: 'Romania' },

  // 3-letter ISO codes (Alpha-3) - aliases to 2-letter codes
  USA: { lat: 37.0902, lng: -95.7129, name: 'United States' },
  CAN: { lat: 56.1304, lng: -106.3468, name: 'Canada' },
  MEX: { lat: 23.6345, lng: -102.5528, name: 'Mexico' },
  GBR: { lat: 55.3781, lng: -3.436, name: 'United Kingdom' },
  DEU: { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  FRA: { lat: 46.2276, lng: 2.2137, name: 'France' },
  ITA: { lat: 41.8719, lng: 12.5674, name: 'Italy' },
  ESP: { lat: 40.4637, lng: -3.7492, name: 'Spain' },
  NLD: { lat: 52.1326, lng: 5.2913, name: 'Netherlands' },
  SWE: { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
  NOR: { lat: 60.472, lng: 8.4689, name: 'Norway' },
  DNK: { lat: 56.2639, lng: 9.5018, name: 'Denmark' },
  FIN: { lat: 61.9241, lng: 25.7482, name: 'Finland' },
  POL: { lat: 51.9194, lng: 19.1451, name: 'Poland' },
  BEL: { lat: 50.5039, lng: 4.4699, name: 'Belgium' },
  AUT: { lat: 47.5162, lng: 14.5501, name: 'Austria' },
  CHE: { lat: 46.8182, lng: 8.2275, name: 'Switzerland' },
  PRT: { lat: 39.3999, lng: -8.2245, name: 'Portugal' },
  IRL: { lat: 53.4129, lng: -8.2439, name: 'Ireland' },
  GRC: { lat: 39.0742, lng: 21.8243, name: 'Greece' },
  JPN: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  KOR: { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
  CHN: { lat: 35.8617, lng: 104.1954, name: 'China' },
  IND: { lat: 20.5937, lng: 78.9629, name: 'India' },
  SGP: { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  THA: { lat: 15.87, lng: 100.9925, name: 'Thailand' },
  MYS: { lat: 4.2105, lng: 101.9758, name: 'Malaysia' },
  IDN: { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  PHL: { lat: 12.8797, lng: 121.774, name: 'Philippines' },
  VNM: { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  TWN: { lat: 23.6978, lng: 120.9605, name: 'Taiwan' },
  HKG: { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  AUS: { lat: -25.2744, lng: 133.7751, name: 'Australia' },
  NZL: { lat: -40.9006, lng: 174.886, name: 'New Zealand' },
  BRA: { lat: -14.235, lng: -51.9253, name: 'Brazil' },
  ARG: { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  CHL: { lat: -35.6751, lng: -71.543, name: 'Chile' },
  COL: { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  PER: { lat: -9.19, lng: -75.0152, name: 'Peru' },
  ARE: { lat: 23.4241, lng: 53.8478, name: 'United Arab Emirates' },
  SAU: { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  ISR: { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  TUR: { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
  ZAF: { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
  NGA: { lat: 9.082, lng: 8.6753, name: 'Nigeria' },
  EGY: { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  KEN: { lat: -0.0236, lng: 37.9062, name: 'Kenya' },
  RUS: { lat: 61.524, lng: 105.3188, name: 'Russia' },
  UKR: { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
  CZE: { lat: 49.8175, lng: 15.473, name: 'Czech Republic' },
  HUN: { lat: 47.1625, lng: 19.5033, name: 'Hungary' },
  ROU: { lat: 45.9432, lng: 24.9668, name: 'Romania' },
};

// Map 3-letter ISO codes (Alpha-3) to 2-letter ISO codes (Alpha-2)
// Used to normalize territory codes so US and USA are treated as the same country
export const ALPHA3_TO_ALPHA2 = {
  USA: 'US',
  CAN: 'CA',
  MEX: 'MX',
  GBR: 'GB',
  DEU: 'DE',
  FRA: 'FR',
  ITA: 'IT',
  ESP: 'ES',
  NLD: 'NL',
  SWE: 'SE',
  NOR: 'NO',
  DNK: 'DK',
  FIN: 'FI',
  POL: 'PL',
  BEL: 'BE',
  AUT: 'AT',
  CHE: 'CH',
  PRT: 'PT',
  IRL: 'IE',
  GRC: 'GR',
  JPN: 'JP',
  KOR: 'KR',
  CHN: 'CN',
  IND: 'IN',
  SGP: 'SG',
  THA: 'TH',
  MYS: 'MY',
  IDN: 'ID',
  PHL: 'PH',
  VNM: 'VN',
  TWN: 'TW',
  HKG: 'HK',
  AUS: 'AU',
  NZL: 'NZ',
  BRA: 'BR',
  ARG: 'AR',
  CHL: 'CL',
  COL: 'CO',
  PER: 'PE',
  ARE: 'AE',
  SAU: 'SA',
  ISR: 'IL',
  TUR: 'TR',
  ZAF: 'ZA',
  NGA: 'NG',
  EGY: 'EG',
  KEN: 'KE',
  RUS: 'RU',
  UKR: 'UA',
  CZE: 'CZ',
  HUN: 'HU',
  ROU: 'RO',
};

// Normalize a territory code to its 2-letter ISO form
export const normalizeTerritory = (code) => {
  if (!code) return code;
  const upper = code.toUpperCase();
  return ALPHA3_TO_ALPHA2[upper] || upper;
};

// Convert latitude and longitude to phi and theta for cobe
// Cobe uses spherical coordinates where:
// - phi is the longitude (horizontal rotation) in radians
// - theta is the latitude (vertical rotation) in radians
export const latLngToPhiTheta = (lat, lng) => {
  // Convert degrees to radians
  const phi = ((lng + 180) * Math.PI) / 180; // Longitude to phi
  const theta = ((90 - lat) * Math.PI) / 180; // Latitude to theta (inverted)

  return { phi, theta };
};

// Get coordinates for a country code
export const getCountryCoordinates = (countryCode) => {
  const country = COUNTRY_COORDINATES[countryCode.toUpperCase()];
  if (!country) {
    console.warn(`No coordinates found for country code: ${countryCode}`);
    return null;
  }
  return country;
};

// Convert country coordinates to globe marker format
export const countryToMarker = (countryCode, size = 0.05) => {
  const country = getCountryCoordinates(countryCode);
  if (!country) return null;

  const { lat, lng } = country;
  const { phi, theta } = latLngToPhiTheta(lat, lng);

  return {
    location: [lat, lng],
    size: size,
  };
};

// Generate markers from revenue data with intensity based on revenue amount
// Returns markers grouped by revenue intensity tiers for color-coded visualization
export const generateRevenueMarkers = (revenueByTerritory, maxMarkers = 20) => {
  if (!revenueByTerritory || revenueByTerritory.length === 0) {
    return {
      high: [],
      medium: [],
      low: [],
    };
  }

  // Get top territories by revenue
  const topTerritories = revenueByTerritory.slice(0, maxMarkers);

  // Find max revenue for normalization
  const maxRevenue = topTerritories[0]?.amount || 1;

  // Separate into tiers
  const high = [];
  const medium = [];
  const low = [];

  topTerritories.forEach((territory) => {
    const country = getCountryCoordinates(territory.code);
    if (!country) return;

    // Normalize revenue to ratio (0-1)
    const revenueRatio = territory.amount / maxRevenue;

    // Size based on revenue (larger = more revenue)
    // Ensure ALL markers are clearly visible with larger sizes
    const size = 0.15 + revenueRatio * 0.25; // Scale from 0.15 to 0.4 (much larger!)

    const marker = {
      location: [country.lat, country.lng],
      size: size,
    };

    // Group by revenue tiers - adjusted thresholds to ensure all territories are visible
    if (revenueRatio >= 0.4) {
      high.push(marker); // Top tier: bright red (top 40%)
    } else if (revenueRatio >= 0.15) {
      medium.push(marker); // Mid tier: medium red (15-40%)
    } else {
      low.push(marker); // Low tier: dim red but still visible (0-15%)
    }
  });

  return { high, medium, low };
};
