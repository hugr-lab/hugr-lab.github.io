import type {ReactNode} from 'react';
import Layout from '@theme/Layout';

export default function Impressum(): ReactNode {
  return (
    <Layout title="Impressum" description="Impressum — Legal notice">
      <main style={{padding: '4rem 0', maxWidth: '800px', margin: '0 auto'}}>
        <h1>Impressum</h1>
        <p>
          Vladimir Gribanov<br />
          Filderstr. 54<br />
          70771 Leinfelden-Echterdingen<br />
          Germany
        </p>
        <p>
          <strong>LinkedIn:</strong><br />
          <a href="https://www.linkedin.com/in/vladimirgribanov/" target="_blank" rel="noopener noreferrer">linkedin.com/in/vladimirgribanov</a>
        </p>
      </main>
    </Layout>
  );
}
