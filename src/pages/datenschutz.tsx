import type {ReactNode} from 'react';
import Layout from '@theme/Layout';

export default function Datenschutz(): ReactNode {
  return (
    <Layout
      title="Datenschutzerklärung"
      description="Datenschutzerklärung – Informationen zur Verarbeitung personenbezogener Daten">
      <main style={{padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto'}}>
        <h1>Datenschutzerklärung</h1>

        <h2>1. Verantwortlicher</h2>
        <p>Verantwortlich für die Datenverarbeitung auf dieser Website:</p>
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

        <h2>2. Hosting über GitHub Pages</h2>
        <p>
          Diese Website wird über <strong>GitHub Pages</strong>, einen Dienst der GitHub
          Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA, bereitgestellt.
        </p>
        <p>
          Beim Aufruf der Website verarbeitet GitHub automatisch technische Zugriffsdaten
          (Server-Logfiles), insbesondere:
        </p>
        <ul>
          <li>IP-Adresse</li>
          <li>Datum und Uhrzeit der Anfrage</li>
          <li>Browsertyp und -version</li>
          <li>Betriebssystem</li>
          <li>Referrer URL</li>
        </ul>
        <p>
          Die Verarbeitung erfolgt zur Bereitstellung und Sicherheit der Website (Art. 6
          Abs. 1 lit. f DSGVO — berechtigtes Interesse an sicherem Betrieb).
        </p>
        <p>
          GitHub kann diese Daten in die USA übertragen. Die Übermittlung erfolgt auf
          Grundlage von Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
        </p>
        <p>
          Weitere Informationen:{' '}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
            target="_blank"
            rel="noopener noreferrer">
            GitHub Privacy Statement
          </a>
        </p>

        <hr />

        <h2>3. Keine Cookies / kein Tracking</h2>
        <p>
          Diese Website verwendet <strong>keine Cookies</strong> und{' '}
          <strong>keine Tracking- oder Analyse-Tools</strong>.
        </p>
        <p>
          Es findet kein Nutzer-Tracking, kein Profiling und keine Auswertung des
          Nutzerverhaltens durch den Betreiber statt.
        </p>

        <hr />

        <h2>4. Kontakt per E-Mail</h2>
        <p>
          Wenn Sie uns per E-Mail kontaktieren, werden Ihre Angaben inklusive der von Ihnen
          dort angegebenen Kontaktdaten zur Bearbeitung der Anfrage gespeichert.
        </p>
        <p>
          Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an Kommunikation).
        </p>
        <p>
          Die Daten werden gelöscht, sobald sie für den Zweck ihrer Erhebung nicht mehr
          erforderlich sind und keine gesetzlichen Aufbewahrungspflichten bestehen.
        </p>

        <hr />

        <h2>5. Links zu externen Diensten</h2>
        <p>
          Diese Website enthält Links zu externen Plattformen, insbesondere GitHub. Beim
          Anklicken eines solchen Links verlassen Sie diese Website.
        </p>
        <p>
          Für die Datenverarbeitung durch diese Dienste gelten ausschließlich deren
          Datenschutzbestimmungen.
        </p>

        <hr />

        <h2>6. Ihre Rechte</h2>
        <p>Sie haben gemäß DSGVO folgende Rechte:</p>
        <ul>
          <li>
            <strong>Auskunft</strong> über gespeicherte Daten (Art. 15 DSGVO)
          </li>
          <li>
            <strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)
          </li>
          <li>
            <strong>Löschung</strong> (Art. 17 DSGVO)
          </li>
          <li>
            <strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)
          </li>
          <li>
            <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)
          </li>
          <li>
            <strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)
          </li>
        </ul>
        <p>Zur Ausübung genügt eine formlose Mitteilung per E-Mail.</p>

        <hr />

        <h2>7. Beschwerderecht bei Aufsichtsbehörde</h2>
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
        </p>
        <p>
          <strong>
            Landesbeauftragter für den Datenschutz und die Informationsfreiheit
            Baden-Württemberg
          </strong>
          <br />
          <a
            href="https://www.baden-wuerttemberg.datenschutz.de"
            target="_blank"
            rel="noopener noreferrer">
            https://www.baden-wuerttemberg.datenschutz.de
          </a>
        </p>
      </main>
    </Layout>
  );
}
