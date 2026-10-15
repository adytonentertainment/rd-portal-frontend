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

export { makeRequest, changeTheme, getCurrentTheme, isValidHttpUrl, isValidEmailAddress };
