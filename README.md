# ippon-slides

**1 枚 1 メッセージ** のスライドを Markdown から作る CLI。

- 黒背景・大きな文字・切り替え時のフェードイン
- 出力は CSS / JS まで全部入った **HTML 1 ファイル**（会場がオフラインでも開ける）
- `--pdf` で 16:9 の **PDF** も出せる
- 依存パッケージなし

📚 詳しいドキュメントは [`docs/`](docs/README.md) にあります（[記法](docs/syntax.md) ・ [`::http::`](docs/http.md) ・ [`ippon serve`](docs/serve.md) ・ [発表者ビュー](docs/presenter.md) ・ [見た目](docs/theming.md) ・ [CLI](docs/cli.md)）。

## 思想 — なぜ「ippon」なのか

名前の **ippon（一本）** は、柔道で勝負を決める一本に由来します。1 枚のスライドで
1 つのメッセージを決める。それが ippon-slides の全てです。

- **1 枚 1 メッセージ（[高橋メソッド](https://en.wikipedia.org/wiki/Takahashi_method)）。**
  スライドは「読ませる資料」ではなく「一瞬で伝わる合図」です。だから文字は大きく、
  言葉は少なく。聴衆が見るのはスクリーンではなく **あなた** であるべきで、スライドは
  話を遮らず後押しするものに徹します。箇条書きを詰め込みたくなったら、それはスライドを
  分けるサインです。
- **道具は消え、メッセージだけが残る。** 出力は CSS も JS も全部入りの **HTML 1 ファイル**。
  会場がオフラインでも、何年後でも、ブラウザさえあれば開けます。クラウドも、専用ビューアも、
  ランタイム依存もありません（依存パッケージはゼロ）。資料はあなたのものであり続け、
  どこかのサービスの寿命に縛られません。
- **内容に集中する。** 見た目をいじる時間を削り、Markdown でメッセージそのものを書きます。
  装飾は少数の CSS 変数で上書きできますが、既定のまま書き始めてすぐ発表に臨めることを
  優先しています。
- **発表体験も素朴に。** 発表者ビューもスマホリモコンも、WebSocket や外部サービスを使わず
  標準機能だけで実装しています。便利さのために依存や複雑さを増やさない、という線引きです。

> 迷ったら、足すのではなく削る。スライドからも、この道具からも。

## 使い方

```sh
npx ippon-slides init                    # サンプルの slide.md を作る
npx ippon-slides build slide.md --html -w # 保存するたびに slide.html を作り直す
npx ippon-slides build slide.md --pdf     # slide.pdf
```

グローバルに入れると `ippon` コマンドとして使えます。

```sh
npm i -g ippon-slides
ippon build slide.md --html --pdf -o dist/
```

### オプション

| オプション | |
|---|---|
| `--html` | HTML を出力する（`--pdf` がなければデフォルト） |
| `--pdf` | PDF を出力する（Chrome / Chromium / Edge が必要） |
| `-o, --output <path>` | 出力先。ディレクトリを指定するとその中に `<input>.html` / `.pdf` を作る。`--html --pdf` を両方指定したときは拡張子だけ差し替える |
| `-w, --watch` | Markdown と `--css` の変更を監視して再ビルドする |
| `--css <file>` | 追加の CSS（色やフォントの上書きなど） |
| `--no-fetch` | `::http::` のレスポンスをビルド時に取得しない |
| `--browser-path <path>` | PDF に使うブラウザ。環境変数 `CHROME_PATH` でも指定できる |

`ippon slide.md` は `ippon build slide.md` の省略形です。

## 書き方

````md
---
title: タイトル
author: 名前
---

::title::

# タイトル

サブタイトル

名前 ・ 日付

---

::center::

1 枚に

1 メッセージ

---

::center size=2 bg=blue::

**大きく**

-# 小さい注釈

---

## 見出しと箇条書き

- **太字** はアクセントカラー
  - ネストもできる

::right::

```ts
const app = new Hono()
!! app.get('/', (c) => c.text('Hello!'))
```
````

| 記法 | |
|---|---|
| `---` | スライドの区切り |
| `::center::` | 1 枚 1 メッセージ（中央寄せの大きな文字） |
| `::title::` | 表紙。最後の段落はページ下に寄る |
| `::wide::` | 左右の余白を詰める（スクリーンショット向け） |
| `::bg=blue::` | 背景色。`blue` / `orange` / `purple` / `red` / `green` / `black` / `white`、または `#rrggbb` |
| `::size=1.5::` | 文字サイズの倍率 |
| `::right::` | ここから右カラム。先頭の見出しはカラムの上に出る |
| `::right left-wide::` / `::right right-wide::` | カラム幅を 1.4:1 / 1:1.4 にする |
| `::right center::` | カラムを上下中央揃えにする。幅指定と併用可（`::right right-wide center::`） |
| `::note::` | この行以降は発表者ノート。本番には出ず発表者ビュー（`p`）だけに出る |
| `::http method=GET url=...::` | HTTP リクエストのプレイグラウンド（下記） |
| `::qr url=...::` | URL の QR コード（SVG）。`caption` を付けると下に URL も出す |
| `-# 注釈` | 小さい注釈 |
| ` ```hcl ` | コード。`hcl` / `console` / `sh` / `json` / `js` / `ts` をハイライト |
| `!! ` | コードの行頭に付けるとその行を強調 |

指示は `::center bg=blue size=2::` のようにまとめて書けます。
`console` のコードは `$ ` で始まる行をコマンド、`Error` を含む行をエラーとして色分けします。

### HTTP プレイグラウンド

`::http method=GET url=https://...::` と書くと、そのスライドに HTTP リクエストの
結果（ステータス・レスポンスタイム・ヘッダー・JSON ボディ）が表示されます。

```md
::http method=GET url=https://api.github.com/repos/under18dev/ippon-slides::
```

レスポンスは **ビルド時に Node 側で取得して焼き込む**ので、CORS に関係なくどんな API
でも表示でき、オフラインや PDF でもそのまま映ります。スライド上の「再送信」ボタンを押すと
ブラウザからライブで叩き直せます（この場合は相手が CORS を許可している API のみ成功し、
失敗したときはビルド時のスナップショットに戻ります）。`method` を省略すると GET です。
ビルド時の取得を止めたいときは `--no-fetch` を付けます。

## 発表中の操作

| キー | |
|---|---|
| `→` / `Space` / 画面右側クリック | 次へ |
| `←` / 画面左側クリック | 前へ |
| `Home` / `End` | 最初 / 最後 |
| `f` | フルスクリーン |
| `o` / `Esc` | スライド一覧 |
| `p` | 発表者ビュー（別ウィンドウ） |

表紙から進むと右下でタイマーが動き、表紙に戻るとリセットされます。
URL の `#12` で 12 枚目から開けます。

### 拡大（Spotlight / Zoom）

スライド上の**画像やコードブロックをクリック**すると拡大表示されます。コードは拡大中に
**行をクリックすると周囲が暗くなり、その行だけ強調**されます（説明したい箇所を指し示すのに便利）。
`Esc` または背景クリックで閉じます。

### 発表者ビュー

`p` を押すと別ウィンドウで発表者ビューが開きます。現在のスライド・次のスライド・
`::note::` で書いたノート・経過タイマー・時計が手元に出て、本番側（プロジェクタに映す画面）は
通常表示のままです。どちらのウィンドウで `→` / `←` を押しても両画面が同期します。
発表者ビューは `p` / `Esc` で閉じます。

## スマホをリモコンにする

```sh
ippon serve slide.md
```

ローカルにサーバを立て、**QR コードを表示**します。スマホのカメラで読み取ると
リモコン画面が開き、ページ送り・タイマーのリセット・**発表者ノートの確認**が手元で
できます。サーバ・本番画面・スマホは SSE で同期します（WebSocket も外部サービスも
使いません）。

- PC とスマホを**同じ Wi-Fi** に繋いでください。
- 発表者ビュー（`p`）にも QR が出ます。本番画面では `r` キーで QR を全画面表示できます。
- リモコンの URL には**ランダムなトークン**が付き、正しいトークンでないと操作できません。
- `-p, --port <n>` でポートを固定できます（省略時は空きポートを自動選択）。
- Markdown を保存すると、開いているデッキとリモコンが自動で再読み込みされます。
- `curl -s http://localhost:<port>/__current-slide` で、表示中のスライドの行範囲と
  **デッキで選択中の文字列**が取れます。コーディングエージェントに「ここ直して」と頼むときに使えます
  （[詳しく](docs/serve.md#コーディングエージェントと一緒に直す__current-slide)）。
- `ippon skills init` で、これを使うエージェント用スキルを `.claude/skills` と `.agents/skills` に置けます。
  ブラウザで文字を選んで「ここ直して」と頼むと、エージェントが `ippon current` で該当箇所を読んで直します。

> Wi-Fi の「クライアント分離（AP isolation）」が有効な環境では、スマホから PC に
> 接続できないことがあります。その場合はテザリングや別の Wi-Fi をお試しください。

## 見た目を変える

`--css` で CSS 変数を上書きできます。

```css
:root {
  --slide-accent: #ff6a00;   /* 進捗バー・一覧の枠 */
  --slide-accent-2: #ff6a00; /* 太字・強調 */
  --slide-display-font: 'Hiragino Sans', sans-serif;
}
```

見出しは `--slide-display-font`（既定で凸版文久見出しゴシック、未インストール環境は
本文フォントに落ちる）、本文は Noto Sans JP（Web フォントを読み込み）で表示されます。

## ライブラリとして使う

```js
import { render, toPdf } from 'ippon-slides'

const { html } = render(markdown, { baseDir: '.', outDir: 'dist' })
```

型定義（`.d.ts`）も同梱しています。

## 開発

TypeScript で書いています。`src/` が Node 側、`src/client/deck.ts` がブラウザで動くナビゲーションです。

```sh
npm install
npm run build      # dist/ と assets/deck.js を作る
npm run typecheck
npm test           # ビルドしてからテスト（テストの実行には Node 22.18+ が必要）
```

貢献の流れ・規約・リリース手順は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## License

MIT
