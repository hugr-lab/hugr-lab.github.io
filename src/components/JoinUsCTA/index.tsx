import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const JoinUsCTA: React.FC = () => {
  return (
    <section className={styles.joinUsSection}>
      <div className="container">
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h2 className={styles.title}>Join Our Community</h2>
            <p className={styles.description}>
              We are building an open-source Data Mesh platform and high-performance GraphQL backend.
              Whether you're interested in database internals, distributed systems, analytics, or GraphQL,
              there's a place for you in our community.
            </p>
            <p className={styles.description}>
              <strong>All repositories are open source and licensed under MIT</strong>, making them free
              to use for both commercial and non-commercial purposes.
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg"
                to="/docs/join-us"
              >
                Learn How to Contribute
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="https://github.com/hugr-lab/hugr/discussions"
              >
                Join Discussions
              </Link>
            </div>
          </div>
          <div className={styles.imageContainer}>
            <img
              src="/img/logo-circle.svg"
              alt="Join Hugr Community"
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinUsCTA;
