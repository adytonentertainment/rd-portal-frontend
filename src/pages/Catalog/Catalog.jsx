import { Helmet } from 'react-helmet-async';
import {
  Backdrop,
  Checkbox,
  CircularProgress,
  Fade,
  Modal,
  Tooltip as MUITooltip,
  TextField,
  Skeleton,
} from '@mui/material';
import { LineChart, ChartContainer } from '@mui/x-charts';
import { IoIosInformationCircle } from 'react-icons/io';
import axios from 'axios';
import { parse } from 'date-fns';
import { useEffect, useRef, useState, useMemo, useCallback, memo, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { FixedSizeList as List } from 'react-window';
import UltraFastGraph from './UltraFastGraph';
import { LockedChart } from '../../components/LockedChart';
import { LockedMetric } from '../../components/LockedMetric';
import RevenueDisplay from '../../components/RevenueDisplay';
import StreamsDisplay from '../../components/StreamsDisplay';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import { mockCoverFor } from '../../utils/mockCover';
import { NivoLineChart } from '../../components/NivoLineChart/NivoLineChart';
import { transformToNivoFormat, applyAdaptiveGranularity } from '../../utils/dataAggregation';
import { BsThreeDots } from 'react-icons/bs';
import { FaArrowLeftLong, FaArrowRightLong, FaMagnifyingGlass } from 'react-icons/fa6';
import { HiMiniMagnifyingGlass } from 'react-icons/hi2';
import { IoCalendarOutline } from 'react-icons/io5';
import { FaArrowUp } from 'react-icons/fa6';
import { RxCross2 } from 'react-icons/rx';
import { toast } from 'react-toastify';
import urlJoin from 'url-join';
import { triggerSubscriptionUpdate } from '../../utils/subscriptionUtils';
import GlassButton from '../../components/Buttons/GlassButton/GlassButton';
import RedButton from '../../components/Buttons/RedButton/RedButton';
import TransparentButton from '../../components/Buttons/TransparentButton/TransparentButton';
import DashboardNavBar from '../../components/DashboardNavBar/DashboardNavBar';
import Sidebar from '../../components/Sidebar/Sidebar';
import { getWriterPersonaId } from '../../utils/persona';
import { hasAnyDistribution, subscribe as subscribeDistribution, CURRENT_PERIOD } from '../../mocks/distributionState';
import { FaHourglassHalf } from 'react-icons/fa';
import Dropdown from '../../components/Dropdown/Dropdown';
import RoundedSection from '../../components/RoundedSection/RoundedSection';
import CatalogAnalysisModal from '../../components/CatalogAnalysisModal/CatalogAnalysisModal';
import ManualSearch from '../../components/ManualSearch/ManualSearch';
import PremiumLockOverlay from '../../components/PremiumLockOverlay/PremiumLockOverlay';
import UpgradeModal from '../../components/UpgradeModal/UpgradeModal';
import styles from './catalog.module.css';
import { catalogData } from '../../misc/mockData';
import DropdownMenu from '../../components/DropdownMenu/DropdownMenu';
import DropdownMultiSelection from '../../components/DropdownMultiSelection/DropdownMultiSelection';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import NumberInput from '../../components/NumberInput/NumberInput';
import SortButton from '../../components/Buttons/SortButton/SortButton';
import SoundchartsAPI from '../../services/soundchartsApi';
import ClaimRoyaltiesModal from '../../components/ClaimRoyaltiesModal/ClaimRoyaltiesModal';
import CaseStatusModal from '../../components/CaseStatusModal/CaseStatusModal';
import CatalogImport from '../../components/CatalogImport/CatalogImport';
import { SubscriptionContextProvider } from '../../components/SubscriptionContext/SubscriptionContext';

// Calculate font size based on formatted value length to fit in card
// Uses ratio-based scaling that works for any base size
const getResponsiveFontSize = (formattedValue, baseSize = 24) => {
  const length = String(formattedValue).length;
  // Scale down by ~15% for each threshold exceeded
  if (length <= 7) return baseSize;
  if (length <= 9) return Math.round(baseSize * 0.85);
  if (length <= 11) return Math.round(baseSize * 0.7);
  if (length <= 13) return Math.round(baseSize * 0.6);
  return Math.round(baseSize * 0.5);
};

// Album image component with fallback placeholder
const AlbumImage = ({ src, alt, style, className }) => {
  const [hasError, setHasError] = useState(false);
  const effectiveSrc = !src || hasError ? mockCoverFor(alt) : src;
  return <img src={effectiveSrc} alt={alt} style={style} className={className} onError={() => setHasError(true)} />;
};

const Track = ({
  data,
  onRoyaltyUpdate,
  isSelected,
  onSelectionChange,
  onClaimRoyaltiesClick,
  onContextMenuSelect,
  hideRoyalties = false,
}) => {
  const { currentTheme } = useContext(ThemeContext);
  const isDarkMode = currentTheme === 'dark';
  const [editingMaster, setEditingMaster] = useState(false);
  const [editingPublishing, setEditingPublishing] = useState(false);
  const [masterValue, setMasterValue] = useState((data?.master_royalty ?? 0) * 100);
  const [publishingValue, setPublishingValue] = useState((data?.publishing_royalty ?? 0) * 100);

  // Sync state with data prop changes
  useEffect(() => {
    if (data) {
      setMasterValue((data.master_royalty ?? 0) * 100);
      setPublishingValue((data.publishing_royalty ?? 0) * 100);
    }
  }, [data?.master_royalty, data?.publishing_royalty]);

  const handleMasterClick = useCallback(() => {
    setEditingMaster(true);
    setMasterValue('');
  }, []);

  const handlePublishingClick = useCallback(() => {
    setEditingPublishing(true);
    setPublishingValue('');
  }, []);

  const handleMasterBlur = useCallback(async () => {
    setEditingMaster(false);
    const currentMaster = data.master_royalty ?? 0;
    const currentPublishing = data.publishing_royalty ?? 0;
    const newValue = masterValue === '' ? currentMaster * 100 : masterValue;
    setMasterValue(newValue);
    if (newValue !== currentMaster * 100) {
      await onRoyaltyUpdate(data, newValue / 100, currentPublishing);
    }
  }, [masterValue, data, onRoyaltyUpdate]);

  const handlePublishingBlur = useCallback(async () => {
    setEditingPublishing(false);
    const currentMaster = data.master_royalty ?? 0;
    const currentPublishing = data.publishing_royalty ?? 0;
    const newValue = publishingValue === '' ? currentPublishing * 100 : publishingValue;
    setPublishingValue(newValue);
    if (newValue !== currentPublishing * 100) {
      await onRoyaltyUpdate(data, currentMaster, newValue / 100);
    }
  }, [publishingValue, data, onRoyaltyUpdate]);

  const handleMasterKeyDown = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handleMasterBlur();
      }
    },
    [handleMasterBlur]
  );

  const handlePublishingKeyDown = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handlePublishingBlur();
      }
    },
    [handlePublishingBlur]
  );

  return !data ? (
    <></>
  ) : (
    <div
      className={`${styles.catalogItem} ${data.is_infringement ? styles.catalogItemInfringing : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenuSelect) {
          onContextMenuSelect(data.spotify_track_id);
        }
      }}
    >
      <Checkbox
        checked={isSelected}
        onChange={(e) => onSelectionChange(data.spotify_track_id, e.target.checked)}
        sx={{
          padding: '2px',
          '& .MuiSvgIcon-root': { fontSize: 16 },
          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
          '&.Mui-checked': {
            color: isDarkMode ? '#ffffff' : '#000000',
          },
        }}
      />
      <div className={styles.catalogItemImage}>
        <AlbumImage
          src={data.album_art}
          alt={data.title}
          style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }}
        />
      </div>
      <div className={styles.catalogItemTitle}>
        <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>{data.title}</div>
        <div className={styles.catalogItemArtists}>
          <span style={{ color: '#888' }}>{data.artist}</span>
          {!hideRoyalties && (
            <>
              <br />
              <MUITooltip title="Publishing Royalty (click to edit)" placement="bottom">
                {editingPublishing ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={publishingValue}
                    onChange={(e) =>
                      setPublishingValue(
                        e.target.value === '' ? '' : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                      )
                    }
                    onBlur={handlePublishingBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handlePublishingBlur()}
                    autoFocus
                    className="text-xs text-teal-400 bg-transparent border-b border-teal-400 w-8 outline-none"
                    style={{ display: 'inline-block' }}
                  />
                ) : (
                  <span
                    className="text-teal-400/60 cursor-pointer hover:text-teal-400 transition-colors"
                    onClick={handlePublishingClick}
                    style={{ display: 'inline', fontSize: '10px' }}
                  >
                    {(data.publishing_royalty ?? 0) * 100}%
                  </span>
                )}
              </MUITooltip>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {data?.publishing_royalty == null && (
          <MUITooltip
            title="Publishing royalty has not been set. Please set the publishing royalty percentage for accurate revenue calculations."
            arrow
          >
            <span style={{ fontSize: '20px', cursor: 'help' }}>⚠️</span>
          </MUITooltip>
        )}
        {data?.publishing_royalty === 0 && (
          <MUITooltip
            title="No revenue tracking - Publishing royalty is set to 0%. This track will not generate any revenue."
            arrow
          >
            <span style={{ fontSize: '16px', cursor: 'help', color: '#ef4444' }}>⚠️</span>
          </MUITooltip>
        )}
        {data?.case_status && data.case_status !== 'closed' && (
          <button
            data-claim-revenue="true"
            className="whitespace-nowrap transition-all"
            style={{
              fontSize: '10px',
              padding: '6px 10px',
              borderRadius: '6px',
              border:
                data?.case_status === 'in_review'
                  ? '2px solid #f59e0b'
                  : data?.case_status === 'in_the_works'
                    ? '2px solid #10b981'
                    : data?.case_status === 'closed'
                      ? '2px solid #666'
                      : `2px solid ${isDarkMode ? '#ffffff' : '#000000'}`,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              background:
                data?.case_status === 'in_review'
                  ? '#f59e0b'
                  : data?.case_status === 'in_the_works'
                    ? '#10b981'
                    : data?.case_status === 'closed'
                      ? '#666'
                      : isDarkMode
                        ? '#ffffff'
                        : '#000000',
              color:
                data?.case_status === 'in_review'
                  ? '#000'
                  : data?.case_status === 'in_the_works'
                    ? '#fff'
                    : data?.case_status === 'closed'
                      ? '#fff'
                      : isDarkMode
                        ? '#000000'
                        : '#ffffff',
              minWidth: '100px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow:
                data?.case_status === 'in_review'
                  ? '2px 2px 0px #d97706'
                  : data?.case_status === 'in_the_works'
                    ? '2px 2px 0px #0d8a63'
                    : data?.case_status === 'closed'
                      ? '2px 2px 0px #4a4a4a'
                      : isDarkMode
                        ? '2px 2px 0px #cccccc'
                        : '2px 2px 0px #000000',
            }}
            onClick={() => onClaimRoyaltiesClick(data)}
            onMouseEnter={(e) => {
              if (data?.case_status === 'in_review') {
                e.target.style.background = '#d97706';
              } else if (!data?.case_status || data?.case_status === 'closed') {
                e.target.style.background = isDarkMode ? '#e0e0e0' : '#333333';
              }
            }}
            onMouseLeave={(e) => {
              if (data?.case_status === 'in_review') {
                e.target.style.background = '#f59e0b';
              } else if (data?.case_status === 'in_the_works') {
                e.target.style.background = '#10b981';
              } else if (data?.case_status === 'closed') {
                e.target.style.background = '#666';
              } else {
                e.target.style.background = isDarkMode ? '#ffffff' : '#000000';
              }
            }}
          >
            {data?.case_status === 'in_review'
              ? 'In Review'
              : data?.case_status === 'in_the_works'
                ? 'In the Works'
                : data?.case_status === 'closed'
                  ? 'Closed'
                  : 'Raise a Case'}
          </button>
        )}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#666',
          lineHeight: '1.3',
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <div>
          {parse(data.date_added.substring(0, 10), 'yyyy-MM-dd', new Date()).toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })}
        </div>
        <MUITooltip title="ISRC">
          <div style={{ cursor: 'help' }}>{data.isrc}</div>
        </MUITooltip>
      </div>
      {data.soundcharts && (
        <div className="flex flex-col gap-1 text-[10px] text-[var(--soft-text)]">
          <MUITooltip title="Soundcharts Data" placement="top">
            <div className="flex flex-col gap-1">
              {data.soundcharts.spotify_monthly_listeners && (
                <div>🎵 {data.soundcharts.spotify_monthly_listeners.toLocaleString()} listeners</div>
              )}
              {data.soundcharts.youtube_views && <div>▶️ {data.soundcharts.youtube_views.toLocaleString()} views</div>}
              {data.soundcharts.tiktok_posts && (
                <div>🎵 {data.soundcharts.tiktok_posts.toLocaleString()} TikTok posts</div>
              )}
            </div>
          </MUITooltip>
        </div>
      )}
    </div>
  );
};

// Memoize Track component to prevent unnecessary re-renders
const MemoizedTrack = memo(Track, (prevProps, nextProps) => {
  return (
    prevProps.data?.spotify_track_id === nextProps.data?.spotify_track_id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.data?.master_royalty === nextProps.data?.master_royalty &&
    prevProps.data?.publishing_royalty === nextProps.data?.publishing_royalty &&
    prevProps.hideRoyalties === nextProps.hideRoyalties &&
    prevProps.onRoyaltyUpdate === nextProps.onRoyaltyUpdate
  );
});

// Optimized Chart Component with Data Decimation
const Catalog = () => {
  const { currentTheme } = useContext(ThemeContext);
  const { selectedClientId, selectedClient } = useClientContext();

  // Demo: gate the writer-facing portal on distribution. Keyed on the active
  // persona — the catalog appears only once the publisher has clicked
  // Distribute. Uploading statements alone never reveals it.
  const writerPersonaId = getWriterPersonaId();
  const [, forceDistTick] = useState(0);
  useEffect(() => subscribeDistribution(() => forceDistTick((x) => x + 1)), []);
  const writerHasNoDistributions = writerPersonaId != null && !hasAnyDistribution(writerPersonaId);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // track selection for graph filtering
  const [selectedTracks, setSelectedTracks] = useState([]);

  // Store ALL track IDs from entire catalog (not just current page)
  const [allCatalogTrackIds, setAllCatalogTrackIds] = useState([]);

  // Store ALL tracks with full data (for artist filtering)
  const [allCatalogTracks, setAllCatalogTracks] = useState([]);

  // Memoized Set for O(1) lookup performance
  const selectedTracksSet = useMemo(() => new Set(selectedTracks), [selectedTracks]);

  // Calculate average royalty percentages from selected tracks (or all catalog if none selected)
  // This is used to apply user's ownership percentages to revenue calculations
  const averageRoyalties = useMemo(() => {
    // Use allCatalogTracks for accurate calculation across all user's tracks
    const tracksToUse =
      selectedTracks.length > 0
        ? allCatalogTracks.filter((t) => selectedTracks.includes(t.spotify_track_id))
        : allCatalogTracks;

    if (!tracksToUse || tracksToUse.length === 0) {
      // Default to 100% if no tracks available (shouldn't happen in normal use)
      return { avgMasterRoyalty: 1, avgPublishingRoyalty: 1 };
    }

    let totalMaster = 0;
    let totalPublishing = 0;

    tracksToUse.forEach((track) => {
      totalMaster += parseFloat(track.master_royalty) || 0;
      totalPublishing += parseFloat(track.publishing_royalty) || 0;
    });

    return {
      avgMasterRoyalty: totalMaster / tracksToUse.length,
      avgPublishingRoyalty: totalPublishing / tracksToUse.length,
    };
  }, [allCatalogTracks, selectedTracks]);

  // Track if we're currently changing timeframe to prevent useEffect cascade
  const isChangingTimeframeRef = useRef(false);

  // modals
  const [openTrackChangeModal, setOpenTrackChangeModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState();
  const [selectedTrackIndex, setSelectedTrackIndex] = useState();
  const masterRoyaltyInputRef = useRef();
  const publishingRoyaltyInputRef = useRef();

  const [openDeleteConfirmationModal, setOpenDeleteConfirmationModal] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState();

  // claim royalties modal
  const [openClaimRoyaltiesModal, setOpenClaimRoyaltiesModal] = useState(false);
  const [openCaseStatusModal, setOpenCaseStatusModal] = useState(false);
  const [trackForClaim, setTrackForClaim] = useState();

  // catalog analysis modal (FREE tier CTA)
  const [showCatalogAnalysisModal, setShowCatalogAnalysisModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // upgrade modal for export
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // import modal
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openClearCatalogModal, setOpenClearCatalogModal] = useState(false);

  // audit modal
  const [openAuditModal, setOpenAuditModal] = useState(false);
  const [openAuditConfirmModal, setOpenAuditConfirmModal] = useState(false);
  const [auditRequestLoading, setAuditRequestLoading] = useState(false);

  // add to catalog modal
  const [openCatalogAddModal, setOpenCatalogAddModal] = useState(false);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // search
  const maxTime = 500;
  const [searchTimeoutHandler, setSearchTimeoutHandler] = useState();
  const catalogSearchRef = useRef();

  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 5);

  // stats
  const [endDate, setEndDate] = useState(new Date());
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [selectedTimeframe, setSelectedTimeframe] = useState('All Time');

  const [revenue, setRevenue] = useState(0);
  const [revenueRaise, setRevenueRaise] = useState(0);
  const [playcount, setPlaycount] = useState(0);
  const [playcountRaise, setPlaycountRaise] = useState(0);
  const [catalogValueData, setCatalogValueData] = useState(null);

  // Track if revenue count animation has completed and CTA should be shown
  const [showRevenueClaimCTA, setShowRevenueClaimCTA] = useState(false);
  const [hasShownCTAThisSession, setHasShownCTAThisSession] = useState(false);

  // Track lock hover state for animation
  const [isLockHovered, setIsLockHovered] = useState(false);

  // per-service playcount breakdown
  const [spotifyPlaycount, setSpotifyPlaycount] = useState(0);
  const [youtubePlaycount, setYoutubePlaycount] = useState(0);

  const [bestPerformer, setBestPerformer] = useState();
  const [worstPerformer, setWorstPerformer] = useState();

  // playcount history
  const [playcountHistory, setPlaycountHistory] = useState();

  // Detailed stats for MUI charts (from stats/playcount endpoint)
  const [detailedStats, setDetailedStats] = useState(null);
  const chartContainerRef = useRef(null);
  const [chartHeight, setChartHeight] = useState(300);

  // sorting
  const [dateSortOrder, setDateSortOrder] = useState('nothing');
  const [popularitySortOrder, setPopularitySortOrder] = useState('nothing');

  // revenue types
  const [selectedRevenueTypes, setSelectedRevenueTypes] = useState(['Master', 'Publishing']);

  // chart view mode: 'streams' or 'revenue'
  const [chartViewMode, setChartViewMode] = useState('streams');

  // streaming services selection
  const [selectedStreamingServices, setSelectedStreamingServices] = useState(['Spotify', 'YouTube']);

  // chart library selection: 'mui' or 'nivo'
  const [chartLibrary, setChartLibrary] = useState('nivo');

  // growth vs cumulative toggle for Last 365 Days
  const [showGrowthView, setShowGrowthView] = useState(true);

  // Subscription context for Pro features
  const subscriptionContext = useContext(SubscriptionContextProvider);
  const subscription = subscriptionContext?.subscription;
  const isFreeTier = !subscription || subscription === null || subscription.tier === 'FREE';

  // Sanitized display values for free tier - prevents data from being visible in DOM inspector
  const FAKE_PLAYCOUNT = 12847;
  const FAKE_SPOTIFY_PLAYCOUNT = 7523;
  const FAKE_YOUTUBE_PLAYCOUNT = 5324;
  const FAKE_REVENUE = 247.83;
  const FAKE_CATALOG_VALUE = {
    publishing: { estimated_value: 4250, annual_revenue: 425 },
    master: { estimated_value: 8750, annual_revenue: 875 },
  };

  // Generate mock data for free tier users
  const mockChartData = useMemo(() => {
    if (!isFreeTier) return null;

    const now = new Date();
    const mockData = [];

    // Generate 180 days (6 months) of mock data for a fuller chart
    for (let i = 180; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Generate realistic looking growth with some variation
      const baseSpotify = 50000 + Math.random() * 10000;
      const baseYoutube = 30000 + Math.random() * 8000;
      const growth = (180 - i) * 200; // Upward trend

      mockData.push({
        date_added: date.toISOString().split('T')[0],
        spotify_playcount: Math.floor(baseSpotify + growth + (Math.random() * 3000 - 1500)),
        youtube_playcount: Math.floor(baseYoutube + growth * 0.6 + (Math.random() * 2000 - 1000)),
        master_royalty: Math.random() * 100 + 50,
        publishing_royalty: Math.random() * 80 + 40,
      });
    }

    return { total: mockData };
  }, [isFreeTier]);

  // Prepare Nivo chart data
  const nivoChartData = useMemo(() => {
    // Use mock data for free tier, otherwise use real data
    const dataSource = isFreeTier && mockChartData ? mockChartData : detailedStats;

    if (!dataSource?.total || dataSource.total.length === 0) {
      return { data: [], colors: [] };
    }

    const metrics = [];
    const labels = {};
    const colors = [];

    if (chartViewMode === 'streams') {
      if (selectedStreamingServices.includes('Spotify')) {
        metrics.push('spotify_playcount');
        labels['spotify_playcount'] = 'Spotify';
        colors.push('#1DB954');
      }
      if (selectedStreamingServices.includes('YouTube')) {
        metrics.push('youtube_playcount');
        labels['youtube_playcount'] = 'YouTube';
        colors.push('#FF0000');
      }
    } else if (chartViewMode === 'revenue') {
      if (selectedRevenueTypes.includes('Master')) {
        metrics.push('master_royalty');
        labels['master_royalty'] = 'Master Royalties';
        colors.push('#fb923c'); // orange-400 to match catalog percentage
      }
      if (selectedRevenueTypes.includes('Publishing')) {
        metrics.push('publishing_royalty');
        labels['publishing_royalty'] = 'Publishing Royalties';
        colors.push('#2dd4bf'); // teal-400 to match catalog percentage
      }
    }

    // Frontend applies adaptive granularity based on timeframe
    let processedData = dataSource.total;

    // Special handling for "Today" - only show last 2 data points
    if (selectedTimeframe === 'Today') {
      // Sort by date to ensure we get the most recent points
      const sortedData = [...dataSource.total].sort(
        (a, b) => new Date(b.date_added || b.date) - new Date(a.date_added || a.date)
      );
      // Take the 2 most recent data points
      processedData = sortedData.slice(0, 2).reverse(); // Reverse to show oldest first
    }

    // Format data points with all metrics
    // Backend now applies per-track equity - no need to multiply here
    let formattedData = processedData.map((entry) => ({
      date: entry.date || entry.date_added,
      spotify_playcount: entry.spotify_playcount || 0,
      youtube_playcount: entry.youtube_playcount || 0,
      master_royalty: entry.master_royalty || 0,
      publishing_royalty: entry.publishing_royalty || 0,
    }));

    // Apply adaptive granularity consistently to ALL timeframes
    // For short timeframes (Last 7 Days, Last 30 Days), determineGranularity returns 'daily' (no aggregation)
    // For longer timeframes, appropriate aggregation (weekly/monthly/quarterly) is applied automatically
    let granularity = 'daily'; // Default granularity
    if (formattedData.length > 0) {
      // Compute start and end dates from the min/max of all dates (handles unsorted data)
      const dateTimestamps = formattedData.map((entry) => new Date(entry.date).getTime());
      const startDate = new Date(Math.min(...dateTimestamps));
      const endDate = new Date(Math.max(...dateTimestamps));

      const {
        data: aggregatedData,
        granularity: determinedGranularity,
        filteredCount,
      } = applyAdaptiveGranularity(formattedData, startDate, endDate, selectedTimeframe);
      granularity = determinedGranularity;

      if (filteredCount > 0) {
        console.debug(`[Catalog] Filtered ${filteredCount} incomplete period(s) from chart data`);
      }

      formattedData = aggregatedData;
    }

    // Allow toggle between cumulative and growth views for all timeframes
    const shouldShowGrowth = showGrowthView;

    if (shouldShowGrowth && formattedData.length >= 2) {
      // Get baseline values (first data point)
      const baseline = {
        spotify_playcount: formattedData[0].spotify_playcount,
        youtube_playcount: formattedData[0].youtube_playcount,
        master_royalty: formattedData[0].master_royalty,
        publishing_royalty: formattedData[0].publishing_royalty,
      };

      // Convert to growth from baseline
      const growthData = formattedData.map((entry) => ({
        date: entry.date,
        spotify_playcount: entry.spotify_playcount - baseline.spotify_playcount,
        youtube_playcount: entry.youtube_playcount - baseline.youtube_playcount,
        master_royalty: entry.master_royalty - baseline.master_royalty,
        publishing_royalty: entry.publishing_royalty - baseline.publishing_royalty,
      }));

      // Apply linear interpolation to smooth out flat segments caused by duplicate data
      // This happens when backend has sporadic data fetching (same value for consecutive days)
      const interpolateMetric = (data, metricKey) => {
        const result = [...data];

        for (let i = 1; i < result.length - 1; i++) {
          const prev = result[i - 1][metricKey];
          const curr = result[i][metricKey];
          const next = result[i + 1][metricKey];

          // If current value equals previous (flat segment), interpolate
          if (curr === prev && next > prev) {
            // Find the end of the flat segment
            let endIdx = i;
            while (endIdx < result.length - 1 && result[endIdx][metricKey] === prev) {
              endIdx++;
            }

            // Interpolate linearly between prev and the next different value
            const nextValue = result[endIdx][metricKey];
            const steps = endIdx - (i - 1);
            const increment = (nextValue - prev) / steps;

            // Apply interpolation to all flat points
            for (let j = i; j < endIdx; j++) {
              result[j][metricKey] = prev + increment * (j - (i - 1));
            }

            // Skip past the interpolated section
            i = endIdx - 1;
          }
        }

        return result;
      };

      // Apply interpolation to all metrics
      let smoothedData = growthData;
      smoothedData = interpolateMetric(smoothedData, 'spotify_playcount');
      smoothedData = interpolateMetric(smoothedData, 'youtube_playcount');
      smoothedData = interpolateMetric(smoothedData, 'master_royalty');
      smoothedData = interpolateMetric(smoothedData, 'publishing_royalty');

      formattedData = smoothedData;
    }

    const nivoData = transformToNivoFormat(formattedData, metrics, labels);

    return {
      data: nivoData,
      colors: colors,
      granularity: granularity,
    };
  }, [
    detailedStats?.total,
    chartViewMode,
    selectedStreamingServices,
    selectedRevenueTypes,
    selectedTimeframe,
    showGrowthView,
    isFreeTier,
    mockChartData,
    averageRoyalties,
  ]);

  // artist filter
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [allArtists, setAllArtists] = useState([]);

  // Abort controller for canceling requests
  const abortControllerRef = useRef(null);

  // Load persisted state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('catalogState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Check for known invalid track IDs that should not exist
        const DELETED_TRACK_IDS = ['72aGCwuSwD5Qb3tHvXBoX3', '7nrd0eIftH3NQLfgk20Qp9'];
        if (parsed.selectedTracks) {
          const hasInvalidIds = parsed.selectedTracks.some((id) => DELETED_TRACK_IDS.includes(id));
          if (hasInvalidIds) {
            sessionStorage.removeItem('catalogState');
            // Don't load any state, let defaults apply
            return;
          }
          setSelectedTracks(parsed.selectedTracks);
        }
        if (parsed.selectedRevenueTypes) setSelectedRevenueTypes(parsed.selectedRevenueTypes);
        if (parsed.selectedStreamingServices) setSelectedStreamingServices(parsed.selectedStreamingServices);
        if (parsed.selectedArtists) setSelectedArtists(parsed.selectedArtists);
        if (parsed.dateSortOrder) setDateSortOrder(parsed.dateSortOrder);
        if (parsed.popularitySortOrder) setPopularitySortOrder(parsed.popularitySortOrder);
        if (parsed.selectedTimeframe) setSelectedTimeframe(parsed.selectedTimeframe);
      } catch (e) {
        console.error('Failed to load saved catalog state:', e);
      }
    }
  }, []);

  // Decode JWT token to get user info on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = jwtDecode(token);
        setUserInfo({
          username: decoded.sub,
          email: decoded.email,
          id: decoded.id,
        });
      }
    } catch (error) {
      console.error('Failed to decode token:', error);
    }
  }, []);

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      selectedTracks,
      selectedRevenueTypes,
      selectedStreamingServices,
      selectedArtists,
      dateSortOrder,
      popularitySortOrder,
      selectedTimeframe,
    };
    sessionStorage.setItem('catalogState', JSON.stringify(stateToSave));
  }, [
    selectedTracks,
    selectedRevenueTypes,
    selectedStreamingServices,
    selectedArtists,
    dateSortOrder,
    popularitySortOrder,
    selectedTimeframe,
  ]);

  const handleFetchAllTrackIds = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch ALL track IDs (no limit/offset), filtered by client if selected
      let url = `catalog/tracks?limit=10000`;
      if (selectedClientId) {
        url += `&client_id=${selectedClientId}`;
      }
      const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, url), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status == 200) {
        const allTracks = response.data.items;
        const trackIds = allTracks.map((track) => track.spotify_track_id);
        setAllCatalogTrackIds(trackIds);
        setAllCatalogTracks(allTracks); // Store full track data
        setSelectedTracks(trackIds); // Select all by default

        // Extract unique artists from ALL tracks
        const artists = [...new Set(allTracks.map((track) => track.artist))].sort();
        setAllArtists(artists);
        // Select all artists by default
        if (selectedArtists.length === 0 && artists.length > 0) {
          setSelectedArtists(artists);
        }
      }
    } catch (error) {
      console.error('Error fetching all track IDs:', error);
    }
  };

  useEffect(() => {
    // Clear stats immediately when client changes to avoid showing stale data
    setPlaycount(0);
    setSpotifyPlaycount(0);
    setYoutubePlaycount(0);
    setRevenue(0);
    setBestPerformer(null);
    setWorstPerformer(null);
    setCatalogValueData(null);
    setDetailedStats(null);
    setPlaycountHistory(null);

    // Fetch all track IDs first for analytics
    handleFetchAllTrackIds();
    // NOTE: handleFetchFromCatalog is called by the useEffect below (line 883)
    // which runs on mount and when sort/page changes, so we don't call it here
    handleFetchBestAndWorstPerformer();
    handleFetchCatalogValuation();

    // For FREE tier, immediately load mock data and select dummy tracks
    if (isFreeTier) {
      // Set dummy selected tracks for FREE tier to ensure conditions work
      setSelectedTracks(['mock-track-1', 'mock-track-2']);
      // Trigger handleSelectTimeInterval which will use processRawData
      handleSelectTimeInterval(selectedTimeframe);
    }
  }, [selectedClientId]); // Re-fetch when client changes

  // Validate and filter selectedTracks when catalog changes
  // This removes any track IDs that no longer exist in the catalog
  useEffect(() => {
    if (allCatalogTrackIds.length > 0) {
      const validTrackIds = new Set(allCatalogTrackIds);

      // Filter out any invalid track IDs from current selection
      if (selectedTracks.length > 0) {
        const filteredTracks = selectedTracks.filter((id) => validTrackIds.has(id));

        // If there are invalid tracks OR if not all tracks are selected, select all tracks
        if (filteredTracks.length !== selectedTracks.length || filteredTracks.length !== allCatalogTrackIds.length) {
          setSelectedTracks(allCatalogTrackIds);

          // Also update sessionStorage to persist the full selection
          const savedState = sessionStorage.getItem('catalogState');
          if (savedState) {
            try {
              const parsed = JSON.parse(savedState);
              parsed.selectedTracks = allCatalogTrackIds;
              sessionStorage.setItem('catalogState', JSON.stringify(parsed));
            } catch (e) {
              console.error('[Catalog] Failed to update sessionStorage:', e);
            }
          }
        }
      } else {
        // No tracks selected, select all by default
        setSelectedTracks(allCatalogTrackIds);
      }
    }
  }, [allCatalogTrackIds]);

  // IMPORTANT: Ensure data is loaded on initial mount
  // This triggers when allCatalogTrackIds is first set, ensuring graph data loads
  // even if selectedTracks doesn't change (e.g., when sessionStorage restores same tracks)
  useEffect(() => {
    // Skip API call for FREE tier - they use mock data
    if (!isFreeTier && allCatalogTrackIds.length > 0 && selectedTracks.length > 0 && selectedTimeframe) {
      handleSelectTimeInterval(selectedTimeframe);
    }
  }, [allCatalogTrackIds]);

  // REMOVED: Duplicate useEffect - consolidated into the one below (lines 661-668)

  useEffect(() => {
    handleFetchFromCatalog();
  }, [dateSortOrder, popularitySortOrder, currentPage, selectedClientId]);

  // Free tier: Calculate revenue from snapshot data when catalog or selection changes
  useEffect(() => {
    if (isFreeTier && catalog && catalog.length > 0) {
      calculateSnapshotRevenue();
    }
  }, [catalog, selectedTracks, isFreeTier]);

  // Measure chart container height
  useEffect(() => {
    const updateChartHeight = () => {
      if (chartContainerRef.current) {
        const height = chartContainerRef.current.clientHeight;
        if (height > 0) {
          setChartHeight(height);
        }
      }
    };

    // Initial measurement
    updateChartHeight();

    // Delayed measurement to ensure container is fully rendered
    const timeoutId = setTimeout(() => {
      updateChartHeight();
    }, 100);

    window.addEventListener('resize', updateChartHeight);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateChartHeight);
    };
  }, [detailedStats, catalog.length]);

  // NOTE: Artist filter effect deliberately does NOT include allCatalogTracks in dependencies
  // to avoid overriding manual track selections when catalog reloads
  useEffect(() => {
    // Only run when artist selection actually changes (not when catalog reloads)
    // Reset to page 1 when artist filter changes
    if (currentPage !== 1) {
      setCurrentPage(1);
    }

    // Update selectedTracks to only include tracks from selected artists
    // If all artists are selected, select all tracks
    if (allCatalogTracks.length > 0 && allArtists.length > 0) {
      const allArtistsSelected = selectedArtists.length === allArtists.length;

      if (allArtistsSelected) {
        // All artists selected = select all tracks
        const allTrackIds = allCatalogTracks.map((track) => track.spotify_track_id);
        setSelectedTracks(allTrackIds);
      } else {
        // Some artists filtered = select only tracks from selected artists
        const filteredTrackIds = allCatalogTracks
          .filter((track) => selectedArtists.includes(track.artist))
          .map((track) => track.spotify_track_id);
        setSelectedTracks(filteredTrackIds);
      }
    }
  }, [selectedArtists, allArtists]);

  useEffect(() => {
    // Re-render graph when revenue types selection changes
    // Skip if we're in the middle of a timeframe change
    if (!isChangingTimeframeRef.current && selectedTracks.length > 0 && selectedTimeframe) {
      handleSelectTimeInterval(selectedTimeframe);
    }
  }, [selectedRevenueTypes]);

  useEffect(() => {
    // Re-render graph when streaming services selection changes
    // Skip if we're in the middle of a timeframe change
    if (!isChangingTimeframeRef.current && selectedTracks.length > 0 && selectedTimeframe) {
      handleSelectTimeInterval(selectedTimeframe);
    }
  }, [selectedStreamingServices]);

  useEffect(() => {
    // Re-render graph when chart view mode changes
    // Skip if we're in the middle of a timeframe change
    if (!isChangingTimeframeRef.current && selectedTracks.length > 0 && selectedTimeframe) {
      handleSelectTimeInterval(selectedTimeframe);
    }
  }, [chartViewMode]);

  useEffect(() => {
    // Listen for catalog updates from Dashboard "Add to Catalog" button
    const handleCatalogUpdate = () => {
      // Force refresh when tracks added from Dashboard
      handleFetchFromCatalog();
      handleFetchAllTrackIds(); // Also refresh all track IDs
    };

    window.addEventListener('catalogUpdated', handleCatalogUpdate);

    return () => {
      window.removeEventListener('catalogUpdated', handleCatalogUpdate);
    };
  }, []); // Empty dependencies - we just want to set up the listener once

  // Remove this effect - we don't want to change selectedTracks when paginated catalog changes
  // selectedTracks should represent ALL catalog tracks, not just the current page

  // Instant update when selected tracks change
  useEffect(() => {
    // Re-render graph immediately when selected tracks change
    // Use current timeframe to ensure correct dates and granularity
    if (selectedTracks.length > 0 && selectedTimeframe) {
      handleSelectTimeInterval(selectedTimeframe);
      handleFetchBestAndWorstPerformer();
    } else if (selectedTracks.length === 0) {
      // Clear all stats when no tracks are selected
      setDetailedStats(null);
      setPlaycount(0);
      setSpotifyPlaycount(0);
      setYoutubePlaycount(0);
      setRevenue(0);
      setRevenueRaise('±0');
      setPlaycountRaise('±0');
      setStatsLoading(false);
    }
  }, [selectedTracks]); // eslint-disable-line

  // Reprocess cached data when dropdown selections change (streaming services, revenue types, chart view mode)
  // This allows instant graph updates without refetching data from API
  useEffect(() => {
    // Only reprocess if we have cached playcount history data
    if (!playcountHistory || !playcountHistory.total || playcountHistory.total.length === 0) {
      return;
    }

    // Don't reprocess for FREE tier - they use mock data
    if (isFreeTier) {
      return;
    }

    // Reprocess the cached data with new selections
    // Must match processRawData logic: apply adaptive granularity, then compute growth (last - first)
    const data = playcountHistory;
    let filteredData = data.total;

    if (filteredData.length === 0) {
      return;
    }

    // Apply adaptive granularity to match processRawData and Nivo chart processing
    let aggregatedData = filteredData;
    if (selectedTimeframe === 'Today') {
      aggregatedData = filteredData.slice(-2);
    } else if (filteredData.length > 0) {
      const dateTimestamps = filteredData.map((entry) => {
        const dateValue = entry.date || entry.date_added;
        return new Date(dateValue).getTime();
      });
      const startDate = new Date(Math.min(...dateTimestamps));
      const endDate = new Date(Math.max(...dateTimestamps));
      const { data: aggData } = applyAdaptiveGranularity(filteredData, startDate, endDate, selectedTimeframe);
      aggregatedData = aggData;
    }

    if (aggregatedData.length === 0) {
      return;
    }

    const lastEntry = aggregatedData[aggregatedData.length - 1];
    const firstEntry = aggregatedData[0];
    const labels = filteredData.map((entry) => entry.date_added);

    // Build datasets based on current selections
    const datasets = [];

    // Stat cards always show growth within the selected period (last - first)
    const isSingleDataPoint = aggregatedData.length === 1;

    let playcountValue, revenueValue, spotifyValue, youtubeValue;

    if (isSingleDataPoint) {
      spotifyValue = lastEntry.spotify_playcount;
      youtubeValue = lastEntry.youtube_playcount || 0;
      revenueValue = 0;
      if (selectedRevenueTypes.includes('Master')) {
        revenueValue += lastEntry.master_royalty || 0;
      }
      if (selectedRevenueTypes.includes('Publishing')) {
        revenueValue += lastEntry.publishing_royalty || 0;
      }
    } else {
      const spotifyGrowth = lastEntry.spotify_playcount - firstEntry.spotify_playcount;
      const youtubeGrowth = (lastEntry.youtube_playcount || 0) - (firstEntry.youtube_playcount || 0);

      let revenueGrowth = 0;
      if (selectedRevenueTypes.includes('Master')) {
        revenueGrowth += (lastEntry.master_royalty || 0) - (firstEntry.master_royalty || 0);
      }
      if (selectedRevenueTypes.includes('Publishing')) {
        revenueGrowth += (lastEntry.publishing_royalty || 0) - (firstEntry.publishing_royalty || 0);
      }

      spotifyValue = spotifyGrowth;
      youtubeValue = youtubeGrowth;
      revenueValue = revenueGrowth;
    }

    // Calculate total playcount based on selected streaming services
    let totalPlaycount = 0;
    if (selectedStreamingServices.includes('Spotify')) {
      totalPlaycount += spotifyValue;
    }
    if (selectedStreamingServices.includes('YouTube')) {
      totalPlaycount += youtubeValue;
    }

    // Update displayed values
    setRevenue(revenueValue.toFixed(2));
    setPlaycount(totalPlaycount);
    setSpotifyPlaycount(spotifyValue);
    setYoutubePlaycount(youtubeValue);

    // Build datasets for the graph (always includes both Spotify and YouTube)
    if (chartViewMode === 'streams') {
      datasets.push({
        label: 'Spotify Streams',
        data: filteredData.map((x) => x.spotify_playcount),
        borderColor: '#1DB954',
        backgroundColor: 'rgba(29, 185, 84, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y',
      });
      datasets.push({
        label: 'YouTube Streams',
        data: filteredData.map((x) => x.youtube_playcount || 0),
        borderColor: '#FF0000',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y',
      });
    } else if (chartViewMode === 'revenue') {
      if (selectedRevenueTypes.includes('Master')) {
        datasets.push({
          label: 'Master Revenue',
          data: filteredData.map((entry) => {
            // Backend now applies per-track equity
            return entry.master_royalty || 0;
          }),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }
      if (selectedRevenueTypes.includes('Publishing')) {
        datasets.push({
          label: 'Publishing Revenue',
          data: filteredData.map((entry) => {
            // Backend now applies per-track equity
            return entry.publishing_royalty || 0;
          }),
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }
    }

    const newStats = { labels, datasets };
  }, [selectedRevenueTypes, chartViewMode, playcountHistory, selectedTimeframe, isFreeTier, averageRoyalties]);

  // Generate dynamic mock data for FREE tier based on timeframe
  // Returns data in the same format as the API (for processRawData to handle)
  const generateMockDataForTimeframe = (timeframe) => {
    const total = [];
    const today = new Date();

    // Helper to create entry with cumulative data
    const createEntry = (daysAgo, spotifyCount, youtubeCount) => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      return {
        date_added: date.toISOString().split('T')[0],
        playcount: spotifyCount,
        youtube_playcount: youtubeCount,
        master_royalty: spotifyCount * 0.003 + youtubeCount * 0.002, // $0.003 per Spotify, $0.002 per YouTube
        publishing_royalty: spotifyCount * 0.001 + youtubeCount * 0.0004, // Publishing rates
      };
    };

    switch (timeframe) {
      case 'Today':
        // Show hourly data for today
        for (let i = 23; i >= 0; i--) {
          total.push(createEntry(0, 8000 + (23 - i) * 15, 9000 + (23 - i) * 12));
        }
        break;
      case 'Last 7 Days':
        for (let i = 6; i >= 0; i--) {
          total.push(createEntry(i, 1000 + (6 - i) * 500, 1500 + (6 - i) * 350));
        }
        break;
      case 'Last 30 Days':
        for (let i = 29; i >= 0; i--) {
          total.push(createEntry(i, 5000 + (29 - i) * 115, 6000 + (29 - i) * 105));
        }
        break;
      case 'Year To Date':
        // Generate daily data for ~90 days
        for (let i = 90; i >= 0; i--) {
          total.push(createEntry(i, 1000 + (90 - i) * 85, 2000 + (90 - i) * 75));
        }
        break;
      case 'Last 365 Days':
        // Generate weekly data for 52 weeks
        for (let i = 51; i >= 0; i--) {
          total.push(createEntry(i * 7, 500 + (51 - i) * 150, 800 + (51 - i) * 140));
        }
        break;
      default: // 'All Time'
        // Generate data for 180 days
        for (let i = 180; i >= 0; i -= 3) {
          total.push(createEntry(i, 500 + (180 - i) * 45, 800 + (180 - i) * 48));
        }
        break;
    }

    return { total };
  };

  // FREE tier version of handleGetPlaycountHistory that processes mock data
  const handleGetPlaycountHistoryForFreeTier = async (mockData, currentTimeframe) => {
    // Directly call the same data processing logic but skip the API call
    // This reuses the existing handleGetPlaycountHistory flow
    setPlaycountHistory(mockData);

    if (mockData.total.length === 0) {
      return;
    }

    // Use the exact same data processing logic as handleGetPlaycountHistory
    // by calling handleGetPlaycountHistory's internal processRawData equivalent
    // For now, just trigger a state update to render the graph
    const filteredData = mockData.total;
    const lastEntry = filteredData[filteredData.length - 1];

    // Set the stats that will be displayed
    const labels = filteredData.map((entry) => entry.date_added);
    const datasets = [];

    // Build datasets based on chart view mode and selected services
    if (chartViewMode === 'streams') {
      datasets.push({
        label: 'Spotify Streams',
        data: filteredData.map((x) => x.spotify_playcount),
        borderColor: '#1DB954',
        backgroundColor: 'rgba(29, 185, 84, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y',
      });
      datasets.push({
        label: 'YouTube Streams',
        data: filteredData.map((x) => x.youtube_playcount || 0),
        borderColor: '#FF0000',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y',
      });
    } else if (chartViewMode === 'revenue') {
      if (selectedRevenueTypes.includes('Master')) {
        datasets.push({
          label: 'Master Royalty ($)',
          data: filteredData.map((entry) => {
            return entry.master_royalty || 0;
          }),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }
      if (selectedRevenueTypes.includes('Publishing')) {
        datasets.push({
          label: 'Publishing Royalty ($)',
          data: filteredData.map((entry) => {
            return entry.publishing_royalty || 0;
          }),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }
    }
  };

  const handleSelectTimeInterval = async (time_interval) => {
    // Free tier can change timeframes to see mock data
    if (isFreeTier) {
      time_interval;
      setSelectedTimeframe(time_interval);
      // Generate mock data that changes based on timeframe
      const mockData = generateMockDataForTimeframe(time_interval);

      // Process mock data the same way paid users process real data
      // Call handleGetPlaycountHistory with mock data processing
      await handleGetPlaycountHistoryForFreeTier(mockData, time_interval);

      return;
    }

    // Mark that we're changing timeframe to prevent useEffect cascade
    isChangingTimeframeRef.current = true;

    let newStartDate = new Date();
    const newEndDate = new Date();
    // Prepare variables for date range and backend time interval key (e.g., 'last_7_days')
    let backendTimeInterval = time_interval.toLowerCase().replace(/ /g, '_');

    if (time_interval === 'Today') {
      // Override backend interval to fetch last 7 days instead of 'today'
      // This ensures we get recent data despite Songstats data lag
      // The processRawData function will slice to the last 2 data points
      backendTimeInterval = 'last_7_days';

      // Keep existing date range for frontend state
      newStartDate.setDate(newStartDate.getDate() - 3);
      newStartDate.setHours(0, 0, 0, 0);
      newEndDate.setHours(23, 59, 59, 999);
    } else if (time_interval === 'Last 7 Days') {
      newStartDate.setDate(newStartDate.getDate() - 6);
    } else if (time_interval === 'Last 30 Days') {
      newStartDate.setDate(newStartDate.getDate() - 29);
    } else if (time_interval === 'Last 365 Days') {
      newStartDate.setDate(newStartDate.getDate() - 364);
    } else if (time_interval === 'Year To Date') {
      newStartDate.setMonth(0);
      newStartDate.setDate(1);
    } else if (time_interval === 'All Time') {
      // For "All Time", we'll pass null for start_date to fetch all available data
      newStartDate = null;
    }
    console.log('[Catalog] setSelectedTimeframe called with:', time_interval);
    console.trace('[Catalog] Call stack for setSelectedTimeframe');
    setSelectedTimeframe(time_interval);
    setStartDate(newStartDate);
    setEndDate(newEndDate);

    // Fetch the playcount history with streaming services parameter
    // Debug logging for timeframe selection
    console.debug('[Catalog] handleSelectTimeInterval:', {
      selectedLabel: time_interval,
      mappedBackendValue: backendTimeInterval,
      startDate: newStartDate ? newStartDate.toISOString() : null,
      endDate: newEndDate ? newEndDate.toISOString() : null,
      selectedTracks: selectedTracks,
      selectedStreamingServices: selectedStreamingServices,
    });

    await handleGetPlaycountHistory(newStartDate, newEndDate, time_interval, backendTimeInterval);

    // Clear the flag after data is loaded
    isChangingTimeframeRef.current = false;
  };

  const handleGetPlaycountHistory = async (start_date, end_date, displayTimeframe = null, backendInterval = null) => {
    // Use the passed display timeframe for processing logic (e.g., 'Today' for slicing to last 2 points)
    // Use backendInterval for the API call (e.g., 'last_7_days' when Today is selected)
    const currentTimeframe = displayTimeframe || selectedTimeframe;
    const apiTimeInterval = backendInterval || null;

    // Free tier: Load mock data instead of real data
    if (isFreeTier) {
      setPlaycount(17470);
      setSpotifyPlaycount(8350);
      setYoutubePlaycount(9120);
      setRevenue(245.67);
      setPlaycountRaise('±0');
      setRevenueRaise('±0');
      setStatsLoading(false);
      return;
    }

    // Validate dates before proceeding (skip validation if dates are null for "All Time")
    if ((start_date && isNaN(start_date.getTime())) || (end_date && isNaN(end_date.getTime()))) {
      console.error('[Catalog] Invalid date values received:', {
        start_date,
        end_date,
      });
      setStatsLoading(false);
      return;
    }

    // If no tracks are selected, clear stats (but not for free tier - they see all tracks)
    if (selectedTracks.length === 0) {
      setDetailedStats(null);

      // Always clear revenue/playcount and graph when no tracks selected
      setPlaycount(0);
      setSpotifyPlaycount(0);
      setYoutubePlaycount(0);
      setRevenue(0);
      setRevenueRaise('±0');
      setPlaycountRaise('±0');

      setStatsLoading(false);
      return;
    }

    // Function to process raw API data with current selections (defined before use)
    const processRawData = (data) => {
      setPlaycountHistory(data);

      // if no data has been loaded, return to avoid out of bounds exceptions
      if (data.total.length === 0) {
        setStatsLoading(false);
        return;
      }

      // For "Today" timeframe, ALWAYS use exactly the last 2 data points
      let filteredData = data.total;
      if (currentTimeframe === 'Today') {
        filteredData = data.total.slice(-2); // Always get only last 2 data points
      }

      // Check if we have any data
      if (filteredData.length === 0) {
        console.warn('[Catalog] No data points available');
        setStatsLoading(false);
        return;
      }

      // Apply adaptive granularity to match Nivo chart processing
      // This ensures all growth calculations use properly aggregated data
      let aggregatedData = filteredData;
      let usedGranularity = 'daily';

      // Skip aggregation for "Today" since it only has 2 data points
      if (currentTimeframe !== 'Today' && filteredData.length > 0) {
        // Compute start and end dates from the min/max of all dates
        const dateTimestamps = filteredData.map((entry) => {
          const dateValue = entry.date || entry.date_added;
          return new Date(dateValue).getTime();
        });
        const startDate = new Date(Math.min(...dateTimestamps));
        const endDate = new Date(Math.max(...dateTimestamps));

        const {
          data: aggData,
          granularity,
          filteredCount,
        } = applyAdaptiveGranularity(filteredData, startDate, endDate, currentTimeframe);

        if (filteredCount > 0) {
          console.debug(`[Catalog] Filtered ${filteredCount} incomplete period(s) from playcount history`);
        }

        aggregatedData = aggData;
        usedGranularity = granularity;
        console.debug(
          `[Catalog] Applied ${granularity} aggregation to playcount history (${filteredData.length} → ${aggregatedData.length} points)`
        );
      }

      // Validate aggregated data has minimum points for growth calculations
      if (aggregatedData.length === 0) {
        console.warn('[Catalog] No data points after aggregation');
        setStatsLoading(false);
        return;
      }

      // Get the latest entry (most recent) to show current totals
      // Use aggregated data for consistent display values with chart
      const lastEntry = aggregatedData[aggregatedData.length - 1];
      const firstEntry = aggregatedData[0];

      // Stats always show growth within the selected period (last - first)
      // so that changing the timeframe dropdown actually changes the displayed numbers.
      // The showGrowthView toggle only affects the chart visualization, not the stat cards.
      const isSingleDataPoint = aggregatedData.length === 1;

      let playcountValue, revenueValue, spotifyValue, youtubeValue;

      if (isSingleDataPoint) {
        // Only one data point - show its values directly
        spotifyValue = lastEntry.spotify_playcount;
        youtubeValue = lastEntry.youtube_playcount || 0;
        revenueValue = 0;
        if (selectedRevenueTypes.includes('Master')) {
          revenueValue += lastEntry.master_royalty || 0;
        }
        if (selectedRevenueTypes.includes('Publishing')) {
          revenueValue += lastEntry.publishing_royalty || 0;
        }
      } else {
        // Calculate growth in the selected timeframe (last - first)
        const spotifyGrowth = lastEntry.spotify_playcount - firstEntry.spotify_playcount;
        const youtubeGrowth = (lastEntry.youtube_playcount || 0) - (firstEntry.youtube_playcount || 0);

        let revenueGrowth = 0;
        if (selectedRevenueTypes.includes('Master')) {
          revenueGrowth += (lastEntry.master_royalty || 0) - (firstEntry.master_royalty || 0);
        }
        if (selectedRevenueTypes.includes('Publishing')) {
          revenueGrowth += (lastEntry.publishing_royalty || 0) - (firstEntry.publishing_royalty || 0);
        }

        spotifyValue = spotifyGrowth;
        youtubeValue = youtubeGrowth;
        revenueValue = revenueGrowth;
      }

      // Calculate total playcount (based on selected streaming services)
      let totalPlaycount = 0;
      if (selectedStreamingServices.includes('Spotify')) {
        totalPlaycount += spotifyValue;
      }
      if (selectedStreamingServices.includes('YouTube')) {
        totalPlaycount += youtubeValue;
      }

      // Show the calculated values (growth or cumulative)
      setRevenue(revenueValue.toFixed(2));
      setPlaycount(totalPlaycount);
      setSpotifyPlaycount(spotifyValue);
      setYoutubePlaycount(youtubeValue);

      // Build datasets based on selected streaming services and revenue types
      const datasets = [];

      // Allow toggle between cumulative and growth views for all timeframes
      const shouldShowGrowth = showGrowthView;

      // Helper function to convert cumulative data to growth data
      // NOTE: This function now operates on AGGREGATED data points (after applyAdaptiveGranularity)
      // which means each point represents a period (daily/weekly/monthly) rather than raw daily values
      const convertToGrowth = (aggregatedCumulativeData) => {
        // For "All Time" or insufficient data, return as-is
        if (!shouldShowGrowth || aggregatedCumulativeData.length < 2) {
          return aggregatedCumulativeData;
        }

        // For growth view: Show cumulative growth from the start of the timeframe
        // This creates a smooth, always-increasing line
        const smoothData = [];
        const startValue = aggregatedCumulativeData[0];

        for (let i = 0; i < aggregatedCumulativeData.length; i++) {
          // Show growth from baseline (start of timeframe)
          smoothData.push(aggregatedCumulativeData[i] - startValue);
        }

        return smoothData;
      };

      // Helper function to apply linear interpolation to smooth out flat segments
      // This handles cases where backend has sporadic data fetching (same value for consecutive periods)
      const interpolateMetric = (data) => {
        if (!shouldShowGrowth || data.length < 3) {
          return data;
        }

        const result = [...data];

        for (let i = 1; i < result.length - 1; i++) {
          const prev = result[i - 1];
          const curr = result[i];
          const next = result[i + 1];

          // If current value equals previous (flat segment), interpolate
          if (curr === prev && next > prev) {
            // Find the end of the flat segment
            let endIdx = i;
            while (endIdx < result.length - 1 && result[endIdx] === prev) {
              endIdx++;
            }

            // Interpolate linearly between prev and the next different value
            const nextValue = result[endIdx];
            const steps = endIdx - (i - 1);
            const increment = (nextValue - prev) / steps;

            // Apply interpolation to all flat points
            for (let j = i; j < endIdx; j++) {
              result[j] = prev + increment * (j - (i - 1));
            }

            // Skip past the interpolated section
            i = endIdx - 1;
          }
        }

        return result;
      };

      // Add streaming data ONLY in streams mode (filtered by selected services)
      // Use aggregatedData for consistency with Nivo chart processing
      if (chartViewMode === 'streams') {
        if (selectedStreamingServices.includes('Spotify')) {
          const spotifyData = aggregatedData.map((x) => x.spotify_playcount);
          const spotifyGrowthData = interpolateMetric(convertToGrowth(spotifyData));
          datasets.push({
            label: shouldShowGrowth ? 'Spotify Streams (Growth)' : 'Spotify Streams',
            data: spotifyGrowthData,
            borderColor: '#1DB954',
            backgroundColor: 'rgba(29, 185, 84, 0.1)',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y',
          });
        }

        if (selectedStreamingServices.includes('YouTube')) {
          const youtubeData = aggregatedData.map((x) => x.youtube_playcount || 0);
          const youtubeGrowthData = interpolateMetric(convertToGrowth(youtubeData));
          datasets.push({
            label: shouldShowGrowth ? 'YouTube Streams (Growth)' : 'YouTube Streams',
            data: youtubeGrowthData,
            borderColor: '#FF0000',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y',
          });
        }
      }

      // Add revenue data ONLY in revenue mode
      // Use aggregatedData for consistency with Nivo chart processing
      if (chartViewMode === 'revenue' && selectedRevenueTypes.includes('Master')) {
        // Filter master revenue by selected streaming services
        const MASTER_PER_STREAM = 0.003;
        const YOUTUBE_MASTER_PER_VIEW = 0.002;

        const masterData = aggregatedData.map((x) => {
          // Backend already calculated the full master revenue (Spotify + YouTube)
          // Calculate what portion is Spotify vs YouTube to filter correctly
          const spotifyMasterPortion = selectedStreamingServices.includes('Spotify')
            ? (x.spotify_playcount || 0) * MASTER_PER_STREAM
            : 0;
          const youtubeMasterPortion = selectedStreamingServices.includes('YouTube')
            ? (x.youtube_playcount || 0) * YOUTUBE_MASTER_PER_VIEW
            : 0;
          const totalMasterBase = spotifyMasterPortion + youtubeMasterPortion;

          if (totalMasterBase === 0) return 0;

          // Backend now applies per-track equity - use master_royalty directly
          const backendMaster = x.master_royalty || 0;
          if (selectedStreamingServices.includes('Spotify') && selectedStreamingServices.includes('YouTube')) {
            return backendMaster;
          } else {
            const spotifyRatio = spotifyMasterPortion / totalMasterBase;
            const youtubeRatio = youtubeMasterPortion / totalMasterBase;
            return selectedStreamingServices.includes('Spotify')
              ? backendMaster * spotifyRatio
              : backendMaster * youtubeRatio;
          }
        });

        const masterGrowthData = interpolateMetric(convertToGrowth(masterData));
        const masterTotal = masterData.reduce((sum, val) => sum + val, 0);
        datasets.push({
          label: shouldShowGrowth ? 'Master Royalty ($) - Growth' : 'Master Royalty ($)',
          data: masterGrowthData,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }

      if (chartViewMode === 'revenue' && selectedRevenueTypes.includes('Publishing')) {
        // Backend calculates: publishing = (spotify * 0.001 + youtube * 0.0004) * publishing_%
        // We need to filter based on selected services
        const PUBLISHING_PER_STREAM = 0.001;
        const YOUTUBE_PUBLISHING_PER_VIEW = 0.0004;

        const publishingData = aggregatedData.map((x) => {
          // Backend already calculated the full publishing revenue (Spotify + YouTube)
          // Calculate what portion is Spotify vs YouTube to filter correctly
          const spotifyPortion = selectedStreamingServices.includes('Spotify')
            ? (x.spotify_playcount || 0) * PUBLISHING_PER_STREAM
            : 0;
          const youtubePortion = selectedStreamingServices.includes('YouTube')
            ? (x.youtube_playcount || 0) * YOUTUBE_PUBLISHING_PER_VIEW
            : 0;
          const totalBase = spotifyPortion + youtubePortion;

          if (totalBase === 0) return 0;

          // Backend now applies per-track equity - use publishing_royalty directly
          const backendPublishing = x.publishing_royalty || 0;
          if (selectedStreamingServices.includes('Spotify') && selectedStreamingServices.includes('YouTube')) {
            return backendPublishing;
          } else {
            const spotifyRatio = spotifyPortion / totalBase;
            const youtubeRatio = youtubePortion / totalBase;
            return selectedStreamingServices.includes('Spotify')
              ? backendPublishing * spotifyRatio
              : backendPublishing * youtubeRatio;
          }
        });

        const publishingGrowthData = interpolateMetric(convertToGrowth(publishingData));
        const publishingTotal = publishingData.reduce((sum, val) => sum + val, 0);

        datasets.push({
          label: shouldShowGrowth ? 'Publishing Royalty ($) - Growth' : 'Publishing Royalty ($)',
          data: publishingGrowthData,
          borderColor: '#14b8a6',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }

      // Check if we have any datasets to display
      if (datasets.length === 0) {
        console.warn('[Catalog] No datasets created - check selections:', {
          chartViewMode,
          selectedRevenueTypes,
          dataPointCount: aggregatedData.length,
          granularity: usedGranularity,
        });
      }

      datasets.map((d) => d.label);

      // Calculate growth percentage: compare second half of period to first half
      // e.g., "Last 30 Days" compares days 16-30 vs days 1-15
      // NOTE: Uses aggregatedData for accurate period-over-period comparisons
      let calculatedRevenueRaise = '±0';
      let calculatedPlaycountRaise = '±0';

      if (aggregatedData.length < 4) {
        // Need at least 4 data points for meaningful comparison
        calculatedRevenueRaise = '±0';
        calculatedPlaycountRaise = '±0';
      } else {
        // Split aggregated data in half: first half is "previous", second half is "current"
        const midpoint = Math.floor(aggregatedData.length / 2);
        const previousPeriod = aggregatedData.slice(0, midpoint);
        const currentPeriod = aggregatedData.slice(midpoint);

        // For CUMULATIVE data (playcounts): compare growth in each period
        // Growth in period = last value - first value of that period
        // Sum playcounts based on selectedStreamingServices (matching chart aggregation)
        const getAggregatedPlaycount = (entry) => {
          let total = 0;
          if (selectedStreamingServices.includes('Spotify')) {
            total += entry?.spotify_playcount || 0;
          }
          if (selectedStreamingServices.includes('YouTube')) {
            total += entry?.youtube_playcount || 0;
          }
          return total;
        };

        const prevPeriodStart = getAggregatedPlaycount(previousPeriod[0]);
        const prevPeriodEnd = getAggregatedPlaycount(previousPeriod[previousPeriod.length - 1]);
        const currPeriodStart = getAggregatedPlaycount(currentPeriod[0]);
        const currPeriodEnd = getAggregatedPlaycount(currentPeriod[currentPeriod.length - 1]);

        const previousPlaycountGrowth = prevPeriodEnd - prevPeriodStart;
        const currentPlaycountGrowth = currPeriodEnd - currPeriodStart;

        // For aggregated data (revenues): sum up values in each period
        let currentRevenue = 0;
        let previousRevenue = 0;

        currentPeriod.forEach((entry) => {
          if (selectedRevenueTypes.includes('Master')) {
            currentRevenue += entry.master_royalty || 0;
          }
          if (selectedRevenueTypes.includes('Publishing')) {
            currentRevenue += entry.publishing_royalty || 0;
          }
        });

        previousPeriod.forEach((entry) => {
          if (selectedRevenueTypes.includes('Master')) {
            previousRevenue += entry.master_royalty || 0;
          }
          if (selectedRevenueTypes.includes('Publishing')) {
            previousRevenue += entry.publishing_royalty || 0;
          }
        });

        // Calculate percentage change: ((current - previous) / previous) * 100
        const revenueGrowthPercent =
          previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        const playcountGrowthPercent =
          previousPlaycountGrowth > 0
            ? ((currentPlaycountGrowth - previousPlaycountGrowth) / previousPlaycountGrowth) * 100
            : 0;

        // Debug logging - check browser console
        console.log('[Growth]', {
          points: aggregatedData.length,
          granularity: usedGranularity,
          mid: midpoint,
          playPrev: `${prevPeriodStart}→${prevPeriodEnd} (+${previousPlaycountGrowth})`,
          playCurr: `${currPeriodStart}→${currPeriodEnd} (+${currentPlaycountGrowth})`,
          playPct: playcountGrowthPercent.toFixed(1) + '%',
          revPrev: previousRevenue.toFixed(2),
          revCurr: currentRevenue.toFixed(2),
          revPct: revenueGrowthPercent.toFixed(1) + '%',
        });

        calculatedRevenueRaise = (revenueGrowthPercent >= 0 ? '+' : '') + revenueGrowthPercent.toFixed(1) + '%';
        calculatedPlaycountRaise = (playcountGrowthPercent >= 0 ? '+' : '') + playcountGrowthPercent.toFixed(1) + '%';
      }

      setRevenueRaise(calculatedRevenueRaise);
      setPlaycountRaise(calculatedPlaycountRaise);

      setStatsLoading(false);
    };

    // Transform API response from new format to legacy format
    const transformApiResponse = (apiResponse) => {
      // New format: { data: { spotify: [{date, playcount}], youtube: [{date, playcount}] } }
      // Legacy format: { total: [{ date_added, spotify_playcount, youtube_playcount, master_royalty, publishing_royalty }] }

      const aggregatedData = apiResponse.data || {};
      const spotifyData = aggregatedData.spotify || [];
      const youtubeData = aggregatedData.youtube || [];
      const masterRoyaltyData = aggregatedData.master_royalty || [];
      const publishingRoyaltyData = aggregatedData.publishing_royalty || [];

      // Create a map of all unique dates
      const dateMap = new Map();

      // Add Spotify data
      spotifyData.forEach((entry) => {
        const dateKey = entry.date;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date_added: dateKey,
            spotify_playcount: 0,
            youtube_playcount: 0,
            master_royalty: 0,
            publishing_royalty: 0,
            total_playcount: 0,
          });
        }
        const record = dateMap.get(dateKey);
        record.spotify_playcount = entry.playcount;
        record.total_playcount += entry.playcount;
      });

      // Add YouTube data
      youtubeData.forEach((entry) => {
        const dateKey = entry.date;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date_added: dateKey,
            spotify_playcount: 0,
            youtube_playcount: 0,
            master_royalty: 0,
            publishing_royalty: 0,
            total_playcount: 0,
          });
        }
        const record = dateMap.get(dateKey);
        record.youtube_playcount = entry.playcount;
        record.total_playcount += entry.playcount;
      });

      // Add Master Royalty data
      masterRoyaltyData.forEach((entry) => {
        const dateKey = entry.date;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date_added: dateKey,
            spotify_playcount: 0,
            youtube_playcount: 0,
            master_royalty: 0,
            publishing_royalty: 0,
            total_playcount: 0,
          });
        }
        const record = dateMap.get(dateKey);
        record.master_royalty = entry.master_royalty;
      });

      // Add Publishing Royalty data
      publishingRoyaltyData.forEach((entry) => {
        const dateKey = entry.date;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date_added: dateKey,
            spotify_playcount: 0,
            youtube_playcount: 0,
            master_royalty: 0,
            publishing_royalty: 0,
            total_playcount: 0,
          });
        }
        const record = dateMap.get(dateKey);
        record.publishing_royalty = entry.publishing_royalty;
      });

      // Convert map to sorted array
      const total = Array.from(dateMap.values()).sort((a, b) => new Date(a.date_added) - new Date(b.date_added));

      // Enforce monotonically increasing values for cumulative data
      // Streams should only ever go up - if a value is less than previous, use previous
      let prevSpotify = 0;
      let prevYoutube = 0;
      let prevMaster = 0;
      let prevPublishing = 0;

      for (const record of total) {
        // Ensure values never decrease (cumulative data should only go up)
        if (record.spotify_playcount < prevSpotify) {
          record.spotify_playcount = prevSpotify;
        }
        if (record.youtube_playcount < prevYoutube) {
          record.youtube_playcount = prevYoutube;
        }
        if (record.master_royalty < prevMaster) {
          record.master_royalty = prevMaster;
        }
        if (record.publishing_royalty < prevPublishing) {
          record.publishing_royalty = prevPublishing;
        }

        // Update previous values to current (which is now >= previous)
        prevSpotify = record.spotify_playcount;
        prevYoutube = record.youtube_playcount;
        prevMaster = record.master_royalty;
        prevPublishing = record.publishing_royalty;

        // Recalculate total
        record.total_playcount = record.spotify_playcount + record.youtube_playcount;
      }

      return { total, all: total };
    };

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setStatsLoading(true);

    // updates playcount if todays entries have not been created yet
    const token = localStorage.getItem('token');
    try {
      // Build URL parameters
      const params = new URLSearchParams();

      // Map frontend timeframe to backend format
      const timeframeMap = {
        Today: 'today',
        'Last 7 Days': 'last_7_days',
        'Last 30 Days': 'last_30_days',
        'Year To Date': 'year_to_date',
        'Last 365 Days': 'last_365_days',
        'All Time': 'all_time',
      };

      // Add time_interval parameter (backend expects values like 'last_7_days', 'last_30_days', etc.)
      // Use apiTimeInterval if explicitly provided (e.g., 'last_7_days' when Today is selected)
      // Otherwise fall back to mapping from currentTimeframe
      if (apiTimeInterval) {
        params.append('time_interval', apiTimeInterval);
      } else if (currentTimeframe) {
        const backendTimeframe = timeframeMap[currentTimeframe] || currentTimeframe.toLowerCase().replace(/\s+/g, '_');
        params.append('time_interval', backendTimeframe);
      }

      // Add track_ids if selected
      if (selectedTracks.length > 0) {
        params.append('track_ids', selectedTracks.join(','));
      }

      // Add streaming_services
      if (selectedStreamingServices.length > 0) {
        params.append('streaming_services', selectedStreamingServices.join(','));
      }

      const fetchUrl = urlJoin(process.env.REACT_APP_BACKEND_URL, `stats/playcount?${params.toString()}`);
      console.debug('[Catalog] handleGetPlaycountHistory - Before fetch:', {
        fullUrl: fetchUrl,
        params: Object.fromEntries(params.entries()),
      });

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (response.ok) {
        const apiResponse = await response.json();

        // Debug logging after response
        const spotifyData = apiResponse?.data?.spotify || [];
        const youtubeData = apiResponse?.data?.youtube || [];
        const allDates = [...spotifyData.map((d) => d.date), ...youtubeData.map((d) => d.date)].filter(Boolean);
        const minDate = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null;
        const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null;
        console.log('[Catalog] Playcount data received:', {
          spotifyDataPoints: spotifyData.length,
          youtubeDataPoints: youtubeData.length,
          dateRange: minDate && maxDate ? `${minDate} to ${maxDate}` : 'No dates',
          rawResponse: apiResponse?.data,
        });

        // Transform new API format to expected format
        // New format: { data: { spotify: [...], youtube: [...] } }
        // Expected format: { total: [{ date_added, spotify_playcount, youtube_playcount, ... }] }
        const transformedData = transformApiResponse(apiResponse);
        console.log('[Catalog] Transformed data points:', transformedData?.total?.length || 0);

        // Set detailedStats for MUI chart component
        setDetailedStats(transformedData);

        // Process data with current selections
        processRawData(transformedData);
      }
    } catch (error) {
      // Don't log or update state if request was aborted
      if (error.name === 'AbortError') {
        // Silently ignore aborted requests
        return;
      }
      console.error('Network error while updating playcount:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFetchFromCatalog = async (current = undefined) => {
    current ??= currentPage;
    const token = localStorage.getItem('token');

    // sorting parameters
    let sort = [];
    let dateSortString = '';
    if (dateSortOrder === 'ascending') dateSortString = '+';
    else if (dateSortOrder === 'descending') dateSortString = '-';
    if (dateSortString) sort.push(dateSortString + 'date_added');

    let popularitySortString = '';
    if (popularitySortOrder === 'ascending') popularitySortString = '+';
    else if (popularitySortOrder === 'descending') popularitySortString = '-';
    if (popularitySortString) sort.push(popularitySortString + 'playcount');

    setCatalogLoading(true);
    try {
      let url = `catalog/tracks?limit=${perPage}&offset=${(current - 1) * perPage}&sort=${encodeURIComponent(sort.join(','))}`;
      if (selectedClientId) {
        url += `&client_id=${selectedClientId}`;
      }
      console.log('[Catalog] Fetching URL:', url, 'client_id:', selectedClientId);
      const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, url), {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(
        '[Catalog] Response:',
        response.status,
        'items:',
        response.data?.items?.length,
        'total:',
        response.data?.total
      );
      if (response.status == 200) {
        const data = response.data.items;
        const totalCount = response.data.total;
        const lastPage = Math.ceil(totalCount / perPage);

        setCatalog(data);
        setLastPage(lastPage);
      }
    } catch (error) {
      console.error('[Catalog] Error fetching catalog:', error);
      console.error('[Catalog] Response:', error.response?.data);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleFetchBestAndWorstPerformer = async () => {
    const token = localStorage.getItem('token');
    try {
      let url = 'catalog/tracks?sort=+playcount';
      if (selectedClientId) {
        url += `&client_id=${selectedClientId}`;
      }
      const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, url), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status == 200) {
        const data = response.data.items;

        if (data.length > 1) {
          setBestPerformer(data[data.length - 1]);
          setWorstPerformer(data[0]);
        } else if (data.length === 1) {
          // Only one track - show it as both best and worst
          setBestPerformer(data[0]);
          setWorstPerformer(data[0]);
        } else {
          // No tracks for this client
          setBestPerformer(null);
          setWorstPerformer(null);
        }
      }
    } catch (error) {
      // user needs to confirm that he wants to go over the threshold
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleFetchCatalogValuation = async () => {
    const token = localStorage.getItem('token');
    try {
      let url = 'catalog/valuation';
      if (selectedClientId) {
        url += `?client_id=${selectedClientId}`;
      }
      const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, url), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 200) setCatalogValueData(response.data);
    } catch (error) {
      console.error('Error fetching catalog valuation:', error);
    }
  };

  const handleDeleteTrack = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.delete(
        urlJoin(process.env.REACT_APP_BACKEND_URL, `catalog/tracks/${trackToDelete.id}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.status == 204) {
        toast('The track has been deleted.');

        // Refresh data
        handleFetchFromCatalog();
        handleSelectTimeInterval(selectedTimeframe);
        handleFetchBestAndWorstPerformer();
        handleFetchCatalogValuation();

        // Update subscription button in real-time
        triggerSubscriptionUpdate();
      }
    } catch (error) {
      // user needs to confirm that he wants to go over the threshold
    } finally {
      setOpenDeleteConfirmationModal(false);
      setOpenTrackChangeModal(false);
    }
  };

  const handleChangeTrackProperties = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `catalog/tracks/${selectedTrack.id}`), {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_infringement: selectedTrack.is_infringement,
          master_royalty: masterRoyaltyInputRef.current.value / 100,
          publishing_royalty: publishingRoyaltyInputRef.current.value / 100,
        }),
      });
      if (response.ok) {
        // returns updated element
        const data = await response.json();
        let newCatalog = [...catalog];
        newCatalog[selectedTrackIndex] = data.items[0];
        setCatalog(newCatalog);
        toast('Changes have been applied.');

        // Refresh graph data
        handleSelectTimeInterval(selectedTimeframe);
        handleFetchBestAndWorstPerformer();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setOpenTrackChangeModal(false);
    }
  };

  const handleShowResults = async () => {
    setCatalogLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        urlJoin(
          process.env.REACT_APP_BACKEND_URL,
          `search?keyword=${catalogSearchRef.current.value}&limit=${perPage}&offset=${(currentPage - 1) * perPage}&type=catalog`
        ),
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        // track array
        const data = await response.json();
        setCatalog(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleUpdateRoyalty = useCallback(
    async (track, masterRoyalty, publishingRoyalty) => {
      const token = localStorage.getItem('token');

      // Skip if track doesn't have a valid ID
      if (!track.id) {
        console.error('Cannot update track without database ID:', track);
        toast.error('Cannot update track - missing ID. Please refresh the page.');
        return;
      }

      try {
        const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `catalog/tracks/${track.id}`), {
          method: 'PATCH',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            master_royalty: masterRoyalty,
            publishing_royalty: publishingRoyalty,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const updatedTrack = data.items[0];

          // Update catalog state
          setCatalog((prevCatalog) => {
            const index = prevCatalog.findIndex(
              (t) => (t.id || t.spotify_track_id) === (track.id || track.spotify_track_id)
            );
            if (index !== -1) {
              const newCatalog = [...prevCatalog];
              newCatalog[index] = updatedTrack;
              return newCatalog;
            }
            return prevCatalog;
          });

          // Also update allCatalogTracks so averageRoyalties recalculates
          setAllCatalogTracks((prevTracks) => {
            const trackIndex = prevTracks.findIndex(
              (t) => (t.id || t.spotify_track_id) === (track.id || track.spotify_track_id)
            );
            if (trackIndex !== -1) {
              const newTracks = [...prevTracks];
              newTracks[trackIndex] = { ...newTracks[trackIndex], ...updatedTrack };
              return newTracks;
            }
            return prevTracks;
          });

          toast('Royalty percentages updated.');

          // Refresh graph data and catalog valuation
          console.log(
            '[Catalog] handleUpdateRoyalty calling handleSelectTimeInterval with selectedTimeframe:',
            selectedTimeframe
          );
          handleSelectTimeInterval(selectedTimeframe);
          handleFetchBestAndWorstPerformer();
          handleFetchCatalogValuation();
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to update royalty percentages.');
      }
    },
    [selectedTimeframe, handleSelectTimeInterval, handleFetchBestAndWorstPerformer, handleFetchCatalogValuation]
  );

  const handleRequestMLCAudit = async () => {
    const token = localStorage.getItem('token');
    setAuditRequestLoading(true);

    try {
      // Call the backend MLC audit endpoint
      let auditUrl = 'mlc-audit/request';
      if (selectedClientId) {
        auditUrl += `?client_id=${selectedClientId}`;
      }
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, auditUrl), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setOpenAuditModal(false);
        setOpenAuditConfirmModal(true);
        toast.success('MLC audit request submitted successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to request MLC audit');
      }
    } catch (error) {
      console.error('MLC audit request error:', error);
      toast.error('Failed to submit MLC audit request. Please try again.');
    } finally {
      setAuditRequestLoading(false);
    }
  };

  const handleImport = async (songs) => {
    toast.success(`Successfully imported ${songs.length} songs!`);

    // Refresh catalog after import - fetch all tracks for analytics and current page
    await handleFetchAllTrackIds();
    await handleFetchFromCatalog();
    await handleFetchCatalogValuation();

    // Update subscription button in real-time
    triggerSubscriptionUpdate();
  };

  const handleExport = async () => {
    // Check if user has export access (Essential tier and above)
    if (isFreeTier) {
      setShowUpgradeModal(true);
      return;
    }

    if (!catalog || catalog.length === 0) {
      toast.error('No tracks to export');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      // Call backend endpoint to get CSV
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/catalog/export/schedule-a'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the CSV text from response
      const csvText = await response.text();
      const filename = `schedule_a_${new Date().toISOString().split('T')[0]}.csv`;

      // Count actual tracks (exclude header row and summary rows at bottom)
      const lines = csvText.trim().split('\n');
      // Find where summary starts (first empty line)
      const summaryStartIndex = lines.findIndex((line) => line.trim() === '');
      const trackCount = summaryStartIndex > 0 ? summaryStartIndex - 1 : lines.length - 1; // -1 for header

      // Create blob with proper MIME type
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });

      // Try File System Access API first (modern browsers)
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'CSV Files',
                accept: { 'text/csv': ['.csv'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.success(`Exported ${trackCount} tracks to Schedule A CSV`);
          return;
        } catch (err) {
          // User cancelled the save dialog
          if (err.name === 'AbortError') {
            return;
          }
          // Continue to fallback methods for other errors
        }
      }

      // Fallback 1: Traditional anchor download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';

      document.body.appendChild(link);

      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        link.click();

        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 150);
      }, 0);

      toast.success(`Exported ${trackCount} tracks to Schedule A CSV`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      toast.error(`Export failed: ${error.message}`);
    }
  };

  const handleSetInfringement = async (track, index) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `catalog/tracks/${track.id}`), {
        method: 'PATCH',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_infringement: !track.is_infringement,
        }),
      });
      if (response.ok) {
        // returns updated element
        const data = await response.json();
        let newCatalog = [...catalog];
        newCatalog[index] = data.items[0];
        setCatalog(newCatalog);

        // Refresh graph data
        handleSelectTimeInterval(selectedTimeframe);
        handleFetchBestAndWorstPerformer();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGoToPreviousPage = async () => {
    if (currentPage === 1) return;
    setCurrentPage(currentPage - 1);
  };

  const handleGoToNextPage = async () => {
    if (currentPage === lastPage) return;
    setCurrentPage(currentPage + 1);
  };

  const handleTrackSelectionChange = useCallback((trackId, checked) => {
    if (checked) {
      setSelectedTracks((prev) => [...prev, trackId]);
    } else {
      setSelectedTracks((prev) => prev.filter((id) => id !== trackId));
    }
  }, []);

  const handleContextMenuSelect = useCallback((trackId) => {
    // Select only the right-clicked track, deselecting all others
    setSelectedTracks([trackId]);
  }, []);

  const handleSelectAllTracks = useCallback(() => {
    // Select ALL tracks from entire catalog, not just current page
    setSelectedTracks(allCatalogTrackIds);
  }, [allCatalogTrackIds]);

  const handleDeselectAllTracks = useCallback(() => {
    setSelectedTracks([]);
  }, []);

  const handleClaimRoyaltiesClick = useCallback(
    (track) => {
      // Use track's own playcount values first (from backend catalog response),
      // fall back to Play Count card values if track doesn't have them
      const trackSpotifyPlaycount = track?.spotify_playcount || spotifyPlaycount || 0;
      const trackYoutubePlaycount = track?.youtube_playcount || youtubePlaycount || 0;

      const trackWithPlaycount = {
        ...track,
        spotify_playcount: trackSpotifyPlaycount,
        youtube_playcount: trackYoutubePlaycount,
        playcount: trackSpotifyPlaycount + trackYoutubePlaycount,
      };
      setTrackForClaim(trackWithPlaycount);
      // If track already has a case status, show case status modal instead
      if (track?.case_status) {
        setOpenCaseStatusModal(true);
      } else {
        setOpenClaimRoyaltiesModal(true);
      }
    },
    [spotifyPlaycount, youtubePlaycount]
  );

  const handleClearCatalog = async () => {
    const token = localStorage.getItem('token');
    try {
      // Build URL with optional client_id filter
      let deleteUrl = 'catalog/tracks';
      if (selectedClientId) {
        deleteUrl += `?client_id=${selectedClientId}`;
      }
      const response = await axios.delete(urlJoin(process.env.REACT_APP_BACKEND_URL, deleteUrl), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 204) {
        const successMessage = selectedClientId
          ? 'All tracks for this client have been deleted from your catalog.'
          : 'All tracks have been deleted from your catalog.';
        toast.success(successMessage);
        setOpenClearCatalogModal(false);
        setCatalog([]);
        setSelectedTracks([]);
        // Update subscription button in real-time
        triggerSubscriptionUpdate();

        // Reset graph data to show $0 revenue and 0 playcounts
        setRevenue(0);
        setPlaycount(0);

        // Reset catalog value data to zeros
        setCatalogValueData({
          publishing: { estimated_value: 0, annual_revenue: 0 },
          master: { estimated_value: 0, annual_revenue: 0 },
        });

        // Reset best/worst performers
        setBestPerformer(null);
        setWorstPerformer(null);

        await handleFetchFromCatalog();
      }
    } catch (error) {
      toast.error('Failed to clear catalog.');
      console.error(error);
    }
  };

  const handleResyncStats = async () => {
    const token = localStorage.getItem('token');
    try {
      // Build URL with optional client_id filter
      let resyncUrl = 'catalog/resync';
      if (selectedClientId) {
        resyncUrl += `?client_id=${selectedClientId}`;
      }
      const response = await axios.post(
        urlJoin(process.env.REACT_APP_BACKEND_URL, resyncUrl),
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        const successMessage = selectedClientId
          ? `Stats cleared for ${response.data.tracks_cleared} tracks. Refreshing data...`
          : `Stats cleared for ${response.data.tracks_cleared} tracks. Refreshing data...`;
        toast.success(successMessage);

        // Clear current selections and refresh to trigger new stats fetch
        setSelectedTracks([]);
        setDetailedStats(null);
        setPlaycountHistory(null);

        // Refresh catalog to trigger new stats fetch
        await handleFetchFromCatalog();
      }
    } catch (error) {
      toast.error('Failed to resync stats.');
      console.error(error);
    }
  };

  // Calculate revenue from snapshot data (for free tier)
  const calculateSnapshotRevenue = () => {
    if (!catalog || catalog.length === 0) {
      setRevenue(0);
      setPlaycount(0);
      return;
    }

    let totalRevenue = 0;
    let totalPlaycount = 0;

    // Calculate from selected tracks or all tracks if none selected
    const tracksToCalculate =
      selectedTracks.length > 0 ? catalog.filter((track) => selectedTracks.includes(track.spotify_track_id)) : catalog;

    tracksToCalculate.forEach((track) => {
      // Get playcount from Songstats data (current snapshot)
      const songstatsPlaycount = track.songstats?.total_streams || 0;
      totalPlaycount += songstatsPlaycount;

      // Calculate revenue using the same rates
      const masterRate = 3.8; // per 1000 streams
      const pubRate = 1.0; // per 1000 streams
      const masterEquity = parseFloat(track.master_royalty) || 0;
      const pubEquity = parseFloat(track.publishing_royalty) || 0;

      const trackRevenue =
        (songstatsPlaycount / 1000) * masterRate * masterEquity + (songstatsPlaycount / 1000) * pubRate * pubEquity;

      totalRevenue += trackRevenue;
    });

    setRevenue(totalRevenue.toFixed(2));
    setPlaycount(totalPlaycount);
    setRevenueRaise('±0'); // No historical data to calculate raise
    setPlaycountRaise('±0');
  };

  // Handler for when catalog is updated (track added/deleted)
  const handleCatalogRefresh = async () => {
    // Fetch catalog
    await handleFetchFromCatalog();

    // For free tier: Skip expensive historical data fetches
    // Revenue will be calculated from snapshot data in catalog
    if (!isFreeTier) {
      // Premium tier: Fetch all track IDs for analytics
      await handleFetchAllTrackIds();

      // Refresh stats if we have selected tracks and date range
      if (selectedTracks.length > 0 && startDate && endDate) {
        await handleGetPlaycountHistory(startDate, endDate);
      }

      // Refresh best/worst performers
      await handleFetchBestAndWorstPerformer();
    } else {
      // Free tier: Calculate revenue from Songstats snapshot data
      calculateSnapshotRevenue();
    }
  };

  if (writerHasNoDistributions) {
    return (
      <>
        <Helmet>
          <title>RD - Catalog</title>
        </Helmet>
        <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
          <Sidebar />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginLeft: 'var(--sidebar-width, 72px)',
              padding: '48px 32px',
              minHeight: '100vh',
            }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>My Catalog</h1>
            <p style={{ color: 'var(--soft-text)', fontSize: 13, marginBottom: 32 }}>
              Works registered with your publisher
            </p>
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
                borderRadius: 12,
                textAlign: 'center',
                color: 'var(--soft-text)',
              }}
            >
              <FaHourglassHalf size={28} style={{ color: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  No catalog data yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 480 }}>
                  Your registered works appear here once your publisher distributes your {CURRENT_PERIOD} statement.
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Memoize chart options to prevent unnecessary re-renders
  return (
    <>
      <Helmet>
        <title>RD - Catalog</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <div
          className={styles.catalog}
          style={{ position: 'relative', zIndex: 1, marginLeft: 'var(--sidebar-width, 72px)' }}
        >
          <div className={styles.catalogLeft}>
            <RoundedSection
              onlyBorder={false}
              className="relative"
              style={{
                paddingLeft: '20px',
                paddingRight: '16px',
                paddingTop: '8px',
                paddingBottom: '8px',
              }}
            >
              <div className={styles.catalogLeftNavigation}>
                {/* Fixed width container to prevent layout shift */}
                <div className="flex flex-row gap-5">
                  {/* Toggle button for growth/cumulative view */}
                  <button
                    onClick={() => setShowGrowthView(!showGrowthView)}
                    style={{
                      width: '7rem', // Fixed width for constant sizing
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: `1px solid ${
                        currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
                      }`,
                      borderRadius: '6px',
                      background: showGrowthView
                        ? currentTheme === 'dark'
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(59, 130, 246, 0.2)'
                        : currentTheme === 'dark'
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.05)',
                      color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {showGrowthView ? 'Growth' : 'Cumulative'}
                  </button>
                  <div>
                    {/* Show Revenue Type dropdown only in Revenue mode */}
                    {chartViewMode === 'revenue' && (
                      <DropdownMultiSelection
                        className="w-full"
                        header="Revenue Type"
                        content={['Master', 'Publishing']}
                        selected={selectedRevenueTypes}
                        onSelect={setSelectedRevenueTypes}
                      />
                    )}
                    {/* Show Streaming Service dropdown only in Streams mode */}
                    {chartViewMode === 'streams' && (
                      <DropdownMultiSelection
                        className="w-full"
                        header="Streaming Service"
                        content={['Spotify', 'YouTube']}
                        selected={selectedStreamingServices}
                        onSelect={setSelectedStreamingServices}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <DropdownMenu
                      className="flex-1 w-[10rem]"
                      header={selectedTimeframe}
                      content={['All Time', 'Year To Date', 'Last 365 Days', 'Last 30 Days', 'Last 7 Days', 'Today']}
                      onSelect={handleSelectTimeInterval}
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Combined Analytics Chart - Above Navigation */}
                {statsLoading ||
                (detailedStats === null && selectedTracks.length > 0 && !(isFreeTier && mockChartData)) ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '20px',
                      minHeight: '300px',
                    }}
                  >
                    {/* Chart header skeleton */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <Skeleton
                        variant="text"
                        width={120}
                        height={24}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                      <Skeleton
                        variant="text"
                        width={80}
                        height={24}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                    </div>
                    {/* Chart area skeleton with simulated chart lines */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        position: 'relative',
                        minHeight: '250px',
                      }}
                    >
                      {/* Y-axis labels */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          paddingRight: '8px',
                          height: '100%',
                        }}
                      >
                        {[...Array(5)].map((_, idx) => (
                          <Skeleton
                            key={idx}
                            variant="text"
                            width={40}
                            height={14}
                            sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                          />
                        ))}
                      </div>
                      {/* Chart body */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div
                          style={{
                            flex: 1,
                            position: 'relative',
                            borderLeft:
                              currentTheme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            borderBottom:
                              currentTheme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                          }}
                        >
                          {/* Horizontal grid lines */}
                          {[...Array(4)].map((_, idx) => (
                            <div
                              key={idx}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${(idx + 1) * 20}%`,
                                borderTop:
                                  currentTheme === 'dark'
                                    ? '1px dashed rgba(255,255,255,0.05)'
                                    : '1px dashed rgba(0,0,0,0.05)',
                              }}
                            />
                          ))}
                          {/* Animated wave-like skeleton for chart area */}
                          <Skeleton
                            variant="rounded"
                            width="100%"
                            height="100%"
                            sx={{
                              bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}
                          />
                        </div>
                        {/* X-axis labels */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: '8px',
                          }}
                        >
                          {[...Array(6)].map((_, idx) => (
                            <Skeleton
                              key={idx}
                              variant="text"
                              width={50}
                              height={14}
                              sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (isFreeTier && mockChartData) ||
                  (detailedStats && detailedStats.total && detailedStats.total.length > 0) ? (
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      ref={chartContainerRef}
                      style={{
                        flex: 1,
                        minHeight: 0,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          filter: isFreeTier ? 'blur(2px)' : 'none',
                          opacity: isFreeTier ? 0.7 : 1,
                          pointerEvents: isFreeTier ? 'none' : 'auto',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        {chartLibrary === 'nivo' ? (
                          <NivoLineChart
                            data={nivoChartData.data || []}
                            height={chartHeight}
                            colors={nivoChartData.colors}
                            granularity={nivoChartData.granularity}
                            enableLegend={false}
                            curve="monotoneX"
                            xAxisLegend=""
                            yAxisLegend={chartViewMode === 'streams' ? 'Streams' : 'Revenue ($)'}
                          />
                        ) : (
                          <LineChart
                            height={chartHeight}
                            slotProps={{
                              legend: { hidden: true },
                            }}
                            dataset={(isFreeTier && mockChartData
                              ? mockChartData.total
                              : detailedStats?.total || []
                            ).map((entry) => ({
                              date: new Date(entry.date_added),
                              spotify: entry.spotify_playcount || 0,
                              youtube: entry.youtube_playcount || 0,
                              master: entry.master_royalty || 0,
                              publishing: entry.publishing_royalty || 0,
                            }))}
                            sx={{
                              '& .MuiChartsAxis-line': {
                                stroke: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                              '& .MuiChartsAxis-tick': {
                                stroke: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                              },
                              '& .MuiChartsAxis-tickLabel': {
                                fill: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                                fontSize: '12px',
                              },
                              '& .MuiChartsGrid-line': {
                                stroke: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                                strokeDasharray: '3 3',
                              },
                              '& .MuiLineElement-root': {
                                strokeWidth: 2.5,
                              },
                              '& .MuiChartsTooltip-root': {
                                backgroundColor:
                                  currentTheme === 'dark' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                                color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                                border: `1px solid ${
                                  currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
                                }`,
                                borderRadius: '8px',
                                boxShadow:
                                  currentTheme === 'dark'
                                    ? '0 4px 12px rgba(0, 0, 0, 0.5)'
                                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                              },
                            }}
                            xAxis={[
                              {
                                dataKey: 'date',
                                scaleType: 'time',
                                valueFormatter: (date) =>
                                  date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  }),
                              },
                            ]}
                            yAxis={(() => {
                              const axes = [];

                              if (chartViewMode === 'streams') {
                                // Two axes for streams mode - one for Spotify (left), one for YouTube (right)
                                axes.push({
                                  id: 'spotify',
                                  min: 0,
                                  position: 'left',
                                  label: 'Spotify Streams',
                                  valueFormatter: (value) => value.toLocaleString('en-US'),
                                });
                                axes.push({
                                  id: 'youtube',
                                  min: 0,
                                  position: 'right',
                                  label: 'YouTube Views',
                                  valueFormatter: (value) => value.toLocaleString('en-US'),
                                });
                              } else if (chartViewMode === 'revenue') {
                                if (selectedRevenueTypes.includes('Master')) {
                                  axes.push({
                                    id: 'revenue',
                                    min: 0,
                                    valueFormatter: (value) => `$${value.toFixed(2)}`,
                                  });
                                }
                                if (
                                  selectedRevenueTypes.includes('Publishing') &&
                                  !selectedRevenueTypes.includes('Master')
                                ) {
                                  axes.push({
                                    id: 'revenue',
                                    min: 0,
                                    valueFormatter: (value) => `$${value.toFixed(2)}`,
                                  });
                                }
                              }

                              return axes.length > 0
                                ? axes
                                : [
                                    {
                                      id: 'default',
                                      min: 0,
                                      valueFormatter: (value) => value.toLocaleString('en-US'),
                                    },
                                  ];
                            })()}
                            series={(() => {
                              const seriesData = [];

                              if (chartViewMode === 'streams') {
                                // Include Spotify if selected with its own axis
                                if (selectedStreamingServices.includes('Spotify')) {
                                  seriesData.push({
                                    dataKey: 'spotify',
                                    label: 'Spotify Streams',
                                    yAxisId: 'spotify',
                                    showMark: false,
                                    color: '#1DB954',
                                    curve: 'natural',
                                    connectNulls: true,
                                    valueFormatter: (value) => value?.toLocaleString('en-US') || '0',
                                  });
                                }
                                // Include YouTube if selected with its own axis
                                if (selectedStreamingServices.includes('YouTube')) {
                                  seriesData.push({
                                    dataKey: 'youtube',
                                    label: 'YouTube Views',
                                    yAxisId: 'youtube',
                                    showMark: false,
                                    color: '#FF0000',
                                    curve: 'natural',
                                    connectNulls: true,
                                    valueFormatter: (value) => value?.toLocaleString('en-US') || '0',
                                  });
                                }
                              } else if (chartViewMode === 'revenue') {
                                if (selectedRevenueTypes.includes('Master')) {
                                  seriesData.push({
                                    dataKey: 'master',
                                    label: 'Master Royalties',
                                    yAxisId: 'revenue',
                                    showMark: false,
                                    color: '#fbbf24',
                                    curve: 'natural',
                                    connectNulls: true,
                                    valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
                                  });
                                }
                                if (selectedRevenueTypes.includes('Publishing')) {
                                  seriesData.push({
                                    dataKey: 'publishing',
                                    label: 'Publishing Royalties',
                                    yAxisId: 'revenue',
                                    showMark: false,
                                    color: '#3b82f6',
                                    curve: 'natural',
                                    connectNulls: true,
                                    valueFormatter: (value) => `$${value?.toFixed(2) || '0.00'}`,
                                  });
                                }
                              }

                              return seriesData;
                            })()}
                            margin={{ left: 80, right: 80, top: 20, bottom: 30 }}
                            grid={{ vertical: true, horizontal: true }}
                          />
                        )}
                      </div>
                      {isFreeTier && <PremiumLockOverlay />}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      ref={chartContainerRef}
                      style={{
                        flex: 1,
                        minHeight: '300px',
                        width: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        <NivoLineChart
                          data={[]}
                          height={chartHeight}
                          colors={[]}
                          granularity="daily"
                          enableLegend={false}
                          curve="monotoneX"
                          xAxisLegend=""
                          yAxisLegend={chartViewMode === 'streams' ? 'Streams' : 'Revenue ($)'}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '14px',
                              color: 'var(--muted-text)',
                              opacity: 0.6,
                            }}
                          >
                            {catalog.length === 0
                              ? 'No data available - add songs to your catalog'
                              : selectedTracks.length === 0
                                ? 'No tracks selected - select tracks to view analytics'
                                : 'No analytics data available'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </RoundedSection>

            <RoundedSection onlyBorder={false} className={styles.stats}>
              <div className={styles.statsPanels}>
                <RoundedSection onlyBorder={false} style={{ padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--muted-text)',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Play Count
                  </div>
                  <div className="text-left">
                    <div className="flex flex-col gap-1">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              fontSize: `${getResponsiveFontSize((isFreeTier ? FAKE_PLAYCOUNT : playcount).toLocaleString('en-US'))}px`,
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap',
                              filter: isFreeTier ? 'blur(6px)' : 'none',
                            }}
                          >
                            {(isFreeTier ? FAKE_PLAYCOUNT : playcount).toLocaleString('en-US')}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--muted-text)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            total
                          </div>
                        </div>
                        {showGrowthView && playcountRaise !== '±0' && selectedTimeframe !== 'All Time' && (
                          <span
                            style={{
                              fontSize: `${Math.max(8, getResponsiveFontSize(String(playcountRaise), 11))}px`,
                              fontWeight: '600',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: String(playcountRaise).startsWith('-')
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(34, 197, 94, 0.1)',
                              color: String(playcountRaise).startsWith('-') ? '#ef4444' : '#22c55e',
                              alignSelf: 'flex-start',
                            }}
                          >
                            {String(playcountRaise).startsWith('-') ? '↓' : '↑'} {playcountRaise}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-row items-center gap-1" style={{ fontSize: '10px' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1DB954' }} />
                        <div style={{ filter: isFreeTier ? 'blur(4px)' : 'none' }}>
                          {(isFreeTier ? FAKE_SPOTIFY_PLAYCOUNT : spotifyPlaycount).toLocaleString('en-US')}
                        </div>
                        <div style={{ color: 'var(--muted-text)' }}>Spotify</div>
                      </div>
                      <div className="flex flex-row items-center gap-1" style={{ fontSize: '10px' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF0000' }} />
                        <div style={{ filter: isFreeTier ? 'blur(4px)' : 'none' }}>
                          {(isFreeTier ? FAKE_YOUTUBE_PLAYCOUNT : youtubePlaycount).toLocaleString('en-US')}
                        </div>
                        <div style={{ color: 'var(--muted-text)' }}>YouTube</div>
                      </div>
                    </div>
                  </div>
                </RoundedSection>
              </div>
            </RoundedSection>
            <div className={styles.performerCardsGrid}>
              <RoundedSection onlyBorder={false} style={{ padding: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted-text)',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Best Performer
                </div>
                {bestPerformer && (
                  <div
                    style={{
                      padding: '10px',
                      background: 'var(--input-bg)',
                      borderRadius: '6px',
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 70px',
                      gap: '10px',
                      alignItems: 'center',
                      minHeight: '70px',
                    }}
                  >
                    <AlbumImage
                      src={bestPerformer.album_art}
                      alt={bestPerformer.title}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.3',
                        }}
                      >
                        {bestPerformer.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--muted-text)',
                          lineHeight: '1.3',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {bestPerformer.artist}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {(bestPerformer?.master_royalty == null || bestPerformer?.publishing_royalty == null) && (
                          <MUITooltip
                            title="Royalty percentages have not been set. Please set your master and publishing royalty percentages for accurate revenue calculations."
                            arrow
                          >
                            <span style={{ fontSize: '20px', cursor: 'help' }}>⚠️</span>
                          </MUITooltip>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--muted-text)',
                          lineHeight: '1.3',
                          textAlign: 'right',
                        }}
                      >
                        <div>
                          {parse(
                            bestPerformer.date_added.substring(0, 10),
                            'yyyy-MM-dd',
                            new Date()
                          ).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </div>
                        <div style={{ marginTop: '2px' }}>{bestPerformer.isrc}</div>
                      </div>
                    </div>
                  </div>
                )}
              </RoundedSection>
              <RoundedSection onlyBorder={false} style={{ padding: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted-text)',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Worst Performer
                </div>
                {worstPerformer && (
                  <div
                    style={{
                      padding: '10px',
                      background: 'var(--input-bg)',
                      borderRadius: '6px',
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 70px',
                      gap: '10px',
                      alignItems: 'center',
                      minHeight: '70px',
                    }}
                  >
                    <AlbumImage
                      src={worstPerformer.album_art}
                      alt={worstPerformer.title}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.3',
                        }}
                      >
                        {worstPerformer.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--muted-text)',
                          lineHeight: '1.3',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {worstPerformer.artist}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {(worstPerformer?.master_royalty == null || worstPerformer?.publishing_royalty == null) && (
                          <MUITooltip
                            title="Royalty percentages have not been set. Please set your master and publishing royalty percentages for accurate revenue calculations."
                            arrow
                          >
                            <span style={{ fontSize: '20px', cursor: 'help' }}>⚠️</span>
                          </MUITooltip>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--muted-text)',
                          lineHeight: '1.3',
                          textAlign: 'right',
                        }}
                      >
                        <div>
                          {parse(
                            worstPerformer.date_added.substring(0, 10),
                            'yyyy-MM-dd',
                            new Date()
                          ).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </div>
                        <div style={{ marginTop: '2px' }}>{worstPerformer.isrc}</div>
                      </div>
                    </div>
                  </div>
                )}
              </RoundedSection>
            </div>
          </div>
          <div className={styles.catalogRight}>
            <div
              className="flex items-center justify-between"
              style={{
                marginBottom: '10px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10,
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  Catalog
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty('background', '#3B82F6', 'important');
                      el.style.setProperty('color', '#ffffff', 'important');
                      el.style.setProperty('border', '1px solid #2563EB', 'important');
                    }
                  }}
                  onClick={() => setOpenCatalogAddModal(true)}
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.setProperty('background', '#2563EB', 'important');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('background', '#3B82F6', 'important');
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add to Catalog
                </button>
                <button
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty('background', 'rgba(220, 38, 38, 0.9)', 'important');
                      el.style.setProperty('color', '#ffffff', 'important');
                      el.style.setProperty('border', '1px solid rgba(220, 38, 38, 0.5)', 'important');
                    }
                  }}
                  onClick={() => setOpenClearCatalogModal(true)}
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    zIndex: 100,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.setProperty('background', 'rgba(220, 38, 38, 1)', 'important');
                    e.currentTarget.style.setProperty('border', '1px solid rgba(220, 38, 38, 0.8)', 'important');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('background', 'rgba(220, 38, 38, 0.9)', 'important');
                    e.currentTarget.style.setProperty('border', '1px solid rgba(220, 38, 38, 0.5)', 'important');
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Clear
                </button>
                <button
                  onClick={() => setOpenImportModal(true)}
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    background: 'var(--panel-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--input-bg)';
                    e.currentTarget.style.borderColor = 'var(--soft-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--panel-bg)';
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Import
                </button>
                <button
                  onClick={handleExport}
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    background: 'var(--panel-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--input-bg)';
                    e.currentTarget.style.borderColor = 'var(--soft-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--panel-bg)';
                    e.currentTarget.style.borderColor = 'var(--panel-border)';
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Export
                </button>
              </div>
            </div>
            <div className={styles.catalogRightNavigation}>
              <div
                className="flex flex-row gap-2 items-center"
                style={{ fontSize: '11px', flex: '1 1 200px', minWidth: '200px' }}
              >
                <FaMagnifyingGlass size={12} style={{ color: 'var(--muted-text)' }} />
                <input
                  ref={catalogSearchRef}
                  placeholder="Search..."
                  type="text"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    color: 'var(--text)',
                    fontSize: '11px',
                    outline: 'none',
                    flex: 1,
                  }}
                  onInput={(e) => {
                    if (searchTimeoutHandler) clearTimeout(searchTimeoutHandler);
                    if (e.target.value) {
                      setSearchTimeoutHandler(setTimeout(handleShowResults, maxTime));
                    } else {
                      handleFetchFromCatalog();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 items-center">
                <DropdownMultiSelection
                  header="Artists"
                  content={allArtists}
                  selected={selectedArtists}
                  onSelect={setSelectedArtists}
                />
                <SortButton onSort={(order) => setDateSortOrder(order)}>Date</SortButton>
                <SortButton onSort={(order) => setPopularitySortOrder(order)}>Popularity</SortButton>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleSelectAllTracks}
                  style={{
                    fontSize: '11px',
                    padding: '7px 12px',
                    background: 'transparent',
                    border: '1px solid var(--button-border)',
                    borderRadius: '6px',
                    color: 'var(--soft-text)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllTracks}
                  style={{
                    fontSize: '11px',
                    padding: '7px 12px',
                    background: 'transparent',
                    border: '1px solid var(--button-border)',
                    borderRadius: '6px',
                    color: 'var(--soft-text)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Deselect All
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleGoToPreviousPage}
                  style={{
                    fontSize: '11px',
                    padding: '7px 10px',
                    background: 'transparent',
                    border: '1px solid var(--button-border)',
                    borderRadius: '6px',
                    color: 'var(--soft-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '36px',
                  }}
                >
                  <FaArrowLeftLong />
                </button>
                <div
                  style={{
                    fontSize: '11px',
                    padding: '7px 12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    color: 'var(--muted-text)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Page {currentPage} of {lastPage}
                </div>
                <button
                  onClick={handleGoToNextPage}
                  style={{
                    fontSize: '11px',
                    padding: '7px 10px',
                    background: 'transparent',
                    border: '1px solid var(--button-border)',
                    borderRadius: '6px',
                    color: 'var(--soft-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '36px',
                  }}
                >
                  <FaArrowRightLong />
                </button>
              </div>
            </div>
            <RoundedSection className={styles.catalogTable} onlyBorder={false}>
              {catalogLoading ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    minHeight: '400px',
                  }}
                >
                  {/* Track skeleton rows */}
                  {[...Array(8)].map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 0',
                        borderBottom:
                          currentTheme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      <Skeleton
                        variant="rounded"
                        width={20}
                        height={20}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                      <Skeleton
                        variant="rounded"
                        width={48}
                        height={48}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <Skeleton
                          variant="text"
                          width="60%"
                          height={20}
                          sx={{
                            bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            marginBottom: '4px',
                          }}
                        />
                        <Skeleton
                          variant="text"
                          width="40%"
                          height={16}
                          sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                        />
                      </div>
                      <Skeleton
                        variant="text"
                        width={80}
                        height={20}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                      <Skeleton
                        variant="text"
                        width={60}
                        height={20}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                      <Skeleton
                        variant="text"
                        width={60}
                        height={20}
                        sx={{ bgcolor: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {catalog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '300px' }}>
                      <div className="flex flex-col items-center gap-2 text-center">
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          style={{ opacity: 0.3, marginBottom: '8px' }}
                        >
                          <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                          <line x1="9" y1="13" x2="21" y2="11" />
                        </svg>
                        <div className="text-lg font-semibold" style={{ color: 'var(--text)', opacity: 0.7 }}>
                          Your catalog is empty
                        </div>
                        <p
                          style={{
                            color: 'var(--muted-text)',
                            fontSize: '14px',
                            maxWidth: '300px',
                          }}
                        >
                          Add songs to your catalog using the "Add to Catalog" button to start tracking your music!
                        </p>
                      </div>
                    </div>
                  ) : (
                    ''
                  )}
                  {catalog
                    .filter((track) => selectedArtists.includes(track.artist))
                    .map((track, i) => {
                      return (
                        <div key={i} className="flex items-center gap-2" style={{ position: 'relative', zIndex: 1 }}>
                          <div className="flex-1">
                            <MemoizedTrack
                              data={track}
                              onRoyaltyUpdate={handleUpdateRoyalty}
                              isSelected={selectedTracksSet.has(track.spotify_track_id)}
                              onSelectionChange={handleTrackSelectionChange}
                              onContextMenuSelect={handleContextMenuSelect}
                              onClaimRoyaltiesClick={handleClaimRoyaltiesClick}
                            />
                          </div>
                          <button
                            className={styles.trackOptionsButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrack(track);
                              setSelectedTrackIndex(i);
                              setOpenTrackChangeModal(true);
                            }}
                            style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--panel-border)',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '40px',
                              height: '40px',
                              position: 'relative',
                              zIndex: 1000,
                            }}
                          >
                            <BsThreeDots size={18} />
                          </button>
                        </div>
                      );
                    })}
                </>
              )}
            </RoundedSection>
          </div>
        </div>
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={openDeleteConfirmationModal}
          onClose={() => setOpenDeleteConfirmationModal(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openDeleteConfirmationModal} className={styles.deleteConfirmationModal}>
            <div>
              <div className="mb-1 flex justify-end">
                <GlassButton onClick={() => setOpenDeleteConfirmationModal(false)}>
                  <RxCross2 className="cursor-pointer" size="22" />
                </GlassButton>
              </div>
              <div className="flex flex-col items-center gap-3 p-4">
                <h1 className="text-2xl">Hold On!</h1>
                <p>Are you sure you want to delete the track from your Catalog?</p>
                <RedButton onClick={handleDeleteTrack}>Delete Track</RedButton>
              </div>
            </div>
          </Fade>
        </Modal>
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={openTrackChangeModal}
          onClose={() => setOpenTrackChangeModal(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openTrackChangeModal} className={styles.deleteConfirmationModal}>
            <div>
              <div className="flex justify-between mb-4">
                <h1 className="text-2xl mb-1">{selectedTrack?.title}</h1>
                <GlassButton onClick={() => setOpenTrackChangeModal(false)}>
                  <RxCross2 className="cursor-pointer" size="22" />
                </GlassButton>
              </div>
              <div className="flex flex-col items-center gap-3 p-4">
                {selectedTrack ? (
                  <>
                    <div className="flex flex-col items-start gap-5">
                      <div>
                        <h1 className="text-xl mb-2">Master Royalty</h1>
                        <div className="text-sm ml-3 text-[var(--soft-text)]">
                          What percentage of the master recording are you paid out?
                        </div>
                        <div>
                          <NumberInput
                            reference={masterRoyaltyInputRef}
                            min={0}
                            max={100}
                            className="w-10 mr-2 my-4"
                            initialValue={selectedTrack.master_royalty * 100}
                          />
                          %
                        </div>
                      </div>
                      <div>
                        <h1 className="text-xl mb-2">Publishing Royalty</h1>
                        <div className="text-sm ml-3 text-[var(--soft-text)]">
                          What percentage of the publishing are you paid out?
                        </div>
                        <div>
                          <NumberInput
                            reference={publishingRoyaltyInputRef}
                            min={0}
                            max={100}
                            className="w-10 mr-2 my-4"
                            initialValue={selectedTrack.publishing_royalty * 100}
                          />
                          %
                        </div>
                      </div>
                      <div>
                        <h1 className="text-xl mb-2">Copyright</h1>
                        <div className="text-sm ml-3 text-[var(--soft-text)]">
                          Is this track claimed illegally by someone?
                        </div>
                        <div className="mb-5 flex flex-row items-center justify-start">
                          <Checkbox
                            onChange={(e, checked) => {
                              setSelectedTrack({
                                ...selectedTrack,
                                is_infringement: checked,
                              });
                            }}
                            checked={selectedTrack.is_infringement}
                            sx={{
                              color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                              '&.Mui-checked': {
                                color: currentTheme === 'dark' ? '#ffffff' : '#000000',
                              },
                            }}
                          />
                          {selectedTrack.is_infringement
                            ? 'Someone else illegally claimed the track.'
                            : 'The track belongs to me.'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between gap-5">
                      <FlatButton onClick={handleChangeTrackProperties}>Apply Changes</FlatButton>
                      <RedButton
                        onClick={() => {
                          setTrackToDelete(selectedTrack);
                          setOpenDeleteConfirmationModal(true);
                        }}
                      >
                        Delete Track
                      </RedButton>
                    </div>
                  </>
                ) : (
                  <></>
                )}
              </div>
            </div>
          </Fade>
        </Modal>

        <ClaimRoyaltiesModal
          isOpen={openClaimRoyaltiesModal}
          onClose={() => setOpenClaimRoyaltiesModal(false)}
          trackData={trackForClaim}
          onCaseFiled={handleFetchFromCatalog}
        />

        <CaseStatusModal
          isOpen={openCaseStatusModal}
          onClose={() => setOpenCaseStatusModal(false)}
          trackData={trackForClaim}
        />

        <CatalogImport isOpen={openImportModal} onClose={() => setOpenImportModal(false)} onImport={handleImport} />

        {/* Clear Catalog Confirmation Modal */}
        <Modal
          open={openClearCatalogModal}
          onClose={() => setOpenClearCatalogModal(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openClearCatalogModal}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
              }}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '16px',
                }}
              >
                {selectedClient ? `Clear ${selectedClient.name}'s Catalog?` : 'Clear Entire Catalog?'}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--muted-text)',
                  marginBottom: '24px',
                  lineHeight: '1.6',
                }}
              >
                {selectedClient
                  ? `Are you sure you want to delete all tracks for ${selectedClient.name}? This action cannot be undone.`
                  : 'Are you sure you want to delete all tracks from your catalog? This action cannot be undone.'}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setOpenClearCatalogModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCatalog}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Delete All Tracks
                </button>
              </div>
            </div>
          </Fade>
        </Modal>

        {/* Audit Catalog Modal */}
        <Modal
          open={openAuditModal}
          onClose={() => setOpenAuditModal(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openAuditModal}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
              }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '16px',
                }}
              >
                Catalog Audit
              </h2>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--muted-text)',
                  marginBottom: '24px',
                  lineHeight: '1.6',
                }}
              >
                <p style={{ marginBottom: '12px' }}>
                  Our team of music rights experts will conduct a comprehensive, in-depth analysis of your entire
                  catalog to identify:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)' }}>Registration issues</strong> - Missing or incomplete
                    registrations across PROs, CMOs, and collecting societies worldwide
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)' }}>Revenue stream leaks</strong> - Unclaimed mechanical,
                    performance, and neighboring rights royalties
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)' }}>Duplicate registrations</strong> - Conflicting claims that
                    may cause payment delays or rejections
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)' }}>Metadata inconsistencies</strong> - Mismatched ISRC, ISWC,
                    and IPI information across platforms
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)' }}>Territory gaps</strong> - Unregistered territories where
                    your music is being exploited
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text)' }}>Publishing splits</strong> - Incorrect or missing co-writer
                    and co-publisher information
                  </li>
                </ul>
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--input-bg)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--text)',
                      fontWeight: 600,
                      marginBottom: '8px',
                    }}
                  >
                    📊 You will receive:
                  </p>
                  <ul style={{ paddingLeft: '20px', color: 'var(--soft-text)' }}>
                    <li>Detailed report with actionable recommendations</li>
                    <li>Track-by-track breakdown of issues found</li>
                    <li>Estimated unclaimed revenue amounts</li>
                    <li>Step-by-step remediation plan</li>
                    <li>Priority ranking of issues to address first</li>
                  </ul>
                </div>
                <p
                  style={{
                    padding: '12px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--text)',
                    fontWeight: 600,
                  }}
                >
                  ⏱️ Complete in-depth analysis delivered within 48 hours
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setOpenAuditModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestMLCAudit}
                  disabled={auditRequestLoading}
                  style={{
                    padding: '10px 20px',
                    background: auditRequestLoading ? 'var(--muted-text)' : 'var(--secondary)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--secondary-text)',
                    cursor: auditRequestLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    opacity: auditRequestLoading ? 0.6 : 1,
                  }}
                >
                  {auditRequestLoading ? 'Submitting...' : 'Get an Audit'}
                </button>
              </div>
            </div>
          </Fade>
        </Modal>

        {/* Audit Confirmation Modal */}
        <Modal
          open={openAuditConfirmModal}
          onClose={() => setOpenAuditConfirmModal(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openAuditConfirmModal}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                  }}
                >
                  ✅
                </div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: '12px',
                  }}
                >
                  Audit Request Submitted!
                </h2>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--soft-text)',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                }}
              >
                <p style={{ marginBottom: '12px' }}>
                  Your catalog audit request has been successfully submitted. Our team will:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                  <li style={{ marginBottom: '8px' }}>Query the MLC database for each of your catalog tracks</li>
                  <li style={{ marginBottom: '8px' }}>Match registrations with your name and artist information</li>
                  <li style={{ marginBottom: '8px' }}>Identify missing registrations and potential issues</li>
                  <li style={{ marginBottom: '8px' }}>
                    Generate a comprehensive audit report with actionable recommendations
                  </li>
                </ul>
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: '4px',
                    }}
                  >
                    ⏱️ You will receive your report within 24 hours
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--soft-text)' }}>
                    Check your email for the detailed audit results
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setOpenAuditConfirmModal(false)}
                  style={{
                    padding: '12px 32px',
                    background: 'var(--secondary)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--secondary-text)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </Fade>
        </Modal>

        {/* Add to Catalog Modal */}
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={openCatalogAddModal}
          onClose={() => setOpenCatalogAddModal(false)}
          closeAfterTransition
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openCatalogAddModal}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90vw',
                maxWidth: '850px',
                maxHeight: '85vh',
                overflow: 'hidden',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="mb-4 flex justify-end">
                <GlassButton onClick={() => setOpenCatalogAddModal(false)}>
                  <RxCross2 className="cursor-pointer" size="22" />
                </GlassButton>
              </div>
              <div onDragOver={(event) => event.preventDefault()} className="flex flex-col">
                <ManualSearch
                  onAddToCatalog={() => {
                    setOpenCatalogAddModal(false);
                    handleCatalogRefresh();
                  }}
                  onDeleteCatalog={handleCatalogRefresh}
                />
              </div>
            </div>
          </Fade>
        </Modal>

        {/* Catalog Analysis Modal for FREE tier users */}
        <CatalogAnalysisModal
          isOpen={showCatalogAnalysisModal}
          onClose={() => setShowCatalogAnalysisModal(false)}
          userCatalogData={catalog}
          userInfo={userInfo}
        />

        {/* Upgrade Modal for Export Feature */}
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="Catalog Export" />
      </div>
    </>
  );
};

export default Catalog;
