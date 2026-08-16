import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar/NavBar';
import Spacing from '../components/Spacing';

const NotFoundPage = () => {
  useEffect(() => {
    document.title = 'TuneScan - Page Not Found';
  }, []);

  return (
    <>
      <NavBar />
      <Spacing height="100px" />
      <h1 style={{ fontSize: '30px', color: 'white', textAlign: 'center' }}>
        The page you are looking for could not be found.
      </h1>
    </>
  );
};

export default NotFoundPage;
