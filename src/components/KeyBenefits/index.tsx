import type { ReactNode } from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

interface Benefit {
  title: string;
  svg: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    title: 'Data Mesh–Ready',
    svg: '/img/benefits/data-mesh-logo.svg',
    description:
      'Build federated, domain-driven schemas without losing visibility or control.',
  },
  {
    title: 'Geospatial & Analytical Power',
    svg: '/img/benefits/analytics-logo.svg',
    description:
    'Perform spatial joins, aggregations, and OLAP queries — all in GraphQL.',
  },
  {
    title: 'Modern Data Stack Support',
    svg: '/img/benefits/modern-stack-logo.svg',
    description:
      'Natively integrates with Postgres, DuckDB, Parquet, Iceberg, Delta Lake, and REST APIs.',
  },
  {
    title: 'Cluster-Ready & Extensible',
    svg: '/img/benefits/cluster-logo.svg',
    description:
      'Scale with your workloads or embed the engine directly in your Go services.',
  },
  {
    title: 'Talk-to-data',
    svg: '/img/benefits/talk-to-data-logo.svg',
    description:
      'Comming soon! Leverage natural language queries to access and analyze your data effortlessly.',
  },
  {
    title: 'Secure by Design',
    svg: '/img/benefits/security-logo.svg',
    description:
      'Enforce fine-grained access policies with built-in authentication and role-based permissions.',
  },
];

interface BenefitCardProps {
  benefit: Benefit;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ benefit }) => (
  <div className={styles.benefitItem}>
    <div className={styles.iconContainer}>
      <img
        className={styles.keySvg}
        src={benefit.svg}
        alt={benefit.title}
        role="img"
      />
    </div>
    <Heading as="h3" className={styles.benefitTitle}>
      {benefit.title}
    </Heading>
    <p className={styles.benefitDescription}>
      {benefit.description}
    </p>
  </div>
);

export default function KeyBenefitsSection(): ReactNode {
  return (
    <section className={styles.benefits}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Key <span className='highlighted'>Benefits</span></h2>
        <div className={styles.benefitRow}>
          {benefits.map((benefit, idx) => (
            <BenefitCard key={idx} benefit={benefit} />
          ))}
        </div>
      </div>
    </section>
  );
}