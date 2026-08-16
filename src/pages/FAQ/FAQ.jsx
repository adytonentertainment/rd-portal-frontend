import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NavBar from '../../components/NavBar/NavBar';
import { useNavigate } from 'react-router-dom';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import Accordion from '../../components/Accordion/Accordion';
import styles from './faq.module.css';
import Threads from '../../components/Threads/Threads';
import Footer from '../../components/Footer/Footer';

const FAQ = () => {
  const navigate = useNavigate();

  const [accordionStates, setAccordionStates] = useState([
    [false, false],
    [false, false, false],
    [false],
    [false, false],
    [false, false],
  ]);

  const handleOpenOrCloseAccordion = (groupIndex, index, value) => {
    const currentState = [...accordionStates];
    const currentGroup = currentState[groupIndex];
    const newGroup = new Array(currentGroup.length).fill(false);
    newGroup[index] = value;
    currentState[groupIndex] = newGroup;
    setAccordionStates(currentState);
  };

  return (
    <>
      <Helmet>
        <title>RD - FAQ</title>
      </Helmet>
      {/* Threads Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -5,
        }}
      >
        <Threads amplitude={1} distance={0} enableMouseInteraction={true} />
      </div>
      <NavBar />
      <div className={styles.container}>
        <h1 className="text-5xl text-center my-20">Frequently Asked Questions</h1>
        <div className={styles.faqIntro}>
          If you have any questions regarding our services, this page might help you. If you can't find a solution,
          please{' '}
          <span style={{ display: 'inline-block' }}>
            <FlatButton onClick={() => navigate('/contact')}>Contact Us</FlatButton>
          </span>
        </div>
        <div className={styles.accordions}>
          <h1>General</h1>
          <Accordion
            title="What is RD?"
            isExpanded={accordionStates[0][0]}
            onClick={() => {
              handleOpenOrCloseAccordion(0, 0, !accordionStates[0][0]);
            }}
          >
            RD is catalog management infrastructure for creators and rights holders. We provide tools for financial
            tracking, royalty collection, publishing administration, and audio fingerprinting — all without requiring
            long-term management deals or giving up equity.
          </Accordion>
          <Accordion
            title="How does RD help me as a music producer?"
            isExpanded={accordionStates[0][1]}
            onClick={() => {
              handleOpenOrCloseAccordion(0, 1, !accordionStates[0][1]);
            }}
          >
            RD helps you manage your catalog business independently. We provide streaming analytics, financial
            dashboards, royalty collection services, and audio fingerprinting to identify unauthorized usage — all while
            you maintain full ownership and control of your work.
          </Accordion>
          <h1>How It Works</h1>
          <Accordion
            title="How does the audio fingerprinting process work?"
            isExpanded={accordionStates[1][0]}
            onClick={() => {
              handleOpenOrCloseAccordion(1, 0, !accordionStates[1][0]);
            }}
          >
            Our system analyzes the unique characteristics of your audio file to create a digital fingerprint. This
            fingerprint is then compared against an extensive database to quickly identify any matches or unauthorized
            usage.
          </Accordion>
          <Accordion
            title="What file formats can I upload?"
            isExpanded={accordionStates[1][1]}
            onClick={() => {
              handleOpenOrCloseAccordion(1, 1, !accordionStates[1][1]);
            }}
          >
            We support a wide range of popular audio file formats, including MP3, WAV, and more. If you have a specific
            format in mind, feel free to reach out to our support team for confirmation.
          </Accordion>
          <Accordion
            title="How long does a scan usually take?"
            isExpanded={accordionStates[1][2]}
            onClick={() => {
              handleOpenOrCloseAccordion(1, 2, !accordionStates[1][2]);
            }}
          >
            Most scans are completed within seconds, allowing you to receive results quickly and take any necessary
            action without delay.
          </Accordion>
          <h1>Security & Data</h1>
          <Accordion
            title="Is my music data secure?"
            isExpanded={accordionStates[2][0]}
            onClick={() => {
              handleOpenOrCloseAccordion(2, 0, !accordionStates[2][0]);
            }}
          >
            Absolutely. We prioritize your data security by using robust encryption and following industry best
            practices to ensure that your uploads remain confidential and protected.
          </Accordion>
          <h1>Legal & Support</h1>
          <Accordion
            title="Do you offer legal advice or support?"
            isExpanded={accordionStates[3][0]}
            onClick={() => {
              handleOpenOrCloseAccordion(3, 0, !accordionStates[3][0]);
            }}
          >
            Yes, we offer legal support. If our system detects potential unauthorized usage of your work, you can
            contact us via email. Our team will review the situation and assist you in further investigating the issue,
            ensuring you have the information needed to take the next steps.
          </Accordion>
          <Accordion
            title="Who do I contact if I need further help or have additional questions?"
            isExpanded={accordionStates[3][1]}
            onClick={() => {
              handleOpenOrCloseAccordion(3, 1, !accordionStates[3][1]);
            }}
          >
            Our dedicated support team is here for you. You can reach us via email on our website for any inquiries or
            assistance you might need.
          </Accordion>
          <h1>Pricing & Getting Started</h1>
          <Accordion
            title="How does pricing work?"
            isExpanded={accordionStates[4][0]}
            onClick={() => {
              handleOpenOrCloseAccordion(4, 0, !accordionStates[4][0]);
            }}
          >
            We offer flexible subscription plans designed to meet various needs, from independent producers to larger
            publishers. Visit our pricing page for detailed information on plans and features.
          </Accordion>
          <Accordion
            title="How can I get started?"
            isExpanded={accordionStates[4][1]}
            onClick={() => {
              handleOpenOrCloseAccordion(4, 1, !accordionStates[4][1]);
            }}
          >
            Getting started is simple. Request a free audit on our homepage and we will analyze your catalog for
            registration gaps, uncollected royalties, and unauthorized usage. From there you can choose the plan that
            fits your needs.
          </Accordion>
        </div>
        <div className={styles.faqOutro}>
          If you have any other questions or need further assistance:
          <div style={{ marginTop: '1rem' }}>
            <FlatButton className="primary" onClick={() => navigate('/contact')}>
              Contact Us
            </FlatButton>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default FAQ;
