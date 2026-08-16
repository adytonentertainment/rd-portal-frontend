import { useContext, useEffect, useState } from 'react';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import { changeTheme } from '../../../misc/helper';
import styles from './themebutton.css';
import { ThemeContext } from '../../ThemeProvider/ThemeProvider';

const ThemeButton = () => {
  const theme = useContext(ThemeContext);

  return (
    <>
      <div onClick={theme.toggleTheme} className="theme-button">
        {theme.currentTheme === 'light' ? (
          <MdLightMode size="20" className="theme-logo" />
        ) : (
          <MdDarkMode size="20" className="theme-logo" />
        )}
      </div>
    </>
  );
};

export default ThemeButton;
