import axios from 'axios';
import urlJoin from 'url-join';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Soundcharts API service for TuneScan frontend
 */
class SoundchartsAPI {
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
   * Get all Soundcharts data for a specific track by ISRC
   * @param {string} isrc - The ISRC code of the track
   * @returns {Promise<Object>} Soundcharts data
   */
  static async getTrackData(isrc) {
    try {
      const response = await axios.get(urlJoin(BASE_URL, `soundcharts/track/${isrc}`), { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error(`Error fetching Soundcharts data for ${isrc}:`, error);
      throw error;
    }
  }

  /**
   * Get streaming metrics for a track
   * @param {string} isrc - The ISRC code
   * @param {string} dateRange - Date range (e.g., '30d', '90d')
   * @returns {Promise<Object>} Streaming metrics
   */
  static async getStreamingMetrics(isrc, dateRange = '30d') {
    try {
      const response = await axios.get(urlJoin(BASE_URL, `soundcharts/streaming/${isrc}?date_range=${dateRange}`), {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching streaming metrics for ${isrc}:`, error);
      throw error;
    }
  }

  /**
   * Get chart positions for a track
   * @param {string} isrc - The ISRC code
   * @returns {Promise<Object>} Chart data
   */
  static async getChartPositions(isrc) {
    try {
      const response = await axios.get(urlJoin(BASE_URL, `soundcharts/charts/${isrc}`), { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error(`Error fetching chart positions for ${isrc}:`, error);
      throw error;
    }
  }

  /**
   * Sync all catalog tracks with Soundcharts
   * @returns {Promise<Object>} Sync results
   */
  static async syncCatalog() {
    try {
      const response = await axios.post(urlJoin(BASE_URL, 'soundcharts/sync'), {}, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Error syncing catalog with Soundcharts:', error);
      throw error;
    }
  }

  /**
   * Get combined metrics for all tracks (for graphs)
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Object>} Combined metrics
   */
  static async getCombinedMetrics(startDate, endDate) {
    try {
      let url = urlJoin(BASE_URL, 'soundcharts/combined-metrics');
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Error fetching combined metrics:', error);
      throw error;
    }
  }

  /**
   * Format Soundcharts data for Chart.js
   * @param {Object} data - Raw Soundcharts data
   * @returns {Object} Formatted data for charts
   */
  static formatForCharts(data) {
    if (!data || !data.streaming) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const datasets = [];

    // Spotify data
    if (data.streaming.spotify) {
      datasets.push({
        label: 'Spotify Monthly Listeners',
        data: data.streaming.spotify.monthly_listeners || 0,
        borderColor: '#1DB954',
        backgroundColor: 'rgba(29, 185, 84, 0.1)',
      });
    }

    // YouTube data
    if (data.streaming.youtube) {
      datasets.push({
        label: 'YouTube Views',
        data: data.streaming.youtube.views || 0,
        borderColor: '#FF0000',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
      });
    }

    // Apple Music data
    if (data.streaming.apple_music) {
      datasets.push({
        label: 'Apple Music Plays',
        data: data.streaming.apple_music.plays || 0,
        borderColor: '#FA243C',
        backgroundColor: 'rgba(250, 36, 60, 0.1)',
      });
    }

    return {
      labels: ['Current'],
      datasets,
    };
  }
}

export default SoundchartsAPI;
