import { existsSync, mkdirSync, readFileSync, statSync, watch, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { current, real, register, skillsInit } from './agent.ts'
import { fetchAll } from './http.ts'
import { frontmatter, scanHttp } from './markdown.ts'
import { toPdf, toPng } from './pdf.ts'
import { qrTerminal } from './qr.ts'
import { render } from './render.ts'
import { serve } from './serve.ts'

const pkg: { version: string } = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'))

const HELP = `ippon v${pkg.version} — 1 枚 1 メッセージのスライドを Markdown から作る

使い方:
  ippon build <input.md> [options]   スライドをビルドする
  ippon <input.md> [options]         build の省略形
  ippon serve <input.md> [options]   ローカルで配信し、スマホをリモコンにする
  ippon init [file]                  サンプルの Markdown を作る（デフォルト: slide.md）
  ippon ogp <input.md> [options]     表紙を OGP 画像（1200×630 の PNG）にする
  ippon current [input.md]           serve 中のデッキで表示中のスライドと選択中の文字列を JSON で出す
  ippon skills init [dir]            current を使うエージェント用スキルを .claude/skills と .agents/skills に置く

build のオプション:
      --html                 HTML を出力する（--pdf がなければデフォルト）
      --pdf                  PDF を出力する（Chrome / Chromium / Edge が必要）
  -o, --output <path>        出力先。--html と --pdf を両方指定したときは拡張子だけ差し替える
                             ディレクトリを指定するとその中に <input>.html / .pdf を作る
  -w, --watch                Markdown と --css の変更を監視して再ビルドする
      --css <file>           追加の CSS（色やフォントの上書きなど）
      --inline               画像を HTML に埋め込む（HTML 1 ファイルだけで画像も出る）
      --no-fetch             ::http:: のレスポンスをビルド時に取得しない
      --browser-path <path>  PDF に使うブラウザ（環境変数 CHROME_PATH でも可）

ogp のオプション:
  -o, --output <path>        出力先（デフォルト: <input>.png）。ディレクトリを指定するとその中に作る
      --css <file>           追加の CSS
      --browser-path <path>  使うブラウザ（環境変数 CHROME_PATH でも可）
  frontmatter に url: を書くと、build した HTML の og:image にこの画像の URL が入る

serve のオプション:
  -p, --port <n>             待ち受けポート（省略時は空きポートを自動）
      --css <file>           追加の CSS

skills init のオプション:
      --force                既にある SKILL.md を上書きする

  -h, --help                 ヘルプ
  -v, --version              バージョン

例:
  ippon build slide.md --html
  ippon build slide.md --pdf -o dist/
  ippon build slide.md --html --pdf -o dist/talk
  ippon build slide.md --html -w
  ippon build slide.md --inline
  ippon ogp slide.md
  ippon serve slide.md
  ippon skills init
`

// ---------------------------------------------------------------
// args
// ---------------------------------------------------------------

export interface Options {
  /** 位置引数 */
  _: string[]
  html?: boolean
  pdf?: boolean
  watch?: boolean
  help?: boolean
  version?: boolean
  noFetch?: boolean
  inline?: boolean
  force?: boolean
  output?: string
  css?: string
  browserPath?: string
  port?: string
}

type Flag = 'html' | 'pdf' | 'watch' | 'help' | 'version' | 'noFetch' | 'inline' | 'force'
type Value = 'output' | 'css' | 'browserPath' | 'port'

const FLAGS: Record<string, Flag> = { '--html': 'html', '--pdf': 'pdf', '-w': 'watch', '--watch': 'watch', '--no-fetch': 'noFetch', '--inline': 'inline', '--force': 'force', '-h': 'help', '--help': 'help', '-v': 'version', '--version': 'version' }
const VALUES: Record<string, Value> = { '-o': 'output', '--output': 'output', '--css': 'css', '--browser-path': 'browserPath', '-p': 'port', '--port': 'port' }

export function parseArgs(argv: string[]): Options {
  const opts: Options = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i]!
    let v: string | undefined
    const eq = a.match(/^(--[^=]+)=(.*)$/)
    if (eq) [, a, v] = eq as [string, string, string]
    // constructor などの名前のファイルを継承プロパティと取り違えないよう、自前のキーだけを見る
    const flag = Object.hasOwn(FLAGS, a) ? FLAGS[a] : undefined
    const value = Object.hasOwn(VALUES, a) ? VALUES[a] : undefined
    if (flag) opts[flag] = true
    else if (value) {
      if (v === undefined) v = argv[++i]
      if (v === undefined) throw new Error(`${a} には値が必要です`)
      opts[value] = v
    } else if (a.startsWith('-') && a !== '-') throw new Error(`不明なオプション: ${a}`)
    else opts._.push(a)
  }
  return opts
}

/** 出力先を決める */
export type Format = 'html' | 'pdf'

