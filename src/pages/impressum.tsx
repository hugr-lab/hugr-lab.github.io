import type {ReactNode} from 'react';
import Layout from '@theme/Layout';

export default function Impressum(): ReactNode {
  return (
    <Layout title="Impressum" description="Impressum – Angaben gemäß § 5 DDG">
      <main style={{padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto'}}>
        <h1>Impressum</h1>

        <h2>Angaben gemäß § 5 DDG</h2>
        <p><strong>Betreiber dieser Website:</strong></p>
        <p>
          Vladimir Gribanov<br />
          Filderstr. 54<br />
          70771 Leinfelden-Echterdingen<br />
          Deutschland
        </p>
        <p>
          <strong>E-Mail:</strong>{' '}
          <a href="mailto:info@hugr-lab.com">info@hugr-lab.com</a>
        </p>

        <hr />

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Vladimir Gribanov<br />
          Filderstr. 54<br />
          70771 Leinfelden-Echterdingen
        </p>

        <hr />

        <h2>Projektstatus</h2>
        <p>
          Diese Website gehört zu einem nichtkommerziellen Open-Source-Softwareprojekt
          („Hugr"). Es werden über diese Website keine kostenpflichtigen Dienstleistungen
          oder Produkte angeboten.
        </p>

        <hr />

        <h2>Haftung für Inhalte</h2>
        <p>
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
          Gewähr übernehmen.
        </p>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen
          Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind
          wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
          fremde Informationen zu überwachen.
        </p>

        <hr />

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
          keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
          Gewähr übernehmen.
        </p>

        <hr />

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
          unterliegen dem deutschen Urheberrecht, sofern nicht anders angegeben. Der
          Quellcode des Projekts steht unter der jeweiligen Open-Source-Lizenz laut{' '}
          <a
            href="https://github.com/hugr-lab/hugr"
            target="_blank"
            rel="noopener noreferrer">
            GitHub-Repository
          </a>
          .
        </p>

        <hr />

        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
          bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </main>
    </Layout>
  );
}
