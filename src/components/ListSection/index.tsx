import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type ListSectionProps = {
  title: string;
  description?: string;
  bullets: string[];
  childrenLeft?: boolean;
  children?: React.ReactNode;
};

export default function ListSection({ title, description, bullets, children, childrenLeft }: ListSectionProps) {
  return (
    <section className={clsx(styles.useCaseSection)}>
      <div className="container">
        <div className={styles.useCaseGrid}>
          {childrenLeft && children && <div className={styles.useCaseVisual}>{children}</div>}
          <div className={styles.useCaseContent}>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
            {bullets && 
              <ul>
                {bullets.map((text, idx) => (
                  <li key={idx}>{text}</li>
                ))}
              </ul>
            }
          </div>
          {!childrenLeft && children && <div className={styles.useCaseVisual}>{children}</div>}
        </div>
      </div>
    </section>
  );
}