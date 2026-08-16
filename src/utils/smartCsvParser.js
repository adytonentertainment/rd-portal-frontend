/**
 * Smart CSV Parser for Revenue Statements
 * Intelligently detects and parses various CSV formats
 */

import { detectStatementProfile, AUTO_APPLY } from './statementProfiles.js';
import { COUNTRY_COORDINATES } from './countryCoordinates.js';

// Build reverse lookup: country name -> ISO code (e.g., "united states" -> "US")
const COUNTRY_NAME_TO_CODE = {};
Object.entries(COUNTRY_COORDINATES).forEach(([code, data]) => {
  if (data.name) {
    COUNTRY_NAME_TO_CODE[data.name.toLowerCase()] = code;
  }
});

class SmartCsvParser {
  constructor(debugMode = false) {
    this.debugMode = debugMode;
    this.log = debugMode ? console.log : () => {};
  }

  /**
   * Main parse function - intelligently parses CSV content
   * @param {string} text - Raw CSV text
   * @param {Object} options - Custom parsing options
   * @returns {Object} Parsed result with transactions and metadata
   */
  parse(text, options = {}) {
    this.log('🔍 Starting Smart CSV Parser...');

    const { customMapping = null, decimalCorrection = false, decimalDivider = 100, skipRows = 0 } = options;

    // Step 1: Clean and normalize the text
    const cleanedText = this.cleanText(text);

    // Step 2: Detect delimiter
    const delimiter = this.detectDelimiter(cleanedText);
    this.log(`📊 Detected delimiter: "${delimiter}"`);

    // Step 3: Parse into rows
    const rows = this.parseRows(cleanedText, delimiter);
    this.log(`📋 Parsed ${rows.length} rows`);

    if (rows.length < 2) {
      return {
        success: false,
        error: 'CSV file appears to be empty or has only headers',
        transactions: [],
        metadata: {},
        headers: [],
        sampleData: [],
      };
    }

    // Step 4: Detect headers and data start
    const { headerRow, dataStartRow } = this.detectHeaders(rows);
    this.log(`📍 Headers at row ${headerRow}, data starts at row ${dataStartRow}`);

    // Step 5: Map columns intelligently or use custom mapping
    const columnMapping = customMapping || this.mapColumns(rows[headerRow]);
    this.log('🗺️ Column mapping:', columnMapping);
    this.log('📋 CSV Headers:', rows[headerRow]);
    this.log('🔍 Has incomePeriod?', 'incomePeriod' in columnMapping, columnMapping.incomePeriod);

    // Step 6: Extract transactions with optional row skipping
    const actualDataStart = dataStartRow + skipRows;
    const transactions = this.extractTransactions(rows.slice(actualDataStart), rows[headerRow], columnMapping, {
      decimalCorrection,
      decimalDivider,
    });

    // Step 7: Analyze and enhance data
    const enhancedTransactions = this.enhanceTransactions(transactions);

    // Log parsing results
    const parsedCount = enhancedTransactions.length;
    const totalDataRows = rows.length - actualDataStart;
    const skippedCount = totalDataRows - parsedCount;
    this.log(`✅ CSV Parsing Complete: ${parsedCount} transactions parsed, ${skippedCount} rows skipped`);

    // Step 8: Generate summary
    const summary = this.generateSummary(enhancedTransactions);

    return {
      success: true,
      transactions: enhancedTransactions,
      metadata: {
        totalRows: rows.length,
        headerRow,
        dataStartRow,
        delimiter,
        columnMapping,
        summary,
      },
      headers: rows[headerRow],
      sampleData: rows.slice(dataStartRow, dataStartRow + 5),
    };
  }

