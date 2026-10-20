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

export { changeTheme, getCurrentTheme, isValidHttpUrl, isValidEmailAddress };
