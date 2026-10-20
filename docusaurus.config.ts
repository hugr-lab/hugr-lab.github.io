import {themes as prismThemes} from 'prism-react-renderer';
import type {Config, Plugin} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import fs from 'node:fs';
import path from 'node:path';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// The site is built twice: for GitHub Pages (default) and, as the hugr classic documentation,
// for https://hugr-lab.com/docs/hugr-classic/ on IONOS (DOCS_TARGET=ionos). That copy is the
// docs alone, at its root: no landing page, and the legal pages are hugr-lab.com's.
const ionos = process.env.DOCS_TARGET === 'ionos';
const site = ionos
  ? {url: 'https://hugr-lab.com', baseUrl: '/docs/hugr-classic/', docs: '/', products: 'https://hugr-lab.com/docs/'}
  : {url: 'https://hugr-lab.github.io', baseUrl: '/', docs: 'docs', products: 'https://hugr-lab.github.io/'};
// A docs page: /docs/<page>/ on GitHub Pages, /<page>/ in the hugr-lab.com copy.
const doc = (page: string) => (ionos ? '/' : '/docs/') + page;
const legal = (label: string, page: string) =>
  ionos ? {label, href: `https://hugr-lab.com/${page}/`} : {label, to: `/${page}/`};

// hugr-lab.com pages request nothing from other servers: the files RemoteMarkdown shows and the
// images the docs take from raw.githubusercontent.com are fetched once here, after the build, and
// served from remote/ (see src/components/RemoteMarkdown and the image src rewrite below).
const raw = 'https://raw.githubusercontent.com/';
const remoteSnapshot = (): Plugin => ({
  name: 'remote-snapshot',
  async postBuild({outDir}) {
    const urls = new Set<string>();
    for (const file of fs.readdirSync('docs', {recursive: true, encoding: 'utf8'})) {
      if (!/\.mdx?$/.test(file)) continue;
      for (const m of fs.readFileSync(path.join('docs', file), 'utf8').matchAll(/(?:url|src)="(https:\/\/raw\.githubusercontent\.com\/[^"]+)"/g)) {
        urls.add(m[1]);
      }
    }
    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const dest = path.join(outDir, 'remote', new URL(url).pathname);
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    }
    // Only the landing page plays the videos, and this copy has none.
    fs.rmSync(path.join(outDir, 'video'), {recursive: true, force: true});
  },
});

const config: Config = {
  title: 'Unified API for Your Data, Wherever It Lives',
  tagline: 'Access databases, files, and APIs through a single, secure interface — with domain ownership and centralized governance built-in.',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: site.url,
  baseUrl: site.baseUrl,
  baseUrlIssueBanner: false,
  trailingSlash: true,
  customFields: {docsTarget: ionos ? 'ionos' : 'github'},

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'hugr-lab', // Usually your GitHub org/user name.
  projectName: 'hugr-lab.github.io', // Usually your repo name.
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: site.docs,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/hugr-lab/hugr-lab.github.io/tree/main/',

          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        pages: ionos ? false : undefined,
        blog: ionos ? false : undefined,
        /*blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },*/
        theme: {
          // Quicksand is served from this site (@fontsource, SIL OFL 1.1), never from Google's servers.
          customCss: [
            require.resolve('@fontsource/quicksand/latin-300.css'),
            require.resolve('@fontsource/quicksand/latin-400.css'),
            require.resolve('@fontsource/quicksand/latin-500.css'),
            require.resolve('@fontsource/quicksand/latin-600.css'),
            require.resolve('@fontsource/quicksand/latin-700.css'),
            './src/css/custom.css',
          ],
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**', '/redirects/**'],
          filename: 'sitemap.xml',
          createSitemapItems: async (params) => {
            const {defaultCreateSitemapItems, ...rest} = params;
            const items = await defaultCreateSitemapItems(rest);
            return items.filter((item) => 
              !item.url.includes('/docs/docs/') 
            );
          }
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: ['@docusaurus/theme-mermaid'],
  plugins: ionos ? [remoteSnapshot] : [],

  markdown: {
    mermaid: true,
    // The docs link each other as /docs/<page>/; in the hugr-lab.com copy they are /<page>/.
    preprocessor: ({fileContent}) =>
      ionos
        ? fileContent
            .replace(/\]\(\/docs\//g, '](/')
            .replaceAll(`src="${raw}`, `src="${site.baseUrl}remote/`)
            .replace(/https:\/\/hugr-lab\.github\.io\/(mssql-extension|mssql-ducklake)\//g, 'https://hugr-lab.com/docs/$1/')
        : fileContent,
  },

  themeConfig: {
    metadata: [
      {name: 'keywords', content: 'Data Mesh, GraphQL, Data Backend, Data Lake, Distributed Data, DuckDB, API, Data Governance, Data Access Layer, PostgreSQL, Spatial Data, Data Federation, Data Integration, Open Source'},
      {name: 'description', content: 'hugr - Open Source Data Mesh platform and high-performance GraphQL backend for distributed data sources. Supporting cross data source queries, spatial analysis, data lakes, databases, and APIs with centralized control and governance.'},
      {name: 'robots', content: 'index,follow'},
      {name: 'googlebot', content: 'index,follow'},
    ],
    image: 'img/hugr-social-card.png',
    navbar: {
      logo: {
        alt: 'Hugr Lab',
        src: 'img/logo-circle.svg',
        href: ionos ? doc('overview/') : undefined,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: doc('join-us/'),
          position: 'left',
          label: 'Join Us',
        },
        ...(ionos ? [{href: 'https://hugr-lab.com/', label: 'Hugr Lab', position: 'right' as const}] : []),
        {
          href: 'https://github.com/hugr-lab/hugr',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false, 
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: doc('overview/'),
            },
            {
              label: 'Key Concepts',
              to: doc('concept/'),
            },
            {
              label: 'Get Started',
              to: doc('get-started/'),
            },
            {
              label: 'Query engine configuration',
              to: doc('engine-configuration/'),
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'DuckDB MSSQL Extension',
              href: site.products + 'mssql-extension/',
            },
            {
              label: 'DuckLake on SQL Server (mssql_ducklake)',
              href: site.products + 'mssql-ducklake/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/hugr-lab/hugr/',
            },
          ],
        },
        {
          title: 'Contact',
          items: [
            {
              label: 'info@hugr-lab.com',
              href: 'mailto:info@hugr-lab.com',
            },
            legal('Impressum', 'impressum'),
            legal('Datenschutz', 'datenschutz'),
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} hugr-lab. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:site_name',
        content: 'Hugr lab',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'robots',
        content: 'index, follow',
      },
    },
    // Search Console's token for hugr-lab.github.io.
    ...(ionos ? [] : [{
      tagName: 'meta',
      attributes: {
        name: 'google-site-verification',
        content: 'oOE10EHH6DYiVidJkz9BmWI4832W_udAVtPrjMuEHlE',
      },
    }]),
  ],
};

export default config;
