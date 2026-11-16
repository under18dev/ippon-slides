// トップページの文言（英語 / 日本語）。ヒーローは src/components/Hero.astro、機能のカードは src/components/Features.astro

import type { StarlightIcon } from '@astrojs/starlight/types'

export type Lang = 'en' | 'ja'

export interface Copy {
  /** <title> と og:title（Starlight が「| ippon」を付ける） */
  title: string
  description: string
  hero: { title: string; lede: string; start: string; github: string; copy: string; copied: string }
  demo: { source: string; deck: string; prev: string; next: string }
  /** [アイコン, 見出し, 説明（HTML）] */
  features: [StarlightIcon, string, string][]
  footer: string
}

/** Starlight のロケール（英語は root = undefined）から言語を決める */
export const langOf = (locale: string | undefined): Lang => (locale === 'ja' ? 'ja' : 'en')

/** トップページの「はじめる」の行き先など、ドキュメントへのパス */
export const docsPath = (lang: Lang, page = '') => `${lang === 'ja' ? '/ja' : ''}/docs/${page ? `${page}/` : ''}`

export const COPY: Record<Lang, Copy> = {
  en: {
    title: 'One message per slide',
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
      ['server', 'Live HTTP', '<code>::http::</code> bakes a real API response into the slide and can re-send it live.'],
      ['pencil', 'Edit with an agent', 'Select text in the deck and ask Claude Code or Codex to fix that slide.'],
    ],
    footer: 'Released under the MIT License.',
  },
  ja: {
    title: '1 枚 1 メッセージ',
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
      ['server', 'HTTP を実演', '<code>::http::</code> で API の実レスポンスをスライドに焼き込み、その場で再送信も。'],
      ['pencil', 'エージェントと直す', 'デッキで文字を選んで、Claude Code や Codex にそのスライドを直してもらえます。'],
    ],
    footer: 'MIT ライセンスで公開しています。',
  },
}

/** トップページの <head> に足す構造化データ */
export function homeHead(lang: Lang) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ippon-slides',
    alternateName: 'ippon',
    description: COPY[lang].description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Linux, Windows (Node.js ≥ 18.17)',
    url: `https://ippon.under18.dev${lang === 'ja' ? '/ja/' : '/'}`,
    downloadUrl: 'https://www.npmjs.com/package/ippon-slides',
    codeRepository: 'https://github.com/under18dev/ippon-slides',
    license: 'https://opensource.org/licenses/MIT',
    author: { '@type': 'Person', name: 'tanahiro2010' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: lang === 'ja' ? 'JPY' : 'USD' },
  }
  return [{ tag: 'script' as const, attrs: { type: 'application/ld+json' }, content: JSON.stringify(ld) }]
}
