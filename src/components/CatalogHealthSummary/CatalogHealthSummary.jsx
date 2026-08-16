import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  DollarSign,
  Music,
  Globe,
  Download,
  X,
  Info,
  Filter,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Divider, Spinner, Tooltip } from '@heroui/react';
import './CatalogHealthSummary.css';
import { useClientContext } from '../ClientContext/ClientContext';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const PRO_AUDIT_URL = process.env.REACT_APP_PRO_AUDIT_URL || 'http://localhost:8080';

// Cache configuration
const AUDIT_CACHE_KEY = 'verax_audit_cache_v1';
const SETTINGS_MODIFIED_KEY = 'verax_settings_modified_at';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function CatalogHealthSummary({
  healthPercentageOverride = null,
  revenueDataOverride = null, // { totalRevenue, totalExpectedRevenue } from Revenue.jsx
}) {
  const { selectedClientId, selectedClient } = useClientContext();
  const [loading, setLoading] = useState(true);
  const [catalogHealth, setCatalogHealth] = useState(null);
  const [mlcData, setMlcData] = useState({});
  const [mlcLoading, setMlcLoading] = useState(false);
  const [streamingData, setStreamingData] = useState({});
  const [streamingLoading, setStreamingLoading] = useState(false);
  // Store raw catalog and transactions for recalculation
  const [rawCatalog, setRawCatalog] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  // Dismissed anomalies
  const [dismissedAnomalies, setDismissedAnomalies] = useState([]);

  // PRO Audit state
  const [proData, setProData] = useState({});
  const [proLoading, setProLoading] = useState(false);
  const [proProgress, setProProgress] = useState({ current: 0, total: 0, currentSong: '' });
  const [proError, setProError] = useState(null);

  // Audit table filter
  const [auditFilter, setAuditFilter] = useState('all'); // 'all', 'leaks', 'partial', 'matched'

  // User info for PRO audit (fetched from settings)
  const [userInfo, setUserInfo] = useState({
    writerName: '',
    writerIpi: '',
    publisherName: '',
    publisherIpi: '',
  });

  // Cache helpers
  const loadFromCache = useCallback((currentUserInfo = null) => {
    try {
      const cached = localStorage.getItem(AUDIT_CACHE_KEY);
      if (cached) {
        const { mlc, pro, userInfo: cachedUserInfo, timestamp } = JSON.parse(cached);
        // Check if cache is expired
        if (Date.now() - timestamp >= CACHE_TTL) {
          console.log('📦 Cache expired (TTL exceeded)');
          return { isValid: false };
        }
        // Check if settings were modified after cache was created
        const settingsModifiedAt = localStorage.getItem(SETTINGS_MODIFIED_KEY);
        if (settingsModifiedAt && parseInt(settingsModifiedAt, 10) > timestamp) {
          console.log('📦 Cache invalidated: settings were modified after cache creation', {
            cacheCreated: new Date(timestamp).toISOString(),
            settingsModified: new Date(parseInt(settingsModifiedAt, 10)).toISOString(),
          });
          return { isValid: false };
        }
        // Check if user info has changed (IPI or name changed)
        if (currentUserInfo) {
          const userInfoChanged =
            cachedUserInfo?.writerIpi !== currentUserInfo.writerIpi ||
            cachedUserInfo?.publisherIpi !== currentUserInfo.publisherIpi ||
            cachedUserInfo?.writerName !== currentUserInfo.writerName ||
            cachedUserInfo?.publisherName !== currentUserInfo.publisherName;
          if (userInfoChanged) {
            console.log('📦 Cache invalidated: user info changed', {
              cached: cachedUserInfo,
              current: currentUserInfo,
            });
            return { isValid: false };
          }
        }
        return { mlc, pro, userInfo: cachedUserInfo, isValid: true };
      }
    } catch (e) {
      console.error('Error loading audit cache:', e);
    }
    return { isValid: false };
  }, []);

  const saveToCache = useCallback((mlc, pro, userInfoData) => {
    try {
      localStorage.setItem(
        AUDIT_CACHE_KEY,
        JSON.stringify({
          mlc,
          pro,
          userInfo: userInfoData,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.error('Error saving audit cache:', e);
    }
  }, []);

  // Fetch user info for PRO audit — uses client data when a client is selected
  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('👤 User info response:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('👤 User data:', data);

        // Use client-level IPI/name when a client is selected and has data
        const useClient =
          selectedClient &&
          (selectedClient.writer_ipi ||
            selectedClient.writer_name ||
            selectedClient.publisher_ipi ||
            selectedClient.publisher_name);

        const info = useClient
          ? {
              writerName: selectedClient.writer_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
              writerIpi: selectedClient.writer_ipi || data.writer_ipi || data.ipi_number || '',
              publisherName: selectedClient.publisher_name || '',
              publisherIpi: selectedClient.publisher_ipi || '',
            }
          : {
              writerName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
              writerIpi: data.writer_ipi || data.ipi_number || '',
              publisherName: data.publisher_name || '',
              publisherIpi: data.publisher_ipi || '',
            };

        console.log('👤 Parsed user info:', info, useClient ? '(from client)' : '(from user)');
        setUserInfo(info);
        return info;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
    return null;
  }, [selectedClient]);

  // Fetch PRO audit data via SSE for real-time progress
  const fetchPROData = useCallback(
    async (catalog, userInfoData) => {
      console.log('🎯 fetchPROData called with:', {
        catalogCount: catalog?.length,
        userInfo: userInfoData,
        PRO_AUDIT_URL,
      });

      if (!catalog || catalog.length === 0) {
        console.log('❌ PRO audit skipped: no catalog');
        return;
      }
      if (!userInfoData?.writerName && !userInfoData?.writerIpi) {
        console.log('❌ PRO audit skipped: no user info available');
        return;
      }

      setProLoading(true);
      setProError(null);
      setProProgress({ current: 0, total: catalog.length, currentSong: '' });

      try {
        const songs = catalog.map((song) => ({
          title: song.title || '',
          performer: song.artist || song.artists?.[0]?.name || '',
        }));

        const requestBody = {
          writer_name: userInfoData.writerName,
          writer_ipi: userInfoData.writerIpi,
          publisher_name: userInfoData.publisherName,
          publisher_ipi: userInfoData.publisherIpi,
          songs,
        };

        // Use SSE streaming endpoint
        console.log('📤 Sending PRO audit request to:', `${PRO_AUDIT_URL}/api/audit/stream`);
        console.log('📤 Request body:', requestBody);

        const response = await fetch(`${PRO_AUDIT_URL}/api/audit/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 PRO audit response status:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`PRO audit failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const proResults = {};
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) {
            streamDone = true;
            continue;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log('📨 SSE event:', data.type, data);

                if (data.type === 'progress') {
                  setProProgress({
                    current: data.current,
                    total: data.total,
                    currentSong: data.song || '',
                  });
                } else if (data.type === 'song_complete') {
                  const song = data.song;
                  const normalizedTitle = (song.title || '').toLowerCase().trim();
                  proResults[normalizedTitle] = {
                    status: song.status,
                    writerNameFound: song.analysis?.writer_name_found,
                    writerIpiFound: song.analysis?.writer_ipi_found,
                    publisherNameFound: song.analysis?.publisher_name_found,
                    publisherIpiFound: song.analysis?.publisher_ipi_found,
                    message: song.analysis?.message,
                    pro: 'ASCAP/BMI', // PRO audit covers both
                  };
                } else if (data.type === 'complete') {
                  console.log('PRO audit complete:', data.summary);
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }

        console.log('✅ PRO audit complete, results:', Object.keys(proResults).length, 'songs');
        console.log('📊 PRO results:', proResults);
        setProData(proResults);
        // Save to cache
        saveToCache(mlcData, proResults, userInfoData);
      } catch (error) {
        console.error('❌ PRO audit error:', error);
        setProError(error.message);
      } finally {
        setProLoading(false);
      }
    },
    [mlcData, saveToCache]
  );

  const fetchMLCData = async () => {
    try {
      console.log('🎵 Fetching MLC data...');
      setMlcLoading(true);
      let mlcUrl = `${API_BASE_URL}/mlc-audit/catalog-check`;
      if (selectedClientId) {
        mlcUrl += `?client_id=${selectedClientId}`;
      }
      const response = await fetch(mlcUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      console.log('🎵 MLC response status:', response.status, response.statusText);
      if (response.ok) {
        const data = await response.json();
        console.log('🎵 MLC data received:', data.tracks?.length, 'tracks');
        // Log first track to see publisher_matched_by field
        if (data.tracks?.[0]) {
          console.log('🎵 Sample MLC track:', {
            title: data.tracks[0].title,
            publishers: data.tracks[0].publishers,
            publisher_matched_by: data.tracks[0].publisher_matched_by,
            user_is_publisher: data.tracks[0].user_is_publisher,
          });
        }
        // Index MLC data by title for easy lookup (normalize to handle accents)
        const mlcByTitle = {};
        (data.tracks || []).forEach((track) => {
          const normalizedTitle = (track.title || '')
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          mlcByTitle[normalizedTitle] = track;
        });
        setMlcData(mlcByTitle);
      }
    } catch (error) {
      console.error('Error fetching MLC data:', error);
    } finally {
      setMlcLoading(false);
    }
  };

  const fetchStreamingData = async () => {
    try {
      setStreamingLoading(true);
      const response = await fetch(`${API_BASE_URL}/catalog/streaming-revenue-analysis`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Streaming revenue analysis response:', data);
        // Index streaming data by title AND spotify_track_id for easy lookup
        const streamingByKey = {};
        (data.tracks || []).forEach((track) => {
          const normalizedTitle = (track.title || '').toLowerCase().trim();
          streamingByKey[normalizedTitle] = track;
          // Also index by spotify_track_id if available
          if (track.spotify_track_id) {
            streamingByKey[track.spotify_track_id] = track;
          }
          console.log(`✅ Added streaming data for "${track.title}": $${track.expected_publishing_revenue}`);
        });
        console.log('📊 Total streaming tracks indexed:', Object.keys(streamingByKey).length);
        setStreamingData(streamingByKey);
      } else {
        console.error('❌ Failed to fetch streaming data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching streaming data:', error);
    } finally {
      setStreamingLoading(false);
    }
  };

  // Trigger PRO audit when catalog is loaded and user info is available
  useEffect(() => {
    console.log('🔍 PRO audit trigger check:', {
      catalogLength: rawCatalog.length,
      writerName: userInfo.writerName,
      proLoading,
      proDataCount: Object.keys(proData).length,
    });

    if (rawCatalog.length > 0 && userInfo.writerName && !proLoading) {
      // Check if we have cached PRO data - pass current userInfo to detect changes
      const cached = loadFromCache(userInfo);
      console.log('📦 Cache check for PRO:', cached);

      if (!cached.isValid || !cached.pro || Object.keys(cached.pro).length === 0) {
        // No valid cache or user info changed, start fresh PRO audit
        // Clear stale PRO data if user info changed
        if (Object.keys(proData).length > 0) {
          console.log('🔄 Clearing stale PRO data due to user info change...');
          setProData({});
        }
        console.log('🚀 Starting PRO audit...');
        fetchPROData(rawCatalog, userInfo);
      } else if (Object.keys(proData).length === 0) {
        // Cache is valid and we don't have PRO data loaded yet, use cached data
        console.log('✅ Using cached PRO data');
        setProData(cached.pro);
      }
    }
  }, [rawCatalog, userInfo, proLoading, proData, loadFromCache, fetchPROData]);

  // Helper function to determine match status for a cell
  const getMatchStatus = (nameFound, ipiFound) => {
    if (nameFound === null && ipiFound === null) return 'not_found';
    if (nameFound && ipiFound) return 'match';
    if (nameFound && !ipiFound) return 'name_only';
    if (!nameFound && ipiFound) return 'ipi_only';
    return 'no_match';
  };

  // Get display info for match status
  const getMatchDisplay = (status, isLoading = false) => {
    if (isLoading || status === 'pending') {
      return {
        icon: <Loader2 size={14} className="animate-spin" />,
        label: 'Pending...',
        color: '#6366F1',
        bgColor: 'rgba(99, 102, 241, 0.1)',
      };
    }

    switch (status) {
      case 'match':
        return {
          icon: <CheckCircle size={14} />,
          label: 'Name & IPI',
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
        };
      case 'name_only':
        return {
          icon: <AlertTriangle size={14} />,
          label: 'Name Only',
          color: '#D97706',
          bgColor: 'rgba(245, 158, 11, 0.12)',
        };
      case 'ipi_only':
        return {
          icon: <AlertTriangle size={14} />,
          label: 'IPI Only',
          color: '#D97706',
          bgColor: 'rgba(245, 158, 11, 0.12)',
        };
      case 'no_match':
        return {
          icon: <XCircle size={14} />,
          label: 'No Match',
          color: '#DC2626',
          bgColor: 'rgba(220, 38, 38, 0.1)',
        };
      case 'not_found':
        return {
          icon: <XCircle size={14} />,
          label: 'Not Found',
          color: '#DC2626',
          bgColor: 'rgba(220, 38, 38, 0.1)',
        };
      case 'na':
        return {
          icon: null,
          label: '—',
          color: 'var(--soft-text)',
          bgColor: 'transparent',
        };
      default:
        return {
          icon: null,
          label: '—',
          color: 'var(--soft-text)',
          bgColor: 'var(--hover-bg)',
        };
    }
  };

  // Compute combined audit data for each song
  const getAuditData = useCallback(
    (song) => {
      const normalizedTitle = (song.title || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const mlcInfo = mlcData[normalizedTitle];
      const proInfo = proData[normalizedTitle];

      // MLC (Mechanical) data
      // Writer matching
      const writerMatchedBy = mlcInfo?.writer_matched_by;
      const mlcWriterNameMatch = mlcInfo?.user_is_writer && (writerMatchedBy === 'name' || writerMatchedBy === 'both');
      const mlcWriterIpiMatch = mlcInfo?.user_is_writer && (writerMatchedBy === 'ipi' || writerMatchedBy === 'both');

      // Publisher matching - use publisher_matched_by field (new) or fall back to user_matched_by (legacy)
      const pubMatchedBy = mlcInfo?.publisher_matched_by || mlcInfo?.user_matched_by;
      const mlcPubNameMatch = mlcInfo?.user_is_publisher && (pubMatchedBy === 'name' || pubMatchedBy === 'both');
      const mlcPubIpiMatch = mlcInfo?.user_is_publisher && (pubMatchedBy === 'ipi' || pubMatchedBy === 'both');

      const mechanical = {
        writer: {
          status: mlcInfo ? getMatchStatus(mlcWriterNameMatch, mlcWriterIpiMatch) : 'not_found',
          nameMatch: mlcWriterNameMatch,
          ipiMatch: mlcWriterIpiMatch,
        },
        publisher: {
          status: mlcInfo ? getMatchStatus(mlcPubNameMatch, mlcPubIpiMatch) : 'not_found',
          nameMatch: mlcPubNameMatch,
          ipiMatch: mlcPubIpiMatch,
        },
        registered: mlcInfo?.mlc_registered || false,
        writers: mlcInfo?.writers || [],
        ipiNumbers: mlcInfo?.ipi_numbers || [],
      };

      // PRO (Performance) data
      // Determine if PRO audit is still pending (not started or in progress)
      const proAuditPending = proLoading || Object.keys(proData).length === 0;

      const getProWriterStatus = () => {
        if (proInfo) return getMatchStatus(proInfo.writerNameFound, proInfo.writerIpiFound);
        if (proAuditPending) return 'pending';
        return 'not_found';
      };

      const getProPublisherStatus = () => {
        if (proInfo) return getMatchStatus(proInfo.publisherNameFound, proInfo.publisherIpiFound);
        if (proAuditPending) return 'pending';
        return 'not_found';
      };

      const performance = {
        writer: {
          status: getProWriterStatus(),
          nameMatch: proInfo?.writerNameFound,
          ipiMatch: proInfo?.writerIpiFound,
        },
        publisher: {
          status: getProPublisherStatus(),
          nameMatch: proInfo?.publisherNameFound,
          ipiMatch: proInfo?.publisherIpiFound,
        },
        registered: proInfo?.status === 'registered' || proInfo?.status === 'collection_issue',
        pro: proInfo?.pro || null,
      };

      // Determine match categories based on mechanical (MLC) data only
      const mechWriterStatus = mechanical.writer.status;
      const mechPubStatus = mechanical.publisher.status;

      const mechWriterMatch = mechWriterStatus === 'match';
      const mechPubMatch = mechPubStatus === 'match';

      const mechWriterMissing = mechWriterStatus === 'no_match' || mechWriterStatus === 'not_found';
      const mechPubMissing = mechPubStatus === 'no_match' || mechPubStatus === 'not_found';

      const mechWriterPartial = mechWriterStatus === 'name_only' || mechWriterStatus === 'ipi_only';
      const mechPubPartial = mechPubStatus === 'name_only' || mechPubStatus === 'ipi_only';

      const hasAnyMatch = mechWriterMatch || mechPubMatch;
      const hasAnyMissing = mechWriterMissing || mechPubMissing;
      const hasAnyPartial = mechWriterPartial || mechPubPartial;

      // LEAK: Has missing registrations and no full matches anywhere
      const hasLeak = hasAnyMissing && !hasAnyMatch && !hasAnyPartial;

      // PARTIAL: Mix of matched and missing, or has partial matches
      const hasPartialMatch = hasAnyPartial || (hasAnyMatch && hasAnyMissing);

      // FULLY MATCHED: Both writer and publisher are full matches
      const isFullyMatched = mechWriterMatch && mechPubMatch;

      return {
        mechanical,
        performance,
        hasLeak,
        hasPartialMatch,
        isFullyMatched,
        isrcMissing: mlcInfo?.isrc_missing || false,
        mlcInfo,
        proInfo,
      };
    },
    [mlcData, proData, proLoading]
  );

  const fetchCatalogHealth = async () => {
    try {
      setLoading(true);

      // Fetch catalog tracks
      let catalogUrl = `${API_BASE_URL}/catalog/tracks`;
      if (selectedClientId) {
        catalogUrl += `?client_id=${selectedClientId}`;
      }
      const catalogResponse = await fetch(catalogUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Fetch revenue transactions
      const transactionsResponse = await fetch(`${API_BASE_URL}/revenue/transactions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (catalogResponse.ok && transactionsResponse.ok) {
        const catalogData = await catalogResponse.json();
        const transactionsData = await transactionsResponse.json();

        console.log('Raw catalog response:', catalogData);
        console.log('Raw transactions response:', transactionsData);

        // Handle different possible response structures
        let catalog = [];
        if (Array.isArray(catalogData)) {
          catalog = catalogData;
        } else if (catalogData && typeof catalogData === 'object') {
          // Try common property names
          if (Array.isArray(catalogData.songs)) {
            catalog = catalogData.songs;
          } else if (Array.isArray(catalogData.catalog)) {
            catalog = catalogData.catalog;
          } else if (Array.isArray(catalogData.data)) {
            catalog = catalogData.data;
          } else if (Array.isArray(catalogData.tracks)) {
            catalog = catalogData.tracks;
          } else if (Array.isArray(catalogData.items)) {
            catalog = catalogData.items;
          } else {
            // Log all keys to help debug
            console.log('Catalog object keys:', Object.keys(catalogData));
          }
        }

        // Ensure catalog is always an array
        if (!Array.isArray(catalog)) {
          console.warn('Catalog is not an array, defaulting to empty array. Type:', typeof catalog);
          catalog = [];
        }

        const transactions = transactionsData.transactions || [];

        console.log('Catalog data:', catalog.length, 'songs');
        console.log('Transactions data:', transactions.length, 'transactions');

        // Store raw data for recalculation when streaming data becomes available
        setRawCatalog(catalog);
        setRawTransactions(transactions);

        // Analyze catalog health (will be recalculated with streaming data once available)
        const health = analyzeCatalogHealth(catalog, transactions);
        setCatalogHealth(health);
      }
    } catch (error) {
      console.error('Error fetching catalog health:', error);
    } finally {
      setLoading(false);
    }
  };

  // Main initialization effect - runs after all functions are defined
  useEffect(() => {
    // Load MLC from cache (MLC data doesn't depend on user info)
    const cached = loadFromCache();
    if (cached.isValid && cached.mlc) {
      setMlcData(cached.mlc);
    }
    // Note: PRO data is loaded by the PRO audit trigger useEffect after
    // fetching fresh user info, so it can detect IPI changes

    fetchCatalogHealth();
    fetchMLCData();
    fetchStreamingData();
    fetchUserInfo();
  }, [loadFromCache, fetchUserInfo, selectedClientId]);

  // Recalculate health when streaming data becomes available
  useEffect(() => {
    if (rawCatalog.length > 0 && Object.keys(streamingData).length > 0) {
      // Recalculate with streaming data using stored raw data (no refetch needed)
      const updatedHealth = analyzeCatalogHealth(rawCatalog, rawTransactions, streamingData);
      setCatalogHealth(updatedHealth);
    }
  }, [streamingData, rawCatalog, rawTransactions]);

  const normalizeString = (str) => {
    return (str || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  };

  const analyzeCatalogHealth = (catalog, transactions, streamingDataParam = null) => {
    const catalogSongs = catalog.length;

    if (catalogSongs === 0) {
      return {
        catalogSongs: 0,
        earningSongs: [],
        missingSongs: [],
        healthPercentage: 0,
        totalRevenue: 0,
        uniqueTerritories: 0,
        uniqueSources: 0,
        avgRevenuePerSong: 0,
        topEarner: null,
        isEmpty: true,
        totalPotentiallyLostRevenue: 0,
      };
    }

    // Build revenue map by song title + ISRC (normalized)
    const revenueByProduct = {};
    const revenueByISRC = {};
    const territoriesBySong = {};
    const sourcesBySong = {};
    const transactionsByKey = {};

    transactions.forEach((t) => {
      const product = normalizeString(t.product || t.incomeName || '');
      const isrc = (t.isrc || '').toUpperCase().trim();

      if (!product && !isrc) return;

      const key = product || isrc;

      // Aggregate revenue by product name
      if (product) {
        revenueByProduct[product] = (revenueByProduct[product] || 0) + (t.amount || 0);

        if (!territoriesBySong[product]) territoriesBySong[product] = new Set();
        if (t.territory) territoriesBySong[product].add(t.territory);

        if (!sourcesBySong[product]) sourcesBySong[product] = new Set();
        if (t.source) sourcesBySong[product].add(t.source);
      }

      // Also index by ISRC for exact matching
      if (isrc && isrc !== 'N/A') {
        revenueByISRC[isrc] = (revenueByISRC[isrc] || 0) + (t.amount || 0);

        if (!territoriesBySong[isrc]) territoriesBySong[isrc] = new Set();
        if (t.territory) territoriesBySong[isrc].add(t.territory);

        if (!sourcesBySong[isrc]) sourcesBySong[isrc] = new Set();
        if (t.source) sourcesBySong[isrc].add(t.source);
      }
    });

    const earningSongs = [];
    const missingSongs = [];

    // Get all transaction song titles for fuzzy matching
    const songsInStatements = Object.keys(revenueByProduct);

    // Analyze each catalog song
    catalog.forEach((song) => {
      const songTitle = normalizeString(song.title || '');
      const artist = song.artist || song.artists || '';
      const isrc = (song.isrc || '').toUpperCase().trim();

      // Find matching transaction using multiple strategies
      let matchingKey = null;
      let matchType = null;

      // Strategy 1: Exact ISRC match (most reliable)
      if (isrc && isrc !== 'N/A' && revenueByISRC[isrc] !== undefined) {
        matchingKey = isrc;
        matchType = 'isrc';
      }
      // Strategy 2: Exact title match
      else if (revenueByProduct[songTitle] !== undefined) {
        matchingKey = songTitle;
        matchType = 'exact';
      }
      // Strategy 3: Fuzzy title matching (contains or is contained by)
      else {
        matchingKey = songsInStatements.find((statementSong) => {
          // Skip very short matches to avoid false positives
          if (songTitle.length < 3 || statementSong.length < 3) return false;

          // Check if one contains the other
          return statementSong.includes(songTitle) || songTitle.includes(statementSong);
        });
        if (matchingKey) matchType = 'fuzzy';
      }

      if (matchingKey) {
        const revenue = (matchType === 'isrc' ? revenueByISRC[matchingKey] : revenueByProduct[matchingKey]) || 0;
        const territories = territoriesBySong[matchingKey] ? Array.from(territoriesBySong[matchingKey]) : [];
        const sources = sourcesBySong[matchingKey] ? Array.from(sourcesBySong[matchingKey]) : [];

        earningSongs.push({
          title: song.title,
          artist: artist,
          isrc: isrc,
          revenue: revenue,
          master_royalty: song.master_royalty || 0,
          publishing_royalty: song.publishing_royalty || 0,
          territories: territories,
          sources: sources,
          matchType: matchType,
          id: song.id,
          cover_art: song.album_art || song.cover_art || song.artwork || song.image_url || null,
          artists: song.artists || [],
        });
      } else {
        // Calculate potentially lost revenue from streaming data
        // Try multiple lookup strategies: title, spotify_track_id
        let potentialRevenue = 0;
        if (streamingDataParam && Object.keys(streamingDataParam).length > 0) {
          const normalizedTitle = (song.title || '').toLowerCase().trim();
          const spotifyTrackId = song.spotify_track_id || '';

          // Try title first, then spotify_track_id
          let streamInfo = streamingDataParam[normalizedTitle];
          if (!streamInfo && spotifyTrackId) {
            streamInfo = streamingDataParam[spotifyTrackId];
          }

          if (streamInfo) {
            potentialRevenue = streamInfo.expected_publishing_revenue || 0;
          }
        }

        missingSongs.push({
          title: song.title,
          artist: artist,
          isrc: isrc,
          master_royalty: song.master_royalty || 0,
          publishing_royalty: song.publishing_royalty || 0,
          id: song.id,
          potentialRevenue: potentialRevenue,
          cover_art: song.album_art || song.cover_art || song.artwork || song.image_url || null,
          artists: song.artists || [],
        });
      }
    });

    const totalRevenue = earningSongs.reduce((sum, song) => sum + song.revenue, 0);
    const avgRevenuePerSong = earningSongs.length > 0 ? totalRevenue / earningSongs.length : 0;

    // Get unique territories and sources across all earning songs
    const allTerritories = new Set();
    const allSources = new Set();
    earningSongs.forEach((song) => {
      song.territories.forEach((t) => allTerritories.add(t));
      song.sources.forEach((s) => allSources.add(s));
    });

    // Find top earner
    const topEarner =
      earningSongs.length > 0
        ? earningSongs.reduce((max, song) => (song.revenue > max.revenue ? song : max), earningSongs[0])
        : null;

    // Calculate total potentially lost revenue from missing songs
    const totalPotentiallyLostRevenue = missingSongs.reduce((sum, song) => sum + (song.potentialRevenue || 0), 0);

    // Calculate total expected streaming revenue based on publishing equity
    let totalStreamingDiscrepancy = 0;
    let totalExpectedRevenue = 0;
    let totalActualRevenue = 0;
    let songsWithDiscrepancy = 0;

    if (streamingDataParam && Object.keys(streamingDataParam).length > 0) {
      // Check both earning songs AND missing songs for streaming data
      const allCatalogSongs = [...earningSongs, ...missingSongs];

      allCatalogSongs.forEach((song) => {
        const normalizedTitle = (song.title || '').toLowerCase().trim();
        const streamInfo = streamingDataParam[normalizedTitle];
        if (streamInfo) {
          const expectedRevenue = streamInfo.expected_publishing_revenue || 0;
          totalExpectedRevenue += expectedRevenue;
          songsWithDiscrepancy++;
        }
      });

      totalStreamingDiscrepancy = totalExpectedRevenue - totalRevenue;
    }

    // Calculate comprehensive health score using weighted component scoring
    // Revenue capture is the dominant factor - it's what actually matters

    // ===== COMPONENT 1: Revenue Capture (50% weight) =====
    // Uses logarithmic scaling - a 10x gap is bad but not 10x worse than 2x gap
    let revenueScore = 100;
    if (totalExpectedRevenue > 0) {
      const captureRate = Math.min(1, totalRevenue / totalExpectedRevenue);
      if (captureRate <= 0) {
        revenueScore = 0;
      } else if (captureRate >= 1) {
        revenueScore = 100;
      } else {
        // Logarithmic scale: 100% = 100, 10% = 50, 1% = 0
        revenueScore = Math.max(0, Math.min(100, 50 + 50 * (Math.log10(captureRate * 100) / 2)));
      }
    }

    // ===== COMPONENT 2: Catalog Coverage (25% weight) =====
    const coverageScore = catalogSongs > 0 ? (earningSongs.length / catalogSongs) * 100 : 100;

    // ===== COMPONENT 3: Data Quality (15% weight) =====
    let missingFieldsCount = 0;
    let totalFieldsChecked = 0;
    catalog.forEach((song) => {
      if (!song.isrc || song.isrc === 'N/A') missingFieldsCount++;
      if (!song.publishing_royalty && song.publishing_royalty !== 0) missingFieldsCount++;
      totalFieldsChecked += 2;
    });
    const dataScore =
      totalFieldsChecked > 0 ? ((totalFieldsChecked - missingFieldsCount) / totalFieldsChecked) * 100 : 100;

    // ===== COMPONENT 4: Diversity (10% weight) =====
    const uniqueTerritoriesCount = allTerritories.size;
    const uniqueSourcesCount = allSources.size;
    const territoryScore = Math.min(100, (uniqueTerritoriesCount / 5) * 100);
    const sourceScore = Math.min(100, (uniqueSourcesCount / 3) * 100);
    const diversityScore = (territoryScore + sourceScore) / 2;

    // ===== WEIGHTED FINAL SCORE =====
    let healthScore =
      revenueScore * 0.5 + // 50% weight - most important
      coverageScore * 0.25 + // 25% weight
      dataScore * 0.15 + // 15% weight
      diversityScore * 0.1; // 10% weight

    // CRITICAL FLOOR: If revenue capture < 20%, cap health at 25%
    if (totalExpectedRevenue > 0 && totalRevenue / totalExpectedRevenue < 0.2) {
      healthScore = Math.min(healthScore, 25);
    }

    // If no expected revenue data, use coverage-weighted fallback
    if (totalExpectedRevenue === 0) {
      healthScore = coverageScore * 0.5 + dataScore * 0.3 + diversityScore * 0.2;
    }

    // Ensure score stays within 0-100
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Calculate discrepancy percentage for display
    const discrepancyPercentage =
      totalRevenue > 0 && totalExpectedRevenue > 0
        ? Math.max(0, ((totalExpectedRevenue - totalRevenue) / totalExpectedRevenue) * 100)
        : totalExpectedRevenue > 0
          ? 100
          : 0;

    // Simple coverage percentage (for reference)
    const catalogCoverage = catalogSongs > 0 ? Math.round((earningSongs.length / catalogSongs) * 100) : 0;

    // ===== ANOMALY DETECTION =====
    const anomalies = [];

    // Group transactions by quarter for trend analysis
    const quarterlyRevenue = {};
    transactions.forEach((t) => {
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
            id: 'revenue_drop_critical',
            type: 'revenue_drop',
            severity: 'critical',
            message: `Revenue dropped ${Math.abs(changePercent).toFixed(0)}% from ${prevQ} to ${currQ}`,
          });
        } else if (changePercent < -30) {
          anomalies.push({
            id: 'revenue_drop_warning',
            type: 'revenue_drop',
            severity: 'warning',
            message: `Revenue decreased ${Math.abs(changePercent).toFixed(0)}% vs previous quarter`,
          });
        }
      }
    }

    // Detect missing quarters (gaps in payment)
    if (quarters.length >= 3) {
      const expectedQuarters = [];
      const startQ = quarters[0][0];
      const endQ = quarters[quarters.length - 1][0];
      const [startYear, startQNum] = startQ.split('-Q').map((v, i) => (i === 0 ? parseInt(v) : parseInt(v)));
      const [endYear, endQNum] = endQ.split('-Q').map((v, i) => (i === 0 ? parseInt(v) : parseInt(v)));

      for (let y = startYear; y <= endYear; y++) {
        const qStart = y === startYear ? startQNum : 1;
        const qEnd = y === endYear ? endQNum : 4;
        for (let q = qStart; q <= qEnd; q++) {
          expectedQuarters.push(`${y}-Q${q}`);
        }
      }

      const missingQuarters = expectedQuarters.filter((q) => !quarterlyRevenue[q]);
      if (missingQuarters.length > 0) {
        anomalies.push({
          id: 'missing_quarters',
          type: 'missing_quarters',
          severity: 'warning',
          message: `Missing data for ${missingQuarters.length} quarter(s): ${missingQuarters.slice(0, 2).join(', ')}${missingQuarters.length > 2 ? '...' : ''}`,
        });
      }
    }

    // Detect songs with $0 revenue in statements
    const zeroRevenueSongs = earningSongs.filter((s) => s.revenue === 0);
    if (zeroRevenueSongs.length > 0) {
      anomalies.push({
        id: 'zero_revenue_songs',
        type: 'zero_revenue',
        severity: 'warning',
        message: `${zeroRevenueSongs.length} song(s) with $0 revenue in statements`,
      });
    }

    // Low revenue capture warning
    if (totalExpectedRevenue > 0 && totalRevenue / totalExpectedRevenue < 0.2) {
      anomalies.push({
        id: 'low_capture_rate',
        type: 'low_capture',
        severity: 'critical',
        message: `Only ${((totalRevenue / totalExpectedRevenue) * 100).toFixed(1)}% of expected revenue captured`,
      });
    }

    // ===== PER-SONG HEALTH CALCULATION =====
    // Add expected revenue and health status to earning songs
    const songsWithHealth = earningSongs.map((song) => {
      const normalizedTitle = (song.title || '').toLowerCase().trim();
      const streamInfo = streamingDataParam ? streamingDataParam[normalizedTitle] : null;
      const expectedRevenue = streamInfo?.expected_publishing_revenue || 0;

      let songHealth = 'good';
      let songHealthColor = '#10B981';
      const issues = [];

      if (expectedRevenue > 0) {
        const captureRate = song.revenue / expectedRevenue;
        if (captureRate < 0.3) {
          songHealth = 'critical';
          songHealthColor = '#DC2626';
          issues.push(`Only ${(captureRate * 100).toFixed(0)}% of expected revenue`);
        } else if (captureRate < 0.7) {
          songHealth = 'warning';
          songHealthColor = '#F59E0B';
          issues.push(`${(captureRate * 100).toFixed(0)}% of expected revenue`);
        }
      }

      if (!song.isrc || song.isrc === 'N/A') {
        issues.push('Missing ISRC');
        if (songHealth === 'good') {
          songHealth = 'warning';
          songHealthColor = '#F59E0B';
        }
      }

      if (song.territories.length < 2) {
        issues.push('Limited territories');
      }

      return {
        ...song,
        expectedRevenue,
        songHealth,
        songHealthColor,
        issues,
      };
    });

    // Add health to missing songs too
    const missingSongsWithHealth = missingSongs.map((song) => ({
      ...song,
      expectedRevenue: song.potentialRevenue || 0,
      songHealth: 'critical',
      songHealthColor: '#DC2626',
      issues: ['Not in statements'],
    }));

    return {
      catalogSongs,
      earningSongs: songsWithHealth,
      missingSongs: missingSongsWithHealth,
      healthPercentage: Math.round(healthScore),
      catalogCoverage,
      totalRevenue,
      uniqueTerritories: allTerritories.size,
      uniqueSources: allSources.size,
      avgRevenuePerSong,
      topEarner,
      isEmpty: false,
      totalPotentiallyLostRevenue,
      totalStreamingDiscrepancy,
      discrepancyPercentage,
      totalExpectedRevenue,
      totalActualRevenue,
      songsWithDiscrepancy,
      anomalies,
      quarterlyRevenue,
    };
  };

  // Calculate health trend from quarterly data - must be before early returns
  const quarterlyRevenue = catalogHealth?.quarterlyRevenue || {};
  const healthTrend = useMemo(() => {
    const quarters = Object.entries(quarterlyRevenue).sort((a, b) => a[0].localeCompare(b[0]));
    if (quarters.length < 2) return { direction: 'stable', change: 0 };

    const recentQuarters = quarters.slice(-4);
    if (recentQuarters.length < 2) return { direction: 'stable', change: 0 };

    const oldAvg = recentQuarters.slice(0, Math.floor(recentQuarters.length / 2)).reduce((s, [, v]) => s + v, 0);
    const newAvg = recentQuarters.slice(Math.floor(recentQuarters.length / 2)).reduce((s, [, v]) => s + v, 0);

    if (oldAvg === 0) return { direction: 'stable', change: 0 };
    const change = ((newAvg - oldAvg) / oldAvg) * 100;

    if (change > 10) return { direction: 'up', change: Math.round(change) };
    if (change < -10) return { direction: 'down', change: Math.round(Math.abs(change)) };
    return { direction: 'stable', change: Math.round(Math.abs(change)) };
  }, [quarterlyRevenue]);

  if (loading) {
    return (
      <div className="catalog-health-container">
        <div className="loading-state">
          <Spinner size="lg" color="primary" />
          <p>Analyzing catalog health...</p>
        </div>
      </div>
    );
  }

  if (!catalogHealth || catalogHealth.isEmpty) {
    return (
      <div className="catalog-health-container">
        <div className="empty-state">
          <AlertTriangle size={64} color="#F59E0B" />
          <h2>No Catalog Data</h2>
          <p>Add songs to your catalog to see health metrics.</p>
          <p className="hint">Go to the Catalog page to add your songs.</p>
        </div>
      </div>
    );
  }

  const {
    catalogSongs,
    earningSongs,
    missingSongs,
    healthPercentage: calculatedHealthPercentage,
    catalogCoverage,
    totalRevenue,
    uniqueTerritories,
    uniqueSources,
    avgRevenuePerSong,
    topEarner,
    totalPotentiallyLostRevenue,
    totalStreamingDiscrepancy,
    discrepancyPercentage,
    totalExpectedRevenue,
    totalActualRevenue,
    songsWithDiscrepancy,
    anomalies = [],
  } = catalogHealth;

  // Use override if provided (from Revenue page), otherwise use calculated value
  const healthPercentage = healthPercentageOverride !== null ? healthPercentageOverride : calculatedHealthPercentage;

  // Use revenue overrides if provided (keeps in sync with Revenue page)
  const displayTotalRevenue = revenueDataOverride?.totalRevenue ?? totalRevenue;
  const displayExpectedRevenue = revenueDataOverride?.totalExpectedRevenue ?? totalExpectedRevenue;

  // Filter out dismissed anomalies
  const activeAnomalies = anomalies.filter((a) => !dismissedAnomalies.includes(a.id));

  const getHealthStatus = () => {
    if (healthPercentage >= 85) return { label: 'Excellent', color: '#10B981', bgColor: '#10B98115' };
    if (healthPercentage >= 70) return { label: 'Good', color: '#3B82F6', bgColor: '#3B82F615' };
    if (healthPercentage >= 50) return { label: 'Fair', color: '#F59E0B', bgColor: '#F59E0B15' };
    if (healthPercentage >= 30) return { label: 'Poor', color: '#EF4444', bgColor: '#EF444415' };
    return { label: 'Critical', color: '#DC2626', bgColor: '#DC262615' };
  };

  const healthStatus = getHealthStatus();

  // Export report as CSV
  const exportReport = () => {
    const allSongs = [...earningSongs, ...missingSongs];
    const headers = ['Song Title', 'Artist', 'ISRC', 'Revenue', 'Expected', 'Health', 'Issues', 'In Statements'];
    const rows = allSongs.map((song) => [
      song.title,
      song.artist || 'Unknown',
      song.isrc || 'N/A',
      `$${(song.revenue || 0).toFixed(2)}`,
      `$${(song.expectedRevenue || 0).toFixed(2)}`,
      song.songHealth,
      (song.issues || []).join('; '),
      earningSongs.some((e) => e.title === song.title) ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalog-health-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as printable HTML
  const exportPrintable = () => {
    const printWindow = window.open('', '_blank');
    const allSongs = [...earningSongs, ...missingSongs];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Catalog Health Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { margin-bottom: 8px; }
          .subtitle { color: #666; margin-bottom: 24px; }
          .score { font-size: 48px; font-weight: bold; color: ${healthStatus.color}; }
          .stats { display: flex; gap: 24px; margin: 24px 0; }
          .stat { background: #f5f5f5; padding: 16px; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
          th { background: #f5f5f5; font-weight: 600; }
          .health-good { color: #10B981; }
          .health-warning { color: #F59E0B; }
          .health-critical { color: #DC2626; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Catalog Health Report</h1>
        <p class="subtitle">Generated ${new Date().toLocaleDateString()}</p>
        
        <div class="score">${healthPercentage}% - ${healthStatus.label}</div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${catalogSongs}</div>
            <div class="stat-label">Total Songs</div>
          </div>
          <div class="stat">
            <div class="stat-value">${earningSongs.length}</div>
            <div class="stat-label">Earning Revenue</div>
          </div>
          <div class="stat">
            <div class="stat-value">${missingSongs.length}</div>
            <div class="stat-label">Missing</div>
          </div>
          <div class="stat">
            <div class="stat-value">$${totalRevenue.toLocaleString()}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
        </div>

        <h2>Song Details</h2>
        <table>
          <thead>
            <tr>
              <th>Song</th>
              <th>Artist</th>
              <th>Revenue</th>
              <th>Expected</th>
              <th>Health</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            ${allSongs
              .map(
                (song) => `
              <tr>
                <td>${song.title}</td>
                <td>${song.artist || 'Unknown'}</td>
                <td>$${(song.revenue || 0).toFixed(2)}</td>
                <td>$${(song.expectedRevenue || 0).toFixed(2)}</td>
                <td class="health-${song.songHealth}">${song.songHealth}</td>
                <td>${(song.issues || []).join(', ') || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="catalog-health-container">
      {/* Header with Export */}
      <div className="health-header">
        <div>
          <h1>Catalog Health Overview</h1>
          <p className="subtitle">
            Comprehensive analysis of {catalogSongs} song{catalogSongs !== 1 ? 's' : ''} in your catalog
          </p>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={exportReport} title="Download CSV">
            <Download size={16} />
            CSV
          </button>
          <button className="export-btn" onClick={exportPrintable} title="Print Report">
            <Download size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {activeAnomalies.length > 0 && (
        <div className="anomaly-alerts">
          {activeAnomalies.map((anomaly) => (
            <div key={anomaly.id} className={`anomaly-alert anomaly-${anomaly.severity}`}>
              <div className="anomaly-content">
                {anomaly.severity === 'critical' ? (
                  <AlertTriangle size={18} />
                ) : anomaly.severity === 'warning' ? (
                  <AlertTriangle size={18} />
                ) : (
                  <Info size={18} />
                )}
                <span>{anomaly.message}</span>
              </div>
              <button
                className="anomaly-dismiss"
                onClick={() => setDismissedAnomalies((prev) => [...prev, anomaly.id])}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Health Score Card */}
      <Card className="health-score-card-hero">
        <CardHeader className="flex gap-4 items-center pb-0">
          <div
            className="score-circle-hero"
            style={{
              border: `4px solid ${healthStatus.color}`,
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="text-3xl font-bold" style={{ color: healthStatus.color }}>
              {healthPercentage}%
            </span>
            <span className="text-xs font-medium" style={{ color: healthStatus.color }}>
              {healthStatus.label}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold" style={{ color: healthStatus.color }}>
                Overall Catalog Health
              </p>
              {healthTrend.direction !== 'stable' && (
                <span
                  className="health-trend-indicator"
                  style={{
                    color: healthTrend.direction === 'up' ? '#10B981' : '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                  }}
                >
                  {healthTrend.direction === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {healthTrend.change}%
                </span>
              )}
            </div>
            <p className="text-default-500">
              <strong>
                {earningSongs.length} of {catalogSongs} songs
              </strong>{' '}
              generating revenue
            </p>
            {missingSongs.length > 0 && (
              <p style={{ color: '#EF4444', fontWeight: 600 }}>
                {missingSongs.length} song{missingSongs.length !== 1 ? 's' : ''} missing
              </p>
            )}
          </div>
        </CardHeader>
        <Divider className="my-3" />
        <CardBody className="pt-0">
          <div className="flex flex-col gap-2">
            {missingSongs.length > 0 && (
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle size={16} />
                <span className="text-sm">
                  {missingSongs.length} song{missingSongs.length !== 1 ? 's' : ''} not found in statements
                </span>
              </div>
            )}
            {topEarner && (
              <div className="flex items-center gap-2 text-success">
                <TrendingUp size={16} />
                <span className="text-sm">
                  Top earner: <strong>{topEarner.title}</strong> (${topEarner.revenue.toFixed(2)})
                </span>
              </div>
            )}
            {(() => {
              const displayDiscrepancy = displayExpectedRevenue - displayTotalRevenue;
              const displayDiscrepancyPercentage =
                displayExpectedRevenue > 0
                  ? Math.max(0, ((displayExpectedRevenue - displayTotalRevenue) / displayExpectedRevenue) * 100)
                  : 0;
              return (
                displayDiscrepancy > 0 && (
                  <div className="flex items-center gap-2" style={{ color: '#DC2626' }}>
                    <AlertTriangle size={16} />
                    <span className="text-sm">
                      Revenue discrepancy: <strong>${displayDiscrepancy.toFixed(2)}</strong> (
                      {displayDiscrepancyPercentage.toFixed(1)}% deviation)
                    </span>
                  </div>
                )
              );
            })()}
          </div>
        </CardBody>
      </Card>

      {/* Stats Grid - 3 Cards */}
      <div className="stats-grid-three">
        {/* Missing from Statements */}
        <Card className="stat-card-hero">
          <CardHeader className="flex gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <XCircle size={24} color="#EF4444" />
            </div>
            <div className="flex flex-col">
              <p className="text-md font-semibold">Missing from Statements</p>
              <p className="text-small text-default-500">Songs not found in statements</p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <p className="text-4xl font-bold" style={{ color: '#EF4444' }}>
              {missingSongs.length}
            </p>
            {totalPotentiallyLostRevenue > 0 && (
              <p className="text-small text-default-500 mt-1">
                $
                {totalPotentiallyLostRevenue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                potential lost revenue
              </p>
            )}
          </CardBody>
        </Card>

        {/* Unreported Royalties */}
        <Card className="stat-card-hero">
          <CardHeader className="flex gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <AlertTriangle size={24} color="#F59E0B" />
            </div>
            <div className="flex flex-col">
              <p className="text-md font-semibold">Unreported Royalties</p>
              <p className="text-small text-default-500">MLC registered, not in statements</p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <p className="text-4xl font-bold" style={{ color: '#F59E0B' }}>
              {
                missingSongs.filter((song) => {
                  const normalizedTitle = (song.title || '')
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
                  const mlcInfo = mlcData[normalizedTitle];
                  return mlcInfo && mlcInfo.mlc_registered;
                }).length
              }
            </p>
          </CardBody>
        </Card>

        {/* Revenue Discrepancy */}
        {(() => {
          // Calculate actual discrepancy: difference between estimated and reported revenue
          const revenueDiscrepancy = displayExpectedRevenue - displayTotalRevenue;
          const hasDiscrepancy = revenueDiscrepancy > 0;

          return (
            <Card className="stat-card-hero">
              <CardHeader className="flex gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    background: hasDiscrepancy ? 'rgba(220, 38, 38, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                  }}
                >
                  <DollarSign size={24} color={hasDiscrepancy ? '#DC2626' : 'var(--soft-text)'} />
                </div>
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Revenue Discrepancy</p>
                  <p className="text-small text-default-500">
                    {hasDiscrepancy ? `Estimated vs. reported difference` : 'No discrepancy detected'}
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <p className="text-4xl font-bold" style={{ color: hasDiscrepancy ? '#DC2626' : 'var(--soft-text)' }}>
                  $
                  {Math.abs(revenueDiscrepancy).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {hasDiscrepancy && (
                  <p className="text-small text-default-500 mt-1">
                    Estimated: $
                    {displayExpectedRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    | Reported: $
                    {displayTotalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </CardBody>
            </Card>
          );
        })()}
      </div>

      {/* Earning Songs Table */}
      {earningSongs.length > 0 && (
        <div className="songs-section">
          <h3>
            <CheckCircle size={20} color="#10B981" />
            Songs Generating Revenue ({earningSongs.length})
          </h3>
          <div className="table-container">
            <table className="songs-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Song Title</th>
                  <th>Artist</th>
                  <th>Revenue</th>
                  <th>Health</th>
                  <th>Territories</th>
                  <th>Sources</th>
                  <th>Pub %</th>
                </tr>
              </thead>
              <tbody>
                {earningSongs
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((song, idx) => {
                    // Format artist name - handle both string and array formats
                    const artistDisplay = (() => {
                      if (song.artists && Array.isArray(song.artists) && song.artists.length > 0) {
                        // Handle array of artist objects or strings
                        return song.artists
                          .map((a) => (typeof a === 'object' ? a.name || a.artist_name || '' : a))
                          .filter(Boolean)
                          .join(', ');
                      }
                      if (typeof song.artist === 'string' && song.artist) {
                        return song.artist;
                      }
                      if (Array.isArray(song.artist) && song.artist.length > 0) {
                        return song.artist
                          .map((a) => (typeof a === 'object' ? a.name || a.artist_name || '' : a))
                          .filter(Boolean)
                          .join(', ');
                      }
                      return 'Unknown';
                    })();

                    return (
                      <tr key={idx} className={song.matchType === 'fuzzy' ? 'fuzzy-match' : ''}>
                        <td style={{ padding: '8px', width: '50px' }}>
                          {song.cover_art ? (
                            <img
                              src={song.cover_art}
                              alt={song.title}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '6px',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '6px',
                                background: '#6366F1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Music size={20} color="#fff" />
                            </div>
                          )}
                        </td>
                        <td className="song-title">
                          {song.title}
                          {song.matchType === 'fuzzy' && <span className="match-badge">Fuzzy</span>}
                        </td>
                        <td>{artistDisplay}</td>
                        <td className="revenue">${song.revenue.toFixed(2)}</td>
                        <td>
                          <span
                            className="song-health-badge"
                            style={{
                              backgroundColor: `${song.songHealthColor}20`,
                              color: song.songHealthColor,
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                            title={song.issues?.join(', ') || ''}
                          >
                            {song.songHealth}
                          </span>
                        </td>
                        <td className="territory-count">{song.territories.length}</td>
                        <td className="source-count">{song.sources.length}</td>
                        <td style={{ fontSize: '15px', fontWeight: 600 }}>
                          {(song.publishing_royalty * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Leak Detection - Audit Table */}
      {catalogSongs > 0 && (
        <div className="songs-section">
          <h3>
            <AlertTriangle size={20} color="#DC2626" />
            Revenue Leak Detection ({catalogSongs} songs)
          </h3>

          {/* ISRC Linkage Issues Banner */}
          {(() => {
            const isrcMissingCount = [...earningSongs, ...missingSongs].filter(
              (s) => getAuditData(s).isrcMissing
            ).length;
            if (isrcMissingCount === 0) return null;
            return (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#D97706',
                  fontSize: '13px',
                }}
              >
                <AlertTriangle size={18} color="#F59E0B" />
                <span>
                  <strong>
                    {isrcMissingCount} song{isrcMissingCount !== 1 ? 's' : ''} with ISRC not linked in MLC
                  </strong>{' '}
                  — These songs are registered but the ISRC is not connected to the MLC registration. Streaming
                  royalties may not be routed correctly. Contact MLC or your publisher to link the ISRC.
                </span>
              </div>
            );
          })()}

          {/* Filter Bar */}
          <div
            className="audit-filter-bar"
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                key: 'all',
                label: 'All',
                icon: <Filter size={14} />,
                count: [...earningSongs, ...missingSongs].length,
                colors: {
                  bg: 'var(--hover-bg)',
                  activeBg: 'var(--text)',
                  text: 'var(--soft-text)',
                  activeText: 'var(--surface)',
                },
              },
              {
                key: 'leaks',
                label: 'Leaks',
                icon: <XCircle size={14} />,
                count: [...earningSongs, ...missingSongs].filter((s) => getAuditData(s).hasLeak).length,
                colors: { bg: 'rgba(220, 38, 38, 0.12)', activeBg: '#DC2626', text: '#DC2626', activeText: '#fff' },
              },
              {
                key: 'partial',
                label: 'Partial',
                icon: <AlertTriangle size={14} />,
                count: [...earningSongs, ...missingSongs].filter(
                  (s) => getAuditData(s).hasPartialMatch && !getAuditData(s).hasLeak
                ).length,
                colors: { bg: 'rgba(245, 158, 11, 0.12)', activeBg: '#F59E0B', text: '#D97706', activeText: '#fff' },
              },
              {
                key: 'matched',
                label: 'Matched',
                icon: <CheckCircle size={14} />,
                count: [...earningSongs, ...missingSongs].filter((s) => getAuditData(s).isFullyMatched).length,
                colors: { bg: 'rgba(16, 185, 129, 0.12)', activeBg: '#10B981', text: '#10B981', activeText: '#fff' },
              },
            ].map((filter) => {
              const isActive = auditFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setAuditFilter(filter.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: isActive ? 'none' : `1px solid ${filter.colors.text}`,
                    background: isActive ? filter.colors.activeBg : filter.colors.bg,
                    color: isActive ? filter.colors.activeText : filter.colors.text,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {filter.icon}
                  {filter.label} ({filter.count})
                </button>
              );
            })}
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="songs-table audit-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ verticalAlign: 'bottom', minWidth: '180px' }}>
                    Song
                  </th>
                  <th rowSpan={2} style={{ verticalAlign: 'bottom', minWidth: '100px' }}>
                    ISRC
                  </th>
                  <th
                    colSpan={2}
                    style={{
                      textAlign: 'center',
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderBottom: '2px solid #6366F1',
                    }}
                  >
                    REGISTRATION
                  </th>
                  <th rowSpan={2} style={{ verticalAlign: 'bottom', minWidth: '100px' }}>
                    Status
                  </th>
                  <th rowSpan={2} style={{ verticalAlign: 'bottom', minWidth: '120px' }}>
                    Expected Loss
                  </th>
                </tr>
                <tr>
                  <th style={{ background: 'rgba(99, 102, 241, 0.1)', fontSize: '12px' }}>Writer</th>
                  <th style={{ background: 'rgba(99, 102, 241, 0.1)', fontSize: '12px' }}>Publisher</th>
                </tr>
              </thead>
              <tbody>
                {[...earningSongs, ...missingSongs]
                  .filter((song) => {
                    const audit = getAuditData(song);
                    if (auditFilter === 'leaks') return audit.hasLeak;
                    if (auditFilter === 'partial') return audit.hasPartialMatch && !audit.hasLeak;
                    if (auditFilter === 'matched') return audit.isFullyMatched;
                    return true;
                  })
                  .map((song, idx) => {
                    const audit = getAuditData(song);
                    const isInStatements = earningSongs.some((e) => e.title === song.title);

                    // Render match cell with tooltip
                    const renderMatchCell = (matchData, type, role) => {
                      const isLoading = type === 'performance' && proLoading;
                      const display = getMatchDisplay(matchData.status, isLoading);

                      const tooltipContent = (
                        <div style={{ padding: '8px', minWidth: '200px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                            {type === 'mechanical' ? 'MLC' : 'PRO'} {role} Registration
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '4px',
                              fontSize: '12px',
                            }}
                          >
                            <span className="text-default-500">Your Name:</span>
                            <span>{userInfo.writerName || '—'}</span>
                            <span className="text-default-500">Name Match:</span>
                            <span style={{ color: matchData.nameMatch ? '#10B981' : '#EF4444' }}>
                              {matchData.nameMatch ? '✓ Yes' : '✗ No'}
                            </span>
                            <span className="text-default-500">Your IPI:</span>
                            <span>{role === 'Writer' ? userInfo.writerIpi || '—' : userInfo.publisherIpi || '—'}</span>
                            <span className="text-default-500">IPI Match:</span>
                            <span style={{ color: matchData.ipiMatch ? '#10B981' : '#EF4444' }}>
                              {matchData.ipiMatch ? '✓ Yes' : '✗ No'}
                            </span>
                          </div>
                          {matchData.status === 'no_match' || matchData.status === 'not_found' ? (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px',
                                background: 'rgba(220, 38, 38, 0.1)',
                                borderRadius: '4px',
                                color: '#DC2626',
                                fontSize: '11px',
                              }}
                            >
                              ⚠️ REVENUE LEAK - Someone else may be collecting your royalties
                            </div>
                          ) : null}
                        </div>
                      );

                      return (
                        <td style={{ padding: '8px' }}>
                          <Tooltip content={tooltipContent} placement="top">
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                background: display.bgColor,
                                color: display.color,
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              {display.icon}
                              {display.label}
                            </div>
                          </Tooltip>
                        </td>
                      );
                    };

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderLeft: audit.hasLeak
                            ? '3px solid #EF4444'
                            : audit.hasPartialMatch
                              ? '3px solid #F59E0B'
                              : audit.isFullyMatched
                                ? '3px solid #10B981'
                                : '3px solid transparent',
                          background: audit.hasLeak ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                        }}
                      >
                        <td className="song-title">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {song.cover_art ? (
                              <img
                                src={song.cover_art}
                                alt={song.title}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '4px',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '4px',
                                  background: '#6366F1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Music size={16} color="#fff" />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 500 }}>{song.title}</div>
                              <div style={{ fontSize: '12px' }} className="text-default-500">
                                {song.artist || 'Unknown'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="isrc-code" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{song.isrc || 'N/A'}</span>
                            {audit.isrcMissing && (
                              <Tooltip
                                content={
                                  <div style={{ padding: '8px', maxWidth: '280px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>ISRC Not Linked in MLC</div>
                                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                                      This song is registered in MLC but the ISRC is not linked to the registration.
                                      Streaming royalties may not be routed correctly.
                                    </div>
                                  </div>
                                }
                                placement="top"
                              >
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#D97706',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                  }}
                                >
                                  <AlertTriangle size={10} />
                                  ISRC not linked
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        {renderMatchCell(audit.mechanical.writer, 'mechanical', 'Writer')}
                        {renderMatchCell(audit.mechanical.publisher, 'mechanical', 'Publisher')}
                        <td>
                          {isInStatements ? (
                            <span
                              className="status-badge"
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              Earning
                            </span>
                          ) : (
                            <span className="status-badge missing">Missing</span>
                          )}
                        </td>
                        <td>
                          {(() => {
                            // Calculate expected loss based on audit issues
                            const expectedRevenue = song.expectedRevenue || song.potentialRevenue || 0;
                            const hasLeakIssue = audit.hasLeak;
                            const hasPartialIssue = audit.hasPartialMatch;

                            // If not in statements, all expected revenue is lost
                            if (!isInStatements && expectedRevenue > 0) {
                              return (
                                <span
                                  style={{
                                    color: '#DC2626',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                  }}
                                >
                                  $
                                  {expectedRevenue.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              );
                            }

                            // If has leak issue, estimate partial loss
                            if (hasLeakIssue && expectedRevenue > 0) {
                              // Count missing mechanical registrations (writer + publisher)
                              let leakCount = 0;
                              if (
                                audit.mechanical.writer.status === 'no_match' ||
                                audit.mechanical.writer.status === 'not_found'
                              )
                                leakCount++;
                              if (
                                audit.mechanical.publisher.status === 'no_match' ||
                                audit.mechanical.publisher.status === 'not_found'
                              )
                                leakCount++;

                              const estimatedLoss = expectedRevenue * (leakCount / 2);
                              return (
                                <span
                                  style={{
                                    color: '#DC2626',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                  }}
                                >
                                  ~$
                                  {estimatedLoss.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              );
                            }

                            // If partial match, smaller estimated loss
                            if (hasPartialIssue && expectedRevenue > 0) {
                              const estimatedLoss = expectedRevenue * 0.1; // 10% risk
                              return (
                                <span
                                  style={{
                                    color: '#F59E0B',
                                    fontWeight: 500,
                                    fontSize: '13px',
                                  }}
                                >
                                  ~$
                                  {estimatedLoss.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              );
                            }

                            // Fully matched, no expected loss
                            return <span style={{ color: '#10B981', fontSize: '13px' }}>—</span>;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {missingSongs.length > 0 && (
        <div className="recommendations">
          <h3>Recommended Actions for Missing Songs</h3>
          <ul>
            <li>
              <strong>Verify Distribution:</strong> Confirm these songs are distributed to streaming platforms (Spotify,
              Apple Music, etc.)
            </li>
            <li>
              <strong>Check PRO Registration:</strong> Ensure songs are registered with your PRO (ASCAP, BMI, SESAC) for
              performance royalties
            </li>
            <li>
              <strong>MLC Registration:</strong> Verify songs are registered with the MLC for mechanical royalties from
              streaming
            </li>
            <li>
              <strong>Upload Missing Statements:</strong> You may have statements from platforms where these songs earn
              that haven't been uploaded yet
            </li>
            <li>
              <strong>Review ISRC Codes:</strong> Confirm each song has a unique ISRC for proper tracking across
              platforms
            </li>
            <li>
              <strong>Contact Distributor:</strong> If songs should be earning but aren't appearing, contact your
              distributor for reporting status
            </li>
          </ul>
        </div>
      )}

      {/* Insights Section */}
      {earningSongs.length > 0 && (
        <div className="insights-section">
          <h3>Catalog Insights</h3>
          <div className="insights-grid">
            <Card className="insight-card-hero">
              <CardHeader className="flex gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                  <CheckCircle size={24} color="#6366F1" />
                </div>
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Coverage Rate</p>
                  <p className="text-small text-default-500">Statement matching</p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <p className="text-3xl font-bold" style={{ color: '#6366F1' }}>
                  {healthPercentage}%
                </p>
                <p className="text-small text-default-500 mt-2">
                  {healthPercentage >= 80
                    ? 'Excellent! Most of your catalog is earning.'
                    : healthPercentage >= 60
                      ? 'Good coverage, but room for improvement.'
                      : 'Many songs not appearing in statements.'}
                </p>
              </CardBody>
            </Card>

            <Card className="insight-card-hero">
              <CardHeader className="flex gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <Globe size={24} color="#10B981" />
                </div>
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Geographic Reach</p>
                  <p className="text-small text-default-500">Territory coverage</p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
                  {uniqueTerritories} <span className="text-lg font-normal">countries</span>
                </p>
                <p className="text-small text-default-500 mt-2">
                  Your music is earning royalties in {uniqueTerritories} different territories worldwide.
                </p>
              </CardBody>
            </Card>

            <Card className="insight-card-hero">
              <CardHeader className="flex gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <Music size={24} color="#8B5CF6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Platform Diversity</p>
                  <p className="text-small text-default-500">Revenue sources</p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <p className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>
                  {uniqueSources} <span className="text-lg font-normal">sources</span>
                </p>
                <p className="text-small text-default-500 mt-2">
                  Revenue coming from {uniqueSources} different platforms and sources.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
