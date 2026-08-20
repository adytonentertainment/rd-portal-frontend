import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';
import {
  FaDollarSign,
  FaMusic,
  FaTshirt,
  FaGlobe,
  FaChartLine,
  FaDownload,
  FaFilter,
  FaSpotify,
  FaApple,
  FaYoutube,
  FaUpload,
  FaList,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaInfoCircle,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaLock,
} from 'react-icons/fa';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import {
  getTransactionsForClient,
  getStatementsForClient,
  getTotalUsages,
  getWorksCount,
} from '../../mocks/earningsData';
import {
  hasAnyDistribution,
  hasAnyStatementData,
  getDistributedPeriods,
  subscribe as subscribeDistribution,
  CURRENT_PERIOD,
} from '../../mocks/distributionState';
import { useIsAdmin } from '../../utils/auth';
import { getWriterPersonaId } from '../../utils/persona';
import { FaHourglassHalf } from 'react-icons/fa';
import { BiTrendingUp } from 'react-icons/bi';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import GlobeIframe from '../../components/Globe/GlobeIframe';
import Box from '@mui/material/Box';
import { Tooltip as MUITooltip } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';
import {
  generateRevenueMarkers,
  getCountryCoordinates,
  normalizeTerritory,
  COUNTRY_COORDINATES,
} from '../../utils/countryCoordinates';
import SmartCsvParser from '../../utils/smartCsvParser';
import { normalizeSourceName } from '../../utils/sourceNormalization';
import IncomePeriodParser from '../../utils/incomePeriodParser';
import { formatCurrency as smartFormat, formatCompact } from '../../utils/currencyFormatter';
import { mockCoverFor } from '../../utils/mockCover';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { UserContextProvider } from '../../components/UserContext/UserContext';
import { SubscriptionContextProvider } from '../../components/SubscriptionContext/SubscriptionContext';
import Sidebar from '../../components/Sidebar/Sidebar';
import QuarterRangePicker from '../../components/QuarterRangePicker/QuarterRangePicker';
import UpgradeModal from '../../components/UpgradeModal/UpgradeModal';
import StatementsModal from '../../components/StatementsModal/StatementsModal';
import ParsingDetailsModal from '../../components/ParsingDetailsModal/ParsingDetailsModal';
import ColumnMappingModal from '../../components/ColumnMappingModal/ColumnMappingModal';
import AutoDetectConfirmModal from '../../components/AutoDetectConfirmModal/AutoDetectConfirmModal';
import CatalogHealthSummary from '../../components/CatalogHealthSummary/CatalogHealthSummary';
import ExportReportModal from '../../components/ExportReportModal/ExportReportModal';
import EditMappingModal from '../../components/EditMappingModal/EditMappingModal';
import { statementsLive } from '../../config/featureFlags';
import LanguageToggle from '../../components/LanguageToggle/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { listMyTransactions, getMyEarnings } from '../../api/portal';
import './revenue.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom component for pie chart center label
const PieCenterLabel = ({ children, isDark }) => (
  <text
    x="50%"
    y="50%"
    textAnchor="middle"
    dominantBaseline="central"
    style={{
      fontSize: '18px',
      fontWeight: 'bold',
      fill: isDark ? '#fff' : '#1a1a2e',
    }}
  >
    {children}
  </text>
);

// Album image component with fallback
const AlbumImage = ({ src, alt, style }) => {
  const [hasError, setHasError] = React.useState(false);
  const isMissing = hasError || !src || src === 'N/A';
  const effectiveSrc = isMissing ? mockCoverFor(alt) : src;
  return <img src={effectiveSrc} alt={alt} style={style} onError={() => setHasError(true)} />;
};

// No mock data - all data comes from uploaded statements

// Minimum balance a writer must reach before a distribution is paid out;
// anything below this carries forward to the next period.
const MIN_PAYOUT = 200;

// Known DSP/streaming platforms for platform detection
const KNOWN_DSPS = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube',
  amazon: 'Amazon Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
  pandora: 'Pandora',
  soundcloud: 'SoundCloud',
  iheart: 'iHeartRadio',
  audiomack: 'Audiomack',
  napster: 'Napster',
  anghami: 'Anghami',
  jiosaavn: 'JioSaavn',
  boomplay: 'Boomplay',
  tiktok: 'TikTok',
  facebook: 'Facebook/Instagram',
  instagram: 'Facebook/Instagram',
  peloton: 'Peloton',
  snap: 'Snapchat',
};

// Collapse the granular royalty income-type codes on real statements
// (MECH-STRM, PERF-STRMS, STRM-SUB, AVOD-BR, In Master, Repro-CR, PERF-LIVE, …)
// into the handful of buckets an average songwriter actually recognizes. Order
// matters: YouTube (whole catalog) → Streaming → Performance → Sync → Downloads.
const groupIncomeType = (catalog, code) => {
  const c = String(code || '').toUpperCase();
  if (String(catalog || '').toUpperCase() === 'YT') return 'YouTube';
  if (c.includes('STRM') || c.includes('STREAM')) return 'Streaming';
  if (c.includes('PERF') || c.includes('BRDC') || c.includes('RDO') || c.includes('RADIO')) return 'Performance';
  if (c.includes('SYNC')) return 'Sync';
  if (
    c.includes('MECH') ||
    c.includes('DWNL') ||
    c.includes('DOWNLOAD') ||
    c.includes('PHYS') ||
    c.includes('HFA') ||
    c.includes('RING') ||
    c.includes('REPRO')
  )
    return 'Downloads & Physical';
  if (c.includes('PRINT') || c.includes('LYR') || c.includes('SHEET')) return 'Sheet Music';
  return 'Other';
};

// Known PRO/CMO organizations that should NOT appear in platform charts
const KNOWN_PROS = [
  'bmi',
  'ascap',
  'sesac',
  'prs',
  'socan',
  'gema',
  'sacem',
  'apra',
  'mcps',
  'jasrac',
  'komca',
  'mlc',
  'harry fox',
  'hfa',
  'cmrra',
  'soundexchange',
  'songtrust',
  'kobalt',
  'sentric',
  'downtown',
  'concord',
  'peermusic',
  'cd baby',
  'tunecore',
  'distrokid',
  'aresa',
  'ice',
  'bmg',
  'mint digital',
];

// Date-aware period comparator for sorting (newest first).
// Parses "H1 2025" into [2025, 1] and compares year then half.
const comparePeriods = (a, b) => {
  const parse = (p) => {
    const m = String(p).match(/H(\d)\s*(\d{4})/);
    return m ? [parseInt(m[2], 10), parseInt(m[1], 10)] : [0, 0];
  };
  const [yearA, halfA] = parse(a);
  const [yearB, halfB] = parse(b);
  if (yearA !== yearB) return yearB - yearA; // newer year first
  return halfB - halfA; // newer half first (H2 > H1)
};

