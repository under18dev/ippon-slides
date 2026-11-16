// トップページの文言（英語 / 日本語）。レイアウトは src/components/Landing.astro が共通で持つ

export type Lang = 'en' | 'ja'

export interface Copy {
  lang: Lang
  /** このページのパス（/ または /ja/） */
  path: string
  /** もう一方の言語 */
  other: { label: string; path: string }
  title: string
  description: string
  nav: { docs: string }
  hero: { title: string[]; lede: string; start: string; star: string; copy: string; copied: string }
  demo: { title: string; sub: string; source: string; deck: string; prev: string; next: string }
  why: { title: string; body: string; quote: string; note: string }
  features: { title: string; sub: string; items: [string, string][] }
  quick: {
    title: string
    sub: string
    steps: { title: string; code: string }[]
    more: string
  }
  faq: { title: string; items: [string, string][] }
  cta: { title: string; button: string }
  footer: { tagline: string; docs: string }
}

/** トップページの「はじめる」の行き先など、ドキュメントへのパス */
export const docsPath = (lang: Lang, page = '') => `${lang === 'ja' ? '/ja' : ''}/docs/${page ? `${page}/` : ''}`

export const COPY: Record<Lang, Copy> = {
  en: {
    lang: 'en',
    path: '/',
    other: { label: '日本語', path: '/ja/' },
    title: 'ippon — One message per slide',
    description:
      'A zero-dependency CLI that turns Markdown into one-message-per-slide decks: a single self-contained HTML file, a 16:9 PDF and a share image. Present from your phone, embed live HTTP responses, zoom into code.',
    nav: { docs: 'Docs' },
    hero: {
      title: ['One message', 'per slide.'],
      lede: 'ippon turns Markdown into a deck where every slide says one thing. One self-contained HTML file, a 16:9 PDF, zero dependencies. Yours, forever.',
      start: 'Get started',
      star: 'Star on GitHub',
      copy: 'Copy',
      copied: 'Copied',
    },
    demo: {
      title: 'Write this. Present this.',
      sub: 'The deck on the right is a real ippon build of the Markdown on the left. Click a slide in the source, or use the arrows.',
      source: 'slide.md',
      deck: 'slide.html',
      prev: 'Previous slide',
      next: 'Next slide',
    },
    why: {
      title: 'The tool disappears. The message stays.',
      body: 'The name comes from <strong>ippon</strong>, the single decisive point in judo. One slide, one message, decided. Craft is in <strong>subtraction</strong>: when bullets pile up, that is your cue to split the slide, not shrink the font.',
      quote: 'When in doubt, remove — from your slides, and from this tool.',
      note: 'No cloud. No special viewer. No runtime dependencies. Your deck is a plain HTML file that opens anywhere, years from now.',
    },
    features: {
      title: 'Everything, in one file',
      sub: 'A focused feature set — each one earns its place.',
      items: [
        ['Single self-contained HTML', 'CSS and JS are inlined. One file you can email, commit, or open offline. Add <code>--inline</code> to embed the images too.'],
        ['Zero runtime dependencies', 'Only TypeScript is used to build it. PDF export drives a local Chrome directly instead of bundling a browser.'],
        ['PDF and a share image', '<code>--pdf</code> renders a crisp 16:9 PDF. <code>ippon ogp</code> turns the cover into a 1200×630 image for links.'],
        ['Phone remote', '<code>ippon serve</code> shows a QR code. Scan it to advance slides and read your notes. Save the file and the deck updates in place.'],
        ['Live HTTP playground', '<code>::http::</code> bakes a real response — status, time, headers, pretty JSON — at build time, with a live re-send button.'],
        ['Spotlight and zoom', 'Click an image or a code block to zoom. Click a line to spotlight it while the rest dims.'],
        ['Presenter view', 'Press <code>p</code> for the current and next slide, speaker notes and a timer in a second window.'],
        ['Themeable', 'Override a few CSS variables with <code>--css</code>. Start with sensible defaults and present immediately.'],
        ['Background images', '<code>::background::</code> puts a photo behind the slide, or across the right half. Dim it with <code>brightness</code>.'],
        ['Code highlighting', 'ts, js, sh, json, hcl, yaml, py, go, rust, html, css and diff. <code>!! </code> marks a line.'],
        ['Readable on a phone', 'Hold a phone upright and the deck becomes a page you can scroll. Turn it sideways to present again.'],
        ['Edit with a coding agent', 'Select text in the deck and ask your agent to fix it. <code>ippon current</code> tells it which slide and lines.'],
      ],
    },
    quick: {
      title: 'Quick start',
      sub: 'No install required — <code>npx</code> runs it on demand. Needs Node.js 18.17+.',
      steps: [
        {
          title: 'Create and build',
          code: '# create a sample deck\nnpx ippon-slides init\n\n# build a single HTML file\nnpx ippon-slides build slide.md\n\n# ...and a 16:9 PDF\nnpx ippon-slides build slide.md --pdf',
        },
        {
          title: 'Present from your phone',
          code: '# serve on your LAN and show a QR code\nnpx ippon-slides serve slide.md\n\n# save the Markdown: the open deck updates in place',
        },
      ],
      more: 'Read the guide',
    },
    faq: {
      title: 'FAQ',
      items: [
        ['How do I turn Markdown into slides?', 'Run <code>npx ippon-slides init</code> to create a sample <code>slide.md</code>, then <code>npx ippon-slides build slide.md</code> to produce a single self-contained <code>slide.html</code>. Separate slides with <code>---</code> and keep one message per slide.'],
        ['Does the output work offline?', 'Yes — one HTML file with all CSS and JS inlined. No network, no server, no runtime dependencies. With <code>--inline</code> the images are embedded too.'],
        ['Can I export to PDF?', 'Yes, with <code>--pdf</code>. ippon drives a locally installed Chrome, Chromium or Edge to print a 16:9 PDF, so nothing heavy is bundled.'],
        ['Can I control slides from my phone?', 'Yes. <code>ippon serve</code> shows a QR code; scanning it gives you a remote for navigation, the timer and your speaker notes, synced over SSE on your LAN.'],
        ['Can links to my deck show the title slide?', 'Yes. <code>ippon ogp slide.md</code> saves the cover as a 1200×630 image. Put the deck’s public <code>url:</code> in the frontmatter and the built HTML points <code>og:image</code> at it.'],
        ['Can a coding agent edit the slide I’m looking at?', 'Yes. While <code>ippon serve</code> runs, <code>ippon current</code> prints the current slide, its lines in the Markdown and the text you selected. <code>ippon skills init</code> teaches Claude Code or Codex to use it.'],
        ['Is it free and open source?', 'Yes — MIT licensed, published on npm, with zero runtime dependencies.'],
      ],
    },
    cta: { title: 'Say one thing. Start now.', button: 'Read the docs' },
    footer: { tagline: 'One message per slide. MIT licensed.', docs: 'Docs' },
  },
  ja: {
    lang: 'ja',
    path: '/ja/',
    other: { label: 'English', path: '/' },
    title: 'ippon — 1 枚 1 メッセージ',
    description:
      'Markdown を「1 枚 1 メッセージ」のスライドに変換するゼロ依存の CLI。CSS/JS 全部入りの単一 HTML、16:9 の PDF、共有用の画像を出力。スマホをリモコンに、HTTP レスポンスの埋め込み、コードの拡大にも対応。',
    nav: { docs: 'ドキュメント' },
    hero: {
      title: ['1 枚に、', '1 メッセージ。'],
      lede: 'ippon は Markdown を「1 枚 1 メッセージ」のスライドに変換します。CSS/JS 全部入りの単一 HTML、そして 16:9 の PDF。ゼロ依存。ずっとあなたのもの。',
      start: 'はじめる',
      star: 'GitHub でスター',
      copy: 'コピー',
      copied: 'コピー済み',
    },
    demo: {
      title: 'これを書くと、こうなる。',
      sub: '右のデッキは、左の Markdown を ippon で実際にビルドしたものです。左のスライドをクリックするか、矢印で進めてみてください。',
      source: 'slide.md',
      deck: 'slide.html',
      prev: '前のスライド',
      next: '次のスライド',
    },
    why: {
      title: '道具は消え、メッセージだけが残る。',
      body: '名前の <strong>ippon（一本）</strong> は柔道で勝負を決める一本から。1 枚で 1 つのメッセージを決める。巧さは装飾ではなく<strong>引き算</strong>にあります。箇条書きが溢れたら、それはフォントを縮めるのではなくスライドを分ける合図です。',
      quote: '迷ったら、足すのではなく削る。スライドからも、この道具からも。',
      note: 'クラウドなし。専用ビューアなし。ランタイム依存なし。デッキはただの HTML ファイルで、どの端末でも、何年後でも開けます。',
    },
    features: {
      title: '全部、1 ファイルに',
      sub: '厳選した機能だけ。ひとつひとつが居場所を持っています。',
      items: [
        ['単一の自己完結 HTML', 'CSS も JS もインライン。メールでも Git でもオフラインでも開ける 1 ファイル。<code>--inline</code> なら画像まで埋め込めます。'],
        ['ランタイム依存ゼロ', 'ビルドに使うのは TypeScript だけ。PDF 出力はブラウザを同梱せずローカルの Chrome を直接駆動。'],
        ['PDF と共有用の画像', '<code>--pdf</code> で 16:9 の PDF。<code>ippon ogp</code> で表紙を 1200×630 の画像にし、URL を貼ったときに表紙が出ます。'],
        ['スマホがリモコン', '<code>ippon serve</code> が QR を表示。読み取ればページ送りもノートも手元で。保存するとデッキがその場で最新に。'],
        ['HTTP プレイグラウンド', '<code>::http::</code> で実レスポンス（ステータス・時間・ヘッダー・整形 JSON）をビルド時に焼き込み、ライブで再送信も。'],
        ['拡大とスポットライト', '画像やコードをクリックで拡大。行をクリックすると周囲が暗くなり 1 行だけ強調。'],
        ['発表者ビュー', '<code>p</code> で現在・次のスライド、発表者ノート、タイマーを別ウィンドウに。'],
        ['テーマ変更', '<code>--css</code> で少数の CSS 変数を上書き。既定のままですぐ発表に臨めます。'],
        ['背景画像', '<code>::background::</code> でスライドの背景に写真を。右半分だけにも敷け、<code>brightness</code> で暗さを調整。'],
        ['コードのハイライト', 'ts・js・sh・json・hcl・yaml・py・go・rust・html・css・diff。<code>!! </code> で 1 行を強調。'],
        ['スマホで縦に読める', 'スマホを縦に持つと、全スライドが縦に並んでスクロールで読めます。横にすれば発表に戻ります。'],
        ['エージェントと直す', 'デッキで文字を選んで「ここ直して」と頼むだけ。<code>ippon current</code> が表示中のスライドと行を渡します。'],
      ],
    },
    quick: {
      title: 'はじめに',
      sub: 'インストール不要。<code>npx</code> でその場で実行（Node.js 18.17+）。',
      steps: [
        {
          title: '作って、ビルド',
          code: '# サンプルを作る\nnpx ippon-slides init\n\n# 単一 HTML を作る\nnpx ippon-slides build slide.md\n\n# 16:9 PDF も\nnpx ippon-slides build slide.md --pdf',
        },
        {
          title: 'スマホで発表',
          code: '# LAN で配信し QR を表示\nnpx ippon-slides serve slide.md\n\n# Markdown を保存すると、開いているデッキがその場で最新に',
        },
      ],
      more: 'ガイドを読む',
    },
    faq: {
      title: 'FAQ',
      items: [
        ['Markdown からスライドを作るには？', '<code>npx ippon-slides init</code> でサンプル <code>slide.md</code> を作り、<code>npx ippon-slides build slide.md</code> で単一の <code>slide.html</code> を出力します。<code>---</code> で区切り、1 枚に 1 メッセージ。'],
        ['出力はオフラインで動く？', 'はい。CSS/JS 全部入りの 1 ファイルなので、ネットワークもサーバーも依存もなしで開けます。<code>--inline</code> なら画像も埋め込めます。'],
        ['PDF に書き出せる？', 'はい、<code>--pdf</code> で。ローカルの Chrome / Chromium / Edge を使って 16:9 PDF を印刷するので、重いものを同梱しません。'],
        ['スマホから操作できる？', 'はい。<code>ippon serve</code> が QR を表示。読み取ればページ送り・タイマー・発表者ノートを LAN 上の SSE で同期して操作できます。'],
        ['URL を貼ったときに表紙を出せる？', 'はい。<code>ippon ogp slide.md</code> で表紙を 1200×630 の画像にします。frontmatter に公開先の <code>url:</code> を書くと、HTML の <code>og:image</code> にその画像が入ります。'],
        ['表示中のスライドを AI エージェントに直してもらえる？', 'はい。<code>ippon serve</code> 中に <code>ippon current</code> を実行すると、表示中のスライド・行範囲・選択中の文字列が出ます。<code>ippon skills init</code> でスキルを置けば、Claude Code や Codex が使ってくれます。'],
        ['無料でオープンソース？', 'はい。MIT ライセンスで npm に公開、ランタイム依存はゼロです。'],
      ],
    },
    cta: { title: '言いたいことを、1 つだけ。', button: 'ドキュメントを読む' },
    footer: { tagline: '1 枚 1 メッセージ。MIT ライセンス。', docs: 'ドキュメント' },
  },
}
