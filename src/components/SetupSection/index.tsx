import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

type OS = 'mac-linux' | 'windows';
type DatabaseType = 'duckdb' | 'postgresql';

export default function SetupSection(): ReactNode {
  const [selectedOS, setSelectedOS] = useState<OS>('mac-linux');
  const [selectedDB, setSelectedDB] = useState<DatabaseType>('duckdb');

  const dockerCommands = {
    'mac-linux': {
      run: `docker run -d \\
  --name hugr \\
  -p 18000:8080 \\
  ghcr.io/hugr-lab/hugr:latest`,
      stop: 'docker stop hugr',
      logs: 'docker logs -f hugr',
    },
    windows: {
      run: `docker run -d ^
  --name hugr ^
  -p 18000:8080 ^
  ghcr.io/hugr-lab/hugr:latest`,
      stop: 'docker stop hugr',
      logs: 'docker logs -f hugr',
    },
  };

  const databaseExamples = {
    duckdb: {
      title: 'Connect DuckDB Database',
      description: 'Use DuckDB as an embedded analytical database with auto-generated schema',
      mutation: `mutation AddDuckDBSource {
  core {
    insert_data_sources(data: {
      name: "analytics"
      type: "duckdb"
      description: "DuckDB analytics database"
      path: "/data/analytics.db"
      as_module: true
      self_defined: true
    }) {
      name
      type
    }
  }
}

# Load the data source
mutation LoadDuckDBSource {
  function {
    core {
      load_data_source(name: "analytics") {
        success
        message
      }
    }
  }
}`,
    },
    postgresql: {
      title: 'Connect PostgreSQL Database',
      description: 'Connect to PostgreSQL with full OLTP support',
      mutation: `mutation AddPostgreSQLSource {
  core {
    insert_data_sources(data: {
      name: "production"
      type: "postgres"
      description: "Production PostgreSQL database"
      path: "postgres://user:password@localhost:5432/mydb"
      as_module: true
      catalogs: [
        {
          name: "schema"
          type: "uri"
          description: "Schema definition"
          path: "/schemas"
        }
      ]
    }) {
      name
      type
    }
  }
}

# Load the data source
mutation LoadPostgreSQLSource {
  function {
    core {
      load_data_source(name: "production") {
        success
        message
      }
    }
  }
}`,
    },
  };

  return (
    <section className={styles.setupSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Quick <span className="highlighted">Setup</span>
        </Heading>

        <div className={styles.setupContent}>
          {/* Docker Setup */}
          <div className={styles.setupBlock}>
            <Heading as="h3" className={styles.blockTitle}>
              1. Run hugr in Docker
            </Heading>

            <div className={styles.osTabs}>
              <button
                className={`${styles.tabButton} ${selectedOS === 'mac-linux' ? styles.active : ''}`}
                onClick={() => setSelectedOS('mac-linux')}
              >
                Mac / Linux
              </button>
              <button
                className={`${styles.tabButton} ${selectedOS === 'windows' ? styles.active : ''}`}
                onClick={() => setSelectedOS('windows')}
              >
                Windows
              </button>
            </div>

            <div className={styles.commandBlock}>
              <p className={styles.commandLabel}>Start hugr container:</p>
              <CodeBlock language="bash">
                {dockerCommands[selectedOS].run}
              </CodeBlock>

              <p className={styles.commandLabel}>Access the admin UI:</p>
              <CodeBlock language="text">
                http://localhost:18000/admin
              </CodeBlock>

              <div className={styles.commandRow}>
                <div className={styles.commandColumn}>
                  <p className={styles.commandLabel}>Stop container:</p>
                  <CodeBlock language="bash">
                    {dockerCommands[selectedOS].stop}
                  </CodeBlock>
                </div>
                <div className={styles.commandColumn}>
                  <p className={styles.commandLabel}>View logs:</p>
                  <CodeBlock language="bash">
                    {dockerCommands[selectedOS].logs}
                  </CodeBlock>
                </div>
              </div>
            </div>
          </div>

          {/* Database Connection */}
          <div className={styles.setupBlock}>
            <Heading as="h3" className={styles.blockTitle}>
              2. Connect Your Database
            </Heading>

            <div className={styles.dbTabs}>
              <button
                className={`${styles.tabButton} ${selectedDB === 'duckdb' ? styles.active : ''}`}
                onClick={() => setSelectedDB('duckdb')}
              >
                DuckDB
              </button>
              <button
                className={`${styles.tabButton} ${selectedDB === 'postgresql' ? styles.active : ''}`}
                onClick={() => setSelectedDB('postgresql')}
              >
                PostgreSQL
              </button>
            </div>

            <div className={styles.dbExample}>
              <Heading as="h4" className={styles.exampleTitle}>
                {databaseExamples[selectedDB].title}
              </Heading>
              <p className={styles.exampleDescription}>
                {databaseExamples[selectedDB].description}
              </p>
              <CodeBlock language="graphql">
                {databaseExamples[selectedDB].mutation}
              </CodeBlock>
              <p className={styles.helpText}>
                Execute this mutation in the admin UI at{' '}
                <code>http://localhost:18000/admin</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
