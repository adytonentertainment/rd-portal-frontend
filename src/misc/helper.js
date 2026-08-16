import axios from 'axios';

/**
 * Performs an HTTP request to the TuneScan backend server.
 */
const makeRequest = async ({ url, method = 'GET', data = {}, isProtectedRoute = true }) => {
  const token = localStorage.getItem('token');
  if (isProtectedRoute && !token) window.location.href = '/';
  try {
    const response = await axios({
      url,
      method,
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data,
    });
    if (response.ok) {
      return {
        response: response.data,
      };
    } else {
      return {
        code: response.status,
        detail: response.data,
      };
    }
  } catch (error) {
    return {
      code: error.response ? error.response.status : 400,
      detail: 'An error has occured.',
    };
  }
};

const changeTheme = (theme) => {
  if (!theme) theme = 'dark';
  if (theme !== 'light' && theme !== 'dark')
    throw new Error("The theme parameter needs to be either 'light' or 'dark'.");
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  // save as cookie
  localStorage.setItem('theme', theme);
};

const getCurrentTheme = () => {
  const themeCookie = localStorage.getItem('theme');
  if (!themeCookie) {
    const hasDarkOS = window.matchMedia('(prefers-color-scheme: dark)');
    return hasDarkOS ? 'dark' : 'light';
  } else return themeCookie;
};

const generateRandomString = (length) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const handleSpotifyAuth = (redirectUri) => {
  const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const state = 'spotify' + generateRandomString(16);
  const scope = 'user-read-private user-library-read';

  let url = 'https://accounts.spotify.com/authorize';
  url += '?response_type=token';
  url += '&client_id=' + encodeURIComponent(clientId);
  url += '&scope=' + encodeURIComponent(scope);
  url += '&redirect_uri=' + encodeURIComponent(redirectUri);
  url += '&state=' + encodeURIComponent(state);

  window.location.href = url;
};

const handleGeniusAuth = (redirectUri) => {
  const clientId = process.env.REACT_APP_GENIUS_CLIENT_ID;
  const state = 'genius' + generateRandomString(16);
  const scope = 'me';

  let url = 'https://api.genius.com/oauth/authorize';
  url += '?response_type=token';
  url += '&client_id=' + encodeURIComponent(clientId);
  url += '&scope=' + encodeURIComponent(scope);
  url += '&redirect_uri=' + encodeURIComponent(redirectUri);
  url += '&state=' + encodeURIComponent(state);

  window.location.href = url;
};

const isValidHttpUrl = (string) => {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
};

const isValidEmailAddress = (email) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
};

export {
  makeRequest,
  changeTheme,
  getCurrentTheme,
  handleGeniusAuth,
  handleSpotifyAuth,
  generateRandomString,
  isValidHttpUrl,
  isValidEmailAddress,
};