const Revenue = () => {
  const user = useContext(UserContextProvider);
  const { currentTheme } = useContext(ThemeContext);
  const { selectedClientId, selectedClient, clients } = useClientContext();
  // Local preview filter — lets a publisher view a single writer's earnings without leaving the publisher context.
  const [previewWriterId, setPreviewWriterId] = useState(null);
  const effectiveClientId = selectedClientId ?? previewWriterId;
  // Derived stats (usages, works) come from static archetype profiles. For a
  // specific writer they must read 0 once that writer has no statement data.
  const effectiveClientHasData = effectiveClientId == null || hasAnyStatementData(effectiveClientId);
  const previewClient = previewWriterId != null ? clients.find((c) => c.id === previewWriterId) : null;
  const effectiveClientName = selectedClient?.name || previewClient?.name;
  const subscriptionContext = useContext(SubscriptionContextProvider);
  const subscription = subscriptionContext?.subscription;
  // Live writer portal: a real signed-in writer (not the publisher admin) reads
  // their own distributed royalty data. They have no subscription, so treat the
  // portal as fully unlocked — their data must never be hidden behind a paywall.
  const isAdminUser = useIsAdmin();
  const { t } = useLanguage();
  // This is the writer's own earnings page. In a publisher deployment it shows
  // REAL distributed royalties to whoever is signed in — including an admin, who
  // was previously dropped into the demo dataset here and shown invented numbers
  // formatted exactly like real ones. Nothing about a page that reports money
  // should be fabricated; if there is no data to show, say so.
  const isLivePortal = statementsLive;
  // No paywall in a publisher deployment, ever. The blur and "Upgrade to view"
  // belong to the Verax SaaS product; a writer must never have their own
  // royalties censored, and an admin must not see a fake upsell over them.
  const isFreeTier = statementsLive
    ? false
    : !subscription || ['FREE', 'Free', 'ESSENTIAL', 'Essential'].includes(subscription.tier);
  const canExport =
    isLivePortal || (subscription && !['FREE', 'Free', 'ESSENTIAL', 'Essential'].includes(subscription.tier));
  // True when the signed-in account has no portal identity (admins). Kept
  // distinct from "no earnings yet", which is a different sentence entirely.
  const [portalDenied, setPortalDenied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState('Revenue');
  // Minimum-payout notice: balances under $200 carry forward instead of paying out.
  const [payoutBannerClosed, setPayoutBannerClosed] = useState(false);
  // Net payable + the statement waterfall (live writer portal only). The
  // charts below aggregate GROSS line items; this is what the writer is paid.
  const [netEarnings, setNetEarnings] = useState(null);
  // Top-songs rows are returned alongside the dimension rows but kept OUT of
  // `uploadedTransactions`: they overlap the same money, so mixing them in
  // would double-count every chart total.
  const [songRows, setSongRows] = useState([]);
  // The old prepicked-timeframe dropdown is replaced by a From/To quarter range
  // picker (see rangeFrom/rangeTo). selectedTimeframe stays 'alltime' so every
  // other timeframe-aware calculation falls on its handled all-time path.
  const [selectedTimeframe] = useState('alltime');
  // Custom date-range filter: the user picks a start and end quarter and the
  // earnings data is scoped to everything in between.
  const [rangeFrom, setRangeFrom] = useState(null);
  const [rangeTo, setRangeTo] = useState(null);
  const [filterSource, setFilterSource] = useState('all');
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [selectedPaymentSources, setSelectedPaymentSources] = useState([]); // Changed to array for multi-select
  const [showPaymentSourcesDropdown, setShowPaymentSourcesDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Song title search filter
  const [uploadedTransactions, setUploadedTransactions] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showParsingDetails, setShowParsingDetails] = useState(false);
  const [parsingResult, setParsingResult] = useState(null);
  const [uploadedStatements, setUploadedStatements] = useState([]);
  const [isStatementsModalOpen, setIsStatementsModalOpen] = useState(false);
  const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
  const [editingStatement, setEditingStatement] = useState(null);
  const [isColumnMappingOpen, setIsColumnMappingOpen] = useState(false);
  const [isAutoDetectConfirmOpen, setIsAutoDetectConfirmOpen] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingCsvText, setPendingCsvText] = useState(null);
  const [detectedProfile, setDetectedProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortByAmount, setSortByAmount] = useState('desc'); // 'asc', 'desc', or null
  const [showAuditCatalog, setShowAuditCatalog] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTransactionTab, setActiveTransactionTab] = useState('top-songs'); // 'transactions' or 'top-songs'
  const [songCatalogData, setSongCatalogData] = useState({}); // Map of song keys to {albumArt, artist} from catalog
  const [sourceViewMode, setSourceViewMode] = useState('incomeType'); // 'incomeType' or 'organization'
  const [missingSongs, setMissingSongs] = useState(null); // Songs in catalog without statement data
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial data fetch
  const [quarterlyExpectedRevenue, setQuarterlyExpectedRevenue] = useState(null); // Expected revenue from catalog calculations
  const [allTimeYearRange, setAllTimeYearRange] = useState({ startYear: null, endYear: null }); // Year range for "All Time" view (3 years = 12 quarters)
  const fileInputRef = React.useRef(null);

  // Use only uploaded transactions - no mock data
  const transactions = uploadedTransactions;

  // ── Demo: gate the writer-facing portal on distribution. Stats only appear
  //    once the admin has clicked Distribute for at least one period.
  const isAdminDemo = useIsAdmin();
  const navigate = useNavigate();
  const [, forceTick] = useState(0);
  useEffect(() => subscribeDistribution(() => forceTick((x) => x + 1)), []);
  // The active persona is the single source of truth for "this is a writer's
  // own portal". The publisher admin is never gated; a writer sees NOTHING
  // until the admin clicks Distribute — uploading statements does not count.
  const writerPersonaId = getWriterPersonaId();
  const isWriterView = writerPersonaId != null;
  const writerHasNoDistributions = isWriterView && !hasAnyDistribution(writerPersonaId);
  // Distributed periods available to this writer (most recent first)
  const writerDistributedPeriods = isWriterView ? [...getDistributedPeriods(writerPersonaId)].sort(comparePeriods) : [];
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  // Track if we've auto-selected once to prevent re-selecting after user deselects all chips.
  const hasAutoSelected = useRef(false);
  // Default the selection to the newest distributed period the first time we get one.
  const distributedPeriodsKey = writerDistributedPeriods.join('|');
  useEffect(() => {
    // Reset auto-select tracker when switching writers or when distributed periods change
    if (!isWriterView || writerDistributedPeriods.length === 0) {
      hasAutoSelected.current = false;
      return;
    }
    // Only auto-select once per writer view session
    if (!hasAutoSelected.current && selectedPeriods.length === 0) {
      hasAutoSelected.current = true;
      setSelectedPeriods([writerDistributedPeriods[0]]);
    }
  }, [isWriterView, distributedPeriodsKey, writerDistributedPeriods, selectedPeriods.length]);
  const togglePeriod = (p) =>
    setSelectedPeriods((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const selectAllPeriods = () => setSelectedPeriods(writerDistributedPeriods);

  // ── Live writer portal: load THIS writer's real distributed line items ─────
  // These feed every visual (overview, pies, globe, bars) through the same
  // `uploadedTransactions` seam the demo uses — just with real backend data.
  useEffect(() => {
    if (!isLivePortal) return undefined;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [rows, earnings] = await Promise.all([listMyTransactions(), getMyEarnings()]);
        if (!cancelled) {
          const all = Array.isArray(rows) ? rows : [];
          setUploadedTransactions(all.filter((r) => !r.is_song_row));
          setSongRows(all.filter((r) => r.is_song_row));
          setNetEarnings(earnings || null);
          setPortalDenied(false);
        }
      } catch (err) {
        if (!cancelled) {
          setUploadedTransactions([]);
          setSongRows([]);
          setNetEarnings(null);
          // 403 = signed in, but this account is not a portal contact — an
          // admin, typically. Empty zeros would read as "you earned nothing".
          setPortalDenied(err?.status === 403);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLivePortal]);

  // ── Demo: inject mock transactions/statements per selected/preview writer ─
  // Re-run when distributedPeriodsKey changes (admin distributed a new period).
  useEffect(() => {
    if (isLivePortal) return; // live portal loads real data above
    setUploadedTransactions(getTransactionsForClient(effectiveClientId, effectiveClientName));
    setUploadedStatements(getStatementsForClient(effectiveClientId));
    setIsLoading(false);
  }, [isLivePortal, effectiveClientId, effectiveClientName, distributedPeriodsKey]);

  // Load transactions and statements from backend on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Live writer portal loads from /me/transactions (its own effect); this
      // demo/estimator path must not run and overwrite it.
      if (isLivePortal) {
        return;
      }

      // Skip data loading for free tier users - show empty state instead
      if (isFreeTier) {
        setIsLoading(false);
        return;
      }

      try {
        // Build URL with optional client_id filter
        const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';

        // Load transactions
        const transactionsResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/transactions${clientParam}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (transactionsResponse.ok) {
          const data = await transactionsResponse.json();
          // Demo: keep injected mocks unless backend actually has data
          if (data.transactions && data.transactions.length > 0) {
            setUploadedTransactions(data.transactions);
          }
        }

        // Load statements
        const statementsResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/statements${clientParam}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (statementsResponse.ok) {
          const data = await statementsResponse.json();
          if (data.statements && data.statements.length > 0) {
            setUploadedStatements(data.statements);
          }
        }

        // Load missing songs (songs in catalog without statement data)
        const missingSongsResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/missing-from-statements${clientParam}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (missingSongsResponse.ok) {
          const data = await missingSongsResponse.json();
          setMissingSongs(data);
        }

        // Load quarterly expected revenue from catalog calculations
        const quarterlyRevenueResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `stats/quarterly-revenue${clientParam}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (quarterlyRevenueResponse.ok) {
          const data = await quarterlyRevenueResponse.json();
          setQuarterlyExpectedRevenue(data);
        }
      } catch (error) {
        console.error('Could not load data from backend:', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedClientId, isFreeTier, isLivePortal]);

  // Calculate available year range from transaction AND expected revenue data for "All Time" navigation
  const availableYearRange = useMemo(() => {
    let minYear = Infinity;
    let maxYear = -Infinity;

    // Check transactions for year range
    transactions.forEach((t) => {
      let year = null;
      if (t.incomePeriod) {
        const quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
        if (quarterKey) {
          year = parseInt(quarterKey.split('-Q')[0]);
        }
      }
      if (!year && t.date) {
        year = new Date(t.date).getFullYear();
      }
      if (year) {
        minYear = Math.min(minYear, year);
        maxYear = Math.max(maxYear, year);
      }
    });

    // Also check expected revenue quarters (from catalog/streaming data)
    if (quarterlyExpectedRevenue?.quarters) {
      quarterlyExpectedRevenue.quarters.forEach((quarterKey) => {
        const year = parseInt(quarterKey.split('-Q')[0]);
        if (year) {
          minYear = Math.min(minYear, year);
          maxYear = Math.max(maxYear, year);
        }
      });
    }

    // Fallback to current year range if no data
    if (minYear === Infinity) {
      const currentYear = new Date().getFullYear();
      return { minYear: currentYear - 2, maxYear: currentYear };
    }

    return { minYear, maxYear };
  }, [transactions, quarterlyExpectedRevenue]);

  // Initialize year range when data loads (default to most recent 3 years)
  useEffect(() => {
    if (availableYearRange.maxYear && !allTimeYearRange.endYear) {
      const endYear = availableYearRange.maxYear;
      // Always show 3 years minimum, or all available years if less than 3
      const yearSpan = Math.min(availableYearRange.maxYear - availableYearRange.minYear, 2);
      const startYear = endYear - yearSpan;
      setAllTimeYearRange({ startYear, endYear });
    }
  }, [availableYearRange, allTimeYearRange.endYear]);

  // Navigate year range for "All Time" view (shift by 1 year at a time)
  const navigateYearRange = (direction) => {
    setAllTimeYearRange((prev) => {
      const shift = direction === 'prev' ? -1 : 1;
      let newStartYear = prev.startYear + shift;
      let newEndYear = prev.endYear + shift;

      // Clamp to available range
      if (newStartYear < availableYearRange.minYear) {
        newStartYear = availableYearRange.minYear;
        newEndYear = newStartYear + 2;
      }
      if (newEndYear > availableYearRange.maxYear) {
        newEndYear = availableYearRange.maxYear;
        newStartYear = newEndYear - 2;
      }

      // Ensure we don't go below minYear after adjustments
      if (newStartYear < availableYearRange.minYear) {
        newStartYear = availableYearRange.minYear;
      }

      return { startYear: newStartYear, endYear: newEndYear };
    });
  };

  // Check if navigation is possible (can navigate if there's more data outside current range)
  const canNavigatePrev = allTimeYearRange.startYear && allTimeYearRange.startYear > availableYearRange.minYear;
  const canNavigateNext = allTimeYearRange.endYear && allTimeYearRange.endYear < availableYearRange.maxYear;

  // Handle file upload - check for free tier first
  const handleUploadClick = () => {
    if (isFreeTier) {
      setShowUpgradeModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  // Refresh quarterly expected revenue data (called after catalog changes)
  const refreshQuarterlyRevenue = async () => {
    try {
      const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';
      const response = await fetch(
        urlJoin(process.env.REACT_APP_BACKEND_URL, `stats/quarterly-revenue${clientParam}`),
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuarterlyExpectedRevenue(data);
      }
    } catch (error) {
      console.error('Error refreshing quarterly revenue:', error);
    }
  };

  // Helper to check free tier before executing an action
  const requireSubscription = (action, requirePro = false, featureName = 'Revenue') => {
    if (requirePro && !canExport) {
      setUpgradeModalFeature(featureName);
      setShowUpgradeModal(true);
      return;
    }
    if (!requirePro && isFreeTier) {
      setUpgradeModalFeature(featureName);
      setShowUpgradeModal(true);
      return;
    }
    action();
  };

  // Handle syncing songs to catalog
  const handleSyncToCatalog = async () => {
    if (isFreeTier) {
      setShowUpgradeModal(true);
      return;
    }
    if (uploadedTransactions.length === 0) {
      alert('No transactions found. Please upload statements first.');
      return;
    }

    setIsSyncing(true);

    try {
      // Extract unique songs from transactions
      // Use ISRC as primary key when available, fall back to title-based key
      const songsMap = new Map();
      const isrcToKey = new Map(); // Track which map key an ISRC belongs to

      uploadedTransactions.forEach((transaction) => {
        const songTitle = (transaction.product || transaction.title || '').trim();
        const artist = (transaction.artist || '').trim();
        const isrc = (transaction.isrc || '').trim();

        if (!songTitle || songTitle === 'Unknown') return;

        // If this transaction has an ISRC, check if we already have this ISRC
        if (isrc && isrc !== 'N/A') {
          if (isrcToKey.has(isrc)) {
            // Already tracked this ISRC, skip
            return;
          }

          // Check if we already have this song by title (without ISRC)
          const titleKey = songTitle.toLowerCase();
          if (songsMap.has(titleKey)) {
            // Update existing entry with the ISRC
            const existing = songsMap.get(titleKey);
            if (!existing.isrc) {
              existing.isrc = isrc;
            }
            isrcToKey.set(isrc, titleKey);
            return;
          }

          // New song with ISRC
          isrcToKey.set(isrc, titleKey);
          songsMap.set(titleKey, {
            title: songTitle,
            artist: artist,
            isrc: isrc,
          });
        } else {
          // No ISRC — deduplicate by title only
          const titleKey = songTitle.toLowerCase();
          if (!songsMap.has(titleKey)) {
            songsMap.set(titleKey, {
              title: songTitle,
              artist: artist,
              isrc: '',
            });
          }
        }
      });

      const uniqueSongs = Array.from(songsMap.values());
      const withIsrc = uniqueSongs.filter((s) => s.isrc && s.isrc !== 'N/A');
      const withoutIsrc = uniqueSongs.filter((s) => !s.isrc || s.isrc === 'N/A');
      console.log(
        `[Sync] ${uniqueSongs.length} unique songs: ${withIsrc.length} with ISRC, ${withoutIsrc.length} without`
      );
      console.log(
        '[Sync] Songs with ISRC:',
        withIsrc.map((s) => `${s.title} (${s.isrc})`)
      );
      console.log(
        '[Sync] Songs without ISRC:',
        withoutIsrc.map((s) => s.title)
      );

      // Call backend API to add songs to catalog
      const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `catalog/bulk-add${clientParam}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ songs: uniqueSongs }),
      });

      if (response.ok) {
        const result = await response.json();

        // Also resolve artist names for all catalog songs (in case they have writer names)
        try {
          const resolveResponse = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, 'catalog/resolve-artists'), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });

          if (resolveResponse.ok) {
            const resolveResult = await resolveResponse.json();
            alert(`Synced ${result.added} songs and resolved ${resolveResult.updated} artist names!`);
          } else {
            alert(`Synced ${result.added} songs to catalog!`);
          }
        } catch (resolveError) {
          console.error('Error resolving artists:', resolveError);
          alert(`Synced ${result.added} songs to catalog!`);
        }

        // Refresh revenue data to reflect catalog changes
        await refreshQuarterlyRevenue();
      } else {
        const error = await response.json();
        alert(`Failed to sync songs: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error syncing to catalog:', error);
      alert('Failed to sync songs to catalog. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Use the smart CSV parser
  const parseCSV = (text) => {
    const parser = new SmartCsvParser(true); // Enable debug mode
    const result = parser.parse(text);

    // Store the parsing result for display
    setParsingResult(result);
    setShowParsingDetails(true);

    if (!result.success) {
      console.error('CSV Parsing failed:', result.error);
      return [];
    }

    return result.transactions;
  };

  // Old parseCSV function (keeping for reference but unused)
  const parseCSVOld = (text) => {
    // Handle different line endings (Windows, Unix, Mac)
    const lines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length < 2) {
      return [];
    }

    // Parse CSV properly handling quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
          // Handle different delimiters
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerValues = parseCSVLine(lines[0]);

    const headers = headerValues.map((h) =>
      h
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );

    const transactions = [];
    let parsedCount = 0;
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) {
        skippedCount++;
        continue; // Skip empty or invalid lines
      }

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Smart field mapping - try multiple possible field names
      const getField = (...fieldNames) => {
        for (const name of fieldNames) {
          if (row[name] && row[name].trim()) return row[name].trim();
        }
        return '';
      };

      const dateValue = getField('date', 'transaction_date', 'payment_date', 'period');
      const amountValue = getField('amount', 'revenue', 'total', 'payment', 'earnings');

      // Clean and parse amount
      const cleanAmount = (value) => {
        if (!value) return 0;
        // Remove currency symbols, commas, and spaces
        const cleaned = value.replace(/[$£€¥,\s]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : Math.abs(parsed);
      };

      const amount = cleanAmount(amountValue);

      // Process rows even without date if they have amount (some CSVs might not have dates)
      if (amount > 0) {
        parsedCount++;
        const source = getField('source', 'platform', 'dsp', 'service', 'store', 'revenue_source');
        const category = getField('category', 'type', 'source_category', 'revenue_type', 'income_type');

        // Smart category detection
        let sourceCategory = 'streaming';
        if (category) {
          const catLower = category.toLowerCase();
          if (catLower.includes('stream')) sourceCategory = 'streaming';
          else if (catLower.includes('performance') || catLower.includes('prf')) sourceCategory = 'performance';
          else if (catLower.includes('mechanical')) sourceCategory = 'mechanical';
          else if (catLower.includes('sync')) sourceCategory = 'sync';
          else if (catLower.includes('merch')) sourceCategory = 'merchandise';
          else if (catLower.includes('live') || catLower.includes('concert')) sourceCategory = 'live';
        } else if (source) {
          const srcLower = source.toLowerCase();
          if (srcLower.includes('spotify') || srcLower.includes('apple') || srcLower.includes('youtube'))
            sourceCategory = 'streaming';
          else if (srcLower.includes('performance') || srcLower.includes('ascap') || srcLower.includes('bmi'))
            sourceCategory = 'performance';
        }

        transactions.push({
          id: `uploaded-${Date.now()}-${i}`,
          date: dateValue || new Date().toISOString().split('T')[0],
          source: source || 'Unknown',
          sourceCategory,
          product: getField('product', 'song', 'track', 'title', 'asset', 'work') || 'Unknown',
          territory: getField('territory', 'country', 'region', 'territory_code') || 'US',
          territoryName: getField('territory_name', 'country_name') || 'Unknown',
          currency: getField('currency', 'currency_code') || 'USD',
          amount,
          artist: getField('artist', 'artist_name', 'performer') || 'Various Artists',
          status: getField('status', 'payment_status') || 'paid',
        });
      }
    }

    return transactions;
  };

  // Reusable function to save transactions to backend
  const saveTransactionsToBackend = async (transactions, filename, fileSize, profileId = null) => {
    try {
      const saveResponse = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, 'revenue/transactions/bulk'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          transactions: transactions,
          filename: filename,
          fileSize: fileSize,
          clientId: selectedClientId,
          profileId: profileId,
        }),
      });

      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';

        // Reload all transactions from database to get the correct IDs
        const transactionsResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/transactions${clientParam}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setUploadedTransactions(transactionsData.transactions || []);
        }

        // Reload all statements from database
        const statementsResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/statements${clientParam}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (statementsResponse.ok) {
          const statementsData = await statementsResponse.json();
          setUploadedStatements(statementsData.statements || []);
        }

        return { success: true };
      } else {
        // If backend save fails, still update local state for temporary use
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        setUploadedTransactions((prev) => [...prev, ...transactions]);

        const statementDate = transactions[0]?.date || new Date().toISOString().split('T')[0];
        setUploadedStatements((prev) => [
          ...prev,
          {
            id: Date.now(),
            filename: filename,
            uploadDate: new Date().toISOString(),
            statementDate: statementDate,
            transactionCount: transactions.length,
            totalAmount: totalAmount,
            fileSize: fileSize,
          },
        ]);

        return { success: false };
      }
    } catch (error) {
      console.error('Backend save failed, data stored locally only:', error.message);
      // Update local state as fallback
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      setUploadedTransactions((prev) => [...prev, ...transactions]);

      const statementDate = transactions[0]?.date || new Date().toISOString().split('T')[0];
      setUploadedStatements((prev) => [
        ...prev,
        {
          id: Date.now(),
          filename: filename,
          uploadDate: new Date().toISOString(),
          statementDate: statementDate,
          transactionCount: transactions.length,
          totalAmount: totalAmount,
          fileSize: fileSize,
        },
      ]);

      return { success: false, error };
    }
  };

  // Handle auto-detect import confirmation
  const handleAutoDetectImport = async () => {
    if (!pendingCsvText || !pendingFile || !detectedProfile) return;

    const parser = new SmartCsvParser(true);

    // Parse with the detected profile
    const result = parser.parseWithProfile(pendingCsvText, detectedProfile);

    if (result.success && result.transactions.length > 0) {
      const totalAmount = result.transactions.reduce((sum, t) => sum + t.amount, 0);

      // Save to backend with profile ID
      await saveTransactionsToBackend(
        result.transactions,
        pendingFile.name,
        `${(pendingFile.size / 1024 / 1024).toFixed(2)} MB`,
        detectedProfile.id
      );

      setParsingResult(result);
      alert(
        `✅ Successfully imported ${result.transactions.length} transactions\n💰 Total: $${totalAmount.toFixed(2)}`
      );

      // Close modal and clear pending data
      setIsAutoDetectConfirmOpen(false);
      setPendingFile(null);
      setPendingCsvText(null);
      setDetectedProfile(null);
    } else {
      alert('⚠️ No valid transactions found in CSV file.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // client_id is optional - will be included if a client is selected

    // For CSV files, show column mapping modal first
    if (file.name.endsWith('.csv')) {
      const text = await file.text();

      // Store file and text for later processing
      setPendingFile(file);
      setPendingCsvText(text);

      // Parse to get headers and preview using SmartCsvParser (handles all delimiters)
      const parser = new SmartCsvParser(true);
      const previewResult = parser.preview(text, file.name);

      if (!previewResult.success) {
        alert('Could not parse CSV file. Please check the format.');
        return;
      }

      // Check if a profile was auto-detected with high confidence
      if (previewResult.autoApply && previewResult.detectedProfile) {
        // High confidence match - open AutoDetectConfirmModal
        setDetectedProfile(previewResult.detectedProfile);
        setIsAutoDetectConfirmOpen(true);
        return;
      }

      // Convert mapping from {fieldName: columnIndex} to {headerName: fieldName}
      const suggestedMappingForModal = {};
      Object.entries(previewResult.suggestedMapping).forEach(([fieldName, columnIndex]) => {
        const headerName = previewResult.headers[columnIndex];
        if (headerName) {
          suggestedMappingForModal[headerName] = fieldName;
        }
      });

      // Store profile detection results for ColumnMappingModal
      setCsvPreviewData({
        headers: previewResult.headers,
        sampleData: previewResult.sampleData,
        suggestedMapping: suggestedMappingForModal,
        detectedProfile: previewResult.detectedProfile,
        detectionConfidence: previewResult.detectionConfidence,
      });

      // Open column mapping modal (with profile suggestion if detected)
      setIsColumnMappingOpen(true);
      return;
    }
  };

  // Process CSV after user confirms column mapping
  const handleColumnMappingConfirm = async (config) => {
    if (!pendingCsvText || !pendingFile) return;

    const parser = new SmartCsvParser(true);

    // Convert column mapping from {headerName: fieldName} to {fieldName: columnIndex}
    const headers = csvPreviewData.headers;
    const mappingByIndex = {};

    Object.entries(config.columnMapping).forEach(([headerName, fieldName]) => {
      if (fieldName) {
        // Skip empty/ignored columns
        const columnIndex = headers.indexOf(headerName);
        if (columnIndex >= 0) {
          mappingByIndex[fieldName] = columnIndex;
        }
      }
    });

    // Parse with custom column mapping
    const result = parser.parse(pendingCsvText, {
      customMapping: mappingByIndex,
      decimalCorrection: config.decimalCorrection,
      decimalDivider: config.decimalDivider,
      skipRows: config.skipRows,
    });

    if (result.success && result.transactions.length > 0) {
      const totalAmount = result.transactions.reduce((sum, t) => sum + t.amount, 0);

      // Save to backend (persistent storage)
      await saveTransactionsToBackend(
        result.transactions,
        pendingFile.name,
        `${(pendingFile.size / 1024 / 1024).toFixed(2)} MB`
      );

      setParsingResult(result);
      alert(
        `✅ Successfully imported ${result.transactions.length} transactions\n💰 Total: $${totalAmount.toFixed(2)}`
      );

      // Close modal and clear pending data
      setIsColumnMappingOpen(false);
      setPendingFile(null);
      setPendingCsvText(null);
    } else {
      alert('⚠️ No valid transactions found in CSV file.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle deleting a statement
  const handleDeleteStatement = async (statementId) => {
    if (
      window.confirm(
        'Are you sure you want to delete this statement? This will also delete all associated transactions.'
      )
    ) {
      try {
        const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/statements/${statementId}`), {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          // Remove the statement from local state
          setUploadedStatements((prev) => prev.filter((statement) => statement.id !== statementId));

          // Reload transactions to reflect deleted statement's transactions
          const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';
          const transactionsResponse = await fetch(
            urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/transactions${clientParam}`),
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          if (transactionsResponse.ok) {
            const data = await transactionsResponse.json();
            setUploadedTransactions(data.transactions || []);
          }
        } else {
          alert('Failed to delete statement. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting statement:', error);
        alert('Failed to delete statement. Please try again.');
      }
    }
  };

  // Note: totalRevenue moved down to use filteredTotalRevenue after filters are applied

  // Compute available quarters from transaction data for the dropdown
  const availableQuarters = useMemo(() => {
    const quartersSet = new Set();
    transactions.forEach((t) => {
      let quarterKey;
      if (t.incomePeriod) {
        quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
      }
      if (!quarterKey && t.date) {
        const date = new Date(t.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        quarterKey = `${year}-Q${quarter}`;
      }
      if (quarterKey) {
        quartersSet.add(quarterKey);
      }
    });
    return Array.from(quartersSet).sort().reverse(); // Most recent first
  }, [transactions]);

  // Seed the range to the data's span the first time data arrives. Only sets
  // when unset — the user is free to pick quarters outside the data range.
  useEffect(() => {
    if (availableQuarters.length === 0) return;
    setRangeFrom((cur) => cur ?? availableQuarters[availableQuarters.length - 1]);
    setRangeTo((cur) => cur ?? availableQuarters[0]);
  }, [availableQuarters]);

  // Filter and sort transactions - MUST BE DEFINED BEFORE CHART DATA
  const filteredTransactions = useMemo(() => {
    // Writer view: only ever consider transactions whose period has been distributed.
    // Plus, if the user has narrowed via the period chips, respect that.
    let filtered = transactions;
    if (isWriterView) {
      const allowed = new Set(writerDistributedPeriods);
      filtered = filtered.filter((t) => t.period && allowed.has(t.period));
      if (selectedPeriods.length > 0) {
        const picked = new Set(selectedPeriods);
        filtered = filtered.filter((t) => picked.has(t.period));
      }
    }

    // Custom range: keep only transactions whose quarter falls within the
    // user-selected From/To quarters (inclusive). Quarter keys are fixed-width
    // "YYYY-QN", so plain string comparison is chronological.
    if (rangeFrom && rangeTo) {
      const lo = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
      const hi = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
      filtered = filtered.filter((t) => {
        let quarterKey;
        if (t.incomePeriod) {
          quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
        }
        if (!quarterKey && t.date) {
          const date = new Date(t.date);
          quarterKey = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
        }
        return quarterKey && quarterKey >= lo && quarterKey <= hi;
      });
    }

    // Then apply other filters
    filtered = filtered
      .filter((t) => filterSource === 'all' || t.sourceCategory === filterSource)
      .filter((t) => filterTerritory === 'all' || t.territory === filterTerritory)
      .filter((t) => selectedPaymentSources.length === 0 || selectedPaymentSources.includes(t.source))
      .filter((t) => {
        // Song title search filter - search across multiple fields
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const product = (t.product || '').toLowerCase();
        const artist = (t.artist || '').toLowerCase();
        const incomeName = (t.incomeName || '').toLowerCase();
        const source = (t.source || '').toLowerCase();

        return (
          product.includes(search) || artist.includes(search) || incomeName.includes(search) || source.includes(search)
        );
      });

    // Then apply sorting
    if (sortByAmount === 'asc') {
      filtered = filtered.sort((a, b) => a.amount - b.amount);
    } else if (sortByAmount === 'desc') {
      filtered = filtered.sort((a, b) => b.amount - a.amount);
    } else {
      // Default sort by date
      filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return filtered;
  }, [
    transactions,
    rangeFrom,
    rangeTo,
    filterSource,
    filterTerritory,
    selectedPaymentSources,
    sortByAmount,
    searchTerm,
    isWriterView,
    writerDistributedPeriods.join('|'),
    selectedPeriods.join('|'),
  ]);

  // Calculate top earning songs from filtered transactions
  // Groups by ISRC (most reliable) or normalized product title to avoid
  // splitting the same song across different writer lists from PRO/CMO statements
  // Song rows carry period/date/title only, so they honour the range and search
  // filters; territory/source filters don't apply to a per-work total.
  const filteredSongRows = useMemo(() => {
    let rows = songRows;
    if (rangeFrom && rangeTo) {
      const lo = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
      const hi = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
      rows = rows.filter((t) => {
        let quarterKey;
        if (t.incomePeriod) quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
        if (!quarterKey && t.date) {
          const d = new Date(t.date);
          quarterKey = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        }
        return quarterKey && quarterKey >= lo && quarterKey <= hi;
      });
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      rows = rows.filter((t) => (t.product || '').toLowerCase().includes(search));
    }
    return rows;
  }, [songRows, rangeFrom, rangeTo, searchTerm]);

  const topEarningSongs = useMemo(() => {
    const songRevenueMap = {};

    // Detect if an "artist" value is actually a pipe-delimited writer list (from MLC/PRO statements)
    const isWriterList = (artist) => {
      if (!artist || artist === 'Unknown') return true;
      return artist.includes('|');
    };

    // Normalize product title for grouping (uppercase, trim, remove extra spaces)
    const normalizeProduct = (product) => {
      return (product || 'Unknown').toUpperCase().replace(/\s+/g, ' ').trim();
    };

    // Statement lines that aren't song-level allocations (lump-sum PRO payments,
    // statement adjustments, sub-threshold rollups) must not appear as "songs".
    const NON_SONG_TITLES = new Set([
      'performance and mechanical royalties',
      'statement adjustments & sub-threshold lines',
    ]);

    const songSource = isLivePortal ? filteredSongRows : filteredTransactions;
    songSource.forEach((t) => {
      // Skip non-song lines so lump-sum / adjustment rows don't pollute Top Songs
      if (t.title && NON_SONG_TITLES.has(t.title.toLowerCase().trim())) return;
      if (t.statementType === 'Adjustment') return;
      // Group by ISRC when available, otherwise by normalized product title
      // Do NOT group by artist, since PRO/CMO statements put writer lists in the artist field
      // which causes the same song to split into many entries
      const normalizedProduct = normalizeProduct(t.product);
      const songKey = t.isrc ? `isrc:${t.isrc.replace(/[\s-]/g, '').toUpperCase()}` : `title:${normalizedProduct}`;

      const artist = t.artist || '';
      const artistIsWriters = isWriterList(artist);

      if (!songRevenueMap[songKey]) {
        songRevenueMap[songKey] = {
          product: t.product || 'Unknown',
          // Only use artist if it's a real performing artist (not a writer list)
          artist: artistIsWriters ? '' : artist,
          writer: t.writer || (artistIsWriters ? artist : ''),
          totalRevenue: 0,
          transactionCount: 0,
          territories: new Set(),
          sources: new Set(),
          isrc: t.isrc || null,
          albumArt: null,
        };
      }

      songRevenueMap[songKey].totalRevenue += t.amount;
      songRevenueMap[songKey].transactionCount += 1;
      if (t.territory) songRevenueMap[songKey].territories.add(t.territory);
      if (t.source) songRevenueMap[songKey].sources.add(t.source);

      // Store ISRC if we don't have one yet
      if (!songRevenueMap[songKey].isrc && t.isrc) {
        songRevenueMap[songKey].isrc = t.isrc;
      }

      // If we find a real performing artist (not a writer list), use it
      if (!songRevenueMap[songKey].artist && !artistIsWriters && artist) {
        songRevenueMap[songKey].artist = artist;
      }
    });

    // Convert to array and sort by total revenue
    return Object.values(songRevenueMap)
      .map((song) => ({
        ...song,
        territoryCount: song.territories.size,
        sourceCount: song.sources.size,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTransactions, filteredSongRows, isLivePortal]);

  // Fetch catalog data (album art + resolved artist) for top earning songs
  useEffect(() => {
    const fetchCatalogData = async () => {
      if (topEarningSongs.length === 0 || activeTransactionTab !== 'top-songs') {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // Helper function to normalize ISRC (remove spaces, dashes, uppercase)
      const normalizeIsrc = (isrc) => {
        if (!isrc) return null;
        return isrc.replace(/[\s-]/g, '').toUpperCase().trim();
      };

      // Helper function to normalize titles (remove diacritics and special chars)
      const normalizeTitle = (str) => {
        return (str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      };

      // Helper function to normalize artist names
      const normalizeArtist = (str) => {
        return (str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // First, fetch the entire catalog once (more efficient than individual queries)
      let catalogTracks = [];
      try {
        const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';
        const catalogResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `catalog/tracks${clientParam}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (catalogResponse.ok) {
          const data = await catalogResponse.json();
          catalogTracks = data.items || [];
        }
      } catch (error) {
        console.error('[Catalog Data] Error fetching catalog:', error);
        return;
      }

      if (catalogTracks.length === 0) {
        return;
      }

      // Build lookup maps for efficient matching
      const catalogByIsrc = {};
      const catalogByTitle = {};
      const catalogByArtistTitle = {};
      const catalogByArtist = {};
      catalogTracks.forEach((track) => {
        // Index by normalized ISRC
        const normalizedIsrc = normalizeIsrc(track.isrc);
        if (normalizedIsrc && normalizedIsrc !== 'N/A') {
          catalogByIsrc[normalizedIsrc] = track;
        }
        // Index by normalized title
        const normalizedTitle = normalizeTitle(track.title);
        if (normalizedTitle) {
          catalogByTitle[normalizedTitle] = track;
        }
        // Index by normalized artist+title combo
        const normalizedArtist = normalizeArtist(track.artist);
        if (normalizedTitle && normalizedArtist) {
          catalogByArtistTitle[`${normalizedArtist}|||${normalizedTitle}`] = track;
        }
        // Index by artist (store array of tracks)
        if (normalizedArtist) {
          if (!catalogByArtist[normalizedArtist]) {
            catalogByArtist[normalizedArtist] = [];
          }
          catalogByArtist[normalizedArtist].push(track);
        }
      });

      const newCatalogData = {};
      const songsToFetch = topEarningSongs.slice(0, 50);

      // Helper: detect if an artist string is a pipe-delimited writer list (not a real artist)
      const isWriterList = (artist) => {
        if (!artist || artist === 'Unknown' || artist === '') return true;
        return artist.includes('|');
      };

      for (const song of songsToFetch) {
        const songKey = `${song.product}|||${song.artist}`;

        // Skip if we already have catalog data for this song
        if (songCatalogData[songKey]) {
          continue;
        }

        let matchedTrack = null;

        const normalizedSongTitle = normalizeTitle(song.product);
        const normalizedSongArtist = normalizeArtist(song.artist);
        const hasRealArtist = !isWriterList(song.artist);

        // Strategy 1: ISRC match (most reliable — identifies exact recording)
        const normalizedIsrc = normalizeIsrc(song.isrc);
        if (normalizedIsrc && catalogByIsrc[normalizedIsrc]) {
          matchedTrack = catalogByIsrc[normalizedIsrc];
        }

        // Strategy 2: Artist+title combo match (only if we have a real performing artist, not writer list)
        if (!matchedTrack && hasRealArtist && normalizedSongArtist && normalizedSongTitle) {
          const artistTitleKey = `${normalizedSongArtist}|||${normalizedSongTitle}`;
          if (catalogByArtistTitle[artistTitleKey]) {
            matchedTrack = catalogByArtistTitle[artistTitleKey];
          }
        }

        // Strategy 3: Exact title match — ONLY if the title is specific enough (>3 words or >15 chars)
        // Short/common titles like "Love", "3AM", "Flow" would match wrong songs
        if (!matchedTrack && normalizedSongTitle && normalizedSongTitle !== 'unknown') {
          const wordCount = normalizedSongTitle.split(' ').filter(Boolean).length;
          const isSpecificTitle = wordCount >= 3 || normalizedSongTitle.length >= 15;
          if (isSpecificTitle && catalogByTitle[normalizedSongTitle]) {
            matchedTrack = catalogByTitle[normalizedSongTitle];
          }
        }

        // Strategy 4: Partial title match within a real artist's catalog (skip if artist is a writer list)
        if (!matchedTrack && hasRealArtist && normalizedSongArtist && catalogByArtist[normalizedSongArtist]) {
          const artistTracks = catalogByArtist[normalizedSongArtist];
          for (const track of artistTracks) {
            const trackTitle = normalizeTitle(track.title);
            if (
              trackTitle === normalizedSongTitle ||
              trackTitle.includes(normalizedSongTitle) ||
              normalizedSongTitle.includes(trackTitle)
            ) {
              matchedTrack = track;
              break;
            }
          }
        }

        if (matchedTrack) {
          newCatalogData[songKey] = {
            albumArt: matchedTrack.album_art || null,
            artist: matchedTrack.artist || null,
          };
        }
      }

      // Collect ISRCs for songs that weren't matched from catalog
      const unmatchedIsrcs = [];
      const isrcToSongKey = {};
      for (const song of songsToFetch) {
        const songKey = `${song.product}|||${song.artist}`;
        if (!newCatalogData[songKey] && song.isrc && song.isrc !== 'N/A') {
          unmatchedIsrcs.push(song.isrc);
          isrcToSongKey[song.isrc.replace(/[\s-]/g, '').toUpperCase().trim()] = songKey;
        }
      }

      // If there are unmatched songs with ISRCs, look them up via Spotify
      if (unmatchedIsrcs.length > 0) {
        try {
          const spotifyResponse = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, 'search/lookup-isrcs'), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(unmatchedIsrcs),
          });

          if (spotifyResponse.ok) {
            const spotifyData = await spotifyResponse.json();

            for (const [isrc, trackInfo] of Object.entries(spotifyData)) {
              const songKey = isrcToSongKey[isrc];
              if (songKey && trackInfo) {
                newCatalogData[songKey] = {
                  albumArt: trackInfo.album_art || null,
                  artist: trackInfo.artist || null,
                };
              }
            }
          }
        } catch (error) {
          console.error('[Catalog Data] Error looking up ISRCs via Spotify:', error);
        }
      }

      // Log any songs that still couldn't be matched
      if (Object.keys(newCatalogData).length > 0) {
        setSongCatalogData((prev) => ({ ...prev, ...newCatalogData }));
      }
    };

    fetchCatalogData();
  }, [topEarningSongs, activeTransactionTab]);

  // Filter statements based on timeframe (using income period from transactions, not statement date)
  const filteredStatements = useMemo(() => {
    if (selectedTimeframe === 'alltime') {
      return uploadedStatements;
    }

    // Only include statements that have at least one transaction within the timeframe
    return uploadedStatements.filter((statement) => {
      // Check if any transaction from this statement is in the filtered transactions
      const hasTransactionInTimeframe = filteredTransactions.some((t) => t.statementId === statement.id);
      return hasTransactionInTimeframe;
    });
  }, [uploadedStatements, selectedTimeframe, filteredTransactions]);

  // Check if any filters are active (the quarter range is a primary control,
  // not a clearable filter, so it is intentionally excluded here)
  const hasActiveFilters = useMemo(() => {
    return (
      filterSource !== 'all' || filterTerritory !== 'all' || selectedPaymentSources.length > 0 || searchTerm !== ''
    );
  }, [filterSource, filterTerritory, selectedPaymentSources, searchTerm]);

  // Calculate filtered metrics (based on filtered transactions)
  const filteredTotalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // Calculate previous period revenue based on timeframe (using ALL transactions, not filtered)
  const previousRevenue = useMemo(() => {
    if (transactions.length === 0) return 0;

    const now = new Date();
    const cutoffDate = new Date();

    // Determine the cutoff date based on selected timeframe
    switch (selectedTimeframe) {
      case '12months':
        cutoffDate.setMonth(now.getMonth() - 12);
        break;
      case '24months':
        cutoffDate.setMonth(now.getMonth() - 24);
        break;
      case '36months':
        cutoffDate.setMonth(now.getMonth() - 36);
        break;
      default:
        return 0; // For 'alltime', no previous period comparison
    }

    // Calculate previous period (same duration, but earlier)
    const previousPeriodEnd = new Date(cutoffDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

    const previousPeriodStart = new Date(previousPeriodEnd);
    switch (selectedTimeframe) {
      case '12months':
        previousPeriodStart.setMonth(previousPeriodEnd.getMonth() - 12);
        break;
      case '24months':
        previousPeriodStart.setMonth(previousPeriodEnd.getMonth() - 24);
        break;
      case '36months':
        previousPeriodStart.setMonth(previousPeriodEnd.getMonth() - 36);
        break;
      default:
        return 0;
    }

    // Sum transactions from previous period
    return transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= previousPeriodStart && tDate <= previousPeriodEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedTimeframe]);

  const revenueGrowth = useMemo(() => {
    return previousRevenue > 0
      ? (((filteredTotalRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
      : '0.0';
  }, [filteredTotalRevenue, previousRevenue]);

  const filteredTopPlatforms = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach((t) => {
      const rawPlatform = (t.platform || '').toLowerCase();
      let normalizedPlatform = 'Other';

      for (const [key, name] of Object.entries(KNOWN_DSPS)) {
        if (rawPlatform.includes(key)) {
          normalizedPlatform = name;
          break;
        }
      }

      // Try to detect from source if no platform
      if (!t.platform && t.source) {
        const sourceLower = t.source.toLowerCase();

        // Skip if source is a known PRO/CMO
        const isPRO = KNOWN_PROS.some((pro) => sourceLower.includes(pro));
        if (isPRO) {
          return; // Skip this transaction - don't add to platform chart
        }

        for (const [key, name] of Object.entries(KNOWN_DSPS)) {
          if (sourceLower.includes(key)) {
            normalizedPlatform = name;
            break;
          }
        }
      }

      // Skip transactions with empty platform and PRO source
      if (!t.platform && t.source) {
        const sourceLower = t.source.toLowerCase();
        const isPRO = KNOWN_PROS.some((pro) => sourceLower.includes(pro));
        if (isPRO && normalizedPlatform === 'Other') {
          return; // Skip - this is a PRO transaction without a platform
        }
      }

      if (!grouped[normalizedPlatform]) {
        grouped[normalizedPlatform] = 0;
      }
      grouped[normalizedPlatform] += t.amount;
    });

    const entries = Object.entries(grouped);
    if (entries.length === 0) return [{ name: 'No data', amount: 0 }];

    const sorted = entries.sort(([, a], [, b]) => b - a);
    return sorted.slice(0, 3).map(([name, amount]) => ({ name, amount }));
  }, [filteredTransactions]);

  const filteredTopTerritories = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach((t) => {
      const isValidCountryCode =
        t.territory && /^[A-Z]{2,3}$/.test(t.territory) && !t.territory.match(/^(MLC|UNK|N\/A|NA|NONE)$/i);

      if (isValidCountryCode) {
        // Normalize 3-letter codes (USA) to 2-letter (US) so they group together
        const code = normalizeTerritory(t.territory);
        const territory =
          COUNTRY_COORDINATES[code]?.name || (code === 'ROW' ? 'Rest of World' : t.territoryName || code);
        if (!grouped[code]) {
          grouped[code] = { name: territory, amount: 0 };
        }
        grouped[code].amount += t.amount;
      }
    });

    const entries = Object.values(grouped);
    if (entries.length === 0) return [{ name: 'No data', amount: 0 }];

    return entries.sort((a, b) => b.amount - a.amount).slice(0, 3);
  }, [filteredTransactions]);

  // Group revenue by income name - for PIE CHART
  // Priority: incomeName > category > sourceCategory > 'Other'
  const revenueByIncomeType = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach((t) => {
      const raw = t.incomeName || t.category || t.sourceCategory || 'Other';
      // Writer portal: collapse granular statement codes into friendly buckets.
      const incomeType = isLivePortal ? groupIncomeType(t.catalog, raw) : raw;
      if (!grouped[incomeType]) {
        grouped[incomeType] = 0;
      }
      grouped[incomeType] += t.amount;
    });
    return grouped;
  }, [filteredTransactions, isLivePortal]);

  // Group revenue by source name (PRO/CMO like BMI, ASCAP, PRS) - for TOP SOURCE card and donut chart
  // Normalizes granular source names to parent company level
  // e.g. "Aresa France (Pan-European Licensing)" + "Aresa Norway (...)" → "Aresa"
  const revenueBySourceName = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach((t) => {
      const rawSource = t.source || 'Unknown';
      const sourceName = normalizeSourceName(rawSource);
      if (!grouped[sourceName]) {
        grouped[sourceName] = 0;
      }
      grouped[sourceName] += t.amount;
    });
    return grouped;
  }, [filteredTransactions]);

  // Group revenue by source category (income type) for alternate pie chart view
  const revenueBySourceCategory = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach((t) => {
      const category = t.sourceCategory || t.incomeName || 'Other';
      // Writer portal: friendly buckets; demo keeps the raw label (capitalized).
      const displayCategory = isLivePortal
        ? groupIncomeType(t.catalog, category)
        : category.charAt(0).toUpperCase() + category.slice(1);
      if (!grouped[displayCategory]) {
        grouped[displayCategory] = 0;
      }
      grouped[displayCategory] += t.amount;
    });
    return grouped;
  }, [filteredTransactions, isLivePortal]);

  // Group revenue by territory
  const revenueByTerritory = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach((t) => {
      // Only include valid country codes (2-3 letter codes, all uppercase)
      const isValidCountryCode =
        t.territory && /^[A-Z]{2,3}$/.test(t.territory) && !t.territory.match(/^(MLC|UNK|N\/A|NA|NONE)$/i);

      if (isValidCountryCode) {
        // Normalize 3-letter codes (USA) to 2-letter (US) so they group together
        const code = normalizeTerritory(t.territory);
        if (!grouped[code]) {
          grouped[code] = {
            name: COUNTRY_COORDINATES[code]?.name || (code === 'ROW' ? 'Rest of World' : t.territoryName || code),
            amount: 0,
          };
        }
        grouped[code].amount += t.amount;
      }
    });
    return Object.entries(grouped)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const topTerritory = revenueByTerritory[0];
  // Top source by Source Name (PRO/CMO)
  const topSource = Object.entries(revenueBySourceName).sort((a, b) => b[1] - a[1])[0];

  // Group revenue by platform (DSP like Spotify, Apple Music, YouTube)
  // Consolidates variants (e.g., "YouTube Music", "YouTube Premium" → "YouTube")
  const revenueByPlatform = useMemo(() => {
    const grouped = {};

    filteredTransactions.forEach((t) => {
      const rawPlatform = (t.platform || '').toLowerCase();
      let normalizedPlatform = 'Other';

      // Match to known platforms
      for (const [key, name] of Object.entries(KNOWN_DSPS)) {
        if (rawPlatform.includes(key)) {
          normalizedPlatform = name;
          break;
        }
      }

      // If no platform set, try to detect from source
      if (!t.platform && t.source) {
        const sourceLower = t.source.toLowerCase();

        // Skip if source is a known PRO/CMO
        const isPRO = KNOWN_PROS.some((pro) => sourceLower.includes(pro));
        if (isPRO) {
          return; // Skip this transaction - don't add to platform chart
        }

        for (const [key, name] of Object.entries(KNOWN_DSPS)) {
          if (sourceLower.includes(key)) {
            normalizedPlatform = name;
            break;
          }
        }
      }

      // Skip transactions with empty platform and PRO source
      if (!t.platform && t.source) {
        const sourceLower = t.source.toLowerCase();
        const isPRO = KNOWN_PROS.some((pro) => sourceLower.includes(pro));
        if (isPRO && normalizedPlatform === 'Other') {
          return; // Skip - this is a PRO transaction without a platform
        }
      }

      if (!grouped[normalizedPlatform]) {
        grouped[normalizedPlatform] = 0;
      }
      grouped[normalizedPlatform] += t.amount;
    });

    // Calculate total and group small platforms into "Other"
    const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);
    const threshold = total * 0.03; // 3% threshold
    const consolidated = {};
    let otherTotal = grouped['Other'] || 0;

    for (const [platform, amount] of Object.entries(grouped)) {
      if (platform === 'Other') continue;
      if (amount < threshold) {
        otherTotal += amount;
      } else {
        consolidated[platform] = amount;
      }
    }

    if (otherTotal > 0) {
      consolidated['Other'] = otherTotal;
    }

    return consolidated;
  }, [filteredTransactions]);
  // MUI BarChart data - transform for MUI BarChart component
  const muiRevenueTimeData = useMemo(() => {
    // Don't return empty - we can still show expected revenue from catalog even without statements
    const hasTransactions = filteredTransactions.length > 0;
    const hasExpectedRevenue = quarterlyExpectedRevenue?.quarters?.length > 0;

    // If no transactions AND no expected revenue data, return empty
    if (!hasTransactions && !hasExpectedRevenue) {
      return {
        labels: [],
        quarterKeys: [],
        quarterlyData: [],
        statementData: [],
        cumulativeActualLine: [],
      };
    }

    // Group transactions by Income Period quarter (not transaction date)
    const quarterlyRevenue = {};

    filteredTransactions.forEach((t) => {
      let quarterKey;

      if (t.incomePeriod) {
        quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
      }

      // Fallback to transaction date if no Income Period
      if (!quarterKey && t.date) {
        const date = new Date(t.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        quarterKey = `${year}-Q${quarter}`;
      }

      if (quarterKey) {
        if (!quarterlyRevenue[quarterKey]) {
          quarterlyRevenue[quarterKey] = 0;
        }
        quarterlyRevenue[quarterKey] += t.amount;
      }
    });

    // Group statements by their quarter (using filtered statements)
    const statementsByQuarter = {};
    filteredStatements.forEach((statement) => {
      const statementDate = new Date(statement.statementDate || statement.uploadDate);
      const year = statementDate.getFullYear();
      const month = statementDate.getMonth() + 1;
      const quarter = Math.ceil(month / 3);
      const quarterKey = `${year}-Q${quarter}`;

      // Use the actual statement total, not filtered transactions
      if (!statementsByQuarter[quarterKey]) {
        statementsByQuarter[quarterKey] = 0;
      }
      statementsByQuarter[quarterKey] += statement.totalAmount || 0;
    });

    // Generate all quarters based on the selected timeframe
    // Find the most recent quarter from ALL transactions (not filtered) to determine the range
    let maxQuarterKey = null;
    let minQuarterKey = null;

    // Check transactions for quarter range
    transactions.forEach((t) => {
      let quarterKey;
      if (t.incomePeriod) {
        quarterKey = IncomePeriodParser.getQuarter(t.incomePeriod);
      }
      if (!quarterKey && t.date) {
        const date = new Date(t.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        quarterKey = `${year}-Q${quarter}`;
      }
      if (quarterKey) {
        if (!maxQuarterKey || quarterKey > maxQuarterKey) {
          maxQuarterKey = quarterKey;
        }
        if (!minQuarterKey || quarterKey < minQuarterKey) {
          minQuarterKey = quarterKey;
        }
      }
    });

    // Also check expected revenue data for quarter range (catalog-based)
    if (quarterlyExpectedRevenue?.quarters) {
      quarterlyExpectedRevenue.quarters.forEach((quarterKey) => {
        if (!maxQuarterKey || quarterKey > maxQuarterKey) {
          maxQuarterKey = quarterKey;
        }
        if (!minQuarterKey || quarterKey < minQuarterKey) {
          minQuarterKey = quarterKey;
        }
      });
    }

    // Fallback to current date if no data
    if (!maxQuarterKey) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
      maxQuarterKey = `${currentYear}-Q${currentQuarter}`;
    }

    const [maxYearStr, maxQStr] = maxQuarterKey.split('-Q');
    const dataMaxYear = parseInt(maxYearStr);
    const dataMaxQuarter = parseInt(maxQStr);

    let quartersToInclude;
    // Check if it's a specific quarter selection (e.g., "2024-Q1")
    const isSpecificQuarter = selectedTimeframe.match(/^\d{4}-Q[1-4]$/);

    if (rangeFrom && rangeTo) {
      // Custom From/To range — show exactly the quarters between the two picks.
      const lo = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
      const hi = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
      const [loY, loQ] = lo.split('-Q').map(Number);
      const [hiY, hiQ] = hi.split('-Q').map(Number);
      quartersToInclude = [];
      for (let i = loY * 4 + (loQ - 1); i <= hiY * 4 + (hiQ - 1); i++) {
        quartersToInclude.push(`${Math.floor(i / 4)}-Q${(i % 4) + 1}`);
      }
    } else if (selectedTimeframe === 'alltime') {
      // For "All Time", show 12 quarters (3 years) based on the year range selector
      if (allTimeYearRange.startYear && allTimeYearRange.endYear) {
        quartersToInclude = [];
        for (let year = allTimeYearRange.startYear; year <= allTimeYearRange.endYear; year++) {
          for (let q = 1; q <= 4; q++) {
            quartersToInclude.push(`${year}-Q${q}`);
          }
        }
      } else {
        // Fallback: use quarters from data if year range not set
        // Include quarters from transactions, statements, AND expected revenue (catalog)
        const allQuartersSet = new Set([
          ...Object.keys(quarterlyRevenue),
          ...Object.keys(statementsByQuarter),
          ...(quarterlyExpectedRevenue?.quarters || []),
        ]);
        quartersToInclude = Array.from(allQuartersSet).sort();
      }
    } else if (isSpecificQuarter) {
      // For specific quarter, just show that one quarter
      quartersToInclude = [selectedTimeframe];
    } else {
      // For specific timeframes, generate all quarters in range
      let numQuarters;
      switch (selectedTimeframe) {
        case '12months':
          numQuarters = 4;
          break;
        case '24months':
          numQuarters = 8;
          break;
        case '36months':
          numQuarters = 12;
          break;
        default:
          numQuarters = 4;
      }

      // Calculate the cutoff quarter based on the most recent data quarter
      let cutoffYear = dataMaxYear;
      let cutoffQuarter = dataMaxQuarter - numQuarters + 1;

      while (cutoffQuarter <= 0) {
        cutoffQuarter += 4;
        cutoffYear -= 1;
      }

      // Generate all quarters from cutoff to max data quarter
      quartersToInclude = [];
      let year = cutoffYear;
      let quarter = cutoffQuarter;

      for (let i = 0; i < numQuarters; i++) {
        quartersToInclude.push(`${year}-Q${quarter}`);
        quarter++;
        if (quarter > 4) {
          quarter = 1;
          year++;
        }
      }
    }

    const allQuarters = quartersToInclude;

    // Build aligned data arrays with statements in their corresponding quarters
    const allLabels = [];
    const quarterKeys = []; // Store original quarter keys for matching with backend data
    const quarterlyData = [];
    const statementData = [];

    // Add quarterly data points with corresponding statement data aligned
    allQuarters.forEach((quarterKey) => {
      const [year, quarter] = quarterKey.split('-');
      const shortYear = year.slice(-2);
      allLabels.push(`${quarter} '${shortYear}`);
      quarterKeys.push(quarterKey); // Store the original key (e.g., "2024-Q1")
      quarterlyData.push(quarterlyRevenue[quarterKey] || null);
      statementData.push(statementsByQuarter[quarterKey] || null); // Aligned with quarter
    });

    // Calculate cumulative quarterly revenue
    const cumulativeActualLine = [];
    let cumulativeTotal = 0;
    quarterlyData.forEach((value) => {
      if (value !== null) {
        cumulativeTotal += value;
        cumulativeActualLine.push(cumulativeTotal);
      } else {
        cumulativeActualLine.push(null);
      }
    });

    return {
      labels: allLabels,
      quarterKeys: quarterKeys,
      quarterlyData: quarterlyData,
      statementData: statementData,
      cumulativeActualLine: cumulativeActualLine,
    };
  }, [
    transactions,
    filteredTransactions,
    filteredStatements,
    selectedTimeframe,
    rangeFrom,
    rangeTo,
    allTimeYearRange,
    quarterlyExpectedRevenue,
  ]);

  // Calculate totals for comparison
  const quarterlyRevenueTotal = useMemo(() => {
    return muiRevenueTimeData.quarterlyData.filter((val) => val !== null).reduce((sum, val) => sum + val, 0);
  }, [muiRevenueTimeData]);

  const statementRevenueTotal = useMemo(() => {
    return muiRevenueTimeData.statementData.filter((val) => val !== null).reduce((sum, val) => sum + val, 0);
  }, [muiRevenueTimeData]);

  // Calculate discrepancy (catalog expected revenue - reported income) for stacked bar chart
  const discrepancyData = useMemo(() => {
    // Calculate discrepancy per quarter: catalog expected revenue - reported income
    const result = [];
    muiRevenueTimeData.quarterKeys.forEach((quarterKey, index) => {
      const reportedIncome = muiRevenueTimeData.quarterlyData[index];

      // Get expected revenue from catalog calculations for this quarter
      const expectedRevenue = quarterlyExpectedRevenue?.quarterly_data?.[quarterKey]?.expected_total_revenue || 0;

      // Only calculate discrepancy if we have reported income
      if (reportedIncome !== null && expectedRevenue > 0) {
        const discrepancy = expectedRevenue - reportedIncome;
        // For stacking on top of reported, we want positive values only (when expected > reported)
        result.push(discrepancy > 0 ? discrepancy : 0);
      } else if (expectedRevenue > 0) {
        // If we have expected revenue but no reported income, the entire expected is "missing"
        result.push(expectedRevenue);
      } else {
        result.push(null);
      }
    });

    return result;
  }, [muiRevenueTimeData.quarterKeys, muiRevenueTimeData.quarterlyData, quarterlyExpectedRevenue]);

  // Calculate total discrepancy from the discrepancy data
  const totalDiscrepancy = useMemo(() => {
    return discrepancyData.reduce((sum, value) => {
      return sum + (value || 0);
    }, 0);
  }, [discrepancyData]);

  // Calculate total expected revenue from catalog - only for displayed quarters (for chart display)
  const totalExpectedRevenue = useMemo(() => {
    if (!quarterlyExpectedRevenue?.quarterly_data) return 0;
    // Sum expected revenue only for the quarters displayed in the chart (based on timeframe)
    return muiRevenueTimeData.quarterKeys.reduce((sum, quarterKey) => {
      return sum + (quarterlyExpectedRevenue.quarterly_data[quarterKey]?.expected_total_revenue || 0);
    }, 0);
  }, [quarterlyExpectedRevenue, muiRevenueTimeData.quarterKeys]);

  // Calculate ALL TIME expected revenue (for catalog health - not affected by graph view range)
  const allTimeExpectedRevenue = useMemo(() => {
    if (!quarterlyExpectedRevenue?.quarterly_data) return 0;
    // Sum ALL quarters regardless of what's displayed
    return Object.values(quarterlyExpectedRevenue.quarterly_data).reduce((sum, data) => {
      return sum + (data?.expected_total_revenue || 0);
    }, 0);
  }, [quarterlyExpectedRevenue]);

  // Calculate ALL TIME reported revenue (for catalog health - not affected by filters)
  const allTimeReportedRevenue = useMemo(() => {
    return uploadedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [uploadedTransactions]);

  // Smart currency formatting that adapts to the value
  const formatCurrency = (amount, options = {}) => {
    // Use the smart formatter for intelligent decimal handling
    return smartFormat(amount, {
      currency: 'USD',
      forceDecimals: options.forceDecimals !== undefined ? options.forceDecimals : null,
      abbreviate: options.abbreviate || false,
      ...options,
    });
  };

  // Compact formatter for non-currency big numbers (usages, plays, views)
  const formatLargeNumber = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
    return n.toLocaleString();
  };

  // Calculate comprehensive catalog health using weighted component scoring
  // Revenue capture is the dominant factor - it's what actually matters
  const catalogHealth = useMemo(() => {
    if (uploadedTransactions.length === 0) {
      return {
        percentage: 0,
        status: 'No Data',
        color: '#6B7280',
        bgColor: '#6B728015',
        icon: FaInfoCircle,
        issues: [],
        anomalies: [],
      };
    }

    const issues = [];
    const anomalies = [];

    // Calculate total reported revenue
    const reportedRevenue = uploadedTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate expected revenue (from streaming estimates) - use ALL TIME data for health
    const expectedRevenue = allTimeExpectedRevenue || 0;

    // ===== COMPONENT 1: Revenue Capture (50% weight) =====
    // Uses logarithmic scaling - a 10x gap is bad but not 10x worse than 2x gap
    let revenueScore = 100;
    if (expectedRevenue > 0) {
      const captureRate = Math.min(1, reportedRevenue / expectedRevenue);
      if (captureRate <= 0) {
        revenueScore = 0;
      } else if (captureRate >= 1) {
        revenueScore = 100;
      } else {
        // Logarithmic scale: 100% = 100, 10% = 50, 1% = 0
        revenueScore = Math.max(0, Math.min(100, 50 + 50 * (Math.log10(captureRate * 100) / 2)));
      }

      const capturePercent = (captureRate * 100).toFixed(1);
      const gapAmount = expectedRevenue - reportedRevenue;
      if (captureRate < 0.2) {
        issues.push(
          `Critical: Only ${capturePercent}% of expected revenue captured (${formatCurrency(gapAmount)} gap)`
        );
      } else if (captureRate < 0.5) {
        issues.push(`High: ${capturePercent}% of expected revenue captured (${formatCurrency(gapAmount)} gap)`);
      } else if (captureRate < 0.8) {
        issues.push(`Medium: ${capturePercent}% revenue captured`);
      }
    }

    // ===== COMPONENT 2: Catalog Coverage (25% weight) =====
    let coverageScore = 100;
    if (missingSongs && missingSongs.totalCatalogSongs > 0) {
      const songsEarning = missingSongs.totalCatalogSongs - (missingSongs.songs?.length || 0);
      coverageScore = (songsEarning / missingSongs.totalCatalogSongs) * 100;

      const missingCount = missingSongs.songs?.length || 0;
      const missingPercent = ((missingCount / missingSongs.totalCatalogSongs) * 100).toFixed(0);
      if (missingCount > 0) {
        const potentialLost = missingSongs.songs?.reduce((sum, s) => sum + (s.potentialRevenue || 0), 0) || 0;
        if (coverageScore < 50) {
          issues.push(`Critical: ${missingCount} songs (${missingPercent}%) missing from statements`);
        } else if (coverageScore < 70) {
          issues.push(`High: ${missingCount} songs not generating revenue`);
        } else if (coverageScore < 90) {
          issues.push(`${missingCount} songs missing from statements`);
        }
        if (potentialLost > 100) {
          issues.push(`${formatCurrency(potentialLost)} potential revenue at risk`);
        }
      }
    }

    // ===== COMPONENT 3: Data Quality (15% weight) =====
    let dataScore = 100;
    let missingFields = 0;
    let totalFields = 0;
    uploadedTransactions.forEach((t) => {
      if (!t.isrc) missingFields++;
      if (!t.product || t.product === 'Unknown') missingFields++;
      totalFields += 2;
    });
    if (totalFields > 0) {
      dataScore = ((totalFields - missingFields) / totalFields) * 100;
      if (dataScore < 80) {
        issues.push(`${(100 - dataScore).toFixed(0)}% of data fields incomplete`);
      }
    }

    // ===== COMPONENT 4: Diversity (10% weight) =====
    const uniqueTerritories = new Set(uploadedTransactions.map((t) => t.territory).filter(Boolean)).size;
    const uniqueSources = new Set(uploadedTransactions.map((t) => t.source).filter(Boolean)).size;
    // Score: 0 territories/sources = 0, 5+ each = 100
    const territoryScore = Math.min(100, (uniqueTerritories / 5) * 100);
    const sourceScore = Math.min(100, (uniqueSources / 3) * 100);
    const diversityScore = (territoryScore + sourceScore) / 2;

    if (uniqueTerritories < 3) {
      issues.push(`Limited territory coverage (${uniqueTerritories} territories)`);
    }
    if (uniqueSources < 2) {
      issues.push(`Revenue from ${uniqueSources === 1 ? 'single source' : 'no sources'}`);
    }

    // ===== WEIGHTED FINAL SCORE =====
    let healthScore =
      revenueScore * 0.5 + // 50% weight - most important
      coverageScore * 0.25 + // 25% weight
      dataScore * 0.15 + // 15% weight
      diversityScore * 0.1; // 10% weight

    // CRITICAL FLOOR: If revenue capture < 20%, cap health at 25%
    if (expectedRevenue > 0 && reportedRevenue / expectedRevenue < 0.2) {
      healthScore = Math.min(healthScore, 25);
    }

    // If no expected revenue data, use coverage-weighted fallback
    if (expectedRevenue === 0) {
      healthScore = coverageScore * 0.5 + dataScore * 0.3 + diversityScore * 0.2;
    }

    // Ensure score stays within 0-100
    healthScore = Math.max(0, Math.min(100, healthScore));

    // ===== ANOMALY DETECTION =====
    // Group transactions by quarter for trend analysis
    const quarterlyRevenue = {};
    uploadedTransactions.forEach((t) => {
      if (!t.date) return;
      const date = new Date(t.date);
      const q = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      quarterlyRevenue[q] = (quarterlyRevenue[q] || 0) + t.amount;
    });

    const quarters = Object.entries(quarterlyRevenue).sort((a, b) => a[0].localeCompare(b[0]));
    if (quarters.length >= 2) {
      const [prevQ, prevAmt] = quarters[quarters.length - 2];
      const [currQ, currAmt] = quarters[quarters.length - 1];
      if (prevAmt > 0) {
        const changePercent = ((currAmt - prevAmt) / prevAmt) * 100;
        if (changePercent < -50) {
          anomalies.push({
            type: 'revenue_drop',
            severity: 'critical',
            message: `Revenue dropped ${Math.abs(changePercent).toFixed(0)}% from ${prevQ} to ${currQ}`,
          });
        } else if (changePercent < -30) {
          anomalies.push({
            type: 'revenue_drop',
            severity: 'warning',
            message: `Revenue decreased ${Math.abs(changePercent).toFixed(0)}% vs previous quarter`,
          });
        }
      }
    }

    // Detect songs with streams but zero/low revenue
    const revenueByProduct = {};
    uploadedTransactions.forEach((t) => {
      const key = t.product || t.isrc || 'unknown';
      revenueByProduct[key] = (revenueByProduct[key] || 0) + t.amount;
    });
    const zeroRevenueSongs = Object.entries(revenueByProduct).filter(([_, amt]) => amt === 0);
    if (zeroRevenueSongs.length > 0) {
      anomalies.push({
        type: 'zero_revenue',
        severity: 'warning',
        message: `${zeroRevenueSongs.length} songs with $0 revenue in statements`,
      });
    }

    // Detect missing quarters (gaps in payment)
    if (quarters.length >= 3) {
      const expectedQuarters = [];
      const startDate = new Date(quarters[0][0].replace('-Q', '-0') + '-01');
      const endDate = new Date(quarters[quarters.length - 1][0].replace('-Q', '-0') + '-01');
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 3)) {
        const q = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        expectedQuarters.push(q);
      }
      const missingQuarters = expectedQuarters.filter((q) => !quarterlyRevenue[q]);
      if (missingQuarters.length > 0) {
        anomalies.push({
          type: 'missing_quarters',
          severity: 'warning',
          message: `Missing data for ${missingQuarters.length} quarter(s): ${missingQuarters.slice(0, 2).join(', ')}${missingQuarters.length > 2 ? '...' : ''}`,
        });
      }
    }

    // Detect platform-specific issues
    const revenueByPlatform = {};
    uploadedTransactions.forEach((t) => {
      const platform = t.platform || t.source || 'Unknown';
      revenueByPlatform[platform] = (revenueByPlatform[platform] || 0) + t.amount;
    });
    const platformEntries = Object.entries(revenueByPlatform).sort((a, b) => b[1] - a[1]);
    if (platformEntries.length > 1) {
      const topPlatformRevenue = platformEntries[0][1];
      platformEntries.slice(1).forEach(([platform, amount]) => {
        if (amount < topPlatformRevenue * 0.05 && amount < 100) {
          anomalies.push({
            type: 'low_platform',
            severity: 'info',
            message: `${platform} revenue unusually low (${formatCurrency(amount)})`,
          });
        }
      });
    }

    // Add critical anomalies to issues
    anomalies.filter((a) => a.severity === 'critical').forEach((a) => issues.unshift(`⚠️ ${a.message}`));

    // Determine status, color, and icon based on final score
    let status, color, bgColor, icon;

    if (healthScore >= 85) {
      status = 'Excellent';
      color = '#10B981';
      bgColor = '#10B98115';
      icon = FaCheckCircle;
    } else if (healthScore >= 70) {
      status = 'Good';
      color = '#3B82F6';
      bgColor = '#3B82F615';
      icon = FaCheckCircle;
    } else if (healthScore >= 50) {
      status = 'Fair';
      color = '#F59E0B';
      bgColor = '#F59E0B15';
      icon = FaExclamationTriangle;
    } else if (healthScore >= 30) {
      status = 'Poor';
      color = '#EF4444';
      bgColor = '#EF444415';
      icon = FaExclamationTriangle;
    } else {
      status = 'Critical';
      color = '#DC2626';
      bgColor = '#DC262615';
      icon = FaExclamationTriangle;
    }

    return {
      percentage: Math.round(healthScore),
      status,
      color,
      bgColor,
      icon,
      issues,
      anomalies,
      // Component scores for debugging/display
      components: {
        revenue: Math.round(revenueScore),
        coverage: Math.round(coverageScore),
        data: Math.round(dataScore),
        diversity: Math.round(diversityScore),
      },
    };
  }, [uploadedTransactions, allTimeExpectedRevenue, missingSongs]);

  // PRO/CMO colors for source breakdown
  const proColors = {
    bmi: '#FF6B00', // Orange
    ascap: '#1E88E5', // Blue
    prs: '#9C27B0', // Purple
    sesac: '#4CAF50', // Green
    socan: '#E91E63', // Pink
    gema: '#FF5722', // Deep Orange
    sacem: '#00BCD4', // Cyan
    apra: '#FFC107', // Amber
    aresa: '#7C3AED', // Violet
    ice: '#2563EB', // Indigo
    bmg: '#DC2626', // Red
    mlc: '#059669', // Emerald
    hfa: '#D97706', // Yellow
    amazon: '#FF9900', // Amazon Orange
    spotify: '#1DB954', // Spotify Green
    apple: '#FC3C44', // Apple Red
    youtube: '#FF0000', // YouTube Red
    other: '#6B7280', // Gray
  };

  // Income type colors for source category breakdown
  const incomeTypeColors = {
    mechanical: '#3B82F6', // Blue
    performance: '#8B5CF6', // Purple
    streaming: '#10B981', // Green
    sync: '#F59E0B', // Amber
    publishing: '#EC4899', // Pink
    neighboring: '#06B6D4', // Cyan
    other: '#6B7280', // Gray
  };

  // MUI Pie chart data for PRO/CMO Source breakdown
  const muiSourcePieData = useMemo(() => {
    const total = Object.values(revenueBySourceName).reduce((sum, val) => sum + val, 0);

    return Object.entries(revenueBySourceName)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], index) => {
        const lowerKey = key.toLowerCase();
        let color = proColors.other;

        if (lowerKey.includes('bmi')) color = proColors.bmi;
        else if (lowerKey.includes('ascap')) color = proColors.ascap;
        else if (lowerKey.includes('prs')) color = proColors.prs;
        else if (lowerKey.includes('sesac')) color = proColors.sesac;
        else if (lowerKey.includes('socan')) color = proColors.socan;
        else if (lowerKey.includes('gema')) color = proColors.gema;
        else if (lowerKey.includes('sacem')) color = proColors.sacem;
        else if (lowerKey.includes('apra')) color = proColors.apra;
        else if (lowerKey.includes('aresa') || lowerKey.includes('ice')) color = proColors.aresa;
        else if (lowerKey.includes('bmg')) color = proColors.bmg;
        else if (lowerKey === 'mlc') color = proColors.mlc;
        else if (lowerKey.includes('hfa')) color = proColors.hfa;
        else if (lowerKey.includes('amazon')) color = proColors.amazon;
        else if (lowerKey.includes('spotify')) color = proColors.spotify;
        else if (lowerKey.includes('apple')) color = proColors.apple;
        else if (lowerKey.includes('youtube')) color = proColors.youtube;

        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        return {
          id: index,
          value: value,
          label: `${key} (${percentage}%)`,
          color: color,
        };
      });
  }, [revenueBySourceName]);

  // MUI Pie chart data for Source Category (Income Type) breakdown
  const muiSourceCategoryPieData = useMemo(() => {
    const total = Object.values(revenueBySourceCategory).reduce((sum, val) => sum + val, 0);

    return Object.entries(revenueBySourceCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], index) => {
        const lowerKey = key.toLowerCase();
        let color = incomeTypeColors.other;

        if (lowerKey === 'mechanical') color = incomeTypeColors.mechanical;
        else if (lowerKey === 'performance') color = incomeTypeColors.performance;
        else if (lowerKey === 'streaming') color = incomeTypeColors.streaming;
        else if (lowerKey === 'sync') color = incomeTypeColors.sync;
        else if (lowerKey === 'publishing') color = incomeTypeColors.publishing;
        else if (lowerKey === 'neighboring') color = incomeTypeColors.neighboring;

        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        return {
          id: index,
          value: value,
          label: `${key} (${percentage}%)`,
          color: color,
        };
      });
  }, [revenueBySourceCategory]);

  // Calculate total revenue by source for center label
  const totalRevenueBySource = useMemo(() => {
    return Object.values(revenueBySourceName).reduce((sum, val) => sum + val, 0);
  }, [revenueBySourceName]);

  // Platform colors for DSPs
  const platformColors = {
    spotify: '#1DB954',
    apple: '#FC3C44',
    youtube: '#FF0000',
    amazon: '#FF9900',
    tidal: '#000000',
    deezer: '#FEAA2D',
    pandora: '#3668FF',
    soundcloud: '#FF5500',
    other: '#6366F1',
  };

  // MUI Pie chart data for Platform/DSP breakdown with percentages
  const muiPlatformPieData = useMemo(() => {
    const total = Object.values(revenueByPlatform).reduce((sum, val) => sum + val, 0);

    return Object.entries(revenueByPlatform)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], index) => {
        const lowerKey = key.toLowerCase();
        let color = platformColors.other;

        if (lowerKey.includes('spotify')) color = platformColors.spotify;
        else if (lowerKey.includes('apple')) color = platformColors.apple;
        else if (lowerKey.includes('youtube')) color = platformColors.youtube;
        else if (lowerKey.includes('amazon')) color = platformColors.amazon;
        else if (lowerKey.includes('tidal')) color = platformColors.tidal;
        else if (lowerKey.includes('deezer')) color = platformColors.deezer;
        else if (lowerKey.includes('pandora')) color = platformColors.pandora;
        else if (lowerKey.includes('soundcloud')) color = platformColors.soundcloud;

        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        return {
          id: index,
          value: value,
          label: `${key} (${percentage}%)`,
          color: color,
        };
      });
  }, [revenueByPlatform]);

  // Calculate total revenue by platform for center label
  const totalRevenueByPlatform = useMemo(() => {
    return Object.values(revenueByPlatform).reduce((sum, val) => sum + val, 0);
  }, [revenueByPlatform]);

  // Territory bar chart
  const territoryBarData = {
    labels: revenueByTerritory.slice(0, 10).map((t) => t.code),
    datasets: [
      {
        label: 'Revenue by Territory',
        data: revenueByTerritory.slice(0, 10).map((t) => t.amount),
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 8,
      },
    ],
  };

  // Globe markers based on revenue by territory
  const globeMarkers = useMemo(() => {
    const markers = generateRevenueMarkers(revenueByTerritory, 20);
    return markers;
  }, [revenueByTerritory]);

  // Prepare revenue data for pinging globe
  const globeRevenueData = useMemo(() => {
    return revenueByTerritory
      .slice(0, 20)
      .map((territory) => {
        const coords = getCountryCoordinates(territory.code);
        if (!coords) return null;

        return {
          code: territory.code,
          lat: coords.lat,
          lng: coords.lng,
          amount: territory.amount,
          name: coords.name || territory.code,
        };
      })
      .filter(Boolean);
  }, [revenueByTerritory]);

  // Prepare data for new Three.js Globe_Pins component
  const globeTerritories = useMemo(() => {
    const territories = revenueByTerritory.slice(0, 20).map((territory) => ({
      territory: territory.code,
      amount: territory.amount,
    }));
    return territories;
  }, [revenueByTerritory]);

  const globeTerritoryCoords = useMemo(() => {
    const coords = {};
    revenueByTerritory.slice(0, 20).forEach((territory) => {
      const countryCoords = getCountryCoordinates(territory.code);
      if (countryCoords) {
        coords[territory.code] = {
          lon: countryCoords.lng,
          lat: countryCoords.lat,
          name: countryCoords.name || territory.code,
        };
      }
    });
    return coords;
  }, [revenueByTerritory]);

  // Convert territories to pins format for Globe_Pins
  const globePins = useMemo(() => {
    return globeTerritories
      .map((t) => {
        const coords = globeTerritoryCoords[t.territory];
        if (!coords) return null;
        return {
          lon: coords.lon,
          lat: coords.lat,
          name: coords.name || t.territory,
          address: `Revenue: $${t.amount.toLocaleString()}`,
          phone: `Territory: ${t.territory}`,
        };
      })
      .filter(Boolean);
  }, [globeTerritories, globeTerritoryCoords]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 12 },
          callback: function (value) {
            // Use compact format for chart axis (1.2K, 3.4M, etc.)
            return formatCompact(value, { currency: 'USD' });
          },
        },
        title: {
          display: true,
          text: 'Revenue',
          color: 'rgba(255, 255, 255, 0.8)',
          font: { size: 13, weight: 'bold' },
        },
      },
      x: {
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { size: 12 },
        },
        title: {
          display: true,
          text: 'Quarter',
          color: 'rgba(255, 255, 255, 0.8)',
          font: { size: 13, weight: 'bold' },
        },
      },
    },
  };

  const getSourceIcon = (source) => {
    if (source.includes('Spotify')) return <FaSpotify />;
    if (source.includes('Apple')) return <FaApple />;
    if (source.includes('YouTube')) return <FaYoutube />;
    if (source.includes('Merchandise')) return <FaTshirt />;
    return <FaMusic />;
  };

  // Get unique payment sources from all transactions (for filter dropdown)
  const uniquePaymentSources = useMemo(() => {
    const sources = new Set();
    transactions.forEach((t) => {
      if (t.source) sources.add(t.source);
    });
    return Array.from(sources).sort();
  }, [transactions]);

  // Calculate total of filtered transactions
  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSource, filterTerritory, selectedPaymentSources, selectedTimeframe, searchTerm]);

  // Close payment sources dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPaymentSourcesDropdown && !event.target.closest('.payment-sources-filter')) {
        setShowPaymentSourcesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPaymentSourcesDropdown]);

  // Skeleton components for loading state
  const SummaryCardSkeleton = () => (
    <div className="summary-card">
      <Skeleton
        variant="rounded"
        width={40}
        height={40}
        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
      />
      <div className="summary-content" style={{ flex: 1 }}>
        <Skeleton
          variant="text"
          width={80}
          height={16}
          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mb: 0.5 }}
        />
        <Skeleton
          variant="text"
          width={120}
          height={28}
          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mb: 0.5 }}
        />
        <Skeleton
          variant="text"
          width={100}
          height={14}
          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        />
      </div>
    </div>
  );

  const ChartSkeleton = ({ height = 300 }) => (
    <div className="chart-card">
      <div className="chart-header">
        <Skeleton
          variant="text"
          width={180}
          height={24}
          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        />
        <Skeleton
          variant="text"
          width={120}
          height={20}
          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        />
      </div>
      <Skeleton
        variant="rounded"
        width="100%"
        height={height}
        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
      />
    </div>
  );

  const TerritorySkeleton = () => (
    <div className="territory-section">
      <div className="section-header">
        <div>
          <Skeleton
            variant="text"
            width={200}
            height={28}
            sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
          />
          <Skeleton
            variant="text"
            width={280}
            height={18}
            sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mt: 1 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '15px', minHeight: '400px', height: '400px', padding: '10px' }}>
        <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Skeleton
            variant="circular"
            width={320}
            height={320}
            sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
          />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <div
            style={{
              background: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              borderRadius: '8px',
              padding: '10px',
              border: currentTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              height: '100%',
            }}
          >
            <Skeleton
              variant="text"
              width={200}
              height={24}
              sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', mb: 2 }}
            />
            {[...Array(10)].map((_, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Skeleton
                  variant="circular"
                  width={32}
                  height={32}
                  sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                />
                <div style={{ flex: 1 }}>
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={18}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                  <Skeleton
                    variant="text"
                    width="50%"
                    height={14}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const TransactionsSkeleton = () => (
    <div className="transactions-section" data-theme={currentTheme}>
      <div className="section-header">
        <div style={{ display: 'flex', gap: '12px' }}>
          <Skeleton
            variant="rounded"
            width={180}
            height={44}
            sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
          />
          <Skeleton
            variant="rounded"
            width={180}
            height={44}
            sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
          />
        </div>
        <Skeleton
          variant="rounded"
          width={100}
          height={40}
          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        />
      </div>
      <div className="transactions-table">
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Date', 'Product', 'Artist', 'Source', 'Territory', 'Amount'].map((header) => (
                <th key={header}>
                  <Skeleton
                    variant="text"
                    width={60}
                    height={16}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, idx) => (
              <tr key={idx}>
                <td>
                  <Skeleton
                    variant="text"
                    width={80}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </td>
                <td>
                  <Skeleton
                    variant="text"
                    width={150}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </td>
                <td>
                  <Skeleton
                    variant="text"
                    width={120}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </td>
                <td>
                  <Skeleton
                    variant="text"
                    width={100}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </td>
                <td>
                  <Skeleton
                    variant="rounded"
                    width={40}
                    height={24}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </td>
                <td>
                  <Skeleton
                    variant="text"
                    width={70}
                    sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (writerHasNoDistributions) {
    return (
      <>
        <Helmet>
          <title>RD - Royalties</title>
        </Helmet>
        <div className="revenue-page">
          <div className="revenue-background" />
          <Sidebar />
          <div className="revenue-content">
            <div className="revenue-header">
              <div>
                <h1 className="revenue-title">Royalties</h1>
                <p className="revenue-subtitle">Your earnings will appear here once your publisher distributes them.</p>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '64px 24px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--soft-text)',
              }}
            >
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {CURRENT_PERIOD} statements pending distribution
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 480 }}>
                  Your publisher is finalising documentation for {CURRENT_PERIOD}. Once the period is closed and
                  royalties are released, your earnings, top works and platform breakdown will appear here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>RD - Revenue & Royalties</title>
      </Helmet>
      <div className="revenue-page">
        {/* Background */}
        <div className="revenue-background">{/* Clean background - no animations */}</div>

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="revenue-content">
          {/* Below-minimum payout notice (writer portal only): balances under
              $200 carry forward instead of being distributed. Dismissable. */}
          {isLivePortal && !payoutBannerClosed && netEarnings && Number(netEarnings.payable) < MIN_PAYOUT && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                margin: '0 0 20px',
                padding: '12px 16px',
                border: '1px solid rgba(220, 38, 38, 0.45)',
                borderRadius: 12,
                background: 'rgba(220, 38, 38, 0.1)',
                color: 'var(--text)',
              }}
            >
              <FaExclamationTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, fontSize: 14, lineHeight: 1.5 }}>
                <strong>{t('payout.belowMinimumTitle', { min: formatCurrency(MIN_PAYOUT) })}</strong>{' '}
                {t('payout.belowMinimumBody', {
                  balance: formatCurrency(Number(netEarnings.payable)),
                  min: formatCurrency(MIN_PAYOUT),
                })}
              </div>
              <button
                type="button"
                aria-label={t('common.dismiss')}
                onClick={() => setPayoutBannerClosed(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--soft-text, #8a8f98)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <FaTimes size={14} />
              </button>
            </div>
          )}
          {/* How net was reached — the same waterfall as the writer's PDF, so the
              headline never silently contradicts their statement. */}
          {isLivePortal && netEarnings && Number(netEarnings.statements) > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                alignItems: 'center',
                margin: '0 0 20px',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: 13,
                color: 'var(--soft-text, #8a8f98)',
              }}
            >
              {[
                [t('waterfall.grossEarned'), netEarnings.gross, null],
                [t('waterfall.broughtForward'), netEarnings.carried_forward_in, '+'],
                [t('waterfall.recouped'), netEarnings.recouped, null],
                [t('waterfall.carriedForward'), netEarnings.carried_forward_out, '−'],
                [t('waterfall.commission'), netEarnings.commission, '−'],
              ]
                .filter(([, v]) => Number(v) !== 0)
                .map(([label, value, sign]) => (
                  <span key={label}>
                    {label}:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {sign}
                      {formatCurrency(Math.abs(Number(value)))}
                    </strong>
                  </span>
                ))}
              <span style={{ marginLeft: 'auto' }}>
                Net payable:{' '}
                <strong style={{ color: 'var(--accent)' }}>{formatCurrency(Number(netEarnings.payable))}</strong>
              </span>
            </div>
          )}

          {/* Header */}
          {/* An admin has no portal identity, so /me/* refuses them. Saying that
              plainly beats a page of zeros, which reads as "you earned nothing"
              — and beats the demo dataset that used to fill in here, which read
              as real money. */}
          {portalDenied && (
            <div className="revenue-notice">
              <strong>This is the writer&apos;s earnings page.</strong> You are signed in as an admin, which has no
              portal of its own, so there is nothing here to show. Open a client from{' '}
              <button type="button" className="revenue-notice-link" onClick={() => navigate('/admin/writers')}>
                the client list
              </button>{' '}
              to see their statements.
            </div>
          )}

          <div className="revenue-header">
            <div>
              <h1 className="revenue-title">{isLivePortal ? t('earnings.title') : 'Earnings'}</h1>
              <p className="revenue-subtitle">
                {isLivePortal ? t('earnings.subtitleLive') : 'Track your income across all platforms and territories'}
              </p>
              {isWriterView && writerDistributedPeriods.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: 10,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--soft-text)',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      marginRight: 4,
                    }}
                  >
                    {t('earnings.period')}
                  </span>
                  {writerDistributedPeriods.map((p) => {
                    const active = selectedPeriods.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePeriod(p)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                          background: active ? 'var(--accent)' : 'var(--card-bg)',
                          color: active ? 'var(--secondary-text, #fff)' : 'var(--text)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {writerDistributedPeriods.length > 1 && (
                    <button
                      onClick={selectAllPeriods}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--soft-text)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      All
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="header-controls">
              {/* ES/EN switch — writer portal only; the admin UI is English. */}
              {isLivePortal && <LanguageToggle />}
              {/* Catalog sync is an estimator feature — not part of the writer portal. */}
              {!isLivePortal && (
                <button
                  className="sync-catalog-btn"
                  onClick={handleSyncToCatalog}
                  disabled={isSyncing || uploadedTransactions.length === 0}
                  title="Add all songs from statements to catalog"
                >
                  <FaSync />
                  {isSyncing ? 'Syncing...' : 'Sync Songs to Catalog'}
                </button>
              )}
              {/* Cross-writer filter is an admin/preview control — a writer's own
                  portal only ever shows their own data, so hide it there. */}
              {!selectedClientId && !isLivePortal && (
                <select
                  value={previewWriterId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPreviewWriterId(v === '' ? null : Number(v));
                  }}
                  className="timeframe-select"
                  title="Filter earnings to a single writer"
                >
                  <option value="">All writers</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <QuarterRangePicker
                from={rangeFrom}
                to={rangeTo}
                onChange={(f, t) => {
                  setRangeFrom(f);
                  setRangeTo(t);
                }}
              />
              <button className="view-statements-btn" onClick={() => navigate('/statements')}>
                <FaList />
                {isLivePortal ? t('earnings.viewStatements') : 'View Statements'}
                {uploadedStatements.length > 0 && <span className="statements-badge">{uploadedStatements.length}</span>}
              </button>
              {/* Writers never upload their own statements — the publisher
                  ingests them. Leaving this in their portal implied they were
                  expected to supply their own royalty data. */}
              {!selectedClientId && !isLivePortal && (
                <button className="upload-btn" onClick={handleUploadClick} disabled={isUploading}>
                  <FaUpload />
                  {isUploading ? 'Uploading...' : 'Upload Statement'}
                </button>
              )}
              {parsingResult && (
                <button
                  className="parsing-details-btn"
                  onClick={() => setShowParsingDetails(true)}
                  title="View details from last CSV parse"
                >
                  <FaInfoCircle />
                  Last Parse
                </button>
              )}
              <button
                className="export-btn"
                onClick={() => requireSubscription(() => setIsExportModalOpen(true), true, 'Earnings Export')}
              >
                <FaDownload />
                Export
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.csv,.xlsx,.xls"
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <>
              <div className="summary-cards">
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
              </div>
              <div className="charts-grid">
                <ChartSkeleton height={300} />
                <ChartSkeleton height={300} />
              </div>
              <TerritorySkeleton />
              <TransactionsSkeleton />
            </>
          )}

          {/* Summary Cards */}
          {!isLoading && (
            <div className="summary-cards">
              <div className="summary-card" style={{ position: 'relative' }}>
                <div className="summary-icon" style={{ background: '#6366F115' }}>
                  <FaDollarSign style={{ color: '#6366F1' }} />
                </div>
                <div className="summary-content">
                  <div className="summary-label">{isLivePortal ? t('earnings.netPayable') : 'Total Revenue'}</div>
                  {isFreeTier ? (
                    <>
                      <div className="summary-value" style={{ opacity: 0.3 }}>
                        —
                      </div>
                      <div
                        className="summary-change"
                        style={{ color: '#6366F1', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => {
                          setUpgradeModalFeature('Revenue');
                          setShowUpgradeModal(true);
                        }}
                      >
                        <FaLock size={12} />
                        Upgrade to view
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="summary-value">
                        {formatCurrency(
                          isLivePortal && netEarnings ? Number(netEarnings.payable) : filteredTotalRevenue
                        )}
                      </div>
                      <div className="summary-change positive">
                        <BiTrendingUp />+{revenueGrowth}% vs last period
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon" style={{ background: '#10B98115' }}>
                  <FaChartLine style={{ color: '#10B981' }} />
                </div>
                <div
                  className="summary-content"
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
                >
                  <div className="summary-label" style={{ marginBottom: '6px' }}>
                    {t('earnings.topPlatforms')}
                  </div>
                  {isFreeTier ? (
                    <>
                      <div className="summary-value" style={{ opacity: 0.3 }}>
                        —
                      </div>
                      <div
                        className="summary-change"
                        style={{ color: '#6366F1', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => {
                          setUpgradeModalFeature('Revenue');
                          setShowUpgradeModal(true);
                        }}
                      >
                        <FaLock size={12} />
                        Upgrade to view
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        flex: 1,
                        justifyContent: 'space-evenly',
                      }}
                    >
                      {filteredTopPlatforms.map((source, idx) => (
                        <div
                          key={idx}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                        >
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--text)',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <span style={{ fontWeight: 600, marginRight: '4px', flexShrink: 0 }}>{idx + 1}.</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {source.name}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--soft-text)',
                              fontFamily: 'var(--font-mono)',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(source.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon" style={{ background: '#EC489915' }}>
                  <FaGlobe style={{ color: '#EC4899' }} />
                </div>
                <div
                  className="summary-content"
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
                >
                  <div className="summary-label" style={{ marginBottom: '6px' }}>
                    {t('earnings.topTerritories')}
                  </div>
                  {isFreeTier ? (
                    <>
                      <div className="summary-value" style={{ opacity: 0.3 }}>
                        —
                      </div>
                      <div
                        className="summary-change"
                        style={{ color: '#6366F1', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => {
                          setUpgradeModalFeature('Revenue');
                          setShowUpgradeModal(true);
                        }}
                      >
                        <FaLock size={12} />
                        Upgrade to view
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        flex: 1,
                        justifyContent: 'space-evenly',
                      }}
                    >
                      {filteredTopTerritories.map((territory, idx) => (
                        <div
                          key={idx}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}
                        >
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--text)',
                              fontFamily: 'var(--font-mono)',
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <span style={{ fontWeight: 600, marginRight: '4px', flexShrink: 0 }}>{idx + 1}.</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {territory.name}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--soft-text)',
                              fontFamily: 'var(--font-mono)',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(territory.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Catalog Health is an estimator feature — not part of the writer portal. */}
              {!isLivePortal && (
                <MUITooltip
                  title={
                    catalogHealth.issues && catalogHealth.issues.length > 0 ? (
                      <div style={{ padding: '8px 4px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>
                          Health Issues ({catalogHealth.issues.length})
                        </div>
                        {catalogHealth.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            style={{
                              marginBottom: '6px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '6px',
                              fontSize: '12px',
                            }}
                          >
                            <span style={{ color: catalogHealth.color, flexShrink: 0 }}>•</span>
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      ''
                    )
                  }
                  placement="bottom"
                  arrow
                  enterDelay={200}
                  slotProps={{
                    tooltip: {
                      sx: {
                        bgcolor: currentTheme === 'dark' ? 'rgba(30, 30, 35, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        color: currentTheme === 'dark' ? '#fff' : '#1f2937',
                        border:
                          currentTheme === 'dark' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        maxWidth: '350px',
                        '& .MuiTooltip-arrow': {
                          color: currentTheme === 'dark' ? 'rgba(30, 30, 35, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        },
                      },
                    },
                  }}
                >
                  <div
                    className="summary-card"
                    style={{ cursor: catalogHealth.issues?.length > 0 ? 'help' : 'default' }}
                  >
                    <div className="summary-icon" style={{ background: catalogHealth.bgColor }}>
                      {React.createElement(catalogHealth.icon, { style: { color: catalogHealth.color } })}
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">{effectiveClientId ? 'Total Usages' : 'Catalog Health'}</div>
                      {effectiveClientId ? (
                        <>
                          <div className="summary-value">
                            {formatLargeNumber(effectiveClientHasData ? getTotalUsages(effectiveClientId, 12) : 0)}
                          </div>
                          <div className="summary-change" style={{ color: 'var(--soft-text)' }}>
                            streams, broadcasts &amp; live
                          </div>
                        </>
                      ) : isFreeTier ? (
                        <>
                          <div className="summary-value" style={{ opacity: 0.3 }}>
                            —
                          </div>
                          <div
                            className="summary-change"
                            style={{ color: '#6366F1', cursor: 'pointer', fontSize: '13px' }}
                            onClick={() => {
                              setUpgradeModalFeature('Revenue');
                              setShowUpgradeModal(true);
                            }}
                          >
                            <FaLock size={12} />
                            Upgrade to view
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="summary-value" style={{ color: catalogHealth.color }}>
                            {catalogHealth.percentage}%
                          </div>
                          <div className="summary-change" style={{ color: catalogHealth.color }}>
                            {catalogHealth.status}
                          </div>
                          {missingSongs?.songs?.length > 0 && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#EF4444',
                                fontWeight: 600,
                                marginTop: '4px',
                              }}
                            >
                              {missingSongs.songs.length} song{missingSongs.songs.length !== 1 ? 's' : ''} missing from
                              statements
                            </div>
                          )}
                          {catalogHealth.status !== 'No Data' && (
                            <>
                              <div
                                style={{
                                  width: '100%',
                                  height: '4px',
                                  background: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                  borderRadius: '2px',
                                  marginTop: '8px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${catalogHealth.percentage}%`,
                                    height: '100%',
                                    background: catalogHealth.color,
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                              {catalogHealth.issues && catalogHealth.issues.length > 0 && (
                                <div
                                  style={{
                                    marginTop: '12px',
                                    fontSize: '11px',
                                    color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                                    lineHeight: '1.4',
                                  }}
                                >
                                  {catalogHealth.issues.slice(0, 2).map((issue, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        marginBottom: '4px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '4px',
                                      }}
                                    >
                                      <span style={{ color: catalogHealth.color, flexShrink: 0 }}>•</span>
                                      <span>{issue}</span>
                                    </div>
                                  ))}
                                  {catalogHealth.issues.length > 2 && (
                                    <div
                                      style={{
                                        marginTop: '4px',
                                        fontStyle: 'italic',
                                        opacity: 0.8,
                                      }}
                                    >
                                      +{catalogHealth.issues.length - 2} more issue
                                      {catalogHealth.issues.length - 2 > 1 ? 's' : ''} (hover to see all)
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </MUITooltip>
              )}

              {effectiveClientId && (
                <div className="summary-card">
                  <div className="summary-icon" style={{ background: '#0EA5E915' }}>
                    <FaMusic style={{ color: '#0EA5E9' }} />
                  </div>
                  <div className="summary-content">
                    <div className="summary-label">{t('earnings.works')}</div>
                    <div className="summary-value">
                      {(effectiveClientHasData ? getWorksCount(effectiveClientId) : 0).toLocaleString()}
                    </div>
                    <div className="summary-change" style={{ color: 'var(--soft-text)' }}>
                      registered with publisher
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Revenue Over Time */}
            <div className="chart-card chart-large">
              <div className="chart-header">
                <h3>{t('earnings.revenueOverTime')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#3B82F6' }}>●</span>
                      <span style={{ opacity: 0.7 }}>Reported Total:</span>
                      <span>{formatCurrency(quarterlyRevenueTotal)}</span>
                    </div>
                    {!isLivePortal && totalDiscrepancy > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#60A5FA', opacity: 0.7 }}>⦿</span>
                        <span style={{ opacity: 0.7 }}>Discrepancy:</span>
                        <span>{formatCurrency(totalDiscrepancy)}</span>
                      </div>
                    )}
                    {!isLivePortal && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#EF4444' }}>●</span>
                        <span style={{ opacity: 0.7 }}>Payout:</span>
                        <span>{formatCurrency(statementRevenueTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Box sx={{ position: 'relative' }}>
                  {/* SVG Pattern Definitions for Diagonal Stripes */}
                  <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <defs>
                      <pattern
                        id="diagonalStripes"
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                        patternTransform="rotate(45)"
                      >
                        <rect width="8" height="8" fill="#60A5FA" opacity="0.3" />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke={currentTheme === 'dark' ? '#3B82F6' : '#2563EB'}
                          strokeWidth="2"
                        />
                      </pattern>
                      <pattern
                        id="diagonalStripesDark"
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                        patternTransform="rotate(45)"
                      >
                        <rect width="8" height="8" fill="#60A5FA" opacity="0.2" />
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#3B82F6" strokeWidth="2" />
                      </pattern>
                    </defs>
                  </svg>
                  <BarChart
                    xAxis={[
                      {
                        data: muiRevenueTimeData.labels,
                        scaleType: 'band',
                        categoryGapRatio: 0.3,
                        barGapRatio: 0.1,
                        tickLabelStyle: {
                          fill: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                          fontSize: 11,
                        },
                      },
                    ]}
                    yAxis={[
                      {
                        tickLabelStyle: {
                          fill: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                          fontSize: 11,
                        },
                      },
                    ]}
                    series={
                      isLivePortal
                        ? [
                            {
                              data: muiRevenueTimeData.quarterlyData,
                              label: 'Reported Revenue',
                              id: 'quarterlyId',
                              color: '#3B82F6',
                              stack: 'total',
                            },
                          ]
                        : [
                            {
                              data: muiRevenueTimeData.quarterlyData,
                              label: 'Reported Revenue',
                              id: 'quarterlyId',
                              color: '#3B82F6',
                              stack: 'total',
                            },
                            {
                              data: discrepancyData,
                              label: 'Discrepancy (Expected - Reported)',
                              id: 'discrepancyId',
                              color: currentTheme === 'dark' ? 'url(#diagonalStripesDark)' : 'url(#diagonalStripes)',
                              stack: 'total',
                            },
                            {
                              data: muiRevenueTimeData.statementData,
                              label: 'Payout',
                              id: 'statementId',
                              color: '#EF4444',
                              stack: 'statement',
                            },
                          ]
                    }
                    slotProps={{
                      legend: {
                        hidden: true,
                      },
                    }}
                    sx={{
                      '& .MuiChartsAxis-tickLabel': {
                        fill:
                          currentTheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.9) !important'
                            : 'rgba(0, 0, 0, 0.9) !important',
                        fontSize: '12px',
                      },
                      '& .MuiChartsAxis-line': {
                        stroke: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                        strokeWidth: 1,
                      },
                      '& .MuiChartsAxis-tick': {
                        stroke: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                        strokeWidth: 1,
                      },
                      '& .MuiChartsGrid-line': {
                        stroke: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        strokeWidth: 1,
                      },
                      '& .MuiChartsLegend-label': {
                        fill:
                          currentTheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.9) !important'
                            : 'rgba(0, 0, 0, 0.9) !important',
                      },
                      '& text': {
                        fill:
                          currentTheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.9) !important'
                            : 'rgba(0, 0, 0, 0.9) !important',
                      },
                    }}
                    grid={{ horizontal: true, vertical: false }}
                    height={350}
                  />
                </Box>
                {/* Year Range Selector for All Time view */}
                {selectedTimeframe === 'alltime' && allTimeYearRange.startYear && (
                  <div className="year-range-selector">
                    <button
                      className="year-nav-btn"
                      onClick={() => navigateYearRange('prev')}
                      disabled={!canNavigatePrev}
                      title={t('earnings.prevYears')}
                    >
                      <FaChevronLeft />
                    </button>
                    <span className="year-range-label">
                      {allTimeYearRange.startYear} - {allTimeYearRange.endYear}
                    </span>
                    <button
                      className="year-nav-btn"
                      onClick={() => navigateYearRange('next')}
                      disabled={!canNavigateNext}
                      title={t('earnings.nextYears')}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Source */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>{t('earnings.revenueBySource')}</h3>
                <div className="source-toggle">
                  <button
                    className={sourceViewMode === 'incomeType' ? 'active' : ''}
                    onClick={() => setSourceViewMode('incomeType')}
                  >
                    {t('earnings.incomeType')}
                  </button>
                  <button
                    className={sourceViewMode === 'organization' ? 'active' : ''}
                    onClick={() => setSourceViewMode('organization')}
                  >
                    {t('earnings.organization')}
                  </button>
                </div>
              </div>
              <div
                className="chart-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  height: '400px',
                  width: '100%',
                  padding: '10px',
                  overflow: 'hidden',
                }}
              >
                {totalRevenueBySource === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {t('earnings.noData')}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '280px',
                        minHeight: '280px',
                        width: '100%',
                      }}
                    >
                      <PieChart
                        series={[
                          {
                            data: sourceViewMode === 'incomeType' ? muiSourceCategoryPieData : muiSourcePieData,
                            innerRadius: 60,
                            outerRadius: 120,
                            paddingAngle: 2,
                            cornerRadius: 4,
                            highlightScope: { faded: 'global', highlighted: 'item' },
                            cx: 130,
                            cy: 130,
                          },
                        ]}
                        width={260}
                        height={260}
                        slotProps={{
                          legend: {
                            hidden: true,
                          },
                        }}
                      >
                        <PieCenterLabel isDark={currentTheme === 'dark'}>
                          {formatCurrency(totalRevenueBySource)}
                        </PieCenterLabel>
                      </PieChart>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        maxHeight: '100px',
                        overflowY: 'auto',
                      }}
                    >
                      {(sourceViewMode === 'incomeType' ? muiSourceCategoryPieData : muiSourcePieData).map(
                        (item, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                            }}
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                backgroundColor: item.color,
                              }}
                            />
                            <span>{item.label}</span>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Territory and Platform Section */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
            {/* Territory Performance */}
            <div className="territory-section" style={{ marginBottom: 0 }}>
              <div className="section-header">
                <h3>{t('earnings.revenueByTerritory')}</h3>
                <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '4px' }}>
                  {t('earnings.globeAlt')}
                </p>
              </div>
              <div
                className="chart-container"
                style={{
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'stretch',
                  minHeight: '400px',
                  height: '400px',
                  width: '100%',
                  padding: '10px',
                  overflow: 'hidden',
                }}
              >
                {/* Globe - takes remaining space and centers content horizontally and vertically */}
                <div
                  style={{
                    flex: '1 1 auto',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '420px',
                      height: '420px',
                      overflow: 'hidden',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '400px',
                        height: '400px',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <GlobeIframe
                        territories={globeTerritories}
                        territoryCoordinates={globeTerritoryCoords}
                        theme={currentTheme}
                      />
                    </div>
                  </div>
                </div>

                {/* Top 10 Countries List - fixed on right */}
                <div style={{ flex: '0 0 140px' }}>
                  <div
                    style={{
                      background: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderRadius: '8px',
                      padding: '10px',
                      border:
                        currentTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <h4
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: currentTheme === 'dark' ? '#FFFFFF' : '#000000',
                        flexShrink: 0,
                      }}
                    >
                      {t('earnings.topCountries')}
                    </h4>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '2px',
                      }}
                    >
                      {globeTerritories
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 10)
                        .map((territory, index) => {
                          const coords = globeTerritoryCoords[territory.territory];
                          const countryName = coords?.name || territory.territory;
                          const percentage = (
                            (territory.amount / globeTerritories.reduce((sum, t) => sum + t.amount, 0)) *
                            100
                          ).toFixed(1);

                          const isDark = currentTheme === 'dark';
                          return (
                            <div
                              key={territory.territory}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px',
                                background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                                borderRadius: '4px',
                                border: isDark
                                  ? '1px solid rgba(255, 255, 255, 0.08)'
                                  : '1px solid rgba(0, 0, 0, 0.08)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDark
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgba(0, 0, 0, 0.05)';
                                e.currentTarget.style.transform = 'translateX(4px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isDark
                                  ? 'rgba(255, 255, 255, 0.03)'
                                  : 'rgba(0, 0, 0, 0.02)';
                                e.currentTarget.style.transform = 'translateX(0)';
                              }}
                            >
                              {/* Rank */}
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background:
                                    index < 3
                                      ? 'linear-gradient(135deg, #FF6B00, #FF8C00)'
                                      : isDark
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'rgba(0, 0, 0, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '700',
                                  fontSize: '12px',
                                  color: index < 3 ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000',
                                }}
                              >
                                {index + 1}
                              </div>

                              {/* Country Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: isDark ? '#FFFFFF' : '#000000',
                                    marginBottom: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {countryName}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                                  }}
                                >
                                  {percentage}% of total
                                </div>
                              </div>

                              {/* Revenue */}
                              <div
                                style={{
                                  textAlign: 'right',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: isDark ? '#00D9FF' : '#0099CC',
                                  }}
                                >
                                  ${territory.amount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Total Revenue Summary */}
                    {globeTerritories.length > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px',
                          background: currentTheme === 'dark' ? 'rgba(0, 217, 255, 0.1)' : 'rgba(0, 153, 204, 0.1)',
                          borderRadius: '4px',
                          border:
                            currentTheme === 'dark'
                              ? '1px solid rgba(0, 217, 255, 0.3)'
                              : '1px solid rgba(0, 153, 204, 0.3)',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '9px',
                            color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                            marginBottom: '3px',
                          }}
                        >
                          Total Revenue ({globeTerritories.length}{' '}
                          {globeTerritories.length === 1 ? 'country' : 'countries'})
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: currentTheme === 'dark' ? '#00D9FF' : '#0099CC',
                          }}
                        >
                          ${globeTerritories.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue by Platform */}
            <div className="territory-section" style={{ marginBottom: 0 }}>
              <div className="section-header">
                <h3>{t('earnings.revenueByPlatform')}</h3>
                <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '4px' }}>
                  {t('earnings.platformSubtitle')}
                </p>
              </div>
              <div
                className="chart-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  height: '400px',
                  width: '100%',
                  padding: '10px',
                }}
              >
                {totalRevenueByPlatform === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {t('earnings.noData')}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flex: 1,
                        width: '100%',
                      }}
                    >
                      <PieChart
                        series={[
                          {
                            data: muiPlatformPieData,
                            innerRadius: 60,
                            outerRadius: 120,
                            paddingAngle: 2,
                            cornerRadius: 4,
                            highlightScope: { faded: 'global', highlighted: 'item' },
                            cx: 130,
                            cy: 130,
                          },
                        ]}
                        width={260}
                        height={260}
                        slotProps={{
                          legend: {
                            hidden: true,
                          },
                        }}
                      >
                        <PieCenterLabel isDark={currentTheme === 'dark'}>
                          {formatCurrency(totalRevenueByPlatform)}
                        </PieCenterLabel>
                      </PieChart>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        marginTop: '10px',
                      }}
                    >
                      {muiPlatformPieData.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                          }}
                        >
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '2px',
                              background: item.color,
                            }}
                          />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* All Transactions */}
          <div className="transactions-section" data-theme={currentTheme}>
            <div className="section-header">
              <div className="transaction-tabs">
                <button
                  className={`tab-button ${activeTransactionTab === 'top-songs' ? 'active' : ''}`}
                  onClick={() => setActiveTransactionTab('top-songs')}
                >
                  Top Earning Songs ({topEarningSongs.length})
                </button>
                <button
                  className={`tab-button ${activeTransactionTab === 'transactions' ? 'active' : ''}`}
                  onClick={() => setActiveTransactionTab('transactions')}
                >
                  All Transactions ({filteredTransactions.length})
                </button>
              </div>
              {activeTransactionTab === 'top-songs' ? (
                <input
                  type="text"
                  placeholder={t('earnings.searchSong')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-select"
                  style={{ minWidth: '240px', fontStyle: searchTerm ? 'normal' : 'italic' }}
                />
              ) : (
                <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
                  <FaFilter />
                  {t('earnings.filters')}
                </button>
              )}
            </div>

            {showFilters && activeTransactionTab !== 'top-songs' && (
              <div className="filters-bar">
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">{t('earnings.allIncomeTypes')}</option>
                  <option value="streaming">{t('income.streaming')}</option>
                  <option value="download">{t('income.download')}</option>
                  <option value="physical">{t('income.physical')}</option>
                  <option value="performance">{t('income.performance')}</option>
                  <option value="mechanical">{t('income.mechanical')}</option>
                  <option value="sync">{t('income.sync')}</option>
                  <option value="merchandise">{t('income.merchandise')}</option>
                  <option value="live">{t('income.live')}</option>
                  <option value="other">{t('income.other')}</option>
                </select>
                {/* Payment Sources Multi-Select */}
                <div className="payment-sources-filter" style={{ position: 'relative' }}>
                  <button
                    className="filter-select"
                    onClick={() => setShowPaymentSourcesDropdown(!showPaymentSourcesDropdown)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      backgroundColor: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      border:
                        currentTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.2)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                      width: '100%',
                    }}
                  >
                    {selectedPaymentSources.length === 0
                      ? `All Payment Sources (${uniquePaymentSources.length})`
                      : `${selectedPaymentSources.length} Payment Source${selectedPaymentSources.length > 1 ? 's' : ''} Selected`}
                  </button>

                  {showPaymentSourcesDropdown && (
                    <div
                      className="payment-sources-checklist"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor:
                          currentTheme === 'dark' ? 'rgba(20, 20, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        border:
                          currentTheme === 'dark'
                            ? '1px solid rgba(255, 255, 255, 0.2)'
                            : '1px solid rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginTop: '4px',
                        padding: '8px',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow:
                          currentTheme === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {/* Select All / Deselect All */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          padding: '8px',
                          borderBottom:
                            currentTheme === 'dark'
                              ? '1px solid rgba(255, 255, 255, 0.1)'
                              : '1px solid rgba(0, 0, 0, 0.1)',
                          marginBottom: '8px',
                        }}
                      >
                        <button
                          onClick={() => setSelectedPaymentSources(uniquePaymentSources)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            borderRadius: '4px',
                            color: '#3B82F6',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {t('earnings.selectAll')}
                        </button>
                        <button
                          onClick={() => setSelectedPaymentSources([])}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '4px',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {t('earnings.deselectAll')}
                        </button>
                      </div>

                      {/* Checkboxes */}
                      {uniquePaymentSources.map((source) => (
                        <label
                          key={source}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            // Right-click: select only this item
                            setSelectedPaymentSources([source]);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s',
                            backgroundColor: selectedPaymentSources.includes(source)
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedPaymentSources.includes(source)) {
                              e.currentTarget.style.backgroundColor =
                                currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedPaymentSources.includes(source)) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPaymentSources.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPaymentSources([...selectedPaymentSources, source]);
                              } else {
                                setSelectedPaymentSources(selectedPaymentSources.filter((s) => s !== source));
                              }
                            }}
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer',
                            }}
                          />
                          <span
                            style={{
                              color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                              fontSize: '14px',
                            }}
                          >
                            {source}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={filterTerritory}
                  onChange={(e) => setFilterTerritory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">{t('earnings.allTerritories')}</option>
                  {/* not `t` — that is the translate function in this scope */}
                  {revenueByTerritory.map((territory) => (
                    <option key={territory.code} value={territory.code}>
                      {territory.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t('earnings.searchSongs')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-select"
                  style={{
                    fontStyle: searchTerm ? 'normal' : 'italic',
                  }}
                />
              </div>
            )}

            {activeTransactionTab === 'transactions' ? (
              <>
                <div className="transactions-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('table.date')}</th>
                        <th>{t('table.source')}</th>
                        <th>{t('table.paymentSources')}</th>
                        <th>{t('table.territory')}</th>
                        <th
                          onClick={() => {
                            if (sortByAmount === 'desc') setSortByAmount('asc');
                            else if (sortByAmount === 'asc') setSortByAmount(null);
                            else setSortByAmount('desc');
                          }}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          title={t('earnings.sortByAmount')}
                        >
                          {t('table.amount')} {sortByAmount === 'desc' ? '↓' : sortByAmount === 'asc' ? '↑' : ''}
                        </th>
                        <th>{t('table.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            {new Date(transaction.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td>
                            <div className="source-cell">
                              <span className="source-icon">{getSourceIcon(transaction.source)}</span>
                              {transaction.category || transaction.sourceCategory || 'Other'}
                            </div>
                          </td>
                          <td>{transaction.source || 'Unknown'}</td>
                          <td>
                            <span className="territory-badge">{transaction.territory}</span>
                          </td>
                          <td className="amount-cell">{formatCurrency(transaction.amount)}</td>
                          <td>
                            <span className={`status-badge status-${transaction.status}`}>{transaction.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="summary-row">
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '20px' }}>
                          Total ({filteredTransactions.length} transactions):
                        </td>
                        <td className="amount-cell" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                          {formatCurrency(filteredTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredTransactions.length > 0 && (
                  <div className="pagination-controls" data-theme={currentTheme}>
                    <div className="pagination-info">
                      {t('earnings.showingRange', {
                        from: startIndex + 1,
                        to: Math.min(endIndex, filteredTransactions.length),
                        total: filteredTransactions.length,
                        pages: totalPages,
                      })}
                    </div>
                    <div className="pagination-buttons">
                      <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        {t('earnings.first')}
                      </button>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        {t('earnings.previous')}
                      </button>
                      <span className="pagination-current">
                        {t('earnings.pageOf', { page: currentPage, pages: totalPages })}
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        {t('earnings.next')}
                      </button>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        {t('earnings.last')}
                      </button>
                    </div>
                    <div className="pagination-per-page">
                      <label>
                        {t('earnings.perPage')}
                        <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={200}>200</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Top Earning Songs View */
              <div className="top-songs-list">
                {topEarningSongs.length === 0 ? (
                  <div className="empty-state">
                    <p>{t('earnings.noSongs')}</p>
                  </div>
                ) : (
                  <div className="songs-grid">
                    {topEarningSongs.map((song, index) => {
                      const songKey = `${song.product}|||${song.artist}`;
                      const catalogData = songCatalogData[songKey];
                      const albumArtUrl = catalogData?.albumArt;
                      // Use resolved artist from catalog if available, then song.artist, then show writer
                      const displayArtist = catalogData?.artist || song.artist || '';
                      const displayWriter = song.writer || '';

                      return (
                        <div key={songKey} className="song-card" data-theme={currentTheme}>
                          <div className="song-rank">#{index + 1}</div>

                          {/* Album Art — no catalog art in the writer portal, so
                              drop the empty cover placeholder entirely there. */}
                          {!isLivePortal && (
                            <div className="song-album-art">
                              {albumArtUrl ? (
                                <img src={albumArtUrl} alt={`${song.product} cover`} />
                              ) : (
                                <div className="song-album-art-placeholder">
                                  <FaMusic />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="song-info">
                            <div className="song-title">{song.product}</div>
                            {displayArtist && <div className="song-artist">{displayArtist}</div>}
                            {!displayArtist && displayWriter && (
                              <div className="song-artist" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                                Writer: {displayWriter.split('|')[0]}
                              </div>
                            )}
                            <div className="song-stats">
                              <span className="stat-item">
                                <FaDollarSign /> {formatCurrency(song.totalRevenue)}
                              </span>
                              <span className="stat-item">
                                <FaList /> {song.transactionCount} transactions
                              </span>
                              <span className="stat-item">
                                <FaGlobe /> {song.territoryCount} territories
                              </span>
                            </div>
                          </div>
                          <div className="song-revenue">{formatCurrency(song.totalRevenue)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Uploaded Statements Summary */}
          {uploadedStatements.length > 0 && (
            <div className="statements-summary" style={{ marginTop: '24px' }}>
              <h3>Uploaded Statements</h3>
              <div className="statements-list">
                {uploadedStatements.map((statement) => (
                  <div key={statement.id} className="statement-item">
                    <div className="statement-info">
                      <div className="statement-name">{statement.filename}</div>
                      <div className="statement-meta">
                        {new Date(statement.uploadDate).toLocaleDateString()} • {statement.transactionCount}{' '}
                        transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Songs Section */}
          {!isFreeTier && missingSongs && missingSongs.songs && missingSongs.songs.length > 0 && (
            <div className="chart-card" style={{ marginTop: '24px' }}>
              <div className="chart-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaExclamationTriangle style={{ color: '#F59E0B' }} />
                  Songs Missing from Statements
                </h3>
                <div
                  style={{
                    fontSize: '13px',
                    color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {missingSongs.missingFromStatements} of {missingSongs.totalCatalogSongs} catalog songs not found in
                  statements
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                  padding: '16px 0',
                }}
              >
                {missingSongs.songs.map((song) => (
                  <div
                    key={song.catalogId}
                    style={{
                      background: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                      border: `1px solid ${currentTheme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      gap: '12px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = '#F59E0B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
                      e.currentTarget.style.borderColor =
                        currentTheme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)';
                    }}
                  >
                    {/* Album Art */}
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AlbumImage
                        src={song.albumArt}
                        alt={song.title}
                        isDark={currentTheme === 'dark'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    {/* Song Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {song.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                          marginBottom: '8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {song.artist}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '11px',
                        }}
                      >
                        <div
                          style={{
                            color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                          }}
                        >
                          {song.totalStreams.toLocaleString()} streams
                        </div>
                        {song.potentialRevenue > 0 && (
                          <div
                            style={{
                              color: '#F59E0B',
                              fontWeight: 600,
                            }}
                          >
                            Potential: {formatCurrency(song.potentialRevenue)}
                          </div>
                        )}
                        {song.publishingSplit > 0 && (
                          <div
                            style={{
                              color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                            }}
                          >
                            {(song.publishingSplit * 100).toFixed(0)}% publishing split
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statements Modal */}
        <StatementsModal
          statements={uploadedStatements}
          isOpen={isStatementsModalOpen}
          onClose={() => setIsStatementsModalOpen(false)}
          onDeleteStatement={handleDeleteStatement}
          onEditMapping={(statement) => {
            setEditingStatement(statement);
            setIsEditMappingOpen(true);
          }}
        />

        {/* Edit Mapping Modal */}
        <EditMappingModal
          statement={editingStatement}
          isOpen={isEditMappingOpen}
          onClose={() => {
            setIsEditMappingOpen(false);
            setEditingStatement(null);
          }}
          onSave={async () => {
            // Refetch transactions after mapping update
            const clientParam = selectedClientId ? `?client_id=${selectedClientId}` : '';
            const response = await fetch(
              urlJoin(process.env.REACT_APP_BACKEND_URL, `revenue/transactions${clientParam}`),
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              }
            );
            if (response.ok) {
              const data = await response.json();
              setUploadedTransactions(data.transactions || []);
            }
          }}
        />

        {/* Parsing Details Modal */}
        <ParsingDetailsModal
          isOpen={showParsingDetails}
          onClose={() => setShowParsingDetails(false)}
          parsingResult={parsingResult}
        />

        {/* Column Mapping Modal */}
        <ColumnMappingModal
          isOpen={isColumnMappingOpen}
          onClose={() => {
            setIsColumnMappingOpen(false);
            setPendingFile(null);
            setPendingCsvText(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          onConfirm={handleColumnMappingConfirm}
          csvHeaders={csvPreviewData?.headers || []}
          suggestedMapping={csvPreviewData?.suggestedMapping || {}}
          sampleData={csvPreviewData?.sampleData || []}
          fileName={pendingFile?.name || ''}
          detectedProfile={csvPreviewData?.detectedProfile}
          detectionConfidence={csvPreviewData?.detectionConfidence}
        />

        {/* Auto-Detect Confirmation Modal */}
        <AutoDetectConfirmModal
          isOpen={isAutoDetectConfirmOpen}
          onClose={() => {
            setIsAutoDetectConfirmOpen(false);
            setPendingFile(null);
            setPendingCsvText(null);
            setDetectedProfile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          onImport={handleAutoDetectImport}
          onAdjustMapping={() => {
            // Fall back to manual column mapping modal
            setIsAutoDetectConfirmOpen(false);

            // Prepare preview data for ColumnMappingModal
            const parser = new SmartCsvParser(true);
            const previewResult = parser.preview(pendingCsvText, pendingFile?.name || '');

            const suggestedMappingForModal = {};
            Object.entries(previewResult.suggestedMapping).forEach(([fieldName, columnIndex]) => {
              const headerName = previewResult.headers[columnIndex];
              if (headerName) {
                suggestedMappingForModal[headerName] = fieldName;
              }
            });

            setCsvPreviewData({
              headers: previewResult.headers,
              sampleData: previewResult.sampleData,
              suggestedMapping: suggestedMappingForModal,
              detectedProfile: detectedProfile,
              detectionConfidence: previewResult.detectionConfidence,
            });

            setIsColumnMappingOpen(true);
          }}
          csvText={pendingCsvText || ''}
          detectedProfile={detectedProfile}
          fileName={pendingFile?.name || ''}
        />

        {/* Audit Catalog Modal */}
        {showAuditCatalog && (
          <div className="modal-overlay" onClick={() => setShowAuditCatalog(false)}>
            <div className="modal-content audit-catalog-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Catalog Health Report</h2>
                <button className="modal-close" onClick={() => setShowAuditCatalog(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '85vh', overflow: 'auto' }}>
                <CatalogHealthSummary
                  healthPercentageOverride={catalogHealth.percentage}
                  revenueDataOverride={{
                    totalRevenue: allTimeReportedRevenue,
                    totalExpectedRevenue: allTimeExpectedRevenue,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Export Report Modal */}
        <ExportReportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          transactions={transactions}
          username={user?.username || user?.name || 'User'}
        />

        {/* Upgrade Modal for Free Tier Users */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature={upgradeModalFeature}
        />
      </div>
    </>
  );
};

export default Revenue;
