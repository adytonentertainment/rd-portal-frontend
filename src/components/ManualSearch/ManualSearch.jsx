import { useRef, useState } from 'react';
import urlJoin from 'url-join';
import styles from './manualsearch.css';
import { IoTimeOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { CircularProgress, Tooltip } from '@mui/material';
import { parse } from 'date-fns';
import { handleSpotifyAuth } from '../../misc/helper';
import { IoCalendarOutline } from 'react-icons/io5';
import { HiMiniMagnifyingGlass } from 'react-icons/hi2';
import FlatButton from '../Buttons/FlatButton/FlatButton';
import DropdownMenu from '../DropdownMenu/DropdownMenu';
import SpotifyButton from '../Buttons/DSP/SpotifyButton/SpotifyButton';
import GeniusButton from '../Buttons/DSP/GeniusButton/GeniusButton';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useClientContext } from '../ClientContext/ClientContext';

const ManualSearch = ({ onDeleteCatalog = () => {}, onAddToCatalog = () => {} }) => {
  const { selectedClientId } = useClientContext();
  const maxTime = 500;
  const [handler, setHandler] = useState();
  const [foundTracks, setFoundTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [searchStarted, setSearchStarted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef();

  const showResults = async () => {
    setIsLoading(true);
    setSearchStarted(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(
        urlJoin(process.env.REACT_APP_BACKEND_URL, `search?keyword=${inputRef.current.value}&type=spotify`),
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
        setFoundTracks(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const showResultsSpotify = () => {
    handleSpotifyAuth(urlJoin(process.env.REACT_APP_FRONTEND_URL, '/catalog'));
  };

  const handleToggleTrack = (track) => {
    const trackWithDefaults = {
      ...track,
      is_infringement: false,
      master_royalty: 0,
      publishing_royalty: 0,
    };

    const isSelected = selectedTracks.some((t) => t.spotify_track_id === track.spotify_track_id);

    if (isSelected) {
      setSelectedTracks(selectedTracks.filter((t) => t.spotify_track_id !== track.spotify_track_id));
    } else {
      setSelectedTracks([...selectedTracks, trackWithDefaults]);
    }
  };

  const isTrackSelected = (track) => {
    return selectedTracks.some((t) => t.spotify_track_id === track.spotify_track_id);
  };

  const handleClearSelection = () => {
    setSelectedTracks([]);
  };

  const handleAddToCatalog = async () => {
    if (selectedTracks.length === 0) return;
    setIsLoading(true);
    setSearchStarted(true);
    const token = localStorage.getItem('token');
    try {
      // Build URL with optional client_id
      let addUrl = 'catalog/tracks';
      if (selectedClientId) {
        addUrl += `?client_id=${selectedClientId}`;
      }
      console.log('[ManualSearch] Adding tracks with URL:', addUrl, 'client_id:', selectedClientId);
      const response = await axios.post(urlJoin(process.env.REACT_APP_BACKEND_URL, addUrl), selectedTracks, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 201) {
        toast.success('The tracks have been added to your catalog.');
        setSelectedTracks([]);
        setFoundTracks([]);
        if (inputRef.current) inputRef.current.value = '';
        await onAddToCatalog();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add tracks to catalog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeSearchType = async (item) => {
    // Handle search type change
  };

  return (
    <div
      className="flex flex-col"
      style={{
        width: '100%',
        height: '70vh',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card-background)',
        borderRadius: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Add Songs to Catalog
        </h2>
      </div>

      {/* Search Section */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {/* Search Input with Selection Info */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              onInput={(e) => {
                if (handler) clearTimeout(handler);
                if (e.target.value) setHandler(setTimeout(showResults, maxTime));
              }}
              type="text"
              ref={inputRef}
              placeholder="Search for songs..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                paddingLeft: '2.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--background)',
                color: 'var(--text)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--text)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
              }}
            />
            <HiMiniMagnifyingGlass
              size={18}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
          </div>

          {/* Selected count and clear button - now inline with search */}
          {selectedTracks.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {selectedTracks.length} song
                {selectedTracks.length !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={handleClearSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--text)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--text-secondary)';
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div
        className="searchlist"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.5rem',
          minHeight: 0,
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress size={50} style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : (
          <div>
            {foundTracks.length !== 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {foundTracks.map((track, i) => {
                  const selected = isTrackSelected(track);
                  return (
                    <div
                      key={i}
                      className="searchlist-item"
                      onClick={() => handleToggleTrack(track)}
                      style={{
                        position: 'relative',
                        background: selected ? 'var(--background)' : 'var(--card-background)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        border: selected ? '2px solid var(--text)' : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) {
                          e.currentTarget.style.borderColor = 'var(--text-secondary)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {/* Album Art and Info */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'center',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          className="searchlist-image"
                          style={{
                            width: '48px',
                            height: '48px',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={track.album_art}
                            alt={track.title}
                            style={{
                              borderRadius: '4px',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: '500',
                              marginBottom: '0.15rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                            }}
                          >
                            {track.title}
                          </div>
                          <div
                            className="searchlist-item-artists"
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '0.25rem',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <IoCalendarOutline size={12} />
                          {parse(track.date_added.substring(0, 10), 'yyyy-MM-dd', new Date()).toLocaleDateString()}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <HiMiniMagnifyingGlass size={12} />
                          {track.isrc}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {selected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-0.5rem',
                            right: '-0.5rem',
                            background: 'var(--text)',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IoCheckmarkCircle size={16} color="var(--background)" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                }}
              >
                {searchStarted ? 'No songs found. Try a different search term.' : 'Start typing to search for songs...'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with Action Button */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
        }}
      >
        <button
          onClick={handleAddToCatalog}
          disabled={selectedTracks.length === 0 || isLoading}
          style={{
            padding: '0.625rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: selectedTracks.length === 0 || isLoading ? 'var(--border-color)' : 'var(--text)',
            color: selectedTracks.length === 0 || isLoading ? 'var(--text-secondary)' : 'var(--background)',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: selectedTracks.length === 0 || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: selectedTracks.length === 0 || isLoading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (selectedTracks.length > 0 && !isLoading) {
              e.target.style.opacity = '0.85';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedTracks.length > 0 && !isLoading) {
              e.target.style.opacity = '1';
            }
          }}
        >
          {isLoading ? 'Adding...' : `Add ${selectedTracks.length > 0 ? selectedTracks.length : ''} to Catalog`}
        </button>
      </div>
    </div>
  );
};
export default ManualSearch;
