import axios from 'axios';
import urlJoin from 'url-join';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Songstats API service for TuneScan frontend
 */
class SongstatsAPI {
  /**
   * Get authorization headers
   */
  static getHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Search for tracks in Songstats
   * @param {string} query - Search query (track name and/or artist)
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Object>} Search results
   */
  static async searchTracks(query, limit = 10) {
    try {
      const response = await axios.get(
        urlJoin(BASE_URL, `songstats/search?q=${encodeURIComponent(query)}&limit=${limit}`),
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error(`Error searching Songstats for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Fetch Songstats data for a specific track
   * @param {string} trackId - Spotify track ID
   * @returns {Promise<Object>} Track data with stats
   */
  static async fetchTrackData(trackId) {
    try {
      const response = await axios.post(
        urlJoin(BASE_URL, `songstats/fetch/${trackId}`),
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching Songstats data for track ${trackId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch Songstats data for all tracks in user's catalog
   * @returns {Promise<Object>} Batch fetch results
   */
  static async fetchAllTracks() {
    try {
      const response = await axios.post(urlJoin(BASE_URL, 'songstats/fetch-all'), {}, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Error fetching Songstats data for all tracks:', error);
      throw error;
    }
  }

  /**
   * Format Songstats data for displaying platform stats
   * @param {Object} data - Raw Songstats data from backend
   * @returns {Object} Formatted platform stats
   */
  static formatPlatformStats(data) {
    if (!data || !data.data) {
      return {
        platforms: [],
        total: 0,
      };
    }

    const platforms = [];
    let total = 0;

    // Spotify
    if (data.data.spotify) {
      platforms.push({
        name: 'Spotify',
        icon: '🎵',
        color: '#1DB954',
        count: data.data.spotify,
        formatted: data.data.spotify.toLocaleString(),
      });
      total += data.data.spotify;
    }

    // Apple Music
    if (data.data.apple_music) {
      platforms.push({
        name: 'Apple Music',
        icon: '🍎',
        color: '#FA243C',
        count: data.data.apple_music,
        formatted: data.data.apple_music.toLocaleString(),
      });
      total += data.data.apple_music;
    }

    // YouTube
    if (data.data.youtube) {
      platforms.push({
        name: 'YouTube',
        icon: '📹',
        color: '#FF0000',
        count: data.data.youtube,
        formatted: data.data.youtube.toLocaleString(),
      });
      total += data.data.youtube;
    }

    return {
      platforms,
      total,
      formatted_total: total.toLocaleString(),
      timestamp: data.data.timestamp,
    };
  }

  /**
   * Format Songstats data for Chart.js
   * @param {Object} data - Raw Songstats data
   * @returns {Object} Formatted data for charts
   */
  static formatForCharts(data) {
    if (!data || !data.data) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = [];
    const spotifyData = [];
    const appleMusicData = [];
    const youtubeData = [];

    // For now, show current values as a single data point
    // In the future, this can be extended to show historical data
    labels.push('Current');

    if (data.data.spotify) spotifyData.push(data.data.spotify);
    if (data.data.apple_music) appleMusicData.push(data.data.apple_music);
    if (data.data.youtube) youtubeData.push(data.data.youtube);

    const datasets = [];

    if (spotifyData.length > 0) {
      datasets.push({
        label: 'Spotify Streams',
        data: spotifyData,
        borderColor: '#1DB954',
        backgroundColor: 'rgba(29, 185, 84, 0.1)',
      });
    }

    if (appleMusicData.length > 0) {
      datasets.push({
        label: 'Apple Music Plays',
        data: appleMusicData,
        borderColor: '#FA243C',
        backgroundColor: 'rgba(250, 36, 60, 0.1)',
      });
    }

    if (youtubeData.length > 0) {
      datasets.push({
        label: 'YouTube Views',
        data: youtubeData,
        borderColor: '#FF0000',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
      });
    }

    return {
      labels,
      datasets,
    };
  }
}

export default SongstatsAPI;
