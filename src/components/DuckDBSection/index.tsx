import React from 'react';
import styles from './styles.module.css';

const DuckDBSection: React.FC = () => {
  return (
    <section className={styles.duckdbSection}>
      <div className="container">
        <div className={styles.content}>
          <div className={styles.logoContainer}>
            <a 
              href="https://duckdb.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.logoLink}
            >
              <img 
                src="/img/duckdb-logo.svg" 
                alt="DuckDB Logo" 
                className={styles.logo}
              />
            </a>
          </div>
          <div className={styles.textContent}>
            <h3 className={styles.title}>Powered by DuckDB</h3>
            <p className={styles.description}>
              hugr leverages <strong>DuckDB</strong> - the blazing-fast in-process analytical database - as its core engine. 
              This enables lightning-speed cross-source JOINs and aggregations directly in memory, combining data from 
              PostgreSQL, S3 Parquet files, CSV, and geospatial formats in a single GraphQL query. With zero network 
              latency and OLAP-optimized performance, DuckDB makes hugr the perfect choice for analytic workloads 
              and data mesh architectures.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DuckDBSection;