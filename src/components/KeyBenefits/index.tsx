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
    svg: '/img/benefits/data-mesh.svg',
    description:
      'Build federated, domain-driven schemas without losing visibility or control.',
  },
  {
    title: 'Modern Data Stack Support',
    svg: '/img/benefits/modern-stack.svg',
    description:
      'Natively integrates with Postgres, DuckDB, Parquet, Iceberg, Delta Lake, and REST APIs.',
  },
  {
    title: 'Geospatial & Analytical Power',
    svg: '/img/benefits/analytics.svg',
    description:
      'Perform spatial joins, aggregations, and OLAP queries — all in GraphQL.',
  },
  {
    title: 'Cluster-Ready & Extensible',
    svg: '/img/benefits/cluster.svg',
    description:
      'Scale with your workloads or embed the engine directly in your Go services.',
  },
  {
    title: 'Secure by Design',
    svg: '/img/benefits/security.svg',
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
        <h2 className={styles.sectionTitle}>Key Benefits</h2>
        <div className={styles.benefitRow}>
          {benefits.map((benefit, idx) => (
            <BenefitCard key={idx} benefit={benefit} />
          ))}
        </div>
      </div>
    </section>
  );
}