  /**
   * Parse CSV using a detected profile's deterministic mapping
   * @param {string} text - Raw CSV text
   * @param {Object} profile - Statement profile from statementProfiles.js
   * @returns {Object} Parsed result with transactions and metadata
   */
  parseWithProfile(text, profile) {
    this.log(`🎯 Parsing with profile: ${profile.name} (${profile.id})`);

    // Step 1: Clean and normalize the text
    const cleanedText = this.cleanText(text);

    // Step 2: Detect delimiter (or use profile's delimiter if specified)
    const delimiter =
      profile.parsingRules?.delimiter === 'auto'
        ? this.detectDelimiter(cleanedText)
        : profile.parsingRules?.delimiter || this.detectDelimiter(cleanedText);
    this.log(`📊 Using delimiter: "${delimiter}"`);

    // Step 3: Parse into rows
    const rows = this.parseRows(cleanedText, delimiter);
    this.log(`📋 Parsed ${rows.length} rows`);

    if (rows.length < 2) {
      return {
        success: false,
        error: 'CSV file appears to be empty or has only headers',
        transactions: [],
        metadata: {},
        headers: [],
        sampleData: [],
      };
    }

    // Step 4: Detect headers and data start
    const { headerRow, dataStartRow } = this.detectHeaders(rows);
    this.log(`📍 Headers at row ${headerRow}, data starts at row ${dataStartRow}`);

    // Step 5: Build column mapping from profile headerMapping
    // Match header names to column indices (position-independent)
    const headers = rows[headerRow];
    const columnMapping = {};

    // Create normalized header lookup for case-insensitive matching
    const headerLookup = {};
    headers.forEach((header, index) => {
      const normalized = this.normalizeHeader(header);
      headerLookup[normalized] = index;
    });

    // Map profile headerMapping to column indices
    for (const [profileHeader, standardField] of Object.entries(profile.headerMapping)) {
      const normalizedProfileHeader = this.normalizeHeader(profileHeader);
      const columnIndex = headerLookup[normalizedProfileHeader];

      if (columnIndex !== undefined) {
        columnMapping[standardField] = columnIndex;
      }
    }

    this.log('🗺️ Profile-based column mapping:', columnMapping);

    // Step 6: Apply profile parsingRules (skipRows)
    const skipRows = profile.parsingRules?.skipRows || 0;
    const actualDataStart = dataStartRow + skipRows;

    // Step 7: Extract transactions
    const transactions = this.extractTransactions(rows.slice(actualDataStart), headers, columnMapping, {
      decimalCorrection: profile.parsingRules?.decimalCorrection || false,
      decimalDivider: profile.parsingRules?.decimalDivider || 100,
    });

    // Step 7.5: Combine periodStart and periodEnd into incomePeriod if present
    transactions.forEach((transaction) => {
      if (transaction.periodStart && transaction.periodEnd) {
        // Combine into incomePeriod format (YYYYMMYYYYMM)
        const incomePeriod = this.combinePeriodDates(transaction.periodStart, transaction.periodEnd);
        if (incomePeriod) {
          transaction.incomePeriod = incomePeriod;
        }
        // Remove intermediate fields
        delete transaction.periodStart;
        delete transaction.periodEnd;
      } else if (transaction.periodStart && !transaction.periodEnd) {
        // If only periodStart exists, use it for both start and end
        const incomePeriod = this.combinePeriodDates(transaction.periodStart, null);
        if (incomePeriod) {
          transaction.incomePeriod = incomePeriod;
        }
        delete transaction.periodStart;
      } else if (transaction.periodEnd && !transaction.periodStart) {
        // Clean up periodEnd if it exists alone (shouldn't happen, but be safe)
        delete transaction.periodEnd;
      }
      // Don't overwrite existing incomePeriod field (mapped directly from a single Period column)
    });

    // Step 8: Apply profile defaults for missing fields
    const enhancedTransactions = transactions.map((transaction) => {
      const enhanced = { ...transaction };

      // Apply defaults from profile
      if (profile.defaults) {
        for (const [field, defaultValue] of Object.entries(profile.defaults)) {
          if (!enhanced[field] || enhanced[field] === 'Unknown') {
            enhanced[field] = defaultValue;
          }
        }
      }

      // Tag transactions with profile info for traceability
      enhanced._profileId = profile.id;
      enhanced._profileName = profile.name;

      return enhanced;
    });

    // Step 9: Final enhancement (normalize territories, etc.)
    const finalTransactions = this.enhanceTransactions(enhancedTransactions);

    // Log parsing results
    const parsedCount = finalTransactions.length;
    const totalDataRows = rows.length - actualDataStart;
    const skippedCount = totalDataRows - parsedCount;
    this.log(`✅ Profile-based parsing complete: ${parsedCount} transactions parsed, ${skippedCount} rows skipped`);

    // Step 10: Generate summary
    const summary = this.generateSummary(finalTransactions);

    return {
      success: true,
      transactions: finalTransactions,
      metadata: {
        totalRows: rows.length,
        headerRow,
        dataStartRow,
        delimiter,
        columnMapping,
        summary,
        profileId: profile.id,
        profileName: profile.name,
      },
      headers,
      sampleData: rows.slice(dataStartRow, dataStartRow + 5),
    };
  }

