// @ts-check
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const SITE = 'https://ippon.under18.dev'

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  integrations: [
    starlight({
      // <title> の「| ...」に付くサイト名。画面の左上は SiteTitle.astro が「ippon.」と出す
      title: { en: 'ippon — Markdown slides CLI', ja: 'ippon — Markdown スライド CLI' },
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
          items: [{ slug: 'docs', label: 'Overview', translations: { ja: '概要' } }, 'docs/why', 'docs/getting-started', 'docs/syntax', 'docs/presenter', 'docs/theming'],
        },
        {
          label: 'Features',
          translations: { ja: '機能' },
          items: ['docs/http', 'docs/serve'],
        },
        {
          label: 'Reference',
          translations: { ja: 'リファレンス' },
          items: ['docs/cli', 'docs/faq'],
        },
      ],
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: `${SITE}/og.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#1b1b1f', media: '(prefers-color-scheme: dark)' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' } },
      ],
      customCss: ['./src/styles/theme.css'],
      routeMiddleware: './src/routeData.ts',
      // コードブロックに端末風の枠（3 つの点）を付けない
      expressiveCode: { defaultProps: { frame: 'none' } },
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
        Hero: './src/components/Hero.astro',
      },
    }),
  ],
})
