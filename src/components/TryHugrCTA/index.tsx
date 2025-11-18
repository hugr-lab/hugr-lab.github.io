import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const TryHugrCTA: React.FC = () => {
  return (
    <section className={styles.tryHugrSection}>
      <div className="container">
        <div className={styles.content}>
          <h2 className={styles.title}>Try Hugr in Your Workspace</h2>
          <p className={styles.description}>
            Hugr is in early stages of development, and we provide <strong>full support</strong> for new users
            during initial implementation. Leave an issue or start a discussion, and we'll get in touch with
            you to plan the implementation together.
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="https://github.com/hugr-dev/hugr/issues/new"
            >
              Open an Issue
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="https://github.com/hugr-dev/hugr/discussions"
            >
              Start a Discussion
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TryHugrCTA;