  /**
   * Normalize header for case-insensitive matching
   */
  normalizeHeader(header) {
    return header
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, ''); // Remove special characters
  }

  /**
   * Preview CSV without full parsing - for showing column mapping UI
   * @param {string} text - Raw CSV text
   * @param {string} filename - Optional filename for profile detection (defaults to empty string)
   */
  preview(text, filename = '') {
    const cleanedText = this.cleanText(text);
    const delimiter = this.detectDelimiter(cleanedText);
    const rows = this.parseRows(cleanedText, delimiter);

    if (rows.length < 2) {
      return {
        success: false,
        headers: [],
        sampleData: [],
        detectedProfile: null,
        detectionConfidence: 0,
        autoApply: false,
        allDetectionResults: [],
      };
    }

    const { headerRow, dataStartRow } = this.detectHeaders(rows);
    const suggestedMapping = this.mapColumns(rows[headerRow]);

    // Detect statement profile
    const headers = rows[headerRow];
    const detectionResults = detectStatementProfile(headers, filename);

    // Get top match
    const topMatch = detectionResults.length > 0 ? detectionResults[0] : null;
    const detectionConfidence = topMatch ? topMatch.confidence : 0;

    // Auto-apply if confidence >= 85 AND all required fingerprint headers are present
    const autoApply = topMatch ? topMatch.confidence >= AUTO_APPLY && topMatch.allRequiredPresent : false;

    return {
      success: true,
      headers,
      sampleData: rows.slice(dataStartRow, dataStartRow + 10),
      suggestedMapping,
      delimiter,
      detectedProfile: topMatch ? topMatch.profile : null,
      detectionConfidence,
      autoApply,
      allDetectionResults: detectionResults,
    };
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    // Handle different line endings
    let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove BOM if present
    if (cleaned.charCodeAt(0) === 0xfeff) {
      cleaned = cleaned.slice(1);
    }

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Detect the delimiter used in the CSV
   * Handles quoted fields properly
   */
  detectDelimiter(text) {
    const lines = text.split('\n').slice(0, 10); // Check first 10 lines
    const delimiters = [',', '\t', ';', '|'];
    const delimiterScores = {};

    // Count delimiters outside of quoted fields
    for (const delimiter of delimiters) {
      const counts = [];

      for (const line of lines) {
        let count = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            count++;
          }
        }

        if (count > 0) {
          counts.push(count);
        }
      }

      // Calculate consistency score (prefer delimiter with consistent count across lines)
      if (counts.length > 0) {
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
        const variance = counts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / counts.length;

        // Score = average count, penalized by variance (we want consistent counts)
        delimiterScores[delimiter] = avg - variance;
      } else {
        delimiterScores[delimiter] = 0;
      }
    }

    // Return delimiter with highest score
    let bestDelimiter = ',';
    let bestScore = -Infinity;

    for (const [delimiter, score] of Object.entries(delimiterScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Parse text into rows, handling quoted fields
   */
  parseRows(text, delimiter) {
    const rows = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row = this.parseRow(line, delimiter);
      if (row.length > 0) {
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Parse a single row, handling quoted fields
   */
  parseRow(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Don't forget the last field
    result.push(current.trim());

    return result;
  }

  /**
   * Detect where headers are and where data starts
   */
  detectHeaders(rows) {
    let headerRow = 0;
    let dataStartRow = 1;

    // Look for row that contains typical header keywords
    const headerKeywords = [
      'date',
      'amount',
      'revenue',
      'payment',
      'total',
      'earnings',
      'product',
      'song',
      'track',
      'title',
      'artist',
      'album',
      'territory',
      'country',
      'region',
      'source',
      'platform',
      'type',
      'category',
      'status',
      'currency',
      'description',
      'quantity',
      'units',
      'plays',
      'streams',
      'downloads',
    ];

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      const rowText = row.join(' ').toLowerCase();

      let keywordCount = 0;
      for (const keyword of headerKeywords) {
        if (rowText.includes(keyword)) {
          keywordCount++;
        }
      }

      // If this row has multiple keywords, it's likely the header
      if (keywordCount >= 2) {
        headerRow = i;
        dataStartRow = i + 1;
        break;
      }
    }

    // Skip any empty rows after header
    while (dataStartRow < rows.length && rows[dataStartRow].every((cell) => !cell || cell.trim() === '')) {
      dataStartRow++;
    }

    return { headerRow, dataStartRow };
  }

  /**
   * Map columns to standardized field names
   */
  mapColumns(headerRow) {
    const mapping = {};

    // Field mapping rules - Enhanced for royalty statements
    // NOTE: Order matters! More specific fields (incomePeriod) should come before generic ones (date)
    const fieldMappings = {
      // Check incomePeriod FIRST before date, since "period" could match both
      incomePeriod: [
        'income period',
        'royalty period',
        'statement period',
        'accounting period',
        'revenue period',
        'pay period',
        'settlement period',
      ],
      incomePeriodCategory: [
        'income period category',
        'period category',
        'period type',
        'income type',
        'royalty type',
        'statement type',
        'revenue type',
        'income category',
        'period classification',
      ],
      incomeName: [
        'original source (received)',
        'original source',
        'income name',
        'revenue name',
        'income description',
        'revenue description',
        'income title',
        'revenue title',
        'income label',
        'revenue label',
      ],
      date: [
        'date',
        'transaction_date',
        'payment_date',
        'period',
        'month',
        'sale_date',
        'reporting_date',
        'activity_date',
        'created_at',
        'transaction date',
        'payment date',
        'sale date',
        'sale month',
        'reporting period',
        'period date',
        'settlement date',
      ],
      amount: [
        'amount',
        'revenue',
        'total',
        'payment',
        'earnings',
        'net',
        'gross',
        'royalty',
        'payout',
        'income',
        'total_amount',
        'net_revenue',
        'gross_revenue',
        'total_revenue',
        'payment_amount',
        'royalty_amount',
        'earned',
        'net revenue',
        'gross revenue',
        'total earned',
        'your revenue',
        'partner share',
        'net receipts',
        'royalty net',
        'royalty gross',
        'label share',
        'artist share',
        'publisher share',
        'writer share',
        'mechanical',
        'performance',
        'sync fee',
        'master recording',
        'composition share',
        'royalty payable',
        'royalties payable',
      ],
      product: [
        'product',
        'song',
        'track',
        'title',
        'asset',
        'work',
        'content',
        'release',
        'album',
        'single',
        'track_name',
        'song_title',
        'content_title',
        'asset_title',
        'track title',
        'song title',
        'track name',
        'release name',
        'composition',
        'recording',
        'asset name',
        'content name',
        'catalog number',
        'work title',
      ],
      artist: [
        'artist',
        'artist_name',
        'performer',
        'band',
        'creator',
        'artist name',
        'performing artist',
        'track artist',
        'recording display artist name',
        'featured artist',
        'primary artist',
      ],
      writer: [
        'writer',
        'composer',
        'composers',
        'songwriter',
        'writer name',
        'composer name',
        'songwriter name',
        'author',
        'work writer list',
        'participant name',
        'urheber',
        'auteur',
        '著作者',
      ],
      source: [
        'source name',
        'income source',
        'source',
        'pro',
        'cmo',
        'society',
        'collecting society',
        'collection society',
        'performing rights',
        'mechanical rights',
        'revenue_source',
        'partner',
        'distributor',
      ],
      platform: [
        'platform',
        'dsp',
        'service',
        'store',
        'storefront',
        'channel',
        'digital service',
        'streaming service',
        'content_type',
        'revenue type',
        'sale type',
        'transaction type',
        'usage type',
        'product type',
        'configuration',
        'tier',
      ],
      category: [
        'main income type name',
        'income type name',
        'category',
        'type',
        'income type',
        'revenue category',
        'royalty type',
        'source category',
        'revenue_type',
        'income_type',
        'royalty_category',
        'usage category',
      ],
      territory: [
        'royalty country code',
        'territory',
        'country',
        'region',
        'territory_code',
        'country_code',
        'location',
        'market',
        'country of sale',
        'reporting territory',
        'sale country',
        'usage territory',
        'reporting country',
        'collection country',
        'royalty country',
      ],
      currency: ['currency', 'currency_code', 'curr', 'ccy', 'currency code'],
      quantity: [
        'quantity',
        'qty',
        'units',
        'plays',
        'streams',
        'downloads',
        'unit_quantity',
        'quantity_sold',
        'stream_count',
        'play_count',
        'units sold',
        'total plays',
        'total streams',
      ],
      isrc: ['isrc', 'isrc_code', 'isrc code'],
      upc: ['upc', 'upc_code', 'barcode', 'ean', 'upc code'],
    };

    // Try to match each column
    for (let i = 0; i < headerRow.length; i++) {
      const header = (headerRow[i] || '').toLowerCase().trim();

      if (!header) continue;

      // Check each field type
      let matchedField = null;
      for (const [fieldName, patterns] of Object.entries(fieldMappings)) {
        for (const pattern of patterns) {
          if (header === pattern || header.includes(pattern) || pattern.includes(header)) {
            mapping[fieldName] = i;
            matchedField = fieldName;
            break;
          }
        }
        if (matchedField) break;
      }

      // If no match found, check for partial matches
      if (!matchedField) {
        for (const [fieldName, patterns] of Object.entries(fieldMappings)) {
          for (const pattern of patterns) {
            // Check if header contains key parts of pattern
            const headerWords = header.split(/[\s_-]+/);
            const patternWords = pattern.split(/[\s_-]+/);

            const matchCount = patternWords.filter((pw) =>
              headerWords.some((hw) => hw.includes(pw) || pw.includes(hw))
            ).length;

            if (matchCount > 0 && matchCount >= patternWords.length / 2) {
              mapping[fieldName] = i;
              matchedField = fieldName;
              break;
            }
          }
          if (matchedField) break;
        }
      }
    }

    // If no amount column found, look for numeric columns
    if (mapping.amount === undefined) {
      for (let i = 0; i < headerRow.length; i++) {
        const header = (headerRow[i] || '').toLowerCase();
        // Check if header suggests it might be a monetary value
        if (
          header.includes('$') ||
          header.includes('usd') ||
          header.includes('eur') ||
          header.includes('gbp') ||
          header.includes('total') ||
          header.includes('net')
        ) {
          mapping.amount = i;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Extract transactions from data rows
   */
  extractTransactions(dataRows, headers, columnMapping, options = {}) {
    const transactions = [];
    const { decimalCorrection = false, decimalDivider = 100 } = options;
    let emptyRowsSkipped = 0;

    this.log(`📥 Processing ${dataRows.length} data rows...`);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Skip empty rows
      if (!row || row.every((cell) => !cell || cell.trim() === '')) {
        emptyRowsSkipped++;
        continue;
      }

      const transaction = {
        id: `parsed-${Date.now()}-${i}`,
        rawData: row,
      };

      // Extract mapped fields
      for (const [field, colIndex] of Object.entries(columnMapping)) {
        if (colIndex !== undefined && colIndex < row.length) {
          transaction[field] = row[colIndex];
        }
      }

      // Parse amount
      if (transaction.amount !== undefined) {
        transaction.amount = this.parseAmount(transaction.amount);
        // Apply decimal correction if enabled
        if (decimalCorrection && decimalDivider > 1) {
          transaction.amount = transaction.amount / decimalDivider;
        }
      } else {
        // Try to find any numeric value that could be amount
        for (const value of row) {
          const parsed = this.parseAmount(value);
          if (parsed > 0) {
            transaction.amount = parsed;
            // Apply decimal correction if enabled
            if (decimalCorrection && decimalDivider > 1) {
              transaction.amount = transaction.amount / decimalDivider;
            }
            break;
          }
        }
      }

      // Parse date
      if (transaction.date) {
        const rawDate = transaction.date;
        transaction.date = this.parseDate(transaction.date);
        // Debug first few dates
        if (i < 3) {
          this.log(`  Date parsing [row ${i}]: "${rawDate}" → "${transaction.date}"`);
        }
      }

      // Include all rows that have any data (even if amount is missing or zero)
      // Set amount to 0 if not found
      if (transaction.amount === undefined || transaction.amount < 0) {
        transaction.amount = 0;
      }

      // Add transaction to list
      transactions.push(transaction);
    }

    this.log(
      `✅ Extraction complete: ${transactions.length} transactions from ${dataRows.length} rows (${emptyRowsSkipped} empty rows skipped)`
    );

    return transactions;
  }

  /**
   * Parse amount from various formats
   */
  parseAmount(value) {
    if (!value && value !== 0) return 0;

    // Convert to string if not already
    const str = String(value).trim();

    // If already a valid number, return it
    if (!isNaN(str) && str !== '') {
      return Math.abs(parseFloat(str));
    }

    // Remove currency symbols and thousands separators
    let cleaned = str.replace(/[$£€¥₹,\s]/g, '');

    // Handle parentheses for negative values
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    // Handle percentage (convert to decimal)
    if (cleaned.endsWith('%')) {
      cleaned = String(parseFloat(cleaned.slice(0, -1)) / 100);
    }

    // Handle K, M, B suffixes with better precision
    const suffixMatch = cleaned.match(/^([-+]?[\d.]+)([kmb])$/i);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1]);
      const suffix = suffixMatch[2].toLowerCase();
      if (!isNaN(num)) {
        const multipliers = { k: 1000, m: 1000000, b: 1000000000 };
        return Math.abs(num * multipliers[suffix]);
      }
    }

    // Handle decimal separators (some locales use comma as decimal)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Check if comma might be decimal separator (e.g., "123,45")
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        cleaned = parts.join('.');
      }
    }

    // Parse the number with better precision
    const parsed = parseFloat(cleaned);

    // Log problematic values in debug mode
    if (this.debugMode && (isNaN(parsed) || parsed === 0) && str !== '0' && str !== '') {
      this.log(`⚠️ Could not parse amount: "${str}"`);
    }

    // Return with proper decimal precision
    return isNaN(parsed) ? 0 : Math.abs(Math.round(parsed * 100) / 100);
  }

  /**
   * Parse date from various formats
   */
  parseDate(value) {
    if (!value) return null; // Don't default to today's date

    const str = String(value).trim();

    // Try to parse the date
    const date = new Date(str);

    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try alternative formats
    // MM/DD/YYYY or MM-DD-YYYY
    const usFormat = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;
    const match = str.match(usFormat);

    if (match) {
      const [_, month, day, year] = match;
      const fullYear = year.length === 2 ? '20' + year : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // YYYY/MM/DD or YYYY-MM-DD
    const isoFormat = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
    const isoMatch = str.match(isoFormat);

    if (isoMatch) {
      const [_, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Default to current date if unparseable
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Combine periodStart and periodEnd into incomePeriod format (YYYYMMYYYYMM)
   * Handles various date formats: YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, YYYYMMDD
   */
  combinePeriodDates(periodStart, periodEnd) {
    if (!periodStart) return null;

    // Parse the start date
    const startDate = this.parseDateToYYYYMM(periodStart);
    if (!startDate) return null;

    // If no end date, use start date for both start and end
    if (!periodEnd) {
      return startDate + startDate;
    }

    // Parse the end date
    const endDate = this.parseDateToYYYYMM(periodEnd);
    if (!endDate) {
      return startDate + startDate;
    }

    return startDate + endDate;
  }

  /**
   * Parse a date string into YYYYMM format
   */
  parseDateToYYYYMM(dateStr) {
    if (!dateStr) return null;

    const str = String(dateStr).trim();

    // Try YYYYMMDD format (8 digits)
    if (/^\d{8}$/.test(str)) {
      return str.substring(0, 6); // Extract YYYYMM
    }

    // Try YYYY-MM-DD or YYYY/MM/DD format
    const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-]\d{1,2}$/);
    if (isoMatch) {
      const [_, year, month] = isoMatch;
      return `${year}${month.padStart(2, '0')}`;
    }

    // Try MM/DD/YYYY or M/D/YYYY format
    const usMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (usMatch) {
      const [_, month, day, year] = usMatch;
      const fullYear = year.length === 2 ? '20' + year : year;
      return `${fullYear}${month.padStart(2, '0')}`;
    }

    // Try parsing as a Date object
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}${month}`;
    }

    return null;
  }

  /**
   * Enhance transactions with additional data
   */
  enhanceTransactions(transactions) {
    return transactions.map((t) => {
      // Ensure all required fields exist
      // Resolve territory ISO code from territoryName if territory is missing
      let territory = t.territory || t.country || '';
      if (!territory && t.territoryName) {
        territory = COUNTRY_NAME_TO_CODE[t.territoryName.toLowerCase().trim()] || '';
      }

      const enhanced = {
        ...t,
        date: t.date || new Date().toISOString().split('T')[0],
        amount: t.amount || 0,
        source: t.source || 'Unknown',
        platform: t.platform || '',
        product: t.product || t.title || t.track || 'Unknown',
        territory: territory || 'US',
        territoryName: t.territoryName || '',
        currency: t.currency || 'USD',
        status: t.status || 'paid',
      };

      // Detect source category
      // Prioritize category from CSV (Main Income Type Name), then fallback to source-based detection
      if (t.category) {
        enhanced.sourceCategory = this.detectSourceCategory(
          t.category,
          true // isIncomeType flag
        );
      } else {
        enhanced.sourceCategory = this.detectSourceCategory(enhanced.source, false);
      }

      return enhanced;
    });
  }

  /**
   * Detect source category from source name or income type
   * @param {string} source - Source name or income type
   * @param {boolean} isIncomeType - Whether this is from Main Income Type Name column
   */
  detectSourceCategory(source, isIncomeType = false) {
    if (!source) return 'other';

    const lower = source.toLowerCase().trim();

    // If this is from Main Income Type Name column, use direct mapping
    if (isIncomeType) {
      // Direct matches for common income types
      if (lower === 'mechanical' || lower === 'mechanicals') {
        return 'mechanical';
      }
      if (lower === 'performance' || lower === 'performances' || lower === 'public performance') {
        return 'performance';
      }
      if (
        lower === 'digital' ||
        lower === 'streaming' ||
        lower === 'interactive streaming' ||
        lower === 'non-interactive streaming' ||
        lower === 'digital/new media'
      ) {
        return 'streaming';
      }
      if (lower === 'sync' || lower === 'synchronization' || lower === 'synch' || lower === 'synchronisation') {
        return 'sync';
      }
      if (lower === 'physical' || lower === 'physical sales' || lower === 'cd sales' || lower === 'vinyl sales') {
        return 'physical';
      }
      if (lower === 'download' || lower === 'downloads' || lower === 'digital download') {
        return 'download';
      }
      if (lower === 'merchandise' || lower === 'merch') {
        return 'merchandise';
      }
      if (lower === 'live' || lower === 'live performance' || lower === 'concert') {
        return 'live';
      }
    }

    // Fallback to keyword-based detection for source names
    if (
      lower.includes('spotify') ||
      lower.includes('apple') ||
      lower.includes('youtube') ||
      lower.includes('amazon') ||
      lower.includes('tidal') ||
      lower.includes('deezer') ||
      lower.includes('stream')
    ) {
      return 'streaming';
    }

    if (
      lower.includes('performance') ||
      lower.includes('ascap') ||
      lower.includes('bmi') ||
      lower.includes('sesac') ||
      lower.includes('pro')
    ) {
      return 'performance';
    }

    if (lower.includes('mechanical') || lower.includes('harry fox') || lower.includes('mech')) {
      return 'mechanical';
    }

    if (lower.includes('sync') || lower.includes('synchronization')) {
      return 'sync';
    }

    if (lower.includes('merch') || lower.includes('merchandise')) {
      return 'merchandise';
    }

    if (lower.includes('live') || lower.includes('concert') || lower.includes('ticket')) {
      return 'live';
    }

    if (lower.includes('download')) {
      return 'download';
    }

    if (lower.includes('physical') || lower.includes('cd') || lower.includes('vinyl')) {
      return 'physical';
    }

    return 'other';
  }

  /**
   * Generate summary statistics
   */
  generateSummary(transactions) {
    if (transactions.length === 0) {
      return {
        totalAmount: 0,
        transactionCount: 0,
        avgTransaction: 0,
        dateRange: null,
        sources: [],
        territories: [],
      };
    }

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const avgTransaction = totalAmount / transactions.length;

    // Get unique sources and territories
    const sources = [...new Set(transactions.map((t) => t.source))];
    const territories = [...new Set(transactions.map((t) => t.territory))];

    // Get date range
    const dates = transactions.map((t) => new Date(t.date)).filter((d) => !isNaN(d.getTime()));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    return {
      totalAmount,
      transactionCount: transactions.length,
      avgTransaction,
      dateRange:
        minDate && maxDate
          ? {
              start: minDate.toISOString().split('T')[0],
              end: maxDate.toISOString().split('T')[0],
            }
          : null,
      sources,
      territories,
    };
  }
}

export default SmartCsvParser;
