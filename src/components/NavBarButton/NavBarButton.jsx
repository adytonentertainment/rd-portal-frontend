import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import styles from './navbarbutton.css';

const NavBarButton = ({ text, to }) => {
  const { currentTheme } = useContext(ThemeContext);

  return (
    <Link className="navbar-button" to={to} data-theme={currentTheme}>
      {text}
    </Link>
  );
};

export default NavBarButton;
