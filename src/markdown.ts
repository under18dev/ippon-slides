// Markdown → スライドの <section> 群
//
//   ---                       スライドの区切り
//   ::center::                1 行目に置くとスライドの指示（center / title / wide / bg=xxx / size=1.5）
//   ::right::                 ここから右カラム（left-wide / right-wide で幅を 1.4:1 / 1:1.4 に、center で上下中央揃え）
//   ::note::                  発表者ノート（この行以降は本番に出ず発表者ビューだけに出る）
//   ::qr url=... caption::    URL の QR コード（SVG。caption で下に URL も出す）
//   ::background path=...::   背景画像（brightness / opacity で明るさ・濃さ。::right:: の後ろなら右半分）
//   -# 注釈                   小さい注釈
//   ```hcl                    コード（hcl / console / sh / json / js / ts / diff / yaml / py / go / rust / html / css）
//   !! 行                     コードの行を強調（行頭の "!! " は消える）

import { esc, highlight } from './highlight.ts'
import { qrSvg } from './qr.ts'

export const BG: Record<string, string> = {
  blue: '#0d76bc',
  orange: '#ff6a00',
  purple: '#5c2d91',
  red: '#c0392b',
  green: '#188038',
  black: '#000000',
  white: '#fafafa',
}

const DIRECTIVES = /^(center|title|wide|bg=.+|size=.+)$/

/** frontmatter（`key: value` だけの簡易 YAML） */
export type Meta = Record<string, string>

export interface Parsed {
  meta: Meta
  /** スライドごとの `<section>` */
  sections: string[]
  /** スライドごとの発表者ノート（::note:: 以降の HTML。無ければ ''）。sections と同じ並び */
  notes: string[]
}

// ---------------------------------------------------------------
// ::http:: （HTTP リクエストのプレイグラウンド）
// ---------------------------------------------------------------

/** `::http method=GET url=...::` のリクエスト指定 */
export interface HttpSpec {
  method: string
  url: string
}

/** ビルド時に取得したレスポンス（http.ts が埋める）。error があれば取得失敗 */
export interface HttpResult {
  status?: number
  statusText?: string
  ms?: number
  headers?: [string, string][]
  contentType?: string
  body?: string
  truncated?: boolean
  error?: string
}

/** method+url → 取得結果。同じリクエストは 1 エントリに集約される */
export type HttpMap = Map<string, HttpResult>

export const httpKey = (s: HttpSpec): string => `${s.method} ${s.url}`

// ---------------------------------------------------------------
// inline
// ---------------------------------------------------------------

/** リンクに出さないスキーム（クリックでスクリプトが動く）。ブラウザと同じく空白・制御文字は無視して見る */
const UNSAFE_LINK = /^(?:javascript|vbscript|data):/i
const safeLink = (url: string): boolean => !UNSAFE_LINK.test(url.replace(/[\u0000-\u0020]/g, ''))

// 画像・リンク。閉じない [ や ( が並ぶと、開始位置ごとに行末まで読んで戻るので行の長さの二乗かかる。
// 長さに上限を付け、URL は (?=(...))\N で後戻りさせない（ブラウザの URL の上限よりは十分長い）
const IMAGE = /!\[([^\]]{0,1000})\]\((?=([^)\s]{1,4000}))\2(?:\s+&quot;([^&]{0,1000})&quot;)?\)/g
const LINK = /\[([^\]]{1,1000})\]\((?=([^)\s]{1,4000}))\2\)/g

