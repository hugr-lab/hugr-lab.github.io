import {type ReactNode, useState, useEffect, useRef} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';
import KeyBenefitsSection from '../components/KeyBenefits';
import ListSection from '../components/ListSection';
import DescriptionSection from '../components/DescriptionSection';
import DuckDBSection from '../components/DuckDBSection';
import DataMeshSection from '../components/DataMeshSection';
import TryHugrCTA from '../components/TryHugrCTA';
import JoinUsCTA from '../components/JoinUsCTA';
import SetupSection from '../components/SetupSection';
import FAQSection from '../components/FAQSection';

function HeroNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, {passive: true});
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={clsx(styles.heroNav, scrolled && styles.heroNavScrolled)}>
        <div className={styles.heroNavInner}>
          {/* Mobile: hamburger toggle */}
          <button
            className={styles.heroNavToggle}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className={styles.heroNavLeft}>
            <Link to="/" className={styles.heroNavLogo}>
              <img src="/img/logo-circle.svg" alt="Hugr Lab" />
            </Link>
            <Link to="/docs/overview/" className={styles.heroNavLink}>Docs</Link>
            <Link to="/docs/join-us/" className={styles.heroNavLink}>Join us</Link>
          </div>

          {/* Mobile: logo on the right */}
          <Link to="/" className={styles.heroNavLogoMobile}>
            <img src="/img/logo-circle.svg" alt="Hugr Lab" />
          </Link>

          <div className={styles.heroNavRight}>
            <Link
              to="https://github.com/hugr-lab/hugr"
              className={clsx(styles.heroNavLink, styles.heroNavExternal)}
            >
              GitHub
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '0.3rem'}}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar — outside nav to avoid Safari fixed-in-fixed issues */}
      {sidebarOpen && (
        <div className={styles.heroSidebarBackdrop} onClick={() => setSidebarOpen(false)} />
      )}
      <div className={clsx(styles.heroSidebar, sidebarOpen && styles.heroSidebarOpen)}>
        <div className={styles.heroSidebarHeader}>
          <Link to="/" className={styles.heroNavLogo}>
            <img src="/img/logo-circle.svg" alt="Hugr Lab" />
          </Link>
          <button
            className={styles.heroSidebarClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.heroSidebarLinks}>
          <Link to="/docs/overview/" className={styles.heroSidebarLink} onClick={() => setSidebarOpen(false)}>Docs</Link>
          <Link to="/docs/join-us/" className={styles.heroSidebarLink} onClick={() => setSidebarOpen(false)}>Join Us</Link>
          <Link to="https://github.com/hugr-lab/hugr" className={styles.heroSidebarLink} onClick={() => setSidebarOpen(false)}>GitHub</Link>
        </div>
      </div>
    </>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const [isDesktop, setIsDesktop] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 997px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isDesktop && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isDesktop]);

  return (
    <header className={clsx('hero', styles.heroBanner)}>
      {isDesktop && (
        <video
          ref={videoRef}
          className={styles.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          poster="/img/hero_mobile_smooth.png"
        >
          <source src="/video/heroloop_shifted_up.mp4" type="video/mp4" />
        </video>
      )}
      <div className="container">
        <Heading as="h1" className="hero__title">
          <span className={styles.titleDesktop}>{siteConfig.title}</span>
          <span className={styles.titleMobile}>Unified API for All Your Data</span>
        </Heading>
        <p className="hero__subtitle">One GraphQL layer for all your data.</p>
        <p className="hero__description">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/get-started">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      wrapperClassName='homepage'
      title={`${siteConfig.title}`}
      description="hugr - Open Source Data Mesh platform and high-performance GraphQL backend for distributed data sources">
      <HeroNavbar />
      <HomepageHeader />
      <main className={styles.mainContent}>
        <DescriptionSection />
        <KeyBenefitsSection />
        <DataMeshSection />
        
        {/* Use Cases Section */}
        <section className={styles.useCasesSection}>
          <div className="container">
            <h2 className={clsx('text--center highlighted', styles.sectionHeader)}>Use Cases</h2>
            
            <ListSection
              title='1. Data Access Backend for Applications'
              description='hugr acts as a universal GraphQL layer over data sources:'
              childrenLeft={true}
              bullets={[
                'Rapid API deployment over existing databases and files',
                'Centralized schema and access control',
                'Unified interfaces for apps and BI tools',
                'Minimal manual integration',
                'Ideal for data-first applications'
              ]}
            >
              <img
                src='/img/use-cases/data-backend.svg'
                alt='Data Access Backend for Applications'
              />
            </ListSection>
            
            <ListSection
              title='2. Building Data Mesh Platforms'
              description='hugr is perfect for Data Mesh architecture:'
              childrenLeft={true}
              bullets={[
                'Modular schema definitions',
                'Federated access through a single API',
                'Decentralized data ownership',
                'Domain-specific modeling and scaling',
                'Easy onboarding of teams and data sources'
              ]}
            >
              <img
                src='/img/use-cases/data-mesh-schema.svg'
                alt='Data Mesh Platform Architecture'
              />
            </ListSection>
            
            <ListSection
              title='3. Analytics, DataOps and MLOps Integration'
              description='hugr enables:'
              childrenLeft={true}
              bullets={[
                'Support for OLAP and spatial analytics',
                'Export to Arrow IPC and Python (pandas/GeoDataFrame)',
                'Server-side jq transformations',
                'Caching and scalability for heavy workloads',
                'Integration of ETL/ELT and ML pipeline results'
              ]}
            >
              <img
                src='/img/use-cases/data-ops-integration.svg'
                alt='Analytics and MLOps Integration'
              />
            </ListSection>

            <ListSection
              title='4. Vibe/Agentic Analytics'
              description="hugr MCP powers Vibe's analytics platform by:"
              childrenLeft={true}
              bullets={[
                'Modular schema design for diverse data sources',
                'Summarize data objects and their fields, relationships, functions, modules and data sources descriptions using LLMs to better understand business context',
                'Lazy Hugr schema introspection tools to automatically generate GraphQL queries based on user requests',
                'Allow models to build complex queries over multiple data sources and performs chain of queries to fetch and aggregate data as needed',
                'Allow models to build JQ transformations to process and filter data server-side before returning results to users'
              ]}
            >
              <img
                src='/img/use-cases/vibe.svg'
                alt='Vibe analytics'
              />
            </ListSection>
            
          </div>
        </section>

        <TryHugrCTA />

        <SetupSection />
        <FAQSection />

        <JoinUsCTA />

        <DuckDBSection />
      </main>
    </Layout>
  );
}