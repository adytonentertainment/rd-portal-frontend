import { useEffect, useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoIosArrowUp } from 'react-icons/io';
import { toast } from 'react-toastify';
import 'react-toastify/ReactToastify.css';
import { triggerSubscriptionUpdate } from '../../utils/subscriptionUtils';
import { CircularProgress, Skeleton } from '@mui/material';
import { Progress } from '@heroui/react';
import urlJoin from 'url-join';
import Dropdown from '../../components/Dropdown/Dropdown';
import Expander from '../../components/Expander/Expander';
import axios from 'axios';
import { BsThreeDots } from 'react-icons/bs';
import { FaSpotify } from 'react-icons/fa';
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowRight,
  MdOutlineAccessTime,
} from 'react-icons/md';
import Tooltip from '@mui/material/Tooltip';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { FaUpload, FaFolderOpen } from 'react-icons/fa';
import BulkUpload from '../../components/BulkUpload';
import { MdKeyboardDoubleArrowLeft } from 'react-icons/md';
import { UserContextProvider } from '../../components/UserContext/UserContext';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import { SubscriptionContextProvider } from '../../components/SubscriptionContext/SubscriptionContext';
import UpgradeModal from '../../components/UpgradeModal/UpgradeModal';
import RoundedSection from '../../components/RoundedSection/RoundedSection';
import Sidebar from '../../components/Sidebar/Sidebar';
import styles from './tunescan.module.css';
import { Helmet } from 'react-helmet-async';
import Switch from 'react-switch';

