import React, { useState } from 'react';
import styles from './styles.module.css';

export default function DataMeshSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={styles.dataMeshSection}>
      <div className="container">
        {/* Основной контент */}
        <div className={styles.mainContent}>
          <div className={styles.textContent}>
            <h2 className={styles.title}>Understanding Data Mesh</h2>
            <p className={styles.description}>
              Data Mesh is a modern approach where teams own and publish their data as a product — just like they do with APIs or microservices.
            </p>
            <p className={styles.description}>
              Hugr enables this by giving every domain a flexible, secure, and unified way to expose their data using GraphQL.
            </p>
            <button 
              className={styles.expandButton}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show Less' : 'Read More'}
            </button>
          </div>
        </div>

        {/* Раскрывающийся контент */}
        {isExpanded && (
          <div className={styles.expandedContent}>
            <p className={styles.introText}>
              In traditional data architectures, a centralized data team collects and serves data to the organization. This often leads to bottlenecks and low data ownership.
            </p>

            <h3 className='highlighted'>Data Mesh is different:</h3>

            <div className={styles.principlesGrid}>
              <div className={styles.principleItem}>
                <h3>• Data as a product:</h3>
                <p>Each dataset has a clear owner and is treated with the same care as software products.</p>
              </div>
              
              <div className={styles.principleItem}>
                <h3>• Domain ownership:</h3>
                <p>Teams that produce data are responsible for its quality and availability.</p>
              </div>
              
              <div className={styles.principleItem}>
                <h3>• Self-serve platform:</h3>
                <p>Anyone can discover and query data through standardized interfaces.</p>
              </div>
              
              <div className={styles.principleItem}>
                <h3>• Federated governance:</h3>
                <p>Standards and policies are enforced without a central bottleneck.</p>
              </div>
            </div>

            <div className={styles.hugrRole}>
              <em>Hugr makes this possible by giving each team a unified GraphQL API to expose data from SQL, files, or APIs — with security, caching, and flexible transformations built in.</em>
            </div>
            
            <div className={styles.comparisonTable}>
              <div className={styles.tableRow}>
                <div className={styles.aspectHeader}>Aspect</div>
                <div className={styles.traditionalHeader}>Traditional Data Lake</div>
                <div className={styles.meshHeader}>Data Mesh</div>
              </div>
              
              <div className={styles.tableRow}>
                <div className={styles.aspectCell}>Ownership</div>
                <div className={styles.traditionalCell}>Central data team owns everything</div>
                <div className={styles.meshCell}>Domain teams own their data</div>
              </div>
              
              <div className={styles.tableRow}>
                <div className={styles.aspectCell}>Access</div>
                <div className={styles.traditionalCell}>Complex requests through data team</div>
                <div className={styles.meshCell}>Self-service APIs for each domain</div>
              </div>
              
              <div className={styles.tableRow}>
                <div className={styles.aspectCell}>Quality</div>
                <div className={styles.traditionalCell}>Centralized quality control</div>
                <div className={styles.meshCell}>Domain experts ensure quality</div>
              </div>
              
              <div className={styles.tableRow}>
                <div className={styles.aspectCell}>Scalability</div>
                <div className={styles.traditionalCell}>Bottleneck at central team</div>
                <div className={styles.meshCell}>Scales with business domains</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}