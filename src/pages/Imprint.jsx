import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import NavBar from '../components/NavBar/NavBar';
import Footer from '../components/Footer/Footer';
import { ThemeContext } from '../components/ThemeProvider/ThemeProvider';

const sectionStyle = {
  marginBottom: '28px',
};

const labelStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  opacity: 0.5,
  marginBottom: '4px',
};

const valueStyle = {
  lineHeight: 1.8,
};

const Imprint = () => {
  const { currentTheme } = useContext(ThemeContext);
  const textColor = currentTheme === 'light' ? 'text-gray-900' : 'text-white';

  return (
    <>
      <Helmet>
        <title>RD - Imprint</title>
      </Helmet>
      <NavBar />
      <h1 className={`${textColor} text-center my-8 text-3xl md:text-4xl font-semibold px-4`}>Imprint</h1>
      <div className={`${textColor}`} style={{ maxWidth: '600px', margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={sectionStyle}>
          <div style={labelStyle}>Company</div>
          <div style={valueStyle}>
            RD UG (haftungsbeschr&auml;nkt)
            <br />
            Am Eichenpark 25
            <br />
            30823 Garbsen, Germany
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Managing Director</div>
          <div style={valueStyle}>C. Meler</div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Contact</div>
          <div style={valueStyle}>
            Email:{' '}
            <a href="mailto:contact@verax.app" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              contact@verax.app
            </a>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Online Dispute Resolution</div>
          <div style={valueStyle}>
            Pursuant to Article 14 (1) ODR Regulation, the European Commission provides a platform for online dispute
            resolution (OS):{' '}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              ec.europa.eu/consumers/odr
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Imprint;