// Element inside of a dropdown
const Match = ({
  index,
  artist,
  trackname,
  duration,
  isrc,
  spotify,
  apple,
  deezer,
  youtube,
  albumArt,
  confidence,
  onAddToCatalog,
  onDelete,
}) => {
  const [coverArt, setCoverArt] = useState(albumArt);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If backend already provided album art, use it
    if (albumArt) {
      setCoverArt(albumArt);
      return;
    }

    // Otherwise, try to fetch it using Spotify ID (from spotify link) or search
    const fetchAlbumArt = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        // If we have a spotify link, extract the track ID and fetch directly for accurate results
        if (spotify && spotify.includes('open.spotify.com/track/')) {
          const spotifyId = spotify.split('track/')[1]?.split('?')[0];
          if (spotifyId) {
            // Fetch track directly by ID for accurate album art
            const trackResponse = await fetch(
              urlJoin(process.env.REACT_APP_BACKEND_URL, `search/spotify/track/${spotifyId}`),
              {
                method: 'GET',
                headers: {
                  accept: 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (trackResponse.ok) {
              const trackData = await trackResponse.json();
              if (trackData?.album_art) {
                setCoverArt(trackData.album_art);
                setLoading(false);
                return;
              }
            }
          }
        }

        // Fallback: search by track name and artist
        const searchQuery = `${trackname} ${artist}`;
        const response = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `search?keyword=${encodeURIComponent(searchQuery)}&type=spotify`),
          {
            method: 'GET',
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const searchResults = await response.json();
          if (searchResults && searchResults.length > 0) {
            // Try to find best match by ISRC first
            let match = null;

            if (isrc) {
              match = searchResults.find((t) => t.isrc === isrc);
            }

            // If no ISRC match, try matching by title and artist
            if (!match) {
              const normalizedTrack = trackname.toLowerCase().trim();
              const normalizedArtist = artist.toLowerCase().trim();

              match = searchResults.find((t) => {
                const resultTrack = t.title?.toLowerCase().trim() || '';
                const resultArtist = t.artist?.toLowerCase().trim() || '';

                return (
                  resultTrack === normalizedTrack ||
                  (resultTrack.includes(normalizedTrack) && resultArtist.includes(normalizedArtist))
                );
              });
            }

            // Fallback to first result
            if (!match) {
              match = searchResults[0];
            }

            if (match?.album_art) {
              setCoverArt(match.album_art);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching album art:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumArt();
  }, [albumArt, isrc, trackname, artist, spotify]);

  return (
    <div className={styles.match} key={index}>
      <div className={styles.matchAlbumArt}>
        {loading ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--input-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={16} sx={{ color: 'var(--muted-text)' }} />
          </div>
        ) : coverArt ? (
          <img src={coverArt} alt={trackname} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--input-bg)',
            }}
          />
        )}
      </div>
      <div className={styles.songInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={styles.songTitle}>{trackname}</div>
          {confidence !== undefined && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
                background: (() => {
                  // Gradient from red (0%) to yellow (50%) to green (100%)
                  const pct = Math.max(0, Math.min(100, confidence)) / 100;
                  if (pct < 0.5) {
                    // Red to Yellow (0% - 50%)
                    const r = 239;
                    const g = Math.round(68 + (179 - 68) * (pct * 2));
                    const b = Math.round(68 + (8 - 68) * (pct * 2));
                    return `rgba(${r}, ${g}, ${b}, 0.15)`;
                  } else {
                    // Yellow to Green (50% - 100%)
                    const r = Math.round(234 + (34 - 234) * ((pct - 0.5) * 2));
                    const g = Math.round(179 + (197 - 179) * ((pct - 0.5) * 2));
                    const b = Math.round(8 + (94 - 8) * ((pct - 0.5) * 2));
                    return `rgba(${r}, ${g}, ${b}, 0.15)`;
                  }
                })(),
                color: (() => {
                  // Gradient from red (0%) to yellow (50%) to green (100%)
                  const pct = Math.max(0, Math.min(100, confidence)) / 100;
                  if (pct < 0.5) {
                    // Red to Yellow (0% - 50%)
                    const r = 239;
                    const g = Math.round(68 + (179 - 68) * (pct * 2));
                    const b = Math.round(68 + (8 - 68) * (pct * 2));
                    return `rgb(${r}, ${g}, ${b})`;
                  } else {
                    // Yellow to Green (50% - 100%)
                    const r = Math.round(234 + (34 - 234) * ((pct - 0.5) * 2));
                    const g = Math.round(179 + (197 - 179) * ((pct - 0.5) * 2));
                    const b = Math.round(8 + (94 - 8) * ((pct - 0.5) * 2));
                    return `rgb(${r}, ${g}, ${b})`;
                  }
                })(),
              }}
            >
              Confidence: {confidence}%
            </span>
          )}
        </div>
        <div className={styles.songArtist}>{artist}</div>
      </div>
      <div className={styles.songLinks}>
        {spotify && (
          <a target="_blank" rel="noopener noreferrer" href={spotify}>
            <FaSpotify className={styles.dspLink} />
          </a>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button className={styles.addToCatalogButton} onClick={onAddToCatalog}>
          Add to Catalog
        </button>
        <button className={styles.deleteButton} onClick={onDelete} title="Delete">
          Delete
        </button>
      </div>
    </div>
  );
};

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

// Helper to calculate rescan progress and remaining time
const getRescanProgress = (lastRescan) => {
  if (!lastRescan) return { progress: 0, remainingText: '14 days' };

  const now = Date.now();
  const elapsed = now - lastRescan;
  const progress = Math.min(100, (elapsed / FOURTEEN_DAYS_MS) * 100);

  const remainingMs = Math.max(0, FOURTEEN_DAYS_MS - elapsed);
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  let remainingText;
  if (remainingDays > 0) {
    remainingText = `${remainingDays}d ${remainingHours}h`;
  } else if (remainingHours > 0) {
    const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    remainingText = `${remainingHours}h ${remainingMinutes}m`;
  } else {
    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
    remainingText = remainingMinutes > 0 ? `${remainingMinutes}m` : 'Now';
  }

  return { progress, remainingText };
};

