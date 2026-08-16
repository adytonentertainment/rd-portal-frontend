import { useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import NavBar from '../../components/NavBar/NavBar';
import Footer from '../../components/Footer/Footer';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import styles from './termsofservice.module.css';

const TermsOfService = () => {
  const { currentTheme } = useContext(ThemeContext);
  const textColor = currentTheme === 'light' ? 'text-gray-900' : 'text-white';

  return (
    <>
      <Helmet>
        <title>RD - Terms of Service</title>
      </Helmet>
      <NavBar />
      <h1 className={`${textColor} text-center my-8 text-3xl md:text-4xl font-semibold px-4`}>Terms of Service</h1>
      <div className={`max-w-[800px] mx-auto ${textColor} mb-10 ${styles.tos}`}>
        <p className="text-sm text-gray-500 mb-6">Last updated: February 5, 2025</p>

        <h2>1. Provider</h2>
        <p>
          RD UG (haftungsbeschränkt), Am Eichenpark 25, 30823 Garbsen, Germany
          <br />
          Email: <a href="mailto:contact@verax.app">contact@verax.app</a>
        </p>

        <h2>2. Service</h2>
        <p>
          RD provides a music royalty tracking and analytics platform. By using the Service, you agree to these Terms.
        </p>

        <h2>3. Account</h2>
        <p>
          You must be 18+ to use the Service. You are responsible for your account security and all activity under your
          account.
        </p>

        <h2>4. Subscriptions</h2>
        <p>
          Subscriptions renew automatically. You may cancel anytime through your account settings. Cancellation takes
          effect at the end of the current billing period.
        </p>

        <h2>5. Right of Withdrawal</h2>
        <p>
          If you are a consumer in the EU, you have the right to withdraw from this contract within 14 days without
          giving any reason. To withdraw, contact us at <a href="mailto:contact@verax.app">contact@verax.app</a> with a
          clear statement of your decision.
        </p>

        <h2>6. Your Content</h2>
        <p>
          You retain rights to content you upload. You grant us a license to process and display your content to provide
          the Service.
        </p>

        <h2>7. Acceptable Use</h2>
        <p>
          You agree not to use the Service for unlawful purposes, attempt unauthorized access, or interfere with the
          Service.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>The Service and its content are owned by RD UG and protected by intellectual property laws.</p>

        <h2>9. Disclaimer</h2>
        <p>
          The Service is provided "as is" without warranties. We do not guarantee accuracy of third-party data or
          uninterrupted availability.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the extent permitted by law, we are not liable for indirect damages. This does not affect liability for
          intent, gross negligence, or injury to life, body, or health under German law.
        </p>

        <h2>11. Termination</h2>
        <p>
          We may terminate your account for breach of these Terms. You may terminate anytime by closing your account.
        </p>

        <h2>12. Changes</h2>
        <p>We may modify these Terms with 30 days notice. Continued use after changes constitutes acceptance.</p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by German law. For consumers, statutory jurisdiction rules apply. The EU ODR platform
          is available at{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions? Contact us at <a href="mailto:contact@verax.app">contact@verax.app</a>.
        </p>
      </div>
      <Footer />
    </>
  );
};

export default TermsOfService;
