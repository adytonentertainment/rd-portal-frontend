import React, { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import * as pdfjsLib from 'pdfjs-dist';
import { useClientContext } from '../ClientContext/ClientContext';

// Set worker for PDF.js via CDN (v4 compatible, works with CRA/webpack)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function CatalogImport({ isOpen, onClose, onImport }) {
  const { selectedClientId } = useClientContext();
  const [importStatus, setImportStatus] = useState(null);
  const [foundSongs, setFoundSongs] = useState([]);
  const eventSourceRef = useRef(null);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startGeniusFetch = useCallback((artistUrl, onComplete) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setImportStatus('fetching');
    setFoundSongs([]);

    const token = localStorage.getItem('token');
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const baseUrl = backendUrl.replace(/\/api\/?$/, '');
    const url = `${baseUrl}/genius-stream/fetch?artist_url=${encodeURIComponent(artistUrl)}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
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
              setImportStatus((prev) => (prev !== 'error' ? 'complete' : prev));
              setIsProcessing(false);
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  switch (data.type) {
                    case 'song_found':
                      setFoundSongs((prev) => [...prev, data.song]);
                      break;
                    case 'complete':
                      setImportStatus('complete');
                      if (onComplete) onComplete(data.songs);
                      break;
                    case 'error':
                      setImportStatus('error');
                      setError(data.message || 'Failed to fetch songs from Genius');
                      setIsProcessing(false);
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
          setImportStatus('error');
          setError(err.message || 'Stream connection lost');
          setIsProcessing(false);
        });
      })
      .catch((err) => {
        setImportStatus('error');
        setError(err.message || 'Failed to connect to Genius import');
        setIsProcessing(false);
      });
  }, []);
  const [importType, setImportType] = useState(null);
  const [geniusUrl, setGeniusUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedSongs, setImportedSongs] = useState([]);
  const [selectedSongIds, setSelectedSongIds] = useState(new Set());
  const [error, setError] = useState('');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Column mapping states
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [rawData, setRawData] = useState([]);

  // Auto-select all songs when importedSongs changes
  useEffect(() => {
    if (importedSongs.length > 0) {
      setSelectedSongIds(new Set(importedSongs.map((song) => song.id)));
    }
  }, [importedSongs]);

  // Manage focus when modals open/close
  useEffect(() => {
    if (showColumnMapping || isOpen) {
      // Store current active element
      const activeElement = document.activeElement;
      // Remove focus from any focused element
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        document.body.style.overflow = '';
      };
    }
  }, [showColumnMapping, isOpen]);

  // Selection helpers
  const toggleSongSelection = (songId) => {
    setSelectedSongIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSongIds.size === importedSongs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(importedSongs.map((song) => song.id)));
    }
  };

  const intelligentColumnDetection = (headers, sampleData = []) => {
    const mapping = {};
    const columnOptions = ['title', 'artist', 'album', 'master_royalty', 'publishing_royalty'];

    // Try to detect based on headers first
    headers.forEach((header, index) => {
      // Extra cleaning: remove special chars, normalize whitespace
      const lowerHeader = header
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, ' ') // Replace special chars with space
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim();

      // Title detection - more flexible
      if (
        lowerHeader.includes('title') ||
        lowerHeader.includes('song') ||
        lowerHeader.includes('track') ||
        lowerHeader.includes('name') ||
        lowerHeader === 'titre' // French
      ) {
        mapping[index] = 'title';
      }
      // Artist detection - more flexible
      else if (
        lowerHeader.includes('artist') ||
        lowerHeader.includes('performer') ||
        lowerHeader.includes('creator') ||
        lowerHeader.includes('by') ||
        lowerHeader === 'artiste' // French
      ) {
        mapping[index] = 'artist';
      }
      // Album detection
      else if (lowerHeader.includes('album') || lowerHeader.includes('release') || lowerHeader.includes('project')) {
        mapping[index] = 'album';
      }
      // Master royalty detection - more flexible
      else if (
        (lowerHeader.includes('master') || lowerHeader.includes('recording')) &&
        (lowerHeader.includes('%') ||
          lowerHeader.includes('royalty') ||
          lowerHeader.includes('share') ||
          lowerHeader.includes('percent'))
      ) {
        mapping[index] = 'master_royalty';
      }
      // Publishing royalty detection - more flexible
      else if (
        (lowerHeader.includes('publish') || lowerHeader.includes('composition')) &&
        (lowerHeader.includes('%') ||
          lowerHeader.includes('royalty') ||
          lowerHeader.includes('share') ||
          lowerHeader.includes('percent'))
      ) {
        mapping[index] = 'publishing_royalty';
      }
      // Check for percentage columns without specific type
      else if (
        lowerHeader.includes('%') ||
        lowerHeader.includes('share') ||
        lowerHeader.includes('royalty') ||
        lowerHeader.includes('percent')
      ) {
        // Check if we already have master/publishing assigned
        const hasMaster = Object.values(mapping).includes('master_royalty');
        const hasPublishing = Object.values(mapping).includes('publishing_royalty');

        if (!hasMaster) {
          mapping[index] = 'master_royalty';
        } else if (!hasPublishing) {
          mapping[index] = 'publishing_royalty';
        } else {
          mapping[index] = 'unknown';
        }
      }
      // Try to guess based on sample data
      else if (sampleData && sampleData.length > 0) {
        const sampleValue = sampleData[0][header];

        // Check if it looks like a percentage
        if (sampleValue && String(sampleValue).includes('%')) {
          const hasMaster = Object.values(mapping).includes('master_royalty');
          const hasPublishing = Object.values(mapping).includes('publishing_royalty');

          if (!hasMaster) {
            mapping[index] = 'master_royalty';
          } else if (!hasPublishing) {
            mapping[index] = 'publishing_royalty';
          } else {
            mapping[index] = 'unknown';
          }
        } else {
          mapping[index] = 'unknown';
        }
      }
      // If unclear, leave as 'unknown'
      else {
        mapping[index] = 'unknown';
      }
    });

    // Debug logging for column detection
    console.log('🔍 Column Detection Debug:');
    console.log('Original headers:', headers);
    console.log('Detected mapping:', mapping);
    headers.forEach((header, index) => {
      const cleaned = header
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      console.log(`  [${index}] "${header}" → cleaned: "${cleaned}" → mapped to: "${mapping[index]}"`);
    });

    // If we couldn't identify title and artist columns, try to guess based on position
    const hasTitle = Object.values(mapping).includes('title');
    const hasArtist = Object.values(mapping).includes('artist');

    if (!hasTitle && headers.length > 0) {
      // First text column is likely title
      for (let i = 0; i < headers.length; i++) {
        if (mapping[i] === 'unknown') {
          mapping[i] = 'title';
          break;
        }
      }
    }

    if (!hasArtist && headers.length > 1) {
      // Second text column is likely artist
      for (let i = 0; i < headers.length; i++) {
        if (mapping[i] === 'unknown') {
          mapping[i] = 'artist';
          break;
        }
      }
    }

    console.log('✅ Final column mapping after fallbacks:', mapping);

    return mapping;
  };

  const parsePDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Extract text items with positioning for better table detection
      let allItems = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Collect all text items with positions
        const items = textContent.items
          .map((item) => ({
            text: item.str.trim(),
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5]),
            width: item.width,
          }))
          .filter((item) => item.text.length > 0);

        // Find unique X positions to detect columns (with tolerance)
        const xPositions = [...new Set(items.map((item) => item.x))].sort((a, b) => a - b);

        // Merge similar X positions (within 10 units tolerance)
        const columnPositions = [];
        xPositions.forEach((x) => {
          const existing = columnPositions.find((col) => Math.abs(col - x) < 10);
          if (!existing) {
            columnPositions.push(x);
          }
        });
        columnPositions.sort((a, b) => a - b);

        // Group items by Y position (rows)
        const lineGroups = {};
        items.forEach((item) => {
          const y = item.y;
          if (!lineGroups[y]) {
            lineGroups[y] = [];
          }

          // Assign item to nearest column
          const nearestCol = columnPositions.reduce((prev, curr) =>
            Math.abs(curr - item.x) < Math.abs(prev - item.x) ? curr : prev
          );

          lineGroups[y].push({
            text: item.text,
            colIndex: columnPositions.indexOf(nearestCol),
          });
        });

        // Sort lines by Y position (top to bottom)
        const sortedYs = Object.keys(lineGroups)
          .map(Number)
          .sort((a, b) => b - a);

        // Build rows with proper column alignment
        sortedYs.forEach((y) => {
          const row = new Array(columnPositions.length).fill('');
          lineGroups[y].forEach((item) => {
            row[item.colIndex] = item.text;
          });

          // Only add rows that have data
          if (row.some((cell) => cell.length > 0)) {
            allItems.push(row);
          }
        });
      }

      if (allItems.length < 2) {
        throw new Error('PDF does not contain enough data to parse as a table');
      }

      // Determine number of columns from the row with most cells
      const rowLengths = allItems.map((row) => row.length).filter((len) => len > 0);
      const maxColumns = rowLengths.length > 0 ? Math.max(...rowLengths) : 0;

      if (maxColumns === 0) {
        throw new Error('No columns detected in PDF');
      }

      // First row might be headers
      const firstRow = allItems[0];
      const headers = [];

      // Build headers - use first row if it has text, otherwise use generic names
      for (let i = 0; i < maxColumns; i++) {
        if (firstRow[i] && firstRow[i].length > 0) {
          headers.push(firstRow[i]);
        } else {
          headers.push(`Column ${i + 1}`);
        }
      }

      // Rest are data rows
      const data = [];
      for (let i = 1; i < allItems.length; i++) {
        const values = allItems[i];
        if (values.length > 0 && values.some((v) => v.length > 0)) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }

      return { headers, data };
    } catch (err) {
      throw new Error(`Failed to parse PDF: ${err.message}`);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setError('');

    try {
      const fileName = file.name.toLowerCase();
      let headers = [];
      let data = [];

      if (fileName.endsWith('.pdf')) {
        // Handle PDF
        const pdfData = await parsePDF(file);
        headers = pdfData.headers;
        data = pdfData.data;
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
        // Handle CSV/TSV
        let text = await file.text();

        // Pre-process: Remove empty/metadata rows at the beginning
        const lines = text.split('\n');
        let firstValidLineIndex = 0;

        // Find the first line with meaningful content (not just delimiters/empty)
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i].trim();
          // Check if line has actual text content (not just delimiters)
          const hasContent = line.replace(/[;,\t|]/g, '').trim().length > 0;

          if (hasContent) {
            firstValidLineIndex = i;
            break;
          }
        }

        // Skip empty metadata rows
        if (firstValidLineIndex > 0) {
          text = lines.slice(firstValidLineIndex).join('\n');
        }

        // Auto-detect delimiter by checking first few lines
        let delimiter = ',';
        if (fileName.endsWith('.tsv')) {
          delimiter = '\t';
        } else {
          // Check for common delimiters in the first valid line
          const firstLine = text.split('\n')[0];
          const delimiters = [';', ',', '\t', '|'];
          const delimiterCounts = delimiters.map((d) => ({
            delimiter: d,
            count: (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length,
          }));

          // Choose delimiter with highest count (at least 1)
          const bestDelimiter = delimiterCounts.reduce((a, b) => (b.count > a.count ? b : a));

          if (bestDelimiter.count > 0) {
            delimiter = bestDelimiter.delimiter;
          }
        }

        await new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            delimiter: delimiter,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
              if (results.meta.fields) {
                headers = results.meta.fields;
                data = results.data;

                // Clean up headers - remove empty ones and trim
                headers = headers.filter((h) => h && String(h).trim().length > 0).map((h) => String(h).trim());

                // Clean up data - only keep fields with valid headers and remove empty rows
                data = data
                  .map((row) => {
                    const cleanRow = {};
                    headers.forEach((header) => {
                      const value = row[header];
                      cleanRow[header] = value !== undefined && value !== null ? String(value).trim() : '';
                    });
                    return cleanRow;
                  })
                  .filter((row) => {
                    // Keep rows that have at least one non-empty value
                    return Object.values(row).some((val) => val && val.length > 0);
                  });
              }
              resolve();
            },
            error: (err) => reject(err),
          });
        });
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Handle Excel with ExcelJS (safer than xlsx)
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const firstSheet = workbook.worksheets[0];
        if (firstSheet) {
          const jsonData = [];
          const sheetHeaders = [];

          // Get headers from first row
          const headerRow = firstSheet.getRow(1);
          headerRow.eachCell((cell, colNumber) => {
            sheetHeaders.push(cell.value?.toString() || `Column ${colNumber}`);
          });

          // Get data rows
          firstSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const rowData = {};
            row.eachCell((cell, colNumber) => {
              const header = sheetHeaders[colNumber - 1];
              if (header) {
                rowData[header] = cell.value?.toString() || '';
              }
            });

            // Only add rows with data
            if (Object.values(rowData).some((val) => val && val.trim().length > 0)) {
              jsonData.push(rowData);
            }
          });

          if (jsonData.length > 0) {
            headers = sheetHeaders;
            data = jsonData;
          }
        }
      } else {
        setError('Unsupported file format. Please use CSV, TSV, XLSX, or PDF.');
        setIsProcessing(false);
        return;
      }

      // Detect columns intelligently
      const mapping = intelligentColumnDetection(headers, data);

      setDetectedColumns(headers);
      setColumnMapping(mapping);
      setRawData(data);

      // Always show column mapping UI for user to confirm/adjust
      // This ensures accuracy
      setShowColumnMapping(true);
      setIsProcessing(false);
    } catch (err) {
      setError(`Failed to process file: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validExts = ['.csv', '.tsv', '.xlsx', '.xls', '.pdf'];
      const isValid = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (isValid) {
        processFile(file);
      } else {
        setError('Unsupported file format. Please use CSV, TSV, XLSX, or PDF.');
      }
    }
  };

  const processWithMapping = (data, mapping) => {
    const songs = data.map((row, idx) => {
      const song = {
        id: idx + 1,
        title: '',
        artist: '',
        album: '',
        master_royalty: null, // Default null (not set)
        publishing_royalty: null, // Default null (not set)
      };

      // Map columns based on mapping
      Object.entries(mapping).forEach(([colIndex, fieldName]) => {
        const header = detectedColumns[parseInt(colIndex)] || Object.keys(row)[parseInt(colIndex)];
        const value = row[header];

        if (fieldName !== 'unknown' && value !== undefined && value !== null && value !== '') {
          if (fieldName === 'master_royalty' || fieldName === 'publishing_royalty') {
            // Parse percentage - handle various formats
            let parsedValue = 0.1; // Default 10%
            const strValue = String(value).trim();

            if (strValue) {
              // Remove any non-numeric characters except . and %
              const cleanValue = strValue.replace(/[^\d.%]/g, '');

              if (cleanValue.includes('%')) {
                // Has % sign - parse as percentage
                const numValue = parseFloat(cleanValue.replace('%', ''));
                if (!isNaN(numValue)) {
                  parsedValue = numValue / 100;
                }
              } else {
                // No % sign - check if it's already decimal or needs conversion
                const numValue = parseFloat(cleanValue);
                if (!isNaN(numValue)) {
                  // If value is greater than 1, assume it's a percentage
                  // If value is 1 or less, assume it's already a decimal
                  parsedValue = numValue > 1 ? numValue / 100 : numValue;
                }
              }

              // Ensure value is between 0 and 1
              parsedValue = Math.max(0, Math.min(1, parsedValue));
            }

            song[fieldName] = parsedValue;
          } else {
            song[fieldName] = String(value).trim();
          }
        }
      });

      // If only one royalty percentage is provided, use it for both
      if (song.master_royalty !== null && song.publishing_royalty === null) {
        // Only master is provided, use it for publishing too
        song.publishing_royalty = song.master_royalty;
      } else if (song.publishing_royalty !== null && song.master_royalty === null) {
        // Only publishing is provided, use it for master too
        song.master_royalty = song.publishing_royalty;
      }

      return song;
    });

    const filteredSongs = songs.filter((s) => s.title || s.artist);

    setImportedSongs(filteredSongs);
    setShowColumnMapping(false);
    setIsProcessing(false);
  };

  const handleColumnMappingConfirm = () => {
    processWithMapping(rawData, columnMapping);
  };

  // Callback for when background fetch completes
  const handleBackgroundFetchComplete = useCallback((songs) => {
    console.log('[CatalogImport] Background fetch complete, received songs:', songs?.length);

    if (!songs || songs.length === 0) {
      console.log('[CatalogImport] No songs received');
      setError('No songs found for this artist on Genius');
      setIsProcessing(false);
      return;
    }

    const formattedSongs = songs.map((item, idx) => {
      // Ensure we have valid non-empty strings for required fields
      const title = (item.title || '').trim();
      const artist = (item.artist || '').trim();
      const album = (item.album || '').trim();
      const albumArt = (item.album_art || '').trim();

      return {
        id: idx + 1,
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        album: album || 'N/A',
        date_added: item.date_added || null,
        writers: '',
        album_art: albumArt || 'N/A',
        master_royalty: 0.03,
        publishing_royalty: 0.5,
      };
    });

    // Filter out songs that have no meaningful data (both title and artist are unknown)
    const filteredSongs = formattedSongs.filter((s) => s.title !== 'Unknown Title' || s.artist !== 'Unknown Artist');

    console.log('[CatalogImport] Setting imported songs:', filteredSongs.length);

    if (filteredSongs.length === 0) {
      setError('No valid songs found. All songs had missing title/artist data.');
      setIsProcessing(false);
      return;
    }

    setImportedSongs(filteredSongs);
    setIsProcessing(false);
    setError('');
    setImportStatus(null);
  }, []);

  // Watch for background fetch completion - also check when modal opens
  useEffect(() => {
    if (importStatus === 'complete' && foundSongs.length > 0 && isOpen) {
      handleBackgroundFetchComplete(foundSongs);
    }
  }, [importStatus, foundSongs, handleBackgroundFetchComplete, isOpen]);

  // When modal opens, check if there's completed fetch data from background
  useEffect(() => {
    if (isOpen && importStatus === 'complete' && foundSongs.length > 0 && importedSongs.length === 0) {
      handleBackgroundFetchComplete(foundSongs);
    }
  }, [isOpen, importStatus, foundSongs, importedSongs.length, handleBackgroundFetchComplete]);

  const handleGeniusImport = async () => {
    if (!geniusUrl.trim()) {
      setError('Please enter a Genius URL');
      return;
    }

    // Parse Genius URL to extract artist name
    const urlMatch = geniusUrl.match(/genius\.com\/artists\/([^/?#]+)/i);

    if (!urlMatch) {
      setError('Invalid Genius URL. Please provide an artist page URL (e.g., genius.com/artists/artist-name)');
      return;
    }

    const artistName = decodeURIComponent(urlMatch[1].replace(/-/g, ' '));

    // Use SSE background fetch - allows closing modal while fetch runs
    setError(`Fetching songs for ${artistName}... You can close this modal - fetching continues in background.`);
    setIsProcessing(true);

    // Start background SSE fetch
    startGeniusFetch(geniusUrl, handleBackgroundFetchComplete);
  };

  const confirmImport = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Filter to only selected songs
      const songsToImport = importedSongs.filter((song) => selectedSongIds.has(song.id));

      if (songsToImport.length === 0) {
        setError('Please select at least one song to import');
        setIsProcessing(false);
        return;
      }

      // Send songs directly to backend - it will handle Spotify lookup
      // This is the same method used by "add to catalog" and is more reliable
      setError(`Importing ${songsToImport.length} songs to catalog...`);

      // Format songs for the backend - keep it simple, let backend handle enrichment
      const songsForBackend = songsToImport.map((song) => ({
        artist: song.artist || 'Unknown Artist',
        title: song.title || 'Unknown Title',
        album: song.album || 'N/A',
        date_added: song.date_added || new Date().toISOString().split('T')[0],
        is_infringement: false,
        isrc: 'N/A', // Backend will search Spotify to get the real ISRC
        album_art: song.album_art || 'N/A',
        spotify_track_id: '',
        publishing_royalty: song.publishing_royalty ?? null,
        master_royalty: song.master_royalty ?? null,
      }));

      // Build URL with optional client_id
      let importUrl = `${process.env.REACT_APP_BACKEND_URL}/catalog/tracks`;
      if (selectedClientId) {
        importUrl += `?client_id=${selectedClientId}`;
      }

      const response = await fetch(importUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(songsForBackend),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle 409 Conflict - tracks already exist
        if (response.status === 409) {
          if (errorData.detail && typeof errorData.detail === 'string') {
            setError('');
            alert(`Import partially complete!\n${errorData.detail}`);

            // Still refresh the catalog to show any new tracks
            if (onImport) {
              onImport(songsForBackend);
            }
            resetModal();
            return;
          }
        }

        throw new Error(errorData.detail || 'Failed to import songs to catalog');
      }

      const result = await response.json();

      if (onImport) {
        onImport(result.items || songsForBackend);
      }

      // Show success message
      const addedCount = result.items?.length || 0;
      const skippedCount = songsToImport.length - addedCount;

      setError('');
      if (skippedCount > 0) {
        alert(
          `Import complete!\n${addedCount} tracks added\n${skippedCount} tracks skipped (duplicates or not found on Spotify)`
        );
      } else {
        alert(`Import complete!\n${addedCount} tracks added to catalog`);
      }

      resetModal();
    } catch (err) {
      setError(`Failed to import: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setImportType(null);
    setGeniusUrl('');
    setImportedSongs([]);
    setSelectedSongIds(new Set());
    setError('');
    setIsProcessing(false);
    setShowColumnMapping(false);
    setDetectedColumns([]);
    setColumnMapping({});
    setRawData([]);
    onClose();
  };

  if (!isOpen) return null;

  // Column Mapping Modal
  if (showColumnMapping) {
    return (
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowColumnMapping(false);
        }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 99999,
          pointerEvents: 'auto',
          isolation: 'isolate',
        }}
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: 'var(--panel-bg)',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text)',
                margin: 0,
              }}
            >
              Map Columns
            </h2>
            <button
              onClick={() => setShowColumnMapping(false)}
              style={{
                color: 'var(--muted-text)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            <p style={{ color: 'var(--muted-text)', marginBottom: '16px' }}>
              Please map the columns from your file to the correct fields:
            </p>
            <p
              style={{
                color: 'var(--secondary)',
                fontSize: '13px',
                marginBottom: '20px',
                padding: '10px',
                background: 'rgba(0, 200, 200, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(0, 200, 200, 0.2)',
              }}
            >
              💡 <strong>Tip:</strong> Royalty % can be in formats like "50%", "50", or "0.5". If only one is provided,
              it will be used for both master and publishing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {detectedColumns.map((column, index) => {
                // Get sample values from first 3 rows
                const sampleValues = rawData
                  .slice(0, 3)
                  .map((row) => row[column])
                  .filter((val) => val && val !== '')
                  .join(', ');

                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '16px',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '8px',
                      background: columnMapping[index] !== 'unknown' ? 'rgba(0, 200, 200, 0.05)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            marginBottom: '4px',
                          }}
                        >
                          Column: {column || `Column ${index + 1}`}
                        </div>
                        {sampleValues && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--muted-text)',
                              fontStyle: 'italic',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Sample: {sampleValues}
                          </div>
                        )}
                      </div>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--muted-text)"
                        strokeWidth="2"
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                      <div style={{ flex: 1 }}>
                        <select
                          value={columnMapping[index] || 'unknown'}
                          onChange={(e) =>
                            setColumnMapping({
                              ...columnMapping,
                              [index]: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '6px',
                            background: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='%23888' d='M6 9L2 5h8z'/></svg>")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '36px',
                          }}
                        >
                          <option value="unknown">Skip / Ignore</option>
                          <option value="title">Song Title</option>
                          <option value="artist">Artist Name</option>
                          <option value="album">Album</option>
                          <option value="master_royalty">Master Royalty %</option>
                          <option value="publishing_royalty">Publishing Royalty %</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '24px' }}>
              <button
                onClick={() => setShowColumnMapping(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text)',
                  borderRadius: '8px',
                  fontWeight: 500,
                  background: 'var(--panel-bg)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleColumnMappingConfirm}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'var(--secondary)',
                  color: 'var(--secondary-text)',
                  borderRadius: '8px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Confirm Mapping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        resetModal();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 99999,
        pointerEvents: 'auto',
        isolation: 'isolate',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: 'var(--panel-bg)',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '672px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Import Catalog
          </h2>
          <button
            onClick={resetModal}
            style={{
              color: 'var(--muted-text)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {!importType && importedSongs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--muted-text)', marginBottom: '8px' }}>
                Choose how you'd like to import your catalog:
              </p>

              <button
                onClick={() => setImportType('genius')}
                style={{
                  width: '100%',
                  padding: '24px',
                  border: '2px solid var(--panel-border)',
                  borderRadius: '8px',
                  background: 'var(--panel-bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--secondary)';
                  e.currentTarget.style.background = 'var(--input-bg)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--panel-border)';
                  e.currentTarget.style.background = 'var(--panel-bg)';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3
                    style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: 'var(--text)',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Import from Genius
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--muted-text)',
                      margin: 0,
                    }}
                  >
                    Paste a Genius artist URL to fetch their catalog
                  </p>
                </div>
              </button>

              <button
                onClick={() => setImportType('file')}
                style={{
                  width: '100%',
                  padding: '24px',
                  border: '2px solid var(--panel-border)',
                  borderRadius: '8px',
                  background: 'var(--panel-bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--secondary)';
                  e.currentTarget.style.background = 'var(--input-bg)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--panel-border)';
                  e.currentTarget.style.background = 'var(--panel-bg)';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3
                    style={{
                      fontWeight: 600,
                      fontSize: '18px',
                      color: 'var(--text)',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Upload File
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--muted-text)',
                      margin: 0,
                    }}
                  >
                    Import from CSV, TSV, XLSX, or PDF
                  </p>
                </div>
              </button>
            </div>
          )}

          {importType === 'genius' && importedSongs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => setImportType(null)}
                style={{
                  fontSize: '14px',
                  color: 'var(--muted-text)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                ← Back
              </button>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  Genius Artist URL
                </label>
                <input
                  type="text"
                  value={geniusUrl}
                  onChange={(e) => setGeniusUrl(e.target.value)}
                  placeholder="https://genius.com/artists/artist-name"
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  disabled={isProcessing}
                />
                <p
                  style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: 'var(--muted-text)',
                  }}
                >
                  Example: https://genius.com/artists/Taylor-swift
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontSize: '14px', color: '#fbbf24', margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                onClick={handleGeniusImport}
                disabled={isProcessing || !geniusUrl.trim()}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: 'var(--secondary)',
                  color: 'var(--secondary-text)',
                  borderRadius: '8px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: isProcessing || !geniusUrl.trim() ? 0.5 : 1,
                }}
              >
                {isProcessing ? 'Fetching...' : 'Fetch Catalog'}
              </button>
            </div>
          )}

          {importType === 'file' && importedSongs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => setImportType(null)}
                style={{
                  fontSize: '14px',
                  color: 'var(--muted-text)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                ← Back
              </button>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--secondary)' : 'var(--panel-border)'}`,
                  borderRadius: '8px',
                  padding: '32px',
                  textAlign: 'center',
                  background: isDragging ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDragging ? 'var(--secondary)' : 'var(--muted-text)'}
                  strokeWidth="2"
                  style={{ margin: '0 auto 16px' }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {isDragging ? (
                  <p style={{ color: 'var(--secondary)', fontWeight: 500 }}>Drop your file here</p>
                ) : (
                  <>
                    <p style={{ color: 'var(--muted-text)', marginBottom: '8px' }}>Drag and drop a file here, or</p>
                    <label style={{ cursor: 'pointer' }}>
                      <span style={{ color: 'var(--secondary)', fontWeight: 500 }}>browse to choose a file</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.xlsx,.xls,.pdf"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        disabled={isProcessing}
                      />
                    </label>
                  </>
                )}
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--muted-text)',
                    marginTop: '8px',
                  }}
                >
                  Supported formats: CSV, TSV, XLSX, PDF
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted-text)',
                    marginTop: '16px',
                  }}
                >
                  Expected columns: title, artist, album, master %, publishing %
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontSize: '14px', color: '#ef4444', margin: 0 }}>{error}</p>
                </div>
              )}

              {isProcessing && (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '2px solid var(--panel-border)',
                      borderTopColor: 'var(--secondary)',
                      borderRadius: '50%',
                      margin: '0 auto',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <p style={{ color: 'var(--muted-text)', marginTop: '16px' }}>Processing file...</p>
                </div>
              )}
            </div>
          )}

          {importedSongs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  Preview ({importedSongs.length} songs)
                </h3>
                <button
                  onClick={() => {
                    setImportedSongs([]);
                    setSelectedSongIds(new Set());
                    setError('');
                  }}
                  style={{
                    fontSize: '14px',
                    color: 'var(--muted-text)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>

              {error && (
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '12px',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p style={{ fontSize: '14px', color: '#fbbf24', margin: 0 }}>{error}</p>
                </div>
              )}

              <div
                style={{
                  maxHeight: '384px',
                  overflowY: 'auto',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                }}
              >
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <thead
                    style={{
                      background: 'var(--input-bg)',
                      position: 'sticky',
                      top: 0,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontWeight: 500,
                          color: 'var(--text)',
                          width: '40px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSongIds.size === importedSongs.length && importedSongs.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th
                        style={{
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: 'var(--text)',
                        }}
                      >
                        Title
                      </th>
                      <th
                        style={{
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: 'var(--text)',
                        }}
                      >
                        Artist
                      </th>
                      <th
                        style={{
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: 'var(--text)',
                        }}
                      >
                        Album
                      </th>
                      <th
                        style={{
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: 'var(--text)',
                        }}
                      >
                        Master %
                      </th>
                      <th
                        style={{
                          padding: '8px 16px',
                          textAlign: 'left',
                          fontWeight: 500,
                          color: 'var(--text)',
                        }}
                      >
                        Publishing %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedSongs.map((song) => (
                      <tr
                        key={song.id}
                        style={{
                          borderTop: '1px solid var(--panel-border)',
                          opacity: selectedSongIds.has(song.id) ? 1 : 0.5,
                          background: selectedSongIds.has(song.id) ? 'transparent' : 'rgba(0,0,0,0.1)',
                        }}
                      >
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedSongIds.has(song.id)}
                            onChange={() => toggleSongSelection(song.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px', color: 'var(--text)' }}>{song.title}</td>
                        <td style={{ padding: '8px 16px', color: 'var(--text)' }}>{song.artist}</td>
                        <td
                          style={{
                            padding: '8px 16px',
                            color: 'var(--muted-text)',
                          }}
                        >
                          {song.album}
                        </td>
                        <td
                          style={{
                            padding: '8px 16px',
                            color: 'var(--secondary)',
                            fontWeight: 500,
                          }}
                        >
                          {song.master_royalty ? `${(song.master_royalty * 100).toFixed(1)}%` : '10.0%'}
                        </td>
                        <td
                          style={{
                            padding: '8px 16px',
                            color: 'var(--secondary)',
                            fontWeight: 500,
                          }}
                        >
                          {song.publishing_royalty ? `${(song.publishing_royalty * 100).toFixed(1)}%` : '10.0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={resetModal}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    fontWeight: 500,
                    background: 'var(--panel-bg)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  disabled={selectedSongIds.size === 0}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: selectedSongIds.size > 0 ? '#22c55e' : '#666',
                    color: '#fff',
                    borderRadius: '8px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: selectedSongIds.size > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: selectedSongIds.size > 0 ? 1 : 0.6,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Import {selectedSongIds.size} of {importedSongs.length} Songs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