const TuneScan = () => {
  // Get client context at the top level so nested components can access it via closure
  const { selectedClientId } = useClientContext();

  const Track = ({ element, disabled = false, className = '', clientId }) => {
    const [caretTurned, setCaretTurned] = useState(false);
    const [, forceUpdate] = useState(0);

    // Update progress every minute when auto-rescan is enabled (default: true)
    useEffect(() => {
      const isEnabled = autoRescanSettings[element.file_id]?.enabled ?? true;
      if (isEnabled) {
        const interval = setInterval(() => forceUpdate((n) => n + 1), 60000);
        return () => clearInterval(interval);
      }
    }, [autoRescanSettings[element.file_id]?.enabled]);

    const handleAddMatchToCatalog = async (match) => {
      // client_id is optional - will be included if a client is selected

      const token = localStorage.getItem('token');
      try {
        // Try searching by ISRC first for exact match, then by track name if ISRC fails
        let searchQuery = match.isrc || `${match.song_name} ${match.artist_name}`;
        const searchResponse = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `search?keyword=${encodeURIComponent(searchQuery)}&type=spotify`),
          {
            method: 'GET',
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        let trackData;
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          // Find exact match by ISRC or use first result if searching by name
          let searchedTrack = null;
          if (match.isrc && searchResults && searchResults.length > 0) {
            // Try to find exact ISRC match
            searchedTrack = searchResults.find((t) => t.isrc === match.isrc) || searchResults[0];
          } else if (searchResults && searchResults.length > 0) {
            searchedTrack = searchResults[0];
          }

          if (searchedTrack) {
            trackData = {
              spotify_track_id: searchedTrack.spotify_track_id || match.spotify_track_id || match.isrc,
              title: match.song_name, // Keep original title from fingerprint
              artist: match.artist_name, // Keep original artist from fingerprint
              album: searchedTrack.album || match.album_name || 'Unknown Album',
              album_art: searchedTrack.album_art || match.album_art || '', // Use search result's album art
              isrc: match.isrc, // Keep original ISRC from fingerprint
              date_added: searchedTrack.date_added || new Date().toISOString(),
              spotify_link: searchedTrack.spotify_link || match.spotify_link || '',
              apple_link: searchedTrack.apple_link || match.applemusic_link || '',
              deezer_link: searchedTrack.deezer_link || match.deezer_link || '',
              youtube_link: searchedTrack.youtube_link || match.youtube_link || '',
              master_royalty: null,
              publishing_royalty: null,
              is_infringement: false,
            };
          } else {
            // Fallback to original match data if no search results
            trackData = {
              spotify_track_id: match.spotify_track_id || match.isrc,
              title: match.song_name,
              artist: match.artist_name,
              album: match.album_name || 'Unknown Album',
              album_art: match.album_art || '',
              isrc: match.isrc,
              date_added: new Date().toISOString(),
              spotify_link: match.spotify_link || '',
              apple_link: match.applemusic_link || '',
              deezer_link: match.deezer_link || '',
              youtube_link: match.youtube_link || '',
              master_royalty: null,
              publishing_royalty: null,
              is_infringement: false,
            };
          }
        } else {
          // Fallback to original match data if search fails
          trackData = {
            spotify_track_id: match.spotify_track_id || match.isrc,
            title: match.song_name,
            artist: match.artist_name,
            album: match.album_name || 'Unknown Album',
            album_art: match.album_art || '',
            isrc: match.isrc,
            date_added: new Date().toISOString(),
            spotify_link: match.spotify_link || '',
            apple_link: match.applemusic_link || '',
            deezer_link: match.deezer_link || '',
            youtube_link: match.youtube_link || '',
            master_royalty: null,
            publishing_royalty: null,
            is_infringement: false,
          };
        }

        // Build URL with optional client_id (use prop passed to Track component)
        let addToCatalogUrl = 'catalog/tracks';
        if (clientId) {
          addToCatalogUrl += `?client_id=${clientId}`;
        }
        const response = await axios.post(urlJoin(process.env.REACT_APP_BACKEND_URL, addToCatalogUrl), [trackData], {
          headers: {
            Authorization: `Bearer ${token}`,
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 201) {
          toast.success(`${match.song_name} has been added to catalog.`);
          // Emit event to notify catalog page to refresh
          window.dispatchEvent(new CustomEvent('catalogUpdated'));
          // Update subscription button in real-time
          triggerSubscriptionUpdate();
        }
      } catch (error) {
        if (error.response?.data?.detail) {
          const detail = error.response.data.detail;
          toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail).substring(0, 100));
        } else {
          toast.error('Failed to add track to catalog.');
        }
      }
    };

    const handleDeleteTrack = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${element.file_id}`), {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const catalogNew = catalog.filter((value) => value.file_id !== element.file_id);
        setCatalog(catalogNew);
        toast(`${element.filename} has been deleted.`);
      }
    };

    const handleRescanTrack = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${element.file_id}`), {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await fetchTrack();
        toast(`${element.filename} has been rescanned.`);
      }
    };

    const handleDeleteMatch = async (matchIndex) => {
      const token = localStorage.getItem('token');
      try {
        // Call backend to delete the match
        const response = await fetch(
          urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${element.file_id}/matches/${matchIndex}`),
          {
            method: 'DELETE',
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          // Update local state after successful backend deletion
          const updatedCatalog = catalog.map((track) => {
            if (track.file_id === element.file_id) {
              const updatedTracks = track.tracks.filter((_, index) => index !== matchIndex);
              return { ...track, tracks: updatedTracks };
            }
            return track;
          });
          setCatalog(updatedCatalog);
          toast.success(`Result has been removed.`);
        } else {
          const errorData = await response.json();
          toast.error(errorData.detail || 'Failed to delete result');
        }
      } catch (error) {
        console.error('Error deleting match:', error);
        toast.error('An error occurred while deleting the result');
      }
    };

    return (
      <Expander
        expanded={caretTurned}
        className={`${styles.track} ${className}`}
        disabled={element.tracks.length === 0 || disabled}
        file_id={element.file_id}
        header={
          <div className={styles.trackEntry}>
            <div className={styles.trackControl}>
              <div className={styles.trackFilename}>{element.filename}</div>
            </div>
            <div className={styles.trackResults}>
              {element.loading ? (
                <div className={styles.trackLoadingResults}>Processing...</div>
              ) : (
                <>
                  {/* Progress bar for auto-rescan countdown - only shows when enabled (default: true) */}
                  {(autoRescanSettings[element.file_id]?.enabled ?? true) &&
                    (() => {
                      const { progress, remainingText } = getRescanProgress(
                        autoRescanSettings[element.file_id]?.lastRescan
                      );
                      return (
                        <Tooltip title={`Next rescan in ${remainingText}`}>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              minWidth: '100px',
                            }}
                          >
                            <Progress
                              size="sm"
                              value={progress}
                              color="success"
                              className="max-w-[80px]"
                              aria-label="Rescan countdown"
                            />
                            <span
                              style={{
                                fontSize: '9px',
                                color: 'var(--muted-text)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {remainingText}
                            </span>
                          </div>
                        </Tooltip>
                      );
                    })()}
                  <div
                    className={`track-${element.tracks.length === 0 ? 'negative' : 'positive'}-results ${styles.trackResults}`}
                  >
                    {element.tracks.length} {element.tracks.length === 1 ? 'Result' : 'Results'}
                  </div>
                  <Tooltip
                    title={
                      (autoRescanSettings[element.file_id]?.enabled ?? true)
                        ? 'Auto-rescan enabled (every 14 days)'
                        : 'Enable auto-rescan'
                    }
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Switch
                        checked={autoRescanSettings[element.file_id]?.enabled ?? true}
                        onChange={(checked) => handleAutoRescanToggle(element.file_id, element.filename, checked)}
                        onColor="#22c55e"
                        offColor="#3f3f46"
                        onHandleColor="#fff"
                        offHandleColor="#a1a1aa"
                        handleDiameter={12}
                        uncheckedIcon={false}
                        checkedIcon={false}
                        height={16}
                        width={32}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--muted-text)' }}>Auto</span>
                    </div>
                  </Tooltip>
                  <button
                    className={styles.trackDeleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrack();
                    }}
                    title="Delete track"
                  >
                    Delete
                  </button>
                  <div
                    className={`${styles.trackCaret} ${element.tracks.length === 0 ? 'invisible' : 'visible'} ${caretTurned ? styles.caretTurned : ''}`}
                    onClick={() => setCaretTurned(!caretTurned)}
                  >
                    <IoIosArrowUp />
                  </div>
                </>
              )}
            </div>
          </div>
        }
        body={element.tracks.map((match, matchIndex) => (
          <Match
            key={matchIndex}
            index={matchIndex}
            artist={match.artist_name}
            trackname={match.song_name}
            duration={match.duration}
            isrc={match.isrc}
            spotify={match.spotify_link}
            apple={match.applemusic_link}
            deezer={match.deezer_link}
            youtube={match.youtube_link}
            albumArt={match.album_art}
            confidence={match.confidence}
            onAddToCatalog={() => handleAddMatchToCatalog(match)}
            onDelete={() => handleDeleteMatch(matchIndex)}
          />
        ))}
      />
    );
  };

  const [catalog, setCatalog] = useState([]);
  const toastRef = useRef(null);
  const searchRef = useRef();
  const perPageRef = useRef();
  const fileInputRef = useRef();
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(undefined);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [autoRescanSettings, setAutoRescanSettings] = useState(() => {
    const saved = localStorage.getItem('tunescan_auto_rescan');
    return saved ? JSON.parse(saved) : {};
  });

  const user = useContext(UserContextProvider);
  const subscriptionContext = useContext(SubscriptionContextProvider);
  const subscription = subscriptionContext?.subscription;
  const isFreeTier = !subscription || subscription.tier === 'FREE' || subscription.tier === 'Free';
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Save auto-rescan settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tunescan_auto_rescan', JSON.stringify(autoRescanSettings));
  }, [autoRescanSettings]);

  // Initialize auto-rescan settings for new tracks (default: enabled)
  useEffect(() => {
    if (catalog.length === 0) return;

    const newSettings = { ...autoRescanSettings };
    let hasNewTracks = false;

    catalog.forEach((track) => {
      if (!(track.file_id in newSettings)) {
        // New track - initialize with enabled=true and lastRescan=now
        newSettings[track.file_id] = {
          enabled: true,
          lastRescan: Date.now(),
        };
        hasNewTracks = true;
      }
    });

    if (hasNewTracks) {
      setAutoRescanSettings(newSettings);
    }
  }, [catalog]);

  // Check for auto-rescans on component mount and when catalog changes
  useEffect(() => {
    const now = Date.now();

    catalog.forEach(async (track) => {
      const settings = autoRescanSettings[track.file_id];
      // Skip tracks that haven't been initialized yet (no settings means new upload still processing)
      if (!settings || !settings.lastRescan) {
        return;
      }
      const isEnabled = settings.enabled ?? true;
      if (isEnabled) {
        const lastRescan = settings.lastRescan;
        if (now - lastRescan >= FOURTEEN_DAYS_MS) {
          // Time to auto-rescan
          const token = localStorage.getItem('token');
          try {
            const response = await fetch(
              urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${track.file_id}?is_auto=true`),
              {
                method: 'PUT',
                headers: {
                  accept: 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (response.ok) {
              toast.info(`Auto-rescanned: ${track.filename}`);
              setAutoRescanSettings((prev) => ({
                ...prev,
                [track.file_id]: { ...prev[track.file_id], lastRescan: now },
              }));
              fetchCatalog();
            }
          } catch (error) {
            console.error('Auto-rescan failed:', error);
          }
        }
      }
    });
  }, [catalog.length]); // Only run when catalog length changes (initial load)

  const handleAutoRescanToggle = (fileId, filename, isSelected) => {
    const now = Date.now();
    setAutoRescanSettings((prev) => ({
      ...prev,
      [fileId]: {
        enabled: isSelected,
        lastRescan: isSelected ? now : prev[fileId]?.lastRescan || 0,
      },
    }));
    if (isSelected) {
      toast.success(`Auto-rescan enabled for ${filename} (every 14 days)`);
    } else {
      toast.info(`Auto-rescan disabled for ${filename}`);
    }
  };

  function isNumeric(str) {
    if (typeof str != 'string') return false; // we only process strings!
    return (
      !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(str))
    ); // ...and ensure strings of whitespace fail
  }

  const fetchSubscriptionData = async () => {
    const token = localStorage.getItem('token');
    const defaultSubscriptionData = null;
    try {
      const response = await axios({
        url: urlJoin(process.env.REACT_APP_BACKEND_URL, `/stripe/subscription`),
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        setSubscriptionData(response.data);
      } else {
        setSubscriptionData(defaultSubscriptionData);
      }
    } catch (error) {
      setSubscriptionData(defaultSubscriptionData);
    }
  };

  async function fetchCatalog() {
    const token = localStorage.getItem('token');
    if (!token) navigate('/');
    setLoading(true);
    // Include client_id filter if a client is selected
    const clientParam = selectedClientId ? `&client_id=${selectedClientId}` : '';
    const response = await fetch(
      urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks?page=${currentPage}&per_page=${perPage}${clientParam}`),
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.ok) {
      const body = await response.json();
      setPageCount(body.last_page);
      setCatalog(body.songs);
    }
    setLoading(false);
  }

  async function fetchTrack(file_id) {
    // returns true if results are ready, false else
    const token = localStorage.getItem('token');
    if (!token) navigate('/');
    const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${file_id}`), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      await fetchCatalog();
    }
  }

  const [search, setSearch] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptionData();
    fetchCatalog();
  }, [navigate, selectedClientId]);

  const searchKeyHandler = (event) => {
    if (event.key === 'Escape') {
      searchRef.current.value = '';
      setSearch('');
    }
  };

  const firstPageHandler = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      fetchCatalog();
    }
  };

  const lastPageHandler = () => {
    if (currentPage !== pageCount) {
      setCurrentPage(pageCount);
      fetchCatalog();
    }
  };

  const nextPageHandler = () => {
    if (currentPage < pageCount) {
      setCurrentPage(currentPage + 1);
      fetchCatalog();
    }
  };

  const previousPageHandler = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      fetchCatalog();
    }
  };

  const perPageHandler = () => {
    const perPage = perPageRef.current.value;
    if (isNumeric(perPage)) {
      setPerPage(Number(perPage));
    }
  };

  const handleOnUploadCompleted = () => {
    fetchCatalog();
    // Update subscription button in real-time after scan upload
    triggerSubscriptionUpdate();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // client_id is optional - will be included if a client is selected

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      toast.error('Please select an MP3 file');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Include client_id in the URL if a client is selected
      let scanEndpoint = 'scan/tracks/comprehensive';
      if (selectedClientId) {
        scanEndpoint += `?client_id=${selectedClientId}`;
      }
      const uploadUrl = urlJoin(process.env.REACT_APP_BACKEND_URL, scanEndpoint);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success(`${file.name} uploaded successfully!`);
        handleOnUploadCompleted();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('An error occurred while uploading the file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNewScanClick = () => {
    if (isFreeTier) {
      setShowUpgradeModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleBulkUploadClick = () => {
    if (isFreeTier) {
      setShowUpgradeModal(true);
      return;
    }
    setShowBulkUpload(true);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all scans? This action cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      // Delete all tracks by iterating through the catalog
      const deletePromises = catalog.map((track) =>
        fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${track.file_id}`), {
          method: 'DELETE',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      );

      await Promise.all(deletePromises);
      setCatalog([]);
      toast.success('All scans have been deleted.');
    } catch (error) {
      toast.error('Failed to delete all scans.');
      console.error('Error deleting all scans:', error);
    }
  };

  if (subscriptionData === undefined) return <></>;

  return (
    <div className="flex flex-col h-full">
      <Sidebar />
      <Helmet>
        <title>RD - TuneScan</title>
      </Helmet>
      <div className={styles.dashboardContainer} style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
        <div className={styles.dashboardPanel}>
          <div className={styles.dashboardHeader}>
            <div>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: 0,
                  marginBottom: '4px',
                }}
              >
                Scan Your Works
              </h2>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--muted-text)',
                  margin: 0,
                }}
              >
                Upload your beats or samples to scan for usage across all DSPs
              </p>
            </div>
            <div className={styles.dashboardControl}>
              <input
                ref={searchRef}
                onKeyDown={searchKeyHandler}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Search scans..."
                style={{
                  padding: '7px 12px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--button-border)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: 'var(--text)',
                  outline: 'none',
                  minWidth: '200px',
                }}
              />
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleNewScanClick}
                disabled={uploading}
                style={{
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(34, 197, 94, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(34, 197, 94, 0.2)';
                }}
                title="Upload new scan"
              >
                <FaUpload size={12} />
                {uploading ? 'Uploading...' : 'New Scan'}
              </button>
              <button
                onClick={handleBulkUploadClick}
                style={{
                  padding: '7px 14px',
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '2px solid var(--panel-border)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.color = '#22c55e';
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--panel-border)';
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Upload multiple files or folder (up to 50)"
              >
                <FaFolderOpen size={12} />
                Bulk Upload
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={catalog.length === 0}
                className={styles.deleteAllButton}
                title="Delete all scans"
              >
                Delete All
              </button>
            </div>
          </div>

          <div className={styles.dashboardContent}>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '16px',
                }}
              >
                {/* Skeleton rows for scan items */}
                {[...Array(5)].map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '16px',
                      background: 'var(--input-bg)',
                      borderRadius: '8px',
                      border: '1px solid var(--button-border)',
                    }}
                  >
                    {/* Header row with filename and status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Skeleton variant="rounded" width={40} height={40} sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)' }} />
                        <div>
                          <Skeleton variant="text" width={180} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                          <Skeleton variant="text" width={120} height={14} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                        </div>
                      </div>
                      <Skeleton variant="rounded" width={80} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    {/* Match rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '52px' }}>
                      {[...Array(2)].map((_, matchIdx) => (
                        <div key={matchIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Skeleton
                            variant="rounded"
                            width={48}
                            height={48}
                            sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                          />
                          <div style={{ flex: 1 }}>
                            <Skeleton
                              variant="text"
                              width="50%"
                              height={18}
                              sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                            />
                            <Skeleton
                              variant="text"
                              width="30%"
                              height={14}
                              sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
                            />
                          </div>
                          <Skeleton variant="text" width={60} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : catalog.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--muted-text)',
                }}
              >
                <p>No scans yet. Upload your tracks to get started!</p>
              </div>
            ) : (
              catalog
                .filter((element) => {
                  let matchFound = false;
                  for (let i = 0; i < element.tracks.length; i++) {
                    if (
                      element.tracks[i].artist_name.toLowerCase().includes(search.toLowerCase()) ||
                      element.tracks[i].song_name.toLowerCase().includes(search.toLowerCase())
                    )
                      matchFound = true;
                  }
                  return search === '' || matchFound || element.filename.toLowerCase().includes(search.toLowerCase());
                })
                .map((element, index) => <Track element={element} key={index} clientId={selectedClientId} />)
            )}
          </div>
          {!loading && catalog.length > 0 && (
            <div className={styles.paginationContainer}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                  Page {currentPage} of {pageCount}
                </div>
                <div className={styles.paginationButtons}>
                  <button onClick={firstPageHandler}>
                    <MdKeyboardDoubleArrowLeft />
                  </button>
                  <button onClick={previousPageHandler}>
                    <MdKeyboardArrowLeft />
                  </button>
                  <button onClick={nextPageHandler}>
                    <MdKeyboardArrowRight />
                  </button>
                  <button onClick={lastPageHandler}>
                    <MdKeyboardDoubleArrowRight />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Per page</div>
                <input
                  onChange={perPageHandler}
                  className={styles.paginationPerPage}
                  type="text"
                  ref={perPageRef}
                  defaultValue={perPage}
                  style={{
                    width: '50px',
                    padding: '6px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--button-border)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: 'var(--text)',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUpload
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onComplete={() => {
          fetchCatalog();
          triggerSubscriptionUpdate();
        }}
        clientId={selectedClientId}
      />

      {/* Upgrade Modal for Free Tier Users */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="TuneScan" />
    </div>
  );
};

export default TuneScan;
