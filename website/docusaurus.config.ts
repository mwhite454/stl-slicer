import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type { Preset } from '@docusaurus/preset-classic';

const config: Config = {
  title: 'STL Slicer Docs',
  tagline: 'Slicing pipeline, workspace, and developer guides',
  url: 'https://localhost',
  baseUrl: '/',
  favicon: 'img/logo.svg',
  organizationName: 'stl-slicer',
  projectName: 'docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'en', locales: ['en'] },

  markdown: { mermaid: true },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs', // reuse repo-level docs
          routeBasePath: '/', // serve docs at site root
          sidebarPath: require.resolve('./sidebars.ts'),
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } as Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'STL Slicer',
      logo: { alt: 'STL Slicer', src: 'img/logo.svg' },
      items: [
        { type: 'doc', docId: 'slicing-flow', position: 'left', label: 'Docs' },
        { href: 'https://github.com/mwhite454/stl-slicer', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [{ label: 'Slicing Flow', to: '/' }],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub Issues', href: 'https://github.com/mwhite454/stl-slicer/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} STL Slicer` ,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
