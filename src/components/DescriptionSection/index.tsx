import React from 'react';
import styles from './styles.module.css';

export default function DescriptionSection() {
  return (
    <section className='margin-top--xl'>
      <div className="container">
        <div className={styles.descriptionGrid}>
          <div className={styles.descriptionVisual}>
            <img
              src='/img/logo.svg'
              alt='Data Access Backend for Applications'
            />
          </div>
          <div className={styles.descriptionContent}>
            <h3 className={styles.headline}>
              Hugr is an <strong>Open Source Data Mesh Platform</strong> and high-performance <strong>GraphQL Backend</strong>.
            </h3>
            <p className={styles.paragraph}>
              Designed for seamless access to <strong>distributed data sources</strong>, advanced analytics, and geospatial processing — Hugr powers <strong>rapid backend development</strong> for applications and BI tools. It provides a <strong>unified GraphQL API</strong> across all your data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}