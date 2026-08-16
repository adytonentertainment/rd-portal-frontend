import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '../../components/Footer/Footer';
import NavBar from '../../components/NavBar/NavBar';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import styles from './privacypolicy.module.css';

const PrivacyPolicy = () => {
  const { currentTheme } = useContext(ThemeContext);
  const textColor = currentTheme === 'light' ? 'text-gray-900' : 'text-white';

  return (
    <>
      <Helmet>
        <title>RD - Privacy Policy</title>
      </Helmet>
      <NavBar />
      <h1 className={`${textColor} text-center my-8 text-3xl md:text-4xl font-semibold px-4`}>Privacy Policy</h1>
      <div className={`max-w-[800px] mx-auto ${textColor} mb-10 ${styles.pp}`}>
        <p className="text-sm text-gray-500 mb-6">Last updated: February 5, 2025</p>

        <h2>1. Data Controller</h2>
        <p>
          RD UG (haftungsbeschränkt), Am Eichenpark 25, 30823 Garbsen, Germany
          <br />
          Email: <a href="mailto:contact@verax.app">contact@verax.app</a>
        </p>

        <h2>2. Data We Collect</h2>
        <p>We collect:</p>
        <ul>
          <li>Account information (name, email)</li>
          <li>Payment information (processed by our payment provider)</li>
          <li>Content you upload (music catalog data, royalty statements)</li>
          <li>Usage data and device information</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <p>We process your data to:</p>
        <ul>
          <li>Provide and maintain our Service</li>
          <li>Process payments</li>
          <li>Communicate with you</li>
          <li>Improve our Service</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>4. Legal Basis</h2>
        <p>
          We process your data based on: contract performance, legitimate interests, your consent, and legal
          obligations.
        </p>

        <h2>5. Data Sharing</h2>
        <p>
          We share data with service providers (payment processors, hosting, analytics) as necessary to operate the
          Service. We do not sell your data.
        </p>

        <h2>6. International Transfers</h2>
        <p>
          Some service providers are located outside the EU. We use appropriate safeguards such as Standard Contractual
          Clauses for these transfers.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your data as long as your account is active and as required by law. You may request deletion at any
          time.
        </p>

        <h2>8. Your Rights</h2>
        <p>Under GDPR, you have the right to:</p>
        <ul>
          <li>Access your data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion</li>
          <li>Restrict or object to processing</li>
          <li>Data portability</li>
          <li>Withdraw consent</li>
          <li>Lodge a complaint with a supervisory authority</li>
        </ul>

        <h2>9. Contact</h2>
        <p>
          To exercise your rights or for questions, contact us at{' '}
          <a href="mailto:contact@verax.app">contact@verax.app</a>.
        </p>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicy;
