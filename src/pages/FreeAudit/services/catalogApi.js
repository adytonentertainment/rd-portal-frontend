const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Fetch songs from a Genius producer/songwriter profile
 * @param {string} artistUrl - Genius artist URL
 * @param {number} [limit] - Max songs to return (omit for all)
 */
export async function fetchGeniusCatalog(artistUrl, limit) {
  let url = `${API_URL}/free-audit/genius/catalog?url=${encodeURIComponent(artistUrl)}`;
  if (limit) url += `&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Genius fetch failed (${res.status})`);
  }
  const data = await res.json();
  return data.songs;
}

/**
 * Fetch songs from a Spotify artist profile
 * @param {string} artistUrl - Spotify artist URL
 * @param {number} [limit] - Max songs to return (omit for all)
 */
export async function fetchSpotifyCatalog(artistUrl, limit) {
  let url = `${API_URL}/free-audit/spotify/catalog?url=${encodeURIComponent(artistUrl)}`;
  if (limit) url += `&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Spotify fetch failed (${res.status})`);
  }
  const data = await res.json();
  return data.songs;
}
