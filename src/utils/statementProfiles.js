/**
 * Statement Profile Registry and Detection Engine
 *
 * Auto-detects known royalty statement formats from PROs (BMI, ASCAP, GEMA),
 * CMOs (MLC, HFA, SoundExchange), and Publishers/Pub Admins (Songtrust, Kobalt, Sentric)
 */

/**
 * Confidence thresholds for auto-detection
 */
export const AUTO_APPLY = 85; // Auto-apply mapping without confirmation
export const SUGGEST = 50; // Suggest profile but require confirmation
export const MINIMUM = 30; // Minimum threshold for considering a match

/**
 * Statement profile registry
 * Each profile defines detection fingerprints and parsing rules for a specific statement format
 */
export const STATEMENT_PROFILES = [
  {
    id: 'mlc-work-summary',
    name: 'MLC Work Summary',
    orgType: 'cmo',
    category: 'mechanical',

    // Required headers that must be present for detection
    fingerprints: {
      required: [
        'Payee Name',
        'Work Primary Title',
        'Work Writer List',
        'DSP Name',
        'Territory',
        'Usage Period Start Date',
        'Usage Period End Date',
        'Royalty Amount',
        'Distributed Amount',
        'Number of Usages',
        'ISWC',
        'MLC Song Code',
      ],
      optional: [
        'Payee MLC Number',
        'Original Publisher Name',
        'Admin Publisher Name',
        'Member Song Identifier',
        'Work Payable %',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/mlc/i, /mechanical.?licensing/i, /work.?summary/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Primary Title': 'product',
      'Work Writer List': 'artist',
      'Distributed Amount': 'amount',
      Territory: 'territory',
      'Number of Usages': 'quantity',
      'DSP Name': 'platform',
      ISWC: 'iswc',
      'Use Type': 'category',
      'Usage Period Start Date': 'periodStart',
      'Usage Period End Date': 'periodEnd',
    },

    // Default values for missing fields
    defaults: {
      source: 'MLC',
      sourceCategory: 'mechanical',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto', // auto-detect between tab and comma
    },
  },

  {
    id: 'mlc-royalty-detail',
    name: 'MLC Royalty Detail',
    orgType: 'cmo',
    category: 'mechanical',

    // Required headers that must be present for detection
    fingerprints: {
      required: [
        'Distribution Identifier',
        'Work Primary Title',
        'Recording Display Artist Name',
        'DSP Name',
        'Territory',
        'ISRC',
        'Usage Period Start Date',
        'Usage Period End Date',
        'Distributed Amount',
        'Number of Usages',
        'Consumer Offering',
        'Publisher Royalty Amount',
      ],
      optional: [
        'Distribution Description',
        'Payee Name',
        'MLC Song Code',
        'ISWC',
        'Work Writer List',
        'DSP Track ID',
        'Recording Title',
        'Product Title',
        'Label',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/mlc/i, /mechanical.?licensing/i, /royalty.?detail/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Primary Title': 'product',
      'Recording Display Artist Name': 'artist',
      'Distributed Amount': 'amount',
      Territory: 'territory',
      ISRC: 'isrc',
      ISWC: 'iswc',
      'DSP Name': 'platform',
      'Number of Usages': 'quantity',
      'Consumer Offering': 'incomeName',
      'Usage Period Start Date': 'periodStart',
      'Usage Period End Date': 'periodEnd',
    },

    // Default values for missing fields
    defaults: {
      source: 'MLC',
      sourceCategory: 'mechanical',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto', // auto-detect between tab and comma
    },
  },

  {
    id: 'bmi-performance',
    name: 'BMI Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection
    fingerprints: {
      required: [
        'PERIOD',
        'PARTICIPANT NAME',
        'TITLE NAME',
        'TITLE #',
        'PERF SOURCE',
        'COUNTRY OF PERFORMANCE',
        'PERF COUNT',
        'ROYALTY AMOUNT',
        'PERF PERIOD',
        'COMPANY NAME',
      ],
      optional: [
        'W OR P',
        'PARTICIPANT #',
        'IP #',
        'SHOW NAME',
        'EPISODE NAME',
        'USE CODE',
        'TIMING',
        'PARTICIPANT %',
        'BONUS LEVEL',
        'WITHHOLD',
        'CURRENT ACTIVITY AMT',
        'HITS SONG OR TV NET SUPER USAGE BONUS',
        'STANDARDS OR TV NET THEME BONUS',
        'FOREIGN SOCIETY ADJUSTMENT',
        'COMPANY CODE',
        'PERF DATE',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/bmi/i, /broadcast.?music/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'TITLE NAME': 'product',
      'PARTICIPANT NAME': 'artist',
      'ROYALTY AMOUNT': 'amount',
      'COUNTRY OF PERFORMANCE': 'territoryName',
      'PERF COUNT': 'quantity',
      'PERF SOURCE': 'platform',
      'PERF PERIOD': 'incomePeriod',
      'COMPANY NAME': 'source',
    },

    // Default values for missing fields
    defaults: {
      source: 'BMI',
      sourceCategory: 'performance',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'ascap-performance',
    name: 'ASCAP Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection
    fingerprints: {
      required: [
        'DistributionYear',
        'Distribution Quarter',
        'Work ID',
        'Work Title',
        'Music User',
        'Number of Plays',
        'Performing Artist',
        'Composer Name',
        'Dollars',
        'Credits',
        'Territory',
        'Performance Quarter',
        'Type Of Right',
        'Performance Source/Broadcast Medium',
      ],
      optional: [
        'Statement Recipient ID',
        'Statement Recipient Name',
        'Party ID',
        'Party Name',
        'Legal Earner Party ID',
        'Legal Earner Party Name',
        'Music User Genre',
        'Network Service',
        'Performance Start Date',
        'Performance End Date',
        'Survey Type',
        'Day Part Code',
        'Series or Film/Attraction',
        'Program Name',
        'CA%',
        'Classification Code',
        'Performance Type (Usage)',
        'Duration',
        'EE Share',
        'Premium Credits',
        'Premium Dollars',
        'Adjustment Indicator',
        'Adjustment Reason Code',
        'Original Distribution Date',
        'Role Type',
        'Licensor',
        'Program Code',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/ascap/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Title': 'product',
      'Performing Artist': 'artist',
      Dollars: 'amount',
      Territory: 'territory',
      'Number of Plays': 'quantity',
      'Music User': 'platform',
      'Performance Quarter': 'incomePeriod',
      'Type Of Right': 'category',
    },

    // Default values for missing fields
    defaults: {
      source: 'ASCAP',
      sourceCategory: 'performance',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'sesac-performance',
    name: 'SESAC Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Title', 'Writer', 'Publisher', 'Performance Type', 'Amount', 'Period', 'Territory'],
      optional: ['Work ID', 'ISWC', 'Performance Count', 'Usage Type', 'Media Outlet', 'Distribution Date'],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/sesac/i],

    // Maps statement headers to standard fields
    headerMapping: {
      Title: 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      'Performance Count': 'quantity',
      'Media Outlet': 'platform',
      Period: 'incomePeriod',
      'Performance Type': 'category',
    },

    // Default values for missing fields
    defaults: {
      source: 'SESAC',
      sourceCategory: 'performance',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'gema-performance',
    name: 'GEMA Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection (German + English)
    fingerprints: {
      required: [
        'Titel', // Title (German)
        'Urheber', // Author (German)
        'Betrag', // Amount (German)
        'Gebiet', // Territory (German)
        'Zeitraum', // Period (German)
      ],
      optional: [
        'Title', // English alternative
        'Author', // English alternative
        'Amount', // English alternative
        'Territory', // English alternative
        'Period', // English alternative
        'ISRC',
        'Werk-Nr', // Work number (German)
        'Work Number', // English alternative
        'Berechtigter', // Rights holder (German)
        'Rights Holder', // English alternative
        'Nutzungsart', // Usage type (German)
        'Usage Type', // English alternative
        'Abrechnungsjahr', // Settlement year (German)
        'Settlement Year', // English alternative
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/gema/i],

    // Maps statement headers to standard fields (handles both German and English)
    headerMapping: {
      Titel: 'product',
      Title: 'product',
      Urheber: 'artist',
      Author: 'artist',
      Betrag: 'amount',
      Amount: 'amount',
      Gebiet: 'territory',
      Territory: 'territory',
      Zeitraum: 'incomePeriod',
      Period: 'incomePeriod',
      ISRC: 'isrc',
      Nutzungsart: 'category',
      'Usage Type': 'category',
    },

    // Default values for missing fields
    defaults: {
      source: 'GEMA',
      sourceCategory: 'performance',
      currency: 'EUR',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'prs-performance',
    name: 'PRS for Music Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection
    fingerprints: {
      required: [
        'Work Title',
        'Writer',
        'Publisher',
        'Usage Type',
        'Royalty Amount',
        'Territory',
        'Distribution Period',
      ],
      optional: [
        'Work ID',
        'ISWC',
        'Duration',
        'Performance Count',
        'Media Outlet',
        'Society',
        'Work Share',
        'CAE/IPI Number',
        'Performance Date',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/prs/i, /prs.?for.?music/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Title': 'product',
      Writer: 'artist',
      'Royalty Amount': 'amount',
      Territory: 'territory',
      'Performance Count': 'quantity',
      'Media Outlet': 'platform',
      'Distribution Period': 'incomePeriod',
      'Usage Type': 'category',
      ISWC: 'iswc',
    },

    // Default values for missing fields
    defaults: {
      source: 'PRS for Music',
      sourceCategory: 'performance',
      currency: 'GBP',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'sacem-performance',
    name: 'SACEM Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection (French)
    fingerprints: {
      required: [
        'Titre', // Title (French)
        'Auteur', // Author (French)
        'Editeur', // Publisher (French)
        'Montant', // Amount (French)
        'Territoire', // Territory (French)
        'Periode', // Period (French)
      ],
      optional: [
        'Title', // English alternative
        'Author', // English alternative
        'Publisher', // English alternative
        'Amount', // English alternative
        'Territory', // English alternative
        'Period', // English alternative
        'ISRC',
        'ISWC',
        'Code Œuvre', // Work code (French)
        'Work Code', // English alternative
        "Type d'Utilisation", // Usage type (French)
        'Usage Type', // English alternative
        'Date de Distribution', // Distribution date (French)
        'Distribution Date', // English alternative
        "Nombre d'Executions", // Performance count (French)
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/sacem/i],

    // Maps statement headers to standard fields (handles both French and English)
    headerMapping: {
      Titre: 'product',
      Title: 'product',
      Auteur: 'artist',
      Author: 'artist',
      Montant: 'amount',
      Amount: 'amount',
      Territoire: 'territory',
      Territory: 'territory',
      Periode: 'incomePeriod',
      Period: 'incomePeriod',
      ISRC: 'isrc',
      ISWC: 'iswc',
      "Type d'Utilisation": 'category',
      'Usage Type': 'category',
      "Nombre d'Executions": 'quantity',
    },

    // Default values for missing fields
    defaults: {
      source: 'SACEM',
      sourceCategory: 'performance',
      currency: 'EUR',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'socan-performance',
    name: 'SOCAN Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Work Title', 'Writer', 'Publisher', 'Performance Type', 'Amount', 'Period', 'Territory'],
      optional: [
        'Work ID',
        'ISWC',
        'Performance Count',
        'Usage Type',
        'Media Outlet',
        'Distribution Date',
        'Duration',
        'Society Code',
        'CAE/IPI Number',
        'Work Share',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/socan/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Title': 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      'Performance Count': 'quantity',
      'Media Outlet': 'platform',
      Period: 'incomePeriod',
      'Performance Type': 'category',
      ISWC: 'iswc',
    },

    // Default values for missing fields
    defaults: {
      source: 'SOCAN',
      sourceCategory: 'performance',
      currency: 'CAD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'apra-amcos-performance',
    name: 'APRA AMCOS Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Work Title', 'Writer', 'Publisher', 'Usage Type', 'Amount', 'Territory', 'Period'],
      optional: [
        'Work ID',
        'ISWC',
        'ISRC',
        'Performance Count',
        'Media Outlet',
        'Distribution Date',
        'Performance Date',
        'Duration',
        'Society Code',
        'CAE/IPI Number',
        'Work Share',
        'Rights Type',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/apra/i, /amcos/i, /apra.?amcos/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Title': 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      'Performance Count': 'quantity',
      'Media Outlet': 'platform',
      Period: 'incomePeriod',
      'Usage Type': 'category',
      ISWC: 'iswc',
      ISRC: 'isrc',
    },

    // Default values for missing fields
    defaults: {
      source: 'APRA AMCOS',
      sourceCategory: 'performance',
      currency: 'AUD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'mcps-mechanical',
    name: 'MCPS Mechanical Royalty',
    orgType: 'pro',
    category: 'mechanical',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Work Title', 'Writer', 'Publisher', 'Usage Type', 'Mechanical Royalty', 'Territory', 'Period'],
      optional: [
        'Work ID',
        'ISWC',
        'ISRC',
        'Album',
        'Artist',
        'Label',
        'Release Date',
        'Units Sold',
        'Catalogue Number',
        'Format',
        'Distribution Date',
        'CAE/IPI Number',
        'Work Share',
        'Publisher Share',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/mcps/i, /mechanical.?copyright/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Title': 'product',
      Writer: 'artist',
      'Mechanical Royalty': 'amount',
      Territory: 'territory',
      'Units Sold': 'quantity',
      Period: 'incomePeriod',
      'Usage Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      Album: 'incomeName',
    },

    // Default values for missing fields
    defaults: {
      source: 'MCPS',
      sourceCategory: 'mechanical',
      currency: 'GBP',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'jasrac-performance',
    name: 'JASRAC Performance Royalty',
    orgType: 'pro',
    category: 'performance',

    // Required headers that must be present for detection (Japanese + English)
    fingerprints: {
      required: [
        '作品名', // Work Title (Japanese)
        '著作者', // Author/Composer (Japanese)
        '金額', // Amount (Japanese)
        '地域', // Territory (Japanese)
        '期間', // Period (Japanese)
      ],
      optional: [
        'Work Title', // English alternative
        'Author', // English alternative
        'Composer', // English alternative
        'Amount', // English alternative
        'Territory', // English alternative
        'Period', // English alternative
        'ISRC',
        'ISWC',
        '作品コード', // Work Code (Japanese)
        'Work Code', // English alternative
        '利用形態', // Usage Type (Japanese)
        'Usage Type', // English alternative
        '利用回数', // Usage Count (Japanese)
        'Usage Count', // English alternative
        '分配日', // Distribution Date (Japanese)
        'Distribution Date', // English alternative
        '出版者', // Publisher (Japanese)
        'Publisher', // English alternative
        '演奏者', // Performer (Japanese)
        'Performer', // English alternative
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/jasrac/i, /ジャスラック/],

    // Maps statement headers to standard fields (handles both Japanese and English)
    headerMapping: {
      作品名: 'product',
      'Work Title': 'product',
      著作者: 'artist',
      Author: 'artist',
      Composer: 'artist',
      演奏者: 'artist',
      Performer: 'artist',
      金額: 'amount',
      Amount: 'amount',
      地域: 'territory',
      Territory: 'territory',
      期間: 'incomePeriod',
      Period: 'incomePeriod',
      ISRC: 'isrc',
      ISWC: 'iswc',
      利用形態: 'category',
      'Usage Type': 'category',
      利用回数: 'quantity',
      'Usage Count': 'quantity',
    },

    // Default values for missing fields
    defaults: {
      source: 'JASRAC',
      sourceCategory: 'performance',
      currency: 'JPY',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  // ============================================================================
  // PUBLISHER AND PUB ADMIN PROFILES
  // ============================================================================

  {
    id: 'songtrust',
    name: 'Songtrust',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Royalty Type', 'Song Title', 'Writer', 'Territory', 'Amount', 'Period', 'Source'],
      optional: [
        'ISRC',
        'ISWC',
        'PRO',
        'Album',
        'Publisher Share',
        'Writer Share',
        'Currency',
        'Exchange Rate',
        'Date',
        'Statement Period',
        'Income Type',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/songtrust/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Song Title': 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      Source: 'incomeName',
      Period: 'incomePeriod',
      'Royalty Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      PRO: 'incomeName',
    },

    // Default values for missing fields
    defaults: {
      source: 'Songtrust',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'kobalt',
    name: 'Kobalt Music Publishing',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Track', 'Artist', 'Territory', 'Revenue Type', 'Amount', 'Currency', 'Period'],
      optional: [
        'ISRC',
        'ISWC',
        'Platform',
        'Income Source',
        'Album',
        'Label',
        'UPC',
        'Release Date',
        'Usage Type',
        'Quantity',
        'Rate',
        'Writer',
        'Publisher Share',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/kobalt/i],

    // Maps statement headers to standard fields
    headerMapping: {
      Track: 'product',
      Artist: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      Platform: 'platform',
      Period: 'incomePeriod',
      'Revenue Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      'Income Source': 'incomeName',
      Quantity: 'quantity',
    },

    // Default values for missing fields
    defaults: {
      source: 'Kobalt',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'sentric',
    name: 'Sentric Music Publishing',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Song Title', 'Writer', 'Territory', 'Royalty Type', 'Amount', 'Period', 'Source'],
      optional: [
        'ISRC',
        'ISWC',
        'Album',
        'Artist',
        'Label',
        'Publisher',
        'Income Type',
        'Usage Type',
        'Currency',
        'Date',
        'Statement Date',
        'Writer Share',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/sentric/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Song Title': 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      Source: 'incomeName',
      Period: 'incomePeriod',
      'Royalty Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      'Income Type': 'incomeName',
    },

    // Default values for missing fields
    defaults: {
      source: 'Sentric',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'downtown',
    name: 'Downtown Music Publishing',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Title', 'Writer', 'Publisher', 'Income Type', 'Amount', 'Territory', 'Period'],
      optional: [
        'ISRC',
        'ISWC',
        'Artist',
        'Album',
        'Label',
        'Source',
        'PRO',
        'Society',
        'Currency',
        'Date',
        'Statement Period',
        'Writer Share',
        'Publisher Share',
        'Usage Type',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/downtown/i, /cd.?baby.?pub/i, /cdbaby.?pub/i],

    // Maps statement headers to standard fields
    headerMapping: {
      Title: 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      Source: 'incomeName',
      Period: 'incomePeriod',
      'Income Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      PRO: 'incomeName',
    },

    // Default values for missing fields
    defaults: {
      source: 'Downtown Music Publishing',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'tunecore-publishing',
    name: 'TuneCore Publishing',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Song', 'Writer', 'Royalty Type', 'Territory', 'Amount', 'Period'],
      optional: [
        'ISRC',
        'ISWC',
        'Artist',
        'Album',
        'Source',
        'PRO',
        'Platform',
        'Income Type',
        'Currency',
        'Date',
        'Statement Date',
        'Writer Share',
        'Publisher Share',
        'Usage',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/tunecore.?pub/i],

    // Maps statement headers to standard fields
    headerMapping: {
      Song: 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      Source: 'incomeName',
      Period: 'incomePeriod',
      'Royalty Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      'Income Type': 'incomeName',
      PRO: 'incomeName',
    },

    // Default values for missing fields
    defaults: {
      source: 'TuneCore Publishing',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'concord',
    name: 'Concord Music Publishing',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Work Title', 'Writer Name', 'Publisher Name', 'Income Type', 'Gross Amount', 'Territory', 'Period'],
      optional: [
        'ISRC',
        'ISWC',
        'Artist',
        'Album',
        'Source Society',
        'PRO',
        'Usage Type',
        'Currency',
        'Statement Date',
        'Distribution Date',
        'Writer Share',
        'Publisher Share',
        'Net Amount',
        'Deductions',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/concord/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Work Title': 'product',
      'Writer Name': 'artist',
      'Gross Amount': 'amount',
      Territory: 'territory',
      'Source Society': 'incomeName',
      Period: 'incomePeriod',
      'Income Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      PRO: 'incomeName',
      'Usage Type': 'incomeName',
    },

    // Default values for missing fields
    defaults: {
      source: 'Concord',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'publishing-earnings',
    name: 'Publishing Earnings Statement',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: [
        'Song Title',
        'ISRC',
        'Composers',
        'Publisher Name',
        'Source Name',
        'Main Income Type Name',
        'Units',
        'Income Period',
        'Royalty Country Code',
        'Royalty Payable',
      ],
      optional: ['Date', 'Release UPC', 'Song Code', 'Source Code', 'Original Source (Received)'],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/publishing.?earnings/i, /pub.?earnings/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Song Title': 'product',
      ISRC: 'isrc',
      Composers: 'writer',
      'Publisher Name': 'source',
      'Source Name': 'incomeName',
      'Main Income Type Name': 'category',
      Units: 'quantity',
      'Income Period': 'incomePeriod',
      'Royalty Country Code': 'territory',
      'Original Source (Received)': 'platform',
      'Royalty Payable': 'amount',
      Date: 'date',
      'Release UPC': 'upc',
    },

    // Default values for missing fields
    defaults: {
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },

  {
    id: 'peermusic',
    name: 'peermusic',
    orgType: 'publisher',
    category: 'mixed',

    // Required headers that must be present for detection
    fingerprints: {
      required: ['Song Title', 'Writer', 'Publisher', 'Royalty Type', 'Amount', 'Territory', 'Period'],
      optional: [
        'ISRC',
        'ISWC',
        'Artist',
        'Album',
        'Source',
        'Society',
        'PRO',
        'Income Source',
        'Usage Type',
        'Currency',
        'Statement Date',
        'Distribution Date',
        'Writer Share',
        'Publisher Share',
        'Quantity',
        'Rate',
      ],
    },

    // Filename patterns for detection boost
    filenamePatterns: [/peermusic/i, /peer.?music/i],

    // Maps statement headers to standard fields
    headerMapping: {
      'Song Title': 'product',
      Writer: 'artist',
      Amount: 'amount',
      Territory: 'territory',
      Source: 'incomeName',
      Period: 'incomePeriod',
      'Royalty Type': 'category',
      ISRC: 'isrc',
      ISWC: 'iswc',
      'Income Source': 'incomeName',
      Society: 'incomeName',
      Quantity: 'quantity',
    },

    // Default values for missing fields
    defaults: {
      source: 'peermusic',
      sourceCategory: 'publishing',
      currency: 'USD',
    },

    // Special parsing rules
    parsingRules: {
      decimalCorrection: false,
      skipRows: 0,
      delimiter: 'auto',
    },
  },
];

/**
 * Normalizes a header string for matching
 * @param {string} header - Header string to normalize
 * @returns {string} Normalized header
 */
function normalizeHeader(header) {
  if (!header || typeof header !== 'string') return '';
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a required header is present in the CSV headers
 * @param {string} requiredHeader - The required header to find
 * @param {Array<string>} csvHeaders - The actual CSV headers
 * @returns {boolean} True if header is found (case-insensitive, fuzzy match)
 */
function headerMatches(requiredHeader, csvHeaders) {
  const normalizedRequired = normalizeHeader(requiredHeader);
  return csvHeaders.some((header) => normalizeHeader(header) === normalizedRequired);
}

/**
 * Scores a profile against the provided headers and filename
 * @param {Object} profile - Statement profile to score
 * @param {Array<string>} headers - CSV headers
 * @param {string} filename - Original filename (optional)
 * @returns {Object} Score result with confidence and match details
 */
function scoreProfile(profile, headers, filename = '') {
  let score = 0;
  let maxScore = 0;

  // Score required headers (70% weight)
  const requiredMatches = profile.fingerprints.required.filter((req) => headerMatches(req, headers));
  const requiredScore = requiredMatches.length;
  const requiredMax = profile.fingerprints.required.length;
  score += requiredScore * 70;
  maxScore += requiredMax * 70;

  // Score optional headers (20% weight)
  if (profile.fingerprints.optional && profile.fingerprints.optional.length > 0) {
    const optionalMatches = profile.fingerprints.optional.filter((opt) => headerMatches(opt, headers));
    const optionalScore = optionalMatches.length;
    const optionalMax = profile.fingerprints.optional.length;
    score += optionalScore * 20;
    maxScore += optionalMax * 20;
  } else {
    // If no optional headers defined, redistribute weight to required
    maxScore += requiredMax * 20;
    score += requiredScore * 20;
  }

  // Score filename match (10% weight)
  let filenameBonus = 0;
  if (filename && profile.filenamePatterns) {
    const filenameMatch = profile.filenamePatterns.some((pattern) => pattern.test(filename));
    if (filenameMatch) {
      filenameBonus = 10;
      score += 10;
    }
  }
  maxScore += 10;

  // Calculate confidence percentage
  const confidence = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  // Check if ALL required headers are present
  const allRequiredPresent = requiredScore === requiredMax;

  return {
    profileId: profile.id,
    profileName: profile.name,
    orgType: profile.orgType,
    confidence,
    score,
    maxScore,
    requiredMatches: requiredScore,
    requiredTotal: requiredMax,
    allRequiredPresent,
    filenameMatch: filenameBonus > 0,
    profile,
  };
}

/**
 * Detects the best matching statement profile(s) for the given CSV headers
 * @param {Array<string>} headers - CSV headers from the uploaded file
 * @param {string} filename - Original filename (optional, used for detection boost)
 * @returns {Array<Object>} Sorted array of profile matches with confidence scores
 */
export function detectStatementProfile(headers, filename = '') {
  if (!headers || headers.length === 0) {
    return [];
  }

  // Score all profiles
  const results = STATEMENT_PROFILES.map((profile) => scoreProfile(profile, headers, filename));

  // Filter by minimum threshold and sort by confidence (descending)
  const matches = results.filter((result) => result.confidence >= MINIMUM).sort((a, b) => b.confidence - a.confidence);

  return matches;
}
