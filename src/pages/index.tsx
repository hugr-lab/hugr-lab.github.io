import {type ReactNode} from 'react';
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

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">One GraphQL layer for all your data.</p>
        <p className="hero__description">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
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

        <DuckDBSection />
      </main>
    </Layout>
  );
}