export function inline(text: string): string {
  // タグ（コード・画像・リンク）はできた順に退避し、最後に戻す。
  // 太字・斜体・矢印の置き換えが <img alt=""> や href="" の中に入って属性を壊さないように
  const held: string[] = []
  const hold = (html: string) => `\u0000${held.push(html) - 1}\u0000`
  let s = text.replace(/\u0000/g, '').replace(/`([^`]+)`/g, (_, c: string) => hold(`<code>${esc(c)}</code>`))
  s = esc(s)
  s = s.replace(
    IMAGE,
    (_, alt: string, src: string, title: string | undefined) =>
      hold(`<img src="${src}" alt="${alt}">`) + (title ? `<span class="img-caption">${title}</span>` : '')
  )
  s = s.replace(LINK, (all, label: string, href: string) =>
    safeLink(href) ? hold(`<a href="${href}" target="_blank" rel="noopener">`) + label + hold('</a>') : label
  )
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
  s = s.replace(/→/g, '<span class="arrow">→</span>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => held[Number(i)]!)
}

// ---------------------------------------------------------------
// block
// ---------------------------------------------------------------

interface ListItem {
  indent: number
  ordered: boolean
  text: string
}

function list(items: ListItem[]): string {
  const base = items[0]!.indent
  const tag = items[0]!.ordered ? 'ol' : 'ul'
  let html = `<${tag}>`
  let i = 0
  while (i < items.length) {
    const item = items[i++]!
    const children: ListItem[] = []
    while (i < items.length && items[i]!.indent > base) children.push(items[i++]!)
    html += `<li>${inline(item.text)}${children.length ? list(children) : ''}</li>`
  }
  return html + `</${tag}>`
}

function table(rows: string[]): string {
  // `\|` はセルの区切りではなく文字としての |
  const cells = (r: string) =>
    r
      .trim()
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'))
  const head = cells(rows[0]!)
  const align = cells(rows[1]!).map((c) => (/:$/.test(c) ? ' class="num"' : ''))
  let html = '<table><thead><tr>'
  head.forEach((c, i) => (html += `<th${align[i] || ''}>${inline(c)}</th>`))
  html += '</tr></thead><tbody>'
  for (const r of rows.slice(2)) {
    html += '<tr>'
    cells(r).forEach((c, i) => (html += `<td${align[i] || ''}>${inline(c)}</td>`))
    html += '</tr>'
  }
  return html + '</tbody></table>'
}

/** 引用の入れ子の深さの上限。これより深い > は文字のまま出す（再帰でスタックがあふれないように） */
const MAX_QUOTE_DEPTH = 16

const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/

/**
 * @param ratio 右カラムのとき、左カラムが占める割合（::background:: を右半分に敷く）
 */
export function blocks(src: string, http?: HttpMap, ratio?: number, depth = 0): string {
  const lines = src.split('\n')
  let html = ''
  let para: string[] = []

  const flush = () => {
    if (!para.length) return
    const text = para.join('\n')
    para = []
    if (text.startsWith('-# ')) html += `<p class="note">${inline(text.slice(3)).replace(/\n/g, '<br>')}</p>`
    else html += `<p>${inline(text).replace(/\n/g, '<br>')}</p>`
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    const fence = line.match(/^```([\w-]*)\s*$/)
    if (fence) {
      flush()
      const lang = fence[1]!
      const body: string[] = []
      while (++i < lines.length && !/^```\s*$/.test(lines[i]!)) body.push(lines[i]!)
      const attr = lang && lang !== 'console' ? ` data-lang="${esc(lang)}"` : ''
      html += `<pre${attr}><code>${highlight(body.join('\n'), lang)}</code></pre>`
      continue
    }

    if (line.startsWith('::http')) {
      const spec = parseHttp(line)
      if (spec) {
        flush()
        html += httpBlock(spec, http)
        continue
      }
    }

    if (line.startsWith('::background')) {
      const spec = parseBackground(line)
      if (spec) {
        flush()
        html += backgroundBlock(spec, ratio)
        continue
      }
    }

    if (line.startsWith('::qr')) {
      const spec = parseQr(line)
      if (spec) {
        flush()
        html += qrBlock(spec)
        continue
      }
    }

    if (!line.trim()) {
      flush()
      continue
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      flush()
      const level = h[1]!.length
      html += `<h${level}>${inline(h[2]!)}</h${level}>`
      continue
    }

    if (LIST_ITEM.test(line) && !line.startsWith('-# ')) {
      flush()
      const items: ListItem[] = []
      let m: RegExpMatchArray | null
      while (i < lines.length && (m = lines[i]!.match(LIST_ITEM))) {
        items.push({ indent: m[1]!.length, ordered: /\d/.test(m[2]!), text: m[3]! })
        i++
      }
      i--
      html += list(items)
      continue
    }

    if (line.startsWith('|') && /^\|?\s*:?-+/.test(lines[i + 1] || '')) {
      flush()
      const rows: string[] = []
      while (i < lines.length && lines[i]!.startsWith('|')) rows.push(lines[i++]!)
      i--
      html += table(rows)
      continue
    }

    if (line.startsWith('> ')) {
      flush()
      const q: string[] = []
      while (i < lines.length && lines[i]!.startsWith('> ')) q.push(lines[i++]!.slice(2))
      i--
      html +=
        depth < MAX_QUOTE_DEPTH
          ? `<blockquote>${blocks(q.join('\n'), http, undefined, depth + 1)}</blockquote>`
          : `<blockquote><p>${inline(q.join('\n')).replace(/\n/g, '<br>')}</p></blockquote>`
      continue
    }

    para.push(line)
  }
  flush()
  return html
}

// ---------------------------------------------------------------
// ::qr:: （URL の QR コード）
// ---------------------------------------------------------------

/** `::qr url=... caption::` の指定 */
export interface QrSpec {
  url: string
  /** QR の下に URL を出すか */
  caption: boolean
}

const QR_LINE = /^::qr[ \t]+(.+?)[ \t]*::[ \t]*$/

/** `::qr url=...::` 行をパースする。url が無ければ null（= ただの段落） */
export function parseQr(line: string): QrSpec | null {
  const m = line.match(QR_LINE)
  if (!m) return null
  let url = ''
  let caption = false
  for (const tok of m[1]!.trim().split(/[ \t]+/)) {
    if (tok === 'caption') caption = true
    else if (tok.startsWith('url=')) url = tok.slice(4)
    // `::qr https://...::` のように URL を裸で書いた場合も許す
    else if (/^https?:\/\//i.test(tok)) url = tok
  }
  return url ? { url, caption } : null
}

function qrBlock(spec: QrSpec): string {
  let svg: string
  try {
    svg = qrSvg(spec.url, 1)
  } catch {
    throw new Error(`::qr:: の URL が長すぎます（213 バイトまで）: ${spec.url}`)
  }
  const caption = spec.caption ? `<figcaption>${esc(spec.url)}</figcaption>` : ''
  return `<figure class="qr">${svg}${caption}</figure>`
}

// ---------------------------------------------------------------
// ::background:: （背景画像）
// ---------------------------------------------------------------

/** `::background path=... brightness=0.6 opacity=0.8::` の指定 */
export interface BackgroundSpec {
  path: string
  /** 明るさ（1 がそのまま、0.5 で半分の暗さ） */
  brightness?: string
  /** 濃さ（1 がそのまま、0 で見えない。下のスライドの背景色が透ける） */
  opacity?: string
}

const BACKGROUND_LINE = /^::background[ \t]+(.+?)[ \t]*::[ \t]*$/
const NUMBER = /^(?:\d+(?:\.\d+)?|\.\d+)%?$/

/** `::background path=...::` 行をパースする。path が無ければ null（= ただの段落） */
export function parseBackground(line: string): BackgroundSpec | null {
  const m = line.match(BACKGROUND_LINE)
  if (!m) return null
  const spec: BackgroundSpec = { path: '' }
  for (const tok of m[1]!.trim().split(/[ \t]+/)) {
    const kv = tok.match(/^(path|brightness|opacity)=(.*)$/)
    if (!kv) {
      // `::background img/bg.jpg::` のようにパスを裸で書いた場合も許す。
      // `https://e.x/a.jpg?w=1280` のように = を含むパスもあるので、`名前=` で始まるもの（知らない指定）だけ飛ばす
      if (!/^[a-z-]+=/i.test(tok)) spec.path = tok
      continue
    }
    const [, key, value] = kv as [string, 'path' | 'brightness' | 'opacity', string]
    if (key !== 'path' && !NUMBER.test(value))
      throw new Error(`::background:: の ${key} は数値で指定してください（例: ${key}=0.6）: ${value}`)
    spec[key] = value
  }
  return spec.path ? spec : null
}

function backgroundBlock(spec: BackgroundSpec, ratio?: number): string {
  const style = [
    ratio !== undefined ? `--ratio:${ratio}` : '',
    spec.opacity ? `opacity:${spec.opacity}` : '',
    spec.brightness ? `filter:brightness(${spec.brightness})` : '',
  ].filter(Boolean)
  // <img> にしておくと、相対パスの書き換え・--inline・serve の静的配信がそのまま効く
  return `<img src="${esc(spec.path)}" class="slide-bg${ratio !== undefined ? ' right' : ''}" alt=""${
    style.length ? ` style="${style.join(';')}"` : ''
  }>`
}

const HTTP_LINE = /^::http[ \t]+(.+?)[ \t]*::[ \t]*$/

/** `::http method=GET url=...::` 行をパースする。url が無ければ null（= ただの段落） */
export function parseHttp(line: string): HttpSpec | null {
  const m = line.match(HTTP_LINE)
  if (!m) return null
  let method = 'GET'
  let url = ''
  for (const tok of m[1]!.trim().split(/[ \t]+/)) {
    const kv = tok.match(/^([A-Za-z]+)=(.+)$/)
    if (!kv) {
      // `::http https://...::` のように URL を裸で書いた場合も許す
      if (/^https?:\/\//i.test(tok)) url = tok
      continue
    }
    const k = kv[1]!.toLowerCase()
    if (k === 'method') method = kv[2]!.toUpperCase()
    else if (k === 'url') url = kv[2]!
  }
  return url ? { method, url } : null
}

/** Markdown 全体から `::http::` のリクエストを拾う（コードフェンス内は無視）。http.ts が使う */
export function scanHttp(md: string): HttpSpec[] {
  const specs: HttpSpec[] = []
  let inFence = false
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) inFence = !inFence
    else if (!inFence) {
      const spec = parseHttp(line)
      if (spec) specs.push(spec)
    }
  }
  return specs
}

