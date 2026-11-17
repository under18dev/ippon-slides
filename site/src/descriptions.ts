// ドキュメントの各ページの meta description（検索結果や SNS のプレビューに出る文）。
// docs/ は GitHub でも読めるよう frontmatter を持たないので、ここで決める。無いページは最初の段落を使う。
// ページを足したら、英語（docs/...）と日本語（ja/docs/...）の両方を書くこと。

export const DESCRIPTIONS: Record<string, string> = {
  docs: 'Documentation for ippon, a zero-dependency CLI that turns Markdown into one-message-per-slide decks as a single HTML file or a 16:9 PDF.',
  'docs/why':
    'Why ippon: the Takahashi-method idea behind it, and how it compares with Marp, Slidev and reveal.js for making slides from Markdown.',
  'docs/getting-started':
    'Make your first deck from Markdown with ippon: run npx ippon-slides init, separate slides with ---, and build an HTML file or a PDF.',
  'docs/syntax':
    "ippon's Markdown syntax for slides: slide breaks, directives for background color and text size, two columns, code highlighting, speaker notes, QR codes and background images.",
  'docs/presenter':
    'Presenting with ippon: keyboard shortcuts, click-to-zoom with a line spotlight, the timer, speaker notes in the presenter view, and reading mode on phones.',
  'docs/theming': 'Change the look of ippon slides with --css: override CSS variables for the accent color, the heading font and the text size.',
  'docs/http':
    'Show real API calls on slides with ::http::. ippon fetches the response at build time and bakes the status, timing, headers and JSON into the deck.',
  'docs/serve':
    'Use your phone as a slide remote with ippon serve: scan a QR code to change slides, read speaker notes and control the timer. The deck reloads when you save.',
  'docs/cli': 'Reference for every ippon command and option: build, serve, ogp, init, current and skills init, and the rules for HTML and PDF output paths.',
  'docs/faq':
    'Answers to common questions about ippon: PDF and PPTX export, presenting offline, images, changing the look, speaker notes, the phone remote and AI agents.',

  'ja/docs': 'Markdown から 1 枚 1 メッセージのスライドを作る CLI「ippon」のドキュメント。HTML 1 ファイルと 16:9 の PDF を出力し、依存はゼロです。',
  'ja/docs/why': 'ippon の考え方（高橋メソッド）と、Marp・Slidev・reveal.js など Markdown でスライドを作るほかの道具との違い、向いている場面をまとめています。',
  'ja/docs/getting-started': 'ippon で Markdown からスライドを作る最初の手順。npx ippon-slides init でサンプルを作り、--- で区切って書き、HTML や PDF にビルドします。',
  'ja/docs/syntax': 'ippon のスライド用の Markdown 記法。スライドの区切り、背景色や文字の大きさの指示、2 カラム、コードのハイライト、発表者ノート、QR コード、背景画像。',
  'ja/docs/presenter': 'ippon で発表するときの操作。キー操作、クリックでの拡大と行の強調、タイマー、発表者ビューのノート、スマホでの縦読みモード。',
  'ja/docs/theming': 'ippon のスライドの見た目を --css で変える方法。アクセントの色、見出しのフォント、文字の大きさを CSS 変数で上書きします。',
  'ja/docs/http': '::http:: で API のリクエストと実際のレスポンスをスライドに出す方法。ビルド時に取得して、ステータス・時間・ヘッダー・JSON を焼き込みます。',
  'ja/docs/serve': 'ippon serve でスマホをスライドのリモコンにする方法。QR コードを読み取り、ページ送り、発表者ノート、タイマーを手元で操作できます。保存すると反映されます。',
  'ja/docs/cli': 'ippon のコマンドとオプションの一覧。build・serve・ogp・init・current・skills init と、HTML / PDF の出力先の決まり。',
  'ja/docs/faq': 'ippon のよくある質問。PDF や PPTX への書き出し、オフラインでの発表、画像、見た目の変更、発表者ノート、スマホでの操作、AI エージェントとの使い方。',
}
