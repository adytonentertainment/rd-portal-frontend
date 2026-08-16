import React from 'react';
import { Helmet } from 'react-helmet-async';
import NavBar from '../../components/NavBar/NavBar';
import styles from './about.module.css';
import Threads from '../../components/Threads/Threads';
import Footer from '../../components/Footer/Footer';

const About = () => {
  return (
    <>
      <Helmet>
        <title>RD - About</title>
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
        <h1 className="text-5xl text-center my-20">Welcome to RD!</h1>
        <div className={styles.aboutText}>
          We are a passionate team of music producers and developers who share a common goal: to empower music creators
          with the tools they need to manage their catalogs, protect their rights, and maximize their earnings. Born out
          of our own experiences in the music industry, we understand the complexities of catalog management, clearance,
          and royalty collection. That's why we created RD—a complete tech solution designed specifically for music
          producers and songwriters who want to maintain their independence.
          <h1>Our Story</h1>
          As creators ourselves, we've encountered the challenges of managing growing catalogs, navigating sample
          clearances, and ensuring we receive every royalty we're owed. Frustrated by fragmented solutions and missed
          opportunities, we combined our industry expertise with technical know-how to build a comprehensive platform
          that addresses all aspects of catalog management. RD was born out of a desire to empower musicians with
          professional-grade tools without the need for traditional management deals that often require giving up
          ownership or control.
          <h1>What We Do</h1>
          RD is your complete catalog management solution. We offer comprehensive services:
          <strong> Financial Dashboard</strong> to view all your revenue in one place,
          <strong> Streaming Analytics</strong> to track performance across platforms,
          <strong> PRO Registration Audit</strong> to ensure proper registration,
          <strong> Master & Publishing Royalty Collection</strong> to maximize your earnings,
          <strong> Catalog Financing</strong> for advances and valuations, and
          <strong> Audio Fingerprinting</strong> to identify unauthorized usage. Our platform puts professional-grade
          tools in your hands, helping you take control of your music business while maintaining your independence.
          <h1>Our Vision</h1>
          We believe that every creator deserves professional tools to manage their catalog and maximize their earnings
          without sacrificing ownership. Our mission is to democratize music rights management by providing producers
          and songwriters with enterprise-level capabilities in an accessible platform. We envision a future where
          technology empowers creators to focus on what they do best—making music—while we handle the complex business
          of catalog management, clearance, and royalty collection. Thank you for trusting RD to be your partner in
          building a sustainable music career. We're excited to be a part of your creative journey, and we're always
          here to support you as you grow your catalog and your business. Welcome aboard!
        </div>
      </div>
      <Footer />
    </>
  );
};

export default About;
