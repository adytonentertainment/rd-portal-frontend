import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button } from '@heroui/react';
import styles from './landing.module.css';

const VeraxLogo = () => {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
      <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M16 8l-6 3v10l6 3 6-3V11l-6-3z" fill="currentColor" />
    </svg>
  );
};

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Navbar maxWidth="xl" className={styles.navbar}>
        <NavbarBrand>
          <VeraxLogo />
          <p className="font-bold text-inherit ml-2">VERAX</p>
        </NavbarBrand>

        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Link color="foreground" href="#features">
              Features
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#pricing">
              Pricing
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="#about">
              About
            </Link>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent justify="end">
          <NavbarItem className="hidden lg:flex">
            <Link href="/login">Login</Link>
          </NavbarItem>
          <NavbarItem>
            <Button as={Link} color="primary" href="/signup" variant="flat">
              Sign Up
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Your music. Your money. Your control.</h1>
        <p className={styles.heroSubtitle}>
          Track royalties, scan contracts, and find missing money — all in one place.
        </p>
        <div className={styles.heroCta}>
          <Button color="primary" size="lg" onClick={() => navigate('/signup')}>
            Get Started Free
          </Button>
          <Button variant="bordered" size="lg" onClick={() => navigate('/login')}>
            Login
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>What does RD do?</h2>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📄</div>
            <h3>Scan your contracts for red flags</h3>
            <p>Upload any deal. See your splits, terms, and what to watch out for.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Track your revenue and catalog</h3>
            <p>Master and publishing royalties. Streaming stats. All in one place.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💰</div>
            <h3>Find missing money</h3>
            <p>Audit your statements. Monitor DSPs for unauthorized usage. Claim what's yours.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h2>Ready to take control?</h2>
        <p>Join thousands of artists managing their music business with RD.</p>
        <Button color="primary" size="lg" onClick={() => navigate('/signup')}>
          Download Free
        </Button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <VeraxLogo />
            <span>VERAX</span>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-of-service">Terms</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <p className={styles.footerCopy}>© 2025 RD. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