export function outputs(
  input: string,
  { html, pdf, output }: Pick<Options, 'html' | 'pdf' | 'output'>
): { format: Format; path: string }[] {
  const formats: Format[] = []
  if (html || !pdf) formats.push('html')
  if (pdf) formats.push('pdf')

  const name = basename(input, extname(input))
  let base = '' // 拡張子なしのパス
  let exact: string | null = null // 1 形式だけのときに -o をそのまま使う

  if (!output) base = join(dirname(input), name)
  else if (output.endsWith('/') || output.endsWith('\\') || (existsSync(output) && statSync(output).isDirectory()))
    base = join(output, name)
  else if (formats.length === 1 && extname(output)) exact = output
  else base = extname(output) ? output.slice(0, -extname(output).length) : output

  return formats.map((f) => ({ format: f, path: resolve(exact || `${base}.${f}`) }))
}

// ---------------------------------------------------------------
// build
// ---------------------------------------------------------------

const time = () => new Date().toLocaleTimeString()

/** 出力先が入力の Markdown 自身なら止める（HTML / PDF / PNG で上書きされて原稿が消える） */
function guardOutput(input: string, out: string): void {
  if (real(out) === real(input)) throw new Error(`出力先が入力の Markdown と同じです（上書きすると原稿が消えます）: ${out}`)
}

async function build(input: string, opts: Options): Promise<void> {
  const md = readFileSync(input, 'utf8')
  const css = opts.css ? readFileSync(opts.css, 'utf8') : ''
  const baseDir = dirname(resolve(input))

  // ::http:: は Node 側で先に叩いてレスポンスを焼き込む（CORS 無し）。--no-fetch で無効化
  const specs = opts.noFetch ? [] : scanHttp(md)
  const http = specs.length ? await fetchAll(specs) : undefined
  if (specs.length) {
    const failed = [...http!.values()].filter((r) => r.error).length
    console.log(`${time()}   ↳ ${specs.length} 件の HTTP リクエストを取得${failed ? `（${failed} 件失敗）` : ''}`)
  }

  const targets = outputs(input, opts)
  for (const { path } of targets) guardOutput(input, path)
  for (const { format, path } of targets) {
    mkdirSync(dirname(path), { recursive: true })
    if (format === 'html') {
      // ippon ogp が書き出す画像。URL として解決するので、# や ? を含む名前でも壊れないようエンコードする
      const ogImage = encodeURIComponent(`${basename(input, extname(input))}.png`)
      const { html, count, missing } = render(md, { baseDir, outDir: dirname(path), css, http, inline: opts.inline, ogImage })
      writeFileSync(path, html)
      console.log(`${time()} ✓ ${count} slides → ${path}`)
      if (missing.length) console.log(`${time()}   ↳ 埋め込めなかった画像（パスのまま）: ${missing.join(', ')}`)
    } else {
      const { html, count } = render(md, { baseDir, css, http })
      await toPdf(html, path, { browserPath: opts.browserPath })
      console.log(`${time()} ✓ ${count} slides → ${path}`)
    }
  }
}

function watchBuild(input: string, opts: Options): void {
  let timer: NodeJS.Timeout | undefined
  let running = Promise.resolve()
  const rebuild = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      running = running.then(() => build(input, opts)).catch((e: Error) => console.error(`${time()} ✗ ${e.message}`))
    }, 80)
  }
  // エディタによってはファイルを置き換えて保存するので、ディレクトリごと監視する
  const files = [input, opts.css].filter((f) => f !== undefined).map((f) => resolve(f))
  for (const dir of new Set(files.map(dirname))) {
    watch(dir, (_, file) => {
      if (file && files.includes(join(dir, file.toString()))) rebuild()
    })
  }
  console.log(`watching ${files.join(', ')} ...`)
}

// ---------------------------------------------------------------
// serve
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// ogp
// ---------------------------------------------------------------

async function ogp(input: string, opts: Options): Promise<void> {
  const md = readFileSync(input, 'utf8')
  const css = opts.css ? readFileSync(opts.css, 'utf8') : ''
  const name = `${basename(input, extname(input))}.png`
  const { output } = opts
  const dirLike =
    output && (output.endsWith('/') || output.endsWith('\\') || (existsSync(output) && statSync(output).isDirectory()))
  const out = resolve(!output ? join(dirname(input), name) : dirLike ? join(output, name) : output)
  guardOutput(input, out)
  mkdirSync(dirname(out), { recursive: true })
  // 画像は file:// URL で読ませる（PDF と同じ）
  const { html } = render(md, { baseDir: dirname(resolve(input)), css })
  await toPng(html, out, { browserPath: opts.browserPath })
  console.log(`${time()} ✓ 表紙 → ${out}（1200×630）`)
  if (!frontmatter(md)[0].url)
    console.log(`${time()}   ↳ frontmatter に url: を書くと、build した HTML の og:image にこの画像の URL が入ります`)
}

