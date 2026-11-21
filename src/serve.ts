// `ippon serve`: ゼロ依存のローカルサーバ。スマホを QR で繋いでスライドのリモコンにする。
//
//   - GET /?t=TOKEN         発表者が開くデッキ（window.__ippon を注入）
//   - GET /remote?t=TOKEN   スマホのリモコン画面
//   - GET /events?t=TOKEN   SSE。state / コマンドを全クライアントへ配信
//   - POST /cmd?t=TOKEN     コマンド送信（go / timer / state）
//   - GET /__current-slide  いま表示中のスライドと選択中の文字列（この PC からだけ、トークン不要）
//   - それ以外              Markdown のあるディレクトリから静的配信（画像だけ。デッキかリモコンを開いた
//                           ブラウザに渡す Cookie かトークンが要る）
//
// 通信は SSE + fetch POST の小さな pub/sub だけ。WebSocket も外部依存も使わない。
// Markdown / --css を書き換えると reload を配信する（デッキは変わったスライドだけ差し替え、リモコンは読み込み直す）。

import { randomUUID } from 'node:crypto'
import { readFileSync, realpathSync, statSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { esc } from './highlight.ts'
import { parse, slideLines } from './markdown.ts'
import { qrSvg } from './qr.ts'
import { render } from './render.ts'

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
}

// 静的配信するのはデッキが <img> で読む画像系だけ。
// .json / .html / .js / .css / .md などは（隣に置かれた設定・秘密・発表者ノートを
// 漏らさないよう）配信しない。
const STATIC_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'])

export interface ServeOptions {
  port?: number
  css?: string
  host?: string
}

export interface ServeResult {
  server: Server
  port: number
  token: string
  /** 発表者がこの PC で開く URL（トークン付き） */
  deckUrl: string
  /** スマホで開くリモコン URL（LAN IP ごと、トークン付き） */
  remoteUrls: string[]
  /** 先頭のリモコン URL を表す QR の SVG */
  qrSvg: string
  /** いま表示中のスライドを返す URL（コーディングエージェント向け。この PC からだけ） */
  currentUrl: string
}

/** /__current-slide の応答 */
export interface CurrentSlide {
  /** Markdown の絶対パス */
  file: string
  /** 表示中のスライド番号（1 始まり） */
  slide: number
  total: number
  /** そのスライドの Markdown 上の行範囲（1 始まり・両端を含む） */
  lines: { start: number; end: number }
  /** そのスライドの Markdown */
  source: string
  /** デッキで選択中の文字列（無ければ ''） */
  selection: string
}

// 画像を直接開いても（SVG の）スクリプトが動かないようにする。<img> で読むときには効かない
const STATIC_HEADERS = {
  'content-security-policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
  'x-content-type-options': 'nosniff',
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * この PC から localhost 宛てに来たリクエストか。
 * Host も見るのは、外部サイトが DNS リバインディングで localhost を読むのを防ぐため
 */
function isLocal(req: IncomingMessage): boolean {
  const host = (req.headers.host || '').replace(/:\d+$/, '').toLowerCase()
  return LOOPBACK.has(req.socket.remoteAddress || '') && LOCAL_HOSTS.has(host)
}

function lanIps(): string[] {
  const out: string[] = []
  const ifs = networkInterfaces()
  for (const list of Object.values(ifs))
    for (const ni of list || []) if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address)
  return out
}

/** </script> 対策で < をエスケープした JSON */
const safeJson = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c')

