import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './styles.module.css';
import Heading from '@theme/Heading';

interface FAQItem {
  question: string;
  answer: ReactNode;
}

const faqItems: FAQItem[] = [
  {
    question: 'What is hugr?',
    answer: (
      <>
        <p>
          hugr is an open-source Data Mesh platform and high-performance GraphQL backend
          for accessing distributed data sources. It provides a unified GraphQL API across
          diverse sources including databases (PostgreSQL, MySQL, DuckDB), file formats
          (Parquet, Iceberg, Delta Lake), and REST APIs.
        </p>
        <p>
          hugr enables rapid API development, analytics & BI, geospatial processing,
          and serves as a universal data access layer for applications.
        </p>
      </>
    ),
  },
  {
    question: 'What is Data Mesh?',
    answer: (
      <>
        <p>
          Data Mesh is a decentralized approach to data architecture that treats data
          as a product, with domain-specific ownership. hugr enables Data Mesh by providing:
        </p>
        <ul>
          <li>Modular schema definitions that can be reused across different sources</li>
          <li>Federated access through a single GraphQL API</li>
          <li>Domain-specific modeling and independent scaling</li>
          <li>Decentralized data ownership while maintaining unified access</li>
        </ul>
      </>
    ),
  },
  {
    question: 'What data sources are supported?',
    answer: (
      <>
        <p>hugr supports multiple data source types:</p>
        <ul>
          <li><strong>Relational Databases:</strong> DuckDB, PostgreSQL (with PostGIS, TimescaleDB, pgvector), MySQL</li>
          <li><strong>File Formats:</strong> Parquet, Apache Iceberg, Delta Lake, CSV, JSON</li>
          <li><strong>Spatial Formats:</strong> GeoParquet, GeoJSON, Shapefiles (GDAL compatible)</li>
          <li><strong>Services:</strong> REST APIs with authentication (HTTP Basic, ApiKey, OAuth2)</li>
          <li><strong>Storage:</strong> Local files and cloud object storage (S3-compatible)</li>
          <li><strong>Coming Soon:</strong> DuckLake - a data lake solution for managing large volumes of data with snapshot-based schema evolution</li>
        </ul>
      </>
    ),
  },
  {
    question: 'How are data sources described?',
    answer: (
      <>
        <p>
          Data sources are described using GraphQL SDL (Schema Definition Language)
          with hugr-specific directives. Key directives include:
        </p>
        <ul>
          <li><code>@table</code> - Define database tables</li>
          <li><code>@view</code> - Define views with SQL expressions</li>
          <li><code>@field_references</code> - Define relationships between tables</li>
          <li><code>@join</code> - Define subquery fields in schema for data selection</li>
          <li><code>@module</code> - Organize schema into logical modules</li>
          <li><code>@function</code> - Define custom functions</li>
        </ul>
        <p>
          Schema files are stored in catalogs and can be located in file systems,
          HTTP endpoints, or S3 buckets.
        </p>
      </>
    ),
  },
  {
    question: 'What types of queries and mutations can be performed on tabular data?',
    answer: (
      <>
        <p><strong>Queries:</strong></p>
        <ul>
          <li>Basic CRUD operations with filtering, sorting, and pagination</li>
          <li>Complex aggregations (count, sum, avg, min, max) and bucket aggregations</li>
          <li>Cross-source queries and relationships</li>
          <li>Spatial joins and geospatial operations</li>
          <li>Vector search for semantic similarity</li>
        </ul>
        <p><strong>Mutations:</strong></p>
        <ul>
          <li>Insert records with nested relations</li>
          <li>Update multiple records with filters</li>
          <li>Delete with conditional filters</li>
          <li>Full transaction support within single requests</li>
        </ul>
      </>
    ),
  },
  {
    question: 'Is caching supported?',
    answer: (
      <>
        <p>
          Yes, hugr provides a comprehensive two-level caching system:
        </p>
        <ul>
          <li><strong>L1 Cache (In-Memory):</strong> Fast local cache for quick access</li>
          <li><strong>L2 Cache (Distributed):</strong> Redis/Memcached for shared cache across cluster nodes</li>
        </ul>
        <p>
          Caching is controlled via directives:
        </p>
        <ul>
          <li><code>@cache</code> - Enable caching with configurable TTL and tags</li>
          <li><code>@no_cache</code> - Disable caching for real-time data</li>
          <li><code>@invalidate_cache</code> - Force cache refresh</li>
        </ul>
        <p>
          Automatic cache invalidation occurs on mutations based on tags.
        </p>
      </>
    ),
  },
  {
    question: 'What authentication methods are supported?',
    answer: (
      <>
        <p>hugr supports multiple authentication methods:</p>
        <ul>
          <li><strong>API Keys:</strong> Static keys for service-to-service communication, with support for managed keys stored in database</li>
          <li><strong>OAuth2/JWT:</strong> Token-based authentication with standard JWT claims and custom claim mapping</li>
          <li><strong>OIDC:</strong> OpenID Connect for enterprise identity providers (Google, Auth0, Keycloak, Azure AD)</li>
          <li><strong>Anonymous:</strong> Unauthenticated access with limited permissions</li>
        </ul>
        <p>
          Multiple methods can be enabled simultaneously, and hugr tries each in order.
        </p>
      </>
    ),
  },
  {
    question: 'How are permissions and roles configured?',
    answer: (
      <>
        <p>
          hugr uses role-based access control (RBAC) managed through GraphQL API:
        </p>
        <ul>
          <li><strong>Roles:</strong> Define user roles in the <code>roles</code> table</li>
          <li><strong>Permissions:</strong> Configure field-level and type-level access in <code>role_permissions</code> table</li>
          <li><strong>Row-Level Security:</strong> Apply mandatory filters to restrict data access</li>
          <li><strong>Default Values:</strong> Auto-inject values in mutations (e.g., user_id, tenant_id)</li>
        </ul>
        <p>
          Permissions support wildcards (<code>*</code>) for broad rules with specific exceptions.
          Access is open by default; add permission entries to restrict.
        </p>
      </>
    ),
  },
  {
    question: 'What is DuckDB and why does hugr use it?',
    answer: (
      <>
        <p>
          DuckDB is a high-performance analytical database engine optimized for OLAP workloads.
          hugr uses DuckDB as its core query engine because:
        </p>
        <ul>
          <li>Optimized for analytical queries and aggregations</li>
          <li>Native support for multiple data formats (Parquet, CSV, JSON)</li>
          <li>In-process execution with efficient memory usage</li>
          <li>Excellent performance for large-scale data processing</li>
          <li>Can attach external databases (PostgreSQL, MySQL) and query them together</li>
        </ul>
      </>
    ),
  },
  {
    question: 'Can hugr handle spatial/geospatial data?',
    answer: (
      <>
        <p>
          Yes, hugr has native support for geospatial operations:
        </p>
        <ul>
          <li>Native <code>Geometry</code> scalar type for spatial fields</li>
          <li>Support for PostGIS (PostgreSQL) and DuckDB spatial extension</li>
          <li>Spatial file formats: GeoParquet, GeoJSON, Shapefiles</li>
          <li>Spatial joins and aggregations across data sources</li>
          <li>Distance-based queries and spatial relationships</li>
          <li>H3 clustering for hierarchical spatial indexing</li>
        </ul>
      </>
    ),
  },
  {
    question: 'How does hugr scale for production workloads?',
    answer: (
      <>
        <p>hugr is designed for enterprise-scale deployments:</p>
        <ul>
          <li><strong>Horizontal Scaling:</strong> Stateless nodes that can be added/removed dynamically</li>
          <li><strong>Cluster Mode:</strong> Multi-node operation with load balancing and fault tolerance</li>
          <li><strong>Caching:</strong> Two-level cache (in-memory + Redis/Memcached) reduces database load</li>
          <li><strong>Performance:</strong> Query optimization and pushdown to data sources</li>
          <li><strong>Kubernetes Ready:</strong> Helm charts for easy K8s deployment</li>
        </ul>
      </>
    ),
  },
  {
    question: 'What output formats are supported?',
    answer: (
      <>
        <p>hugr supports multiple output formats:</p>
        <ul>
          <li><strong>GraphQL JSON:</strong> Standard GraphQL response format</li>
          <li><strong>Arrow IPC:</strong> Efficient binary format for large datasets via Hugr multipart IPC protocol</li>
          <li><strong>Python Integration:</strong> Direct export to pandas DataFrame and GeoDataFrame</li>
          <li><strong>JQ Transformations:</strong> Server-side data transformation with custom JSON output</li>
        </ul>
        <p>
          The Arrow IPC protocol enables efficient streaming of large datasets to analytics
          and ML pipelines.
        </p>
      </>
    ),
  },
];

interface FAQItemComponentProps {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItemComponent: React.FC<FAQItemComponentProps> = ({
  item,
  index,
  isOpen,
  onToggle,
}) => (
  <div className={styles.faqItem}>
    <button
      className={`${styles.faqQuestion} ${isOpen ? styles.open : ''}`}
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span className={styles.questionNumber}>{index + 1}.</span>
      <span className={styles.questionText}>{item.question}</span>
      <span className={styles.toggleIcon}>{isOpen ? '−' : '+'}</span>
    </button>
    <div className={`${styles.faqAnswer} ${isOpen ? styles.open : ''}`}>
      <div className={styles.answerContent}>{item.answer}</div>
    </div>
  </div>
);

export default function FAQSection(): ReactNode {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <section className={styles.faqSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Frequently Asked <span className="highlighted">Questions</span>
        </Heading>

        <div className={styles.faqList}>
          {faqItems.map((item, index) => (
            <FAQItemComponent
              key={index}
              item={item}
              index={index}
              isOpen={openItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
