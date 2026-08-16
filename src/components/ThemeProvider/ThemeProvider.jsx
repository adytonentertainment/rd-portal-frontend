import { createContext, useState, useMemo } from 'react';
import { changeTheme } from '../../misc/helper';

const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') ?? 'dark');

  const toggleTheme = () => {
    let nextTheme = currentTheme;
    if (nextTheme === 'dark') nextTheme = 'light';
    else if (nextTheme === 'light') nextTheme = 'dark';
    changeTheme(nextTheme);
    setCurrentTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={useMemo(() => ({ currentTheme, toggleTheme }), [currentTheme, toggleTheme])}>
      {children}
    </ThemeContext.Provider>
  );
};
export { ThemeContext, ThemeProvider };