function remotePage(token: string, notes: string[], total: number, title: string): string {
  const remoteJs = readFileSync(join(assets, 'remote.js'), 'utf8')
  const config = safeJson({ token, total, notes })
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="color-scheme" content="dark">
<title>${esc(title)} — リモコン</title>
<style>
:root{--acc:#ff6a00}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#111;color:#fff;font-family:-apple-system,'Hiragino Sans','Noto Sans JP',system-ui,sans-serif;overscroll-behavior:none}
#r{display:flex;flex-direction:column;height:100%;padding:env(safe-area-inset-top) 12px calc(12px + env(safe-area-inset-bottom))}
.top{display:flex;align-items:baseline;gap:12px;padding:12px 4px}
.pos{font-size:1.1rem;font-variant-numeric:tabular-nums}
.clock{margin-left:auto;font-size:1.6rem;font-weight:700;font-variant-numeric:tabular-nums}
.note{flex:1;overflow-y:auto;background:#1b1b1e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 16px;font-size:1.1rem;line-height:1.7;-webkit-overflow-scrolling:touch}
.note .empty{color:#76767c}
.note h1,.note h2,.note h3{font-size:1.2rem;margin:.4em 0}
.note strong{color:var(--acc)}
.pad{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
button{font:inherit;color:#fff;background:#2a2a2e;border:1px solid rgba(255,255,255,.16);border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.nav{font-size:2.4rem;padding:26px 0}
.nav:active{background:var(--acc)}
.row{display:flex;gap:12px;margin-top:12px}
.row button{flex:1;padding:14px 0;font-size:1rem}
.conn{padding:6px 4px;font-size:.8rem;color:#8a8a8a;text-align:center}
.conn.off{color:#ef5350}
</style>
</head>
<body>
<div id="r">
<div class="top"><span class="pos" id="pos">— / —</span><span class="clock" id="clock">0:00</span></div>
<div class="note" id="note"><p class="empty">（ノートなし）</p></div>
<div class="pad"><button class="nav" id="prev">◀</button><button class="nav" id="next">▶</button></div>
<div class="row"><button id="first">⤒ 最初</button><button id="reset">⟲ タイマー</button><button id="last">⤓ 最後</button></div>
<div class="conn" id="conn">接続中…</div>
</div>
<script>window.__ipponRemote=${config}</script>
<script>${remoteJs}</script>
</body>
</html>
`
}

export async function serve(input: string, opts: ServeOptions = {}): Promise<ServeResult> {
  const mdFile = resolve(input)
  const baseDir = dirname(mdFile)
  const realBase = realpathSync(baseDir)
  const token = randomUUID()
  // 編集を反映するため、Markdown と CSS はリクエストのたびに読み直す
  const readMd = () => readFileSync(mdFile, 'utf8')
  const readCss = () => (opts.css ? readFileSync(opts.css, 'utf8') : '')
  readMd()
  readCss()
  let port = 0
  // 画像の <img> リクエストには URL のトークンが付かないので、デッキ・リモコンを開いたブラウザに
  // Cookie で渡す。Cookie はポートで分かれず、同じホストの別のポートのサーバにも送られるので、
  // 値はトークンではなく画像を読むためだけの別の鍵にする。名前にポートを入れて複数の serve を区別する
  const imageKey = randomUUID()
  const cookieName = () => `ippon-${port}`
  const cookie = () => `${cookieName()}=${imageKey}; Path=/; HttpOnly; SameSite=Strict`
  const hasCookie = (req: IncomingMessage) =>
    (req.headers.cookie || '').split(/;\s*/).includes(`${cookieName()}=${imageKey}`)

  // SSE の購読者と、途中参加に即返す最新 state
  const clients = new Set<ServerResponse>()
  let lastState: string | null = null
  const broadcast = (payload: string) => {
    for (const res of clients) res.write(`data: ${payload}\n\n`)
  }

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost')
      const path = decodeURIComponent(url.pathname)
      const authed = url.searchParams.get('t') === token

      // ---- SSE ----
      if (path === '/events') {
        if (!authed) return end(res, 403, 'forbidden')
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
        })
        res.write('retry: 2000\n\n')
        if (lastState) res.write(`data: ${lastState}\n\n`)
        clients.add(res)
        req.on('close', () => clients.delete(res))
        return
      }

      // ---- コマンド ----
      if (path === '/cmd' && req.method === 'POST') {
        if (!authed) return end(res, 403, 'forbidden')
        let body = ''
        req.on('data', (c) => {
          body += c
          if (body.length > 1e6) req.destroy()
        })
        req.on('end', () => {
          try {
            const msg = JSON.parse(body) as { type?: string }
            if (msg && msg.type === 'state') lastState = body
            broadcast(body)
          } catch {
            /* 壊れた JSON は無視 */
          }
          end(res, 204, '')
        })
        return
      }

      // ---- いま表示中のスライド（コーディングエージェント向け） ----
      if (path === '/__current-slide') {
        if (!authed && !isLocal(req)) return end(res, 403, 'forbidden')
        const state = lastState ? (JSON.parse(lastState) as { idx?: unknown; sel?: unknown }) : null
        if (!state || typeof state.idx !== 'number')
          return json(res, 404, { error: 'デッキがまだ開かれていません。ippon serve が表示した URL をブラウザで開いてください' })
        const md = readMd()
        const ranges = slideLines(md)
        const range = ranges[state.idx]
        if (!range) return json(res, 404, { error: `スライド ${state.idx + 1} が見つかりません（Markdown が変わった可能性があります）` })
        const [start, endLine] = range
        const current: CurrentSlide = {
          file: mdFile,
          slide: state.idx + 1,
          total: ranges.length,
          lines: { start, end: endLine },
          source: md.replace(/\r\n/g, '\n').split('\n').slice(start - 1, endLine).join('\n'),
          selection: typeof state.sel === 'string' ? state.sel : '',
        }
        return json(res, 200, current)
      }

      // ---- リモコン画面 ----
      if (path === '/remote') {
        if (!authed) return end(res, 403, 'このページは ippon serve の QR から開いてください')
        const { meta, notes, sections } = parse(readMd())
        const html = remotePage(token, notes, sections.length, meta.title || 'slides')
        res.setHeader('set-cookie', cookie())
        return end(res, 200, html, 'text/html; charset=utf-8')
      }

      // ---- デッキ本体 ----
      if (path === '/' || path === '/index.html') {
        if (!authed) return end(res, 403, 'このページは ippon serve が表示する URL から開いてください')
        const ips = lanIps()
        const remoteUrl = `http://${ips[0] || 'localhost'}:${port}/remote?t=${token}`
        const config =
          `<script>window.__ippon=${safeJson({ token, remoteUrl, qr: qrSvg(remoteUrl, 4) })}</script>\n`
        let html = render(readMd(), { baseDir, outDir: baseDir, css: readCss() }).html
        html = html.replace('<script id="notes"', config + '<script id="notes"')
        res.setHeader('set-cookie', cookie())
        return end(res, 200, html, 'text/html; charset=utf-8')
      }

      // ---- 静的ファイル（画像） ----
      // デッキかリモコンを開いたブラウザ（Cookie）だけに、画像系（STATIC_EXT）だけを配信する。
      if (!authed && !hasCookie(req)) return end(res, 403, 'forbidden')
      const rel = normalize(path).replace(/^(\.\.(\/|\\|$))+/, '')
      const file = join(baseDir, rel)
      if (file !== baseDir && !file.startsWith(baseDir + sep)) return end(res, 403, 'forbidden')
      const ext = (file.match(/\.[^.]+$/)?.[0] || '').toLowerCase()
      if (!STATIC_EXT.has(ext)) return end(res, 404, 'not found')
      try {
        // シンボリックリンクでフォルダの外を指していたら配信しない
        const real = realpathSync(file)
        if (!real.startsWith(realBase + sep)) return end(res, 403, 'forbidden')
        if (statSync(real).isFile()) {
          res.writeHead(200, { 'content-type': MIME[ext]!, ...STATIC_HEADERS })
          res.end(readFileSync(real))
          return
        }
      } catch {
        /* 無ければ 404 */
      }
      end(res, 404, 'not found')
    } catch (e) {
      // 詳細はサーバ側ログだけに出し、クライアントには固定文言を返す
      console.error(e)
      end(res, 500, 'internal server error')
    }
  })

  port = await new Promise<number>((res, rej) => {
    server.on('error', rej)
    server.listen(opts.port ?? 0, opts.host ?? '0.0.0.0', () => {
      const addr = server.address()
      res(typeof addr === 'object' && addr ? addr.port : 0)
    })
  })

  // Markdown / CSS が変わったら、開いているデッキとリモコンに再読み込みさせる。
  // エディタによっては置き換え保存するので、ファイルではなく親ディレクトリを監視する
  const files = [mdFile, ...(opts.css ? [resolve(opts.css)] : [])]
  let reloadTimer: NodeJS.Timeout | undefined
  const watchers = [...new Set(files.map(dirname))].map((dir) =>
    watch(dir, (_, name) => {
      if (!name || !files.includes(join(dir, name.toString()))) return
      clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => broadcast(JSON.stringify({ type: 'reload' })), 100)
    })
  )
  for (const w of watchers) w.unref()
  server.on('close', () => {
    clearTimeout(reloadTimer)
    for (const w of watchers) w.close()
  })

  const ips = lanIps()
  const remoteUrls = (ips.length ? ips : ['localhost']).map((ip) => `http://${ip}:${port}/remote?t=${token}`)
  return {
    server,
    port,
    token,
    deckUrl: `http://localhost:${port}/?t=${token}`,
    remoteUrls,
    qrSvg: qrSvg(remoteUrls[0]!, 4),
    currentUrl: `http://localhost:${port}/__current-slide`,
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  end(res, status, JSON.stringify(body, null, 2) + '\n', 'application/json; charset=utf-8')
}

function end(res: ServerResponse, status: number, body: string, type = 'text/plain; charset=utf-8'): void {
  res.writeHead(status, { 'content-type': type })
  res.end(body)
}
