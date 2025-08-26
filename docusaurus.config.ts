import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Unified API for Your Data, Wherever It Lives',
  tagline: 'Power your architecture with a Data-First approach.\nDesign distributed, domain-owned schemas and access SQL, data lakes, and APIs through a single GraphQL layer — with centralized control and governance.',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://hugr-lab.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',
  trailingSlash: true,

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
          routeBasePath: 'docs',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/hugr-lab/hugr-lab.github.io/',

          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
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
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**', '/redirects/**'],
          filename: 'sitemap_index.xml',
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
  
  themeConfig: {
    metadata: [
      {name: 'keywords', content: 'Data Mesh, GraphQL, Data Backend, Data Lake, Distributed Data, DuckDB, API, Data Governance, Data Access Layer, PostgreSQL, Spatial Data, Data Federation, Data Integration, Open Source'},
      {name: 'description', content: 'hugr - Open Source Data Mesh platform and high-performance GraphQL backend for distributed data sources. Supporting cross data source queries, spatial analysis, data lakes, databases, and APIs with centralized control and governance.'},
      {name: 'robots', content: 'index,follow'},
      {name: 'googlebot', content: 'index,follow'},
    ],
    image: 'img/hugr-social-card.png',
    navbar: {
      title: 'hugr',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
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
              to: '/docs/overview',
            },
            {
              label: 'Key Concepts',
              to: '/docs/concept',
            },
            {
              label: 'Get Started',
              to: '/docs/get-started',
            },
            {
              label: 'Query engine configuration',
              to: '/docs/category/query-engine-configuration',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/hugr-lab/hugr',
            },
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
    {
      tagName: 'meta',
      attributes: {
        name: 'google-site-verification',
        content: 'oOE10EHH6DYiVidJkz9BmWI4832W_udAVtPrjMuEHlE',
      },
    },
  ],
};

export default config;
