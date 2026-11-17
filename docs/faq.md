# よくある質問

## ippon とは何ですか？

Markdown から「1 枚 1 メッセージ」のスライドを作るコマンドラインツールです。npm のパッケージ名は
`ippon-slides`、コマンド名は `ippon` です。出力は CSS と JavaScript をすべて含んだ HTML 1 ファイルと、
16:9 の PDF です。MIT ライセンスで、無料で使えます。

## インストールは必要ですか？

必要ありません。Node.js 18.17 以上があれば、`npx ippon-slides init` でその場で使えます。
よく使うなら `npm install -g ippon-slides` で入れると、`ippon` コマンドになります。
詳しくは [はじめに](getting-started.md) を見てください。

## Markdown からスライドを作るには？

`npx ippon-slides init` でサンプルの `slide.md` を作り、`---` の行でスライドを区切って書きます。
`npx ippon-slides build slide.md` を実行すると `slide.html` ができ、ブラウザで開けばそのまま発表できます。
書き方は [Markdown 記法](syntax.md) にまとめています。

## 高橋メソッドのスライドを作れますか？

作れます。ippon は高橋メソッド（1 枚に短い言葉を大きく出す発表の方法）を前提にした道具で、
既定の見た目が黒地に大きな文字です。文字の大きさは画面の大きさに合わせて決まり、
`::size=2::` のような指示で 1 枚ずつ変えられます。

## PDF に書き出せますか？

書き出せます。`ippon build slide.md --pdf` で 16:9 の PDF を作ります。手元の Chrome、Chromium、
Edge のどれかを使うので、それらが必要です。見つからないときは `--browser-path` か環境変数
`CHROME_PATH` でブラウザの場所を指定してください。

## PowerPoint（PPTX）に書き出せますか？

書き出せません。出力は HTML と PDF です。PPTX のファイルが必要なら、Marp や Slidev のほうが
向いています（[なぜ ippon か](why.md)）。

## オフラインで発表できますか？

できます。HTML 1 ファイルに CSS と JavaScript がすべて入っているので、サーバーもネットワークも
いりません。画像は相対パスのままなので、HTML と一緒に画像のフォルダを持っていくか、`--inline` で
画像も HTML に埋め込んでください。本文のフォント（Noto Sans JP）は Web フォントなので、
オフラインのときは端末にあるフォントで表示されます。

## 画像や背景の写真を使えますか？

使えます。普通の Markdown の `![説明](img/photo.png)` で画像を置け、クリックで拡大できます。
[`::background::`](syntax.md#背景画像background) でスライドの背景（または右半分）に写真を敷けます。

## 見た目は変えられますか？

`--css` で CSS 変数を上書きして、アクセントの色や見出しのフォント、文字の大きさを変えられます。
スライドごとの背景色や文字の大きさは、1 行目の指示（`::center bg=blue size=1.3::` など）で変えます。
[見た目を変える](theming.md) を見てください。

## 発表者ノートやタイマーはありますか？

あります。`::note::` より下に書いた文章が発表者ノートになり、`p` キーで開く発表者ビューに、
次のスライド、ノート、タイマーが出ます。[発表者ビューと操作](presenter.md) を見てください。

## スマホでスライドを操作できますか？

できます。`ippon serve slide.md` を実行すると QR コードが出るので、同じ Wi-Fi のスマホで読み取ります。
スマホからページ送りやタイマーの操作ができ、発表者ノートも読めます。
[スマホをリモコンにする](serve.md) を見てください。

## どのプログラミング言語をハイライトできますか？

TypeScript、JavaScript、シェル、JSON、HCL（Terraform）、YAML、Python、Go、Rust、HTML、CSS、
diff、コンソールの出力に対応しています。`!! ` で始めた行は強調されます。
一覧は [コードブロック](syntax.md#コードブロック) にあります。

## 作ったスライドを公開・共有するには？

できた HTML はただの静的なファイルなので、GitHub Pages などにそのまま置けます。frontmatter に
公開先の `url:` を書いて `ippon ogp slide.md` で表紙の画像を作ると、URL を SNS に貼ったときに
表紙がプレビューに出ます。

## AI のコーディングエージェントと一緒に使えますか？

使えます。`ippon serve` の実行中に `ippon current` を実行すると、表示中のスライドの番号、Markdown の
行の範囲、デッキで選んでいる文字列が JSON で出ます。`ippon skills init` でスキルのファイルを置くと、
Claude Code や Codex が「このスライドを直して」に応えられるようになります。

## Marp や Slidev とは何が違いますか？

ippon は 1 枚 1 メッセージのスライドに絞り、見た目は 1 種類、依存はゼロ、出力は HTML 1 ファイルです。
レイアウトの作り込みや PPTX の書き出しが必要なら Marp や Slidev が向いています。
くわしくは [なぜ ippon か](why.md) にまとめています。