function statusClass(status: number): string {
  if (status < 200) return 's-1xx'
  if (status < 300) return 's-2xx'
  if (status < 400) return 's-3xx'
  if (status < 500) return 's-4xx'
  return 's-5xx'
}

function httpBody(result: HttpResult): string {
  const body = result.body ?? ''
  const isJson = /\bjson\b/i.test(result.contentType || '') || /^\s*[[{]/.test(body)
  if (isJson) {
    try {
      const pretty = JSON.stringify(JSON.parse(body), null, 2)
      return `<pre data-lang="json"><code>${highlight(pretty, 'json')}</code></pre>`
    } catch {
      // JSON ではなかった → 素のテキストで出す
    }
  }
  return `<pre><code>${esc(body)}</code></pre>`
}

/** 取得結果の `<div class="http-res">`（焼き込み済み / 未取得 / エラー） */
function httpRes(result: HttpResult | undefined): string {
  if (!result) {
    return `<div class="http-res" data-state="pending"><p class="http-msg">未取得 — 「再送信」で取得します</p></div>`
  }
  if (result.error) {
    return `<div class="http-res" data-state="error"><div class="http-status"><span class="http-errmsg">✗ ${esc(result.error)}</span></div></div>`
  }
  const status = result.status ?? 0
  const headers = result.headers ?? []
  return (
    `<div class="http-res" data-state="ok">` +
    `<div class="http-status">` +
    `<span class="http-code ${statusClass(status)}">${status}</span>` +
    `<span class="http-statustext">${esc(result.statusText || '')}</span>` +
    `<span class="http-time">${result.ms ?? 0} ms</span>` +
    `</div>` +
    `<details class="http-headers"><summary>ヘッダー（${headers.length}）</summary><table>` +
    headers.map(([k, v]) => `<tr><td class="http-hk">${esc(k)}</td><td class="http-hv">${esc(v)}</td></tr>`).join('') +
    `</table></details>` +
    httpBody(result) +
    (result.truncated ? `<p class="http-msg">… レスポンスが長いため省略しました</p>` : '') +
    `</div>`
  )
}

function httpBlock(spec: HttpSpec, http?: HttpMap): string {
  return (
    `<div class="http" data-method="${esc(spec.method)}" data-url="${esc(spec.url)}">` +
    `<div class="http-req">` +
    `<span class="http-method m-${esc(spec.method.toLowerCase())}">${esc(spec.method)}</span>` +
    `<span class="http-url">${esc(spec.url)}</span>` +
    `<button class="http-send" type="button">再送信</button>` +
    `</div>` +
    httpRes(http?.get(httpKey(spec))) +
    `</div>`
  )
}

// ---------------------------------------------------------------
// slide
// ---------------------------------------------------------------

/** `---` で区切ったスライドの塊（md 内の 0 始まりの開始行つき）。中身が空の塊は除く */
function chunks(md: string): { start: number; lines: string[] }[] {
  const out: { start: number; lines: string[] }[] = []
  let cur: string[] = []
  let start = 0
  let inFence = false
  md.split('\n').forEach((line, i) => {
    if (/^```/.test(line)) inFence = !inFence
    if (!inFence && /^---\s*$/.test(line)) {
      out.push({ start, lines: cur })
      cur = []
      start = i + 1
    } else cur.push(line)
  })
  out.push({ start, lines: cur })
  return out.filter((c) => c.lines.join('\n').trim())
}

export function splitSlides(md: string): string[] {
  return chunks(md).map((c) => c.lines.join('\n'))
}

/**
 * スライドごとの元ファイル上の行範囲 [開始, 終了]（1 始まり・両端を含む・前後の空行は除く）。
 * parse() の sections と同じ並び。ippon serve の /__current-slide が使う
 */
export function slideLines(md: string): [number, number][] {
  const src = md.replace(/\r\n/g, '\n')
  const [, body] = frontmatter(src)
  const offset = src.slice(0, src.length - body.length).split('\n').length - 1
  return chunks(body).map(({ start, lines }) => {
    let a = 0
    let b = lines.length - 1
    while (!lines[a]!.trim()) a++
    while (!lines[b]!.trim()) b--
    return [offset + start + a + 1, offset + start + b + 1]
  })
}

export function slide(src: string, http?: HttpMap): { section: string; note: string } {
  const classes = ['slide']
  let style = ''
  let body = src.replace(/^\s+/, '')

  // 発表者ノート（::note:: 以降）。本番スライドの DOM には入れず、別で返す
  let note = ''
  const noteParts = body.split(/^::note::[ \t]*$/m)
  if (noteParts.length > 1) {
    body = noteParts[0]!
    note = blocks(noteParts.slice(1).join('\n').trim(), http)
  }

  const d = body.match(/^::([^:]+)::[ \t]*(\n|$)/)
  const tokens = d ? d[1]!.trim().split(/\s+/) : []
  if (d && tokens.every((t) => DIRECTIVES.test(t))) {
    for (const tok of tokens) {
      const bg = tok.match(/^bg=(.+)$/)
      const size = tok.match(/^size=(.+)$/)
      if (bg) {
        const name = bg[1]!
        // bg=constructor などで継承プロパティを拾わないよう、自前のキーだけを見る
        style += `background:${esc((Object.hasOwn(BG, name) && BG[name]) || name)};`
        if (name === 'white') classes.push('light')
      } else if (size) style += `--slide-size:${esc(size[1]!)};`
      else classes.push(tok)
    }
    body = body.slice(d[0].length)
  }

  let html: string
  // ::right::（1:1）/ ::right left-wide::（1.4:1）/ ::right right-wide::（1:1.4）
  // center を付けるとカラムを上下中央揃えにする（::right center:: / ::right right-wide center::）
  const parts = body.split(/^::right((?:[ \t]+(?:left-wide|right-wide|center))*)::[ \t]*$/m)
  if (parts.length === 3) {
    const [first, mods, right] = parts as [string, string, string]
    // 先頭の見出しはカラムの外（上）に出す
    const head = first.match(/^\s*(#{1,3} .*)\n/)
    const left = head ? first.replace(head[0], '') : first
    const flags = new Set(mods.trim().split(/[ \t]+/).filter(Boolean))
    const cls = ['cols', ...flags].join(' ')
    // 左カラムの割合（右カラムの ::background:: を右半分に敷くのに使う）
    const ratio = flags.has('left-wide') ? 1.4 / 2.4 : flags.has('right-wide') ? 1 / 2.4 : 0.5
    html =
      (head ? blocks(head[1]!, http) : '') +
      `<div class="${cls}"><div>${blocks(left, http)}</div><div>${blocks(right, http, Number(ratio.toFixed(4)))}</div></div>`
  } else {
    html = blocks(body, http)
  }

  // 背景画像はスライドの先頭に集める（どこに書いても、表紙の p:last-child などの構造セレクターを狂わせない）。
  // 位置は CSS の position: absolute と --ratio で決まるので、DOM の場所は関係ない
  const bgs: string[] = []
  html = html.replace(/<img src="[^"]*" class="slide-bg[^"]*"[^>]*>/g, (img) => {
    bgs.push(img)
    return ''
  })
  html = bgs.join('') + html

  const section = `<section class="${classes.join(' ')}"${style ? ` style="${style}"` : ''}>${html}</section>`
  return { section, note }
}

export function frontmatter(md: string): [Meta, string] {
  const m = md.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!m) return [{}, md]
  const meta: Meta = {}
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*?)\s*$/)
    if (kv) meta[kv[1]!] = kv[2]!.replace(/^(["'])(.*)\1$/, '$2')
  }
  return [meta, md.slice(m[0].length)]
}

/** Markdown 全体 → { meta, sections } */
export function parse(md: string, http?: HttpMap): Parsed {
  const [meta, body] = frontmatter(md.replace(/\r\n/g, '\n'))
  const slides = splitSlides(body).map((s) => slide(s, http))
  return { meta, sections: slides.map((s) => s.section), notes: slides.map((s) => s.note) }
}
