// トップページの文言（英語 / 日本語）。ヒーローは src/components/Hero.astro、機能のカードは src/components/Features.astro

import type { StarlightIcon } from '@astrojs/starlight/types'
import pkg from '../../package.json'

export type Lang = 'en' | 'ja'

export interface Copy {
  /** og:title とページの名前 */
  title: string
  /** トップの <title>（検索結果に出る。サイト名は付けない） */
  pageTitle: string
  description: string
  hero: { title: string; lede: string; start: string; github: string; copy: string; copied: string }
  demo: { source: string; deck: string; prev: string; next: string }
  /** [アイコン（Starlight のアイコン名か、独自の 'qr'）, 見出し, 説明（HTML）] */
  features: [StarlightIcon | 'qr', string, string][]
  footer: string
}

/** Starlight のロケール（英語は root = undefined）から言語を決める */
export const langOf = (locale: string | undefined): Lang => (locale === 'ja' ? 'ja' : 'en')

/** トップページの「はじめる」の行き先など、ドキュメントへのパス */
export const docsPath = (lang: Lang, page = '') => `${lang === 'ja' ? '/ja' : ''}/docs/${page ? `${page}/` : ''}`

export const COPY: Record<Lang, Copy> = {
  en: {
    title: 'One message per slide',
    pageTitle: 'ippon — Turn Markdown into one-message-per-slide decks',
    description:
      'A zero-dependency CLI that turns Markdown into one-message-per-slide decks: a single self-contained HTML file, a 16:9 PDF and a share image. Present from your phone, embed live HTTP responses, zoom into code.',
    hero: {
      title: 'One message per slide, from Markdown',
      lede: 'Builds one self-contained HTML file and a 16:9 PDF. Zero runtime dependencies.',
      start: 'Get Started',
      github: 'View on GitHub',
      copy: 'Copy',
      copied: 'Copied',
    },
    demo: { source: './slide.md', deck: 'slide.html', prev: 'Previous slide', next: 'Next slide' },
    features: [
      ['document', 'One HTML file', 'CSS and JS are inlined. Opens offline, years from now. <code>--inline</code> embeds the images too.'],
      ['npm', 'Zero dependencies', 'Nothing to install but ippon itself. PDF export drives the Chrome you already have.'],
      ['download', 'PDF and a share image', '<code>--pdf</code> prints a 16:9 PDF. <code>ippon ogp</code> turns the cover into a link preview.'],
      ['mobile-android', 'Phone remote', '<code>ippon serve</code> shows a QR code. Advance slides and read notes from your phone.'],
      ['laptop', 'Presenter view', 'Press <code>p</code> for the next slide, speaker notes and a timer in a second window.'],
      ['magnifier', 'Zoom and spotlight', 'Click an image or code block to zoom in, and a line to spotlight it.'],
      ['qr', 'QR codes', 'One <code>::qr::</code> line turns a URL into a QR code, drawn at build time. It prints in the PDF too.'],
      ['pencil', 'Edit with an agent', 'Select text in the deck and ask Claude Code or Codex to fix that slide.'],
    ],
    footer: 'Released under the MIT License.',
  },
  ja: {
    title: '1 枚 1 メッセージ',
    pageTitle: 'ippon — Markdown で 1 枚 1 メッセージのスライドを作る CLI',
    description:
      'Markdown を「1 枚 1 メッセージ」のスライドに変換するゼロ依存の CLI。CSS/JS 全部入りの単一 HTML、16:9 の PDF、共有用の画像を出力。スマホをリモコンに、HTTP レスポンスの埋め込み、コードの拡大にも対応。',
    hero: {
      title: 'Markdown で書く、1 枚 1 メッセージのスライド',
      lede: 'HTML 1 ファイルと 16:9 の PDF を出力します。ランタイム依存はゼロ。',
      start: 'はじめる',
      github: 'GitHub で見る',
      copy: 'コピー',
      copied: 'コピーしました',
    },
    demo: { source: './slide.md', deck: 'slide.html', prev: '前のスライド', next: '次のスライド' },
    features: [
      ['document', 'HTML 1 ファイル', 'CSS も JS も入った 1 ファイル。オフラインでも何年後でも開けます。<code>--inline</code> なら画像も。'],
      ['npm', '依存ゼロ', 'ippon のほかに入れるものはありません。PDF は手元の Chrome で書き出します。'],
      ['download', 'PDF と共有用の画像', '<code>--pdf</code> で 16:9 の PDF。<code>ippon ogp</code> で表紙をリンクのプレビュー画像に。'],
      ['mobile-android', 'スマホがリモコン', '<code>ippon serve</code> の QR を読めば、手元でページ送りとノートの確認。'],
      ['laptop', '発表者ビュー', '<code>p</code> で次のスライド、発表者ノート、タイマーを別ウィンドウに。'],
      ['magnifier', '拡大とスポットライト', '画像やコードをクリックで拡大。行をクリックすると 1 行だけ強調。'],
      ['qr', 'QR コード', '<code>::qr::</code> の 1 行で URL を QR コードに。ビルド時に描くので PDF にもそのまま出ます。'],
      ['pencil', 'エージェントと直す', 'デッキで文字を選んで、Claude Code や Codex にそのスライドを直してもらえます。'],
    ],
    footer: 'MIT ライセンスで公開しています。',
  },
}

/** トップページの <head> に足す構造化データ（サイトとソフトウェア） */
export function homeHead(lang: Lang) {
  const home = `https://ippon.under18.dev${lang === 'ja' ? '/ja/' : '/'}`
  const t = COPY[lang]
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'ippon',
        alternateName: 'ippon-slides',
        url: home,
        inLanguage: lang,
        description: t.description,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'ippon-slides',
        alternateName: 'ippon',
        description: t.description,
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Presentation software',
        operatingSystem: 'macOS, Linux, Windows (Node.js ≥ 18.17)',
        softwareVersion: pkg.version,
        url: home,
        image: `https://ippon.under18.dev/og/${lang === 'ja' ? 'ja/index' : 'index'}.png`,
        downloadUrl: 'https://www.npmjs.com/package/ippon-slides',
        installUrl: 'https://www.npmjs.com/package/ippon-slides',
        codeRepository: 'https://github.com/under18dev/ippon-slides',
        sameAs: ['https://github.com/under18dev/ippon-slides', 'https://www.npmjs.com/package/ippon-slides'],
        license: 'https://opensource.org/licenses/MIT',
        isAccessibleForFree: true,
        featureList: t.features.map(([, title]) => title),
        author: { '@type': 'Person', name: 'tanahiro2010', url: 'https://github.com/tanahiro2010' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: lang === 'ja' ? 'JPY' : 'USD' },
      },
    ],
  }
  return [{ tag: 'script' as const, attrs: { type: 'application/ld+json' }, content: JSON.stringify(graph) }]
}
