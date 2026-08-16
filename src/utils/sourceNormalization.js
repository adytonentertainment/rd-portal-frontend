/**
 * Source Name Normalization for Revenue by Source
 *
 * Publisher/sub-publisher statements often have extremely granular source names
 * like "Aresa France (Pan-European Licensing)", "Aresa Norway (Pan-European Licensing)" etc.
 * This normalizes them to parent company level for meaningful aggregation.
 */

/**
 * Known company prefixes and their canonical display names.
 * Order matters - more specific patterns should come first.
 */
const COMPANY_MAPPINGS = [
  // Pan-European sub-publisher variants
  { pattern: /^ice\s+aresa/i, name: 'ICE/Aresa' },
  { pattern: /^aresa\s/i, name: 'Aresa' },

  // MLC collections from specific DSPs (e.g. "Spotify - MLC", "Apple - MLC")
  { pattern: /^(.+?)\s*-\s*MLC$/i, extract: true },

  // BMG regional entities
  { pattern: /^bmg\s/i, name: 'BMG' },

  // Mint Digital Services regional
  { pattern: /^mint\s+digital/i, name: 'Mint Digital Services' },

  // YouTube variants
  { pattern: /^youtube/i, name: 'YouTube' },
  { pattern: /^youtube\s+shorts/i, name: 'YouTube' },
  { pattern: /^youtube\s+premium/i, name: 'YouTube' },

  // HFA variants
  { pattern: /^hfa\s/i, name: 'HFA' },
];

/**
 * Parenthetical suffixes to strip from source names.
 */
const PARENTHETICAL_PATTERNS = [
  /\s*\(Pan-Europ(?:ean)?\s+Licens(?:ing|g)\)\s*$/i,
  /\s*\(Pan-Europ\s+Lcsg?\)\s*$/i,
  /\s*Pan-Europ(?:ean)?\s+Licensing\s*$/i,
];

/**
 * Normalize a source name to its parent company for display aggregation.
 *
 * Examples:
 *   "Aresa France (Pan-European Licensing)" → "Aresa"
 *   "Aresa Norway (Pan-European Licensing)" → "Aresa"
 *   "ICE Aresa UK (Pan-European Licensing)" → "ICE/Aresa"
 *   "Amazon - MLC" → "Amazon"
 *   "Spotify - MLC" → "Spotify"
 *   "BMG RM Australia PTY LTD" → "BMG"
 *   "BMG RM Canada" → "BMG"
 *   "Mint Digital Services India" → "Mint Digital Services"
 *   "BMI" → "BMI" (unchanged - already clean)
 *   "ASCAP" → "ASCAP" (unchanged)
 *
 * @param {string} sourceName - The raw source name from the transaction
 * @returns {string} Normalized company-level source name
 */
export function normalizeSourceName(sourceName) {
  if (!sourceName || typeof sourceName !== 'string') return sourceName || 'Unknown';

  let cleaned = sourceName.trim();

  // Try known company mappings first
  for (const mapping of COMPANY_MAPPINGS) {
    if (mapping.extract) {
      // Extract group from pattern (e.g., "Spotify - MLC" → "Spotify")
      const match = cleaned.match(mapping.pattern);
      if (match) {
        return match[1].trim();
      }
    } else if (mapping.pattern.test(cleaned)) {
      return mapping.name;
    }
  }

  // Strip parenthetical suffixes
  for (const pattern of PARENTHETICAL_PATTERNS) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim();
      // After stripping parenthetical, also strip country names that may remain
      // e.g., "Aresa France" → we want "Aresa"
      // Try matching against known company prefixes again
      for (const mapping of COMPANY_MAPPINGS) {
        if (!mapping.extract && mapping.pattern.test(cleaned)) {
          return mapping.name;
        }
      }
      // If no company match, return the cleaned version
      return cleaned;
    }
  }

  // Return as-is if no normalization needed
  return cleaned;
}
