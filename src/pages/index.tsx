import type {ReactNode} from 'react';
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

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/get-started">
            Get Started - 15min ⏱️
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
      title={`${siteConfig.title}`}
      description="hugr - Open Source Data Mesh platform and high-performance GraphQL backend for distributed data sources">
      <HomepageHeader />
      <main className={styles.mainContent}>
        <DescriptionSection />
        <KeyBenefitsSection />
        
        {/* Use Cases Section */}
        <section className={styles.useCasesSection}>
          <div className="container">
            <h2 className={clsx('text--center', styles.sectionHeader)}>Use Cases</h2>
            
            <ListSection
              title='1. Data Access Backend for Applications'
              description='hugr acts as a universal GraphQL layer over data sources:'
              bullets={[
                'Rapid API deployment over existing databases and files',
                'Centralized schema and access control',
                'Unified interfaces for apps and BI tools',
                'Minimal manual integration',
                'Ideal for data-first applications'
              ]}
            >
              <img
                src='/img/use-cases/backend.svg'
                alt='Data Access Backend for Applications'
              />
            </ListSection>
            
            <ListSection
              title='2. Embedding the Engine into Custom Services'
              description="hugr's core is a reusable Go package:"
              bullets={[
                'Can be embedded into your own services',
                'Serves as a query compiler and execution engine',
                'Supports custom Go functions as data sources',
                'Unifies internal and external data in one schema'
              ]}
              childrenLeft={true}
            >
              <img
                src='/img/use-cases/embedded.svg'
                alt='Embedding hugr Engine into Custom Services'
              />
            </ListSection>
            
            <ListSection
              title='3. Building Data Mesh Platforms'
              description='hugr is perfect for Data Mesh architecture:'
              bullets={[
                'Modular schema definitions',
                'Federated access through a single API',
                'Decentralized data ownership',
                'Domain-specific modeling and scaling',
                'Easy onboarding of teams and data sources'
              ]}
            >
              <img
                src='/img/use-cases/data-mesh.svg'
                alt='Data Mesh Platform Architecture'
              />
            </ListSection>
            
            <ListSection
              title='4. Analytics, DataOps and MLOps Integration'
              description='hugr enables:'
              bullets={[
                'Support for OLAP and spatial analytics',
                'Export to Arrow IPC and Python (pandas/GeoDataFrame)',
                'Server-side jq transformations',
                'Caching and scalability for heavy workloads',
                'Integration of ETL/ELT and ML pipeline results'
              ]}
              childrenLeft={true}
            >
              <img
                src='/img/use-cases/data-ops.svg'
                alt='Analytics and MLOps Integration'
              />
            </ListSection>
          </div>
        </section>

        <DuckDBSection />
      </main>
    </Layout>
  );
}