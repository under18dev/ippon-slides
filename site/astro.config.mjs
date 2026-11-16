// @ts-check
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const SITE = 'https://ippon.under18.dev'

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'ippon',
      description: 'Markdown to one-message-per-slide decks. A single self-contained HTML file, a 16:9 PDF, zero dependencies.',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ja: { label: '日本語', lang: 'ja' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/under18dev/ippon-slides' },
        { icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/ippon-slides' },
      ],
      sidebar: [
        {
          label: 'Guide',
          translations: { ja: 'ガイド' },
          items: [{ slug: 'docs', label: 'Overview', translations: { ja: '概要' } }, 'docs/getting-started', 'docs/syntax', 'docs/presenter', 'docs/theming'],
        },
        {
          label: 'Features',
          translations: { ja: '機能' },
          items: ['docs/http', 'docs/serve'],
        },
        {
          label: 'Reference',
          translations: { ja: 'リファレンス' },
          items: ['docs/cli'],
        },
      ],
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: `${SITE}/og.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#000000' } },
      ],
      customCss: ['./src/styles/theme.css'],
      // コードブロックに端末風の枠（3 つの点）を付けない
      expressiveCode: { defaultProps: { frame: 'none' } },
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
        Hero: './src/components/Hero.astro',
      },
    }),
  ],
})