async function runServe(input: string, opts: Options): Promise<void> {
  let port: number | undefined
  if (opts.port !== undefined) {
    port = Number(opts.port)
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`ポートが不正です: ${opts.port}`)
  }
  const r = await serve(input, { port, css: opts.css })
  // ippon current がこのサーバを見つけられるように登録しておく（終了時に消す）
  const unregister = register({ port: r.port, file: real(input), pid: process.pid, startedAt: Date.now() })
  process.on('exit', unregister)
  for (const sig of ['SIGINT', 'SIGTERM'] as const) process.once(sig, () => process.exit(sig === 'SIGINT' ? 130 : 143))
  console.log(qrTerminal(r.remoteUrls[0]!))
  console.log(`✓ ippon serve で配信中`)
  console.log(``)
  console.log(`  この PC で開く:   ${r.deckUrl}`)
  for (const u of r.remoteUrls) console.log(`  スマホのリモコン: ${u}`)
  console.log(``)
  console.log(`  ↑ の QR をスマホのカメラで読み取るとリモコンになります（PC と同じ Wi-Fi に接続）`)
  console.log(`  発表者ビュー（p）にも QR が出ます。Ctrl+C で終了`)
  console.log(``)
  console.log(`  表示中のスライド: ippon current（または curl -s ${r.currentUrl}）`)
  console.log(`  （選択中の文字列と Markdown の行番号を返します。ippon skills init でエージェントに使い方を教えられます）`)
}

// ---------------------------------------------------------------
// init
// ---------------------------------------------------------------

const SAMPLE = `---
title: はじめての ippon
author: あなたの名前
---

::title::

# はじめての ippon

サブタイトル

あなたの名前 ・ 2026-01-01

---

::center::

1 枚に

1 メッセージ

---

::center size=2::

**大きく**

---

::center bg=blue::

背景色も変えられる

-# blue / orange / purple / red / green / black / white、または #rrggbb

---

::center size=1.5 bg=white::

セクション

---

## 箇条書き

- **太字** はアクセントカラーになる
- \`inline code\` も書ける
  - ネストもできる
- 矢印 → は少し薄くなる

---

## 2 カラム

- 左に説明
- 右にコード

::right::

\`\`\`ts
const app = new Hono()
!! app.get('/', (c) => c.text('Hello!'))
\`\`\`

-# 行頭に "!! " を付けるとその行が強調される

::note::

p キーで発表者ビューが開きます。
この ::note:: 以降は本番に出ず、手元のメモとして見えます。

---

\`\`\`console
$ npx ippon-slides build slide.md --html --pdf
✓ 9 slides → slide.html
✓ 9 slides → slide.pdf
\`\`\`

---

::title::

# ありがとうございました

あなたの名前
`

function init(file = 'slide.md'): void {
  if (existsSync(file)) throw new Error(`${file} はすでにあります`)
  writeFileSync(file, SAMPLE)
  console.log(`✓ ${file} を作りました → ippon build ${file} --html -w`)
}

// ---------------------------------------------------------------
// main
// ---------------------------------------------------------------

export async function main(argv: string[]): Promise<void> {
  const opts = parseArgs(argv)
  if (opts.version) return console.log(pkg.version)
  const [cmd, ...args] = opts._
  if (opts.help || cmd === undefined) return console.log(HELP)

  let rest = args
  if (cmd === 'init') return init(rest[0])
  if (cmd === 'current') {
    if (rest.length > 1) throw new Error(`入力は 1 つだけ指定してください: ${rest.join(' ')}`)
    return console.log(await current(process.cwd(), rest[0]))
  }
  if (cmd === 'skills') {
    if (rest[0] !== 'init') throw new Error('使い方: ippon skills init [dir]')
    const { written, skipped } = skillsInit(resolve(rest[1] || '.'), opts.force)
    const rel = (p: string) => relative(process.cwd(), p)
    for (const p of written) console.log(`✓ ${rel(p)}`)
    for (const p of skipped) console.log(`- ${rel(p)} はすでにあります（--force で上書き）`)
    if (written.length) console.log(`  ippon serve 中に「ここ直して」と頼むと、エージェントが ippon current で表示中のスライドを読みます`)
    return
  }
  if (cmd === 'ogp') {
    const input = rest[0]
    if (!input) throw new Error('入力の Markdown を指定してください（例: ippon ogp slide.md）')
    if (rest.length > 1) throw new Error(`入力は 1 つだけ指定してください: ${rest.join(' ')}`)
    if (!existsSync(input)) throw new Error(`${input} が見つかりません`)
    return ogp(input, opts)
  }
  if (cmd === 'serve') {
    const input = rest[0]
    if (!input) throw new Error('入力の Markdown を指定してください（例: ippon serve slide.md）')
    if (rest.length > 1) throw new Error(`入力は 1 つだけ指定してください: ${rest.join(' ')}`)
    if (!existsSync(input)) throw new Error(`${input} が見つかりません`)
    return runServe(input, opts)
  }
  if (cmd !== 'build') rest = [cmd, ...rest] // `ippon slide.md` は build の省略形

  const input = rest[0]
  if (!input) throw new Error('入力の Markdown を指定してください（例: ippon build slide.md --html）')
  if (rest.length > 1) throw new Error(`入力は 1 つだけ指定してください: ${rest.join(' ')}`)
  if (!existsSync(input)) throw new Error(`${input} が見つかりません`)

  await build(input, opts)
  if (opts.watch) watchBuild(input, opts)
}
