import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const BackgroundImportContext = createContext(null);

export const useBackgroundImport = () => {
  const context = useContext(BackgroundImportContext);
  if (!context) {
    throw new Error('useBackgroundImport must be used within a BackgroundImportProvider');
  }
  return context;
};

export const BackgroundImportProvider = ({ children }) => {
  const [importStatus, setImportStatus] = useState(null); // null | 'fetching' | 'complete' | 'error'
  const [progress, setProgress] = useState({ message: '', current: 0, songTitle: '' });
  const [foundSongs, setFoundSongs] = useState([]);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const onCompleteCallbackRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startGeniusFetch = useCallback((artistUrl, onComplete) => {
    // Store callback for when fetch completes
    onCompleteCallbackRef.current = onComplete;

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Reset state
    setImportStatus('fetching');
    setProgress({ message: 'Starting fetch...', current: 0, songTitle: '' });
    setFoundSongs([]);
    setError(null);

    const token = localStorage.getItem('token');
    // REACT_APP_BACKEND_URL includes /api, but genius-stream is at root level
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    // Remove /api suffix if present to get the base URL
    const baseUrl = backendUrl.replace(/\/api\/?$/, '');

    // Create EventSource for SSE
    // Note: EventSource doesn't support custom headers, so we need to use fetch with ReadableStream
    const url = `${baseUrl}/genius-stream/fetch?artist_url=${encodeURIComponent(artistUrl)}`;

    console.log('[GeniusSSE] Starting fetch to:', url);

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
    })
      .then(async (response) => {
        console.log('[GeniusSSE] Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[GeniusSSE] Error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          let keepReading = true;
          while (keepReading) {
            const { done, value } = await reader.read();

            if (done) {
              setImportStatus('complete');
              keepReading = false;
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  console.log('[GeniusSSE] Event received:', data.type, data);

                  switch (data.type) {
                    case 'status':
                      setProgress({
                        message: data.message,
                        current: data.progress || 0,
                        songTitle: '',
                      });
                      break;

                    case 'progress':
                      setProgress({
                        message: data.message,
                        current: data.current,
                        songTitle: data.song_title,
                      });
                      break;

                    case 'song_found':
                      setFoundSongs((prev) => [...prev, data.song]);
                      setProgress((prev) => ({
                        ...prev,
                        message: `Found: ${data.song.title}`,
                        totalFound: data.total_found,
                      }));
                      break;

                    case 'complete':
                      setImportStatus('complete');
                      setProgress({
                        message: data.message,
                        current: data.total,
                        songTitle: '',
                      });
                      // Call the completion callback with the songs
                      if (onCompleteCallbackRef.current) {
                        onCompleteCallbackRef.current(data.songs);
                      }
                      break;

                    case 'error':
                      setImportStatus('error');
                      setError(data.message);
                      break;

                    default:
                      break;
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }
        };

        processStream().catch((err) => {
          console.error('[GeniusSSE] Stream processing error:', err);
          setImportStatus('error');
          setError(err.message);
        });
      })
      .catch((err) => {
        console.error('[GeniusSSE] Fetch error:', err);
        setImportStatus('error');
        setError(err.message);
      });
  }, []);

  const cancelFetch = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setImportStatus(null);
    setProgress({ message: '', current: 0, songTitle: '' });
    setFoundSongs([]);
    setError(null);
  }, []);

  const dismissNotification = useCallback(() => {
    setImportStatus(null);
    setProgress({ message: '', current: 0, songTitle: '' });
    setError(null);
  }, []);

  const value = {
    importStatus,
    progress,
    foundSongs,
    error,
    startGeniusFetch,
    cancelFetch,
    dismissNotification,
  };

  return <BackgroundImportContext.Provider value={value}>{children}</BackgroundImportContext.Provider>;
};

export default BackgroundImportContext;
