import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { serve } from '../src/serve.ts'
import type { ServeResult } from '../src/serve.ts'

const dir = mkdtempSync(join(tmpdir(), 'ippon-serve-'))
const md = join(dir, 'd.md')
writeFileSync(md, '# タイトル\n\n本文\n\n::note::\n\nメモA\n\n---\n\n## 2枚目\n\nx\n')
// スライドと同じフォルダに置かれがちなファイル（漏れてはいけない / 画像は配信してよい）
writeFileSync(join(dir, 'config.json'), '{"secret":"API_KEY"}')
writeFileSync(join(dir, '.env'), 'TOKEN=xxx')
writeFileSync(join(dir, 'pic.png'), 'PNGDATA')

let r: ServeResult
before(async () => {
  r = await serve(md, { port: 0 })
})
after(() => {
  r.server.close()
  rmSync(dir, { recursive: true, force: true })
})

const base = () => `http://localhost:${r.port}`
const get = async (p: string) => {
  const res = await fetch(base() + p)
  return { status: res.status, body: await res.text() }
}

test('トークン無しは 403', async () => {
  assert.equal((await get('/')).status, 403)
  assert.equal((await get('/remote')).status, 403)
  assert.equal((await get('/events')).status, 403)
})

test('/?t= はデッキ HTML に window.__ippon を注入する', async () => {
  const { status, body } = await get('/?t=' + r.token)
  assert.equal(status, 200)
  assert.match(body, /<section class="slide/)
  assert.match(body, /window\.__ippon=/)
  // 注入スクリプトは notes より前（deck.js 実行前）にある
  assert.ok(body.indexOf('window.__ippon=') < body.indexOf('<script id="notes"'))
})

test('/remote?t= はリモコン画面（remote.js + ノート）を返す', async () => {
  const { status, body } = await get('/remote?t=' + r.token)
  assert.equal(status, 200)
  assert.match(body, /__ipponRemote/)
  assert.match(body, /メモA/)
})

test('POST /cmd が SSE 購読者へ配信される', async () => {
  const ac = new AbortController()
  const es = await fetch(base() + '/events?t=' + r.token, { signal: ac.signal })
  const reader = es.body!.getReader()
  const read = (async () => {
    let buf = ''
    for (let i = 0; i < 8; i++) {
      const { value, done } = await reader.read()
      if (done) break
      buf += new TextDecoder().decode(value)
      if (buf.includes('"type":"go"')) break
    }
    return buf
  })()
  await new Promise((res) => setTimeout(res, 50))
  await fetch(base() + '/cmd?t=' + r.token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'go', n: 1 }),
  })
  const buf = await Promise.race([read, new Promise<string>((res) => setTimeout(() => res(''), 1000))])
  ac.abort()
  assert.match(buf, /"type":"go".*"n":1|"n":1.*"type":"go"/)
})

test('静的配信は画像だけ。ソースや設定ファイルは漏らさない', async () => {
  // デッキを開くと Cookie が付き、それで画像を読める
  const deck = await fetch(base() + '/?t=' + r.token)
  const cookie = deck.headers.get('set-cookie')!.split(';')[0]!
  assert.match(deck.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict/)
  // Cookie は別のポートのサーバにも送られるので、トークンそのものを入れない（デッキ・/events・/cmd に使えない）
  const key = cookie.split('=')[1]!
  assert.notEqual(key, r.token)
  assert.equal((await get('/?t=' + key)).status, 403)
  assert.equal((await get('/events?t=' + key)).status, 403)
  const withCookie = (p: string) => fetch(base() + p, { headers: { cookie } })
  const png = await withCookie('/pic.png')
  assert.equal(png.status, 200)
  assert.equal(await png.text(), 'PNGDATA')
  // 直接開いても SVG のスクリプトが動かないよう sandbox を付ける
  assert.match(png.headers.get('content-security-policy')!, /sandbox/)
  // Markdown ソース（::note:: を含む）・設定・ドットファイルは 404
  assert.equal((await withCookie('/d.md')).status, 404)
  assert.equal((await withCookie('/config.json')).status, 404)
  assert.equal((await withCookie('/.env')).status, 404)
  // パストラバーサル（素・URL エンコードとも）
  assert.equal((await withCookie('/../../../etc/passwd')).status, 404)
  assert.equal((await withCookie('/%2e%2e/%2e%2e/etc/passwd')).status, 404)
})

test('静的配信は Cookie もトークンも無いと 403（LAN の他の端末から画像を読ませない）', async () => {
  assert.equal((await get('/pic.png')).status, 403)
  assert.equal((await fetch(base() + '/pic.png', { headers: { cookie: 'ippon-1=x' } })).status, 403)
  assert.equal((await get('/pic.png?t=' + r.token)).status, 200)
})

test('シンボリックリンクでフォルダの外を指す画像は配信しない', async () => {
  const outside = mkdtempSync(join(tmpdir(), 'ippon-out-'))
  writeFileSync(join(outside, 'o.png'), 'OUT')
  symlinkSync(outside, join(dir, 'link'))
  try {
    assert.equal((await get('/link/o.png?t=' + r.token)).status, 403)
  } finally {
    rmSync(outside, { recursive: true, force: true })
  }
})

test('state は保持され、後から繋いだ購読者にも即届く', async () => {
  await fetch(base() + '/cmd?t=' + r.token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'state', idx: 1, total: 2, elapsed: 5000, running: true }),
  })
  const ac = new AbortController()
  const es = await fetch(base() + '/events?t=' + r.token, { signal: ac.signal })
  const { value } = await es.body!.getReader().read()
  const first = new TextDecoder().decode(value)
  ac.abort()
  assert.match(first, /"idx":1/)
  assert.match(first, /"running":true/)
})

// ---- /__current-slide（コーディングエージェント向け） ----

const postState = (srv: ServeResult, state: Record<string, unknown>) =>
  fetch(`http://localhost:${srv.port}/cmd?t=${srv.token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'state', total: 2, elapsed: 0, running: false, ...state }),
  })

test('/__current-slide は表示中のスライドの行範囲・Markdown・選択中の文字列を返す', async () => {
  const d = mkdtempSync(join(tmpdir(), 'ippon-cur-'))
  const file = join(d, 'c.md')
  writeFileSync(file, '---\ntitle: t\n---\n\n# 1 枚目\n\n---\n\n## 2 枚目\n\n- いち\n- に\n\n::note::\n\nメモ\n')
  const srv = await serve(file, { port: 0 })
  try {
    const url = srv.currentUrl
    assert.equal(url, `http://127.0.0.1:${srv.port}/__current-slide`)
    const get = () => fetch(url, { headers: { 'x-ippon-key': srv.agentKey } })
    // デッキが state を送る前は 404
    assert.equal((await get()).status, 404)

    await postState(srv, { idx: 1, sel: 'いち' })
    const res = await get()
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') || '', /application\/json/)
    assert.deepEqual(await res.json(), {
      file,
      slide: 2,
      total: 2,
      lines: { start: 9, end: 16 },
      source: '## 2 枚目\n\n- いち\n- に\n\n::note::\n\nメモ',
      selection: 'いち',
    })

    // 書き換えた Markdown を読み直す
    writeFileSync(file, '# 1 枚目\n\n---\n\n## 2 枚目（改）\n')
    const after = (await (await get()).json()) as { lines: unknown; source: string }
    assert.deepEqual(after.lines, { start: 5, end: 5 })
    assert.equal(after.source, '## 2 枚目（改）')
  } finally {
    srv.server.close()
    rmSync(d, { recursive: true, force: true })
  }
})

test('/__current-slide は鍵が無ければ、この PC からでも 403（::http:: のビルド時取得で読ませない）', async () => {
  await postState(r, { idx: 0 })
  assert.equal((await fetch(r.currentUrl)).status, 403)
  assert.equal((await fetch(r.currentUrl, { headers: { 'x-ippon-key': r.token } })).status, 403)
  assert.equal((await fetch(r.currentUrl, { headers: { 'x-ippon-key': r.agentKey } })).status, 200)
})

test('/__current-slide は localhost 以外の Host を拒否する（DNS リバインディング対策）', async () => {
  const { request } = await import('node:http')
  const status = await new Promise<number>((res, rej) => {
    const headers = { host: 'evil.example', 'x-ippon-key': r.agentKey }
    const req = request({ host: '127.0.0.1', port: r.port, path: '/__current-slide', headers }, (x) => {
      x.resume()
      res(x.statusCode || 0)
    })
    req.on('error', rej)
    req.end()
  })
  assert.equal(status, 403)
})

test('Markdown を書き換えると SSE で reload を配信し、/ も新しい内容を返す', async () => {
  const ac = new AbortController()
  const es = await fetch(base() + '/events?t=' + r.token, { signal: ac.signal })
  const reader = es.body!.getReader()
  const read = (async () => {
    let buf = ''
    while (!buf.includes('"type":"reload"')) {
      const { value, done } = await reader.read()
      if (done) break
      buf += new TextDecoder().decode(value)
    }
    return buf
  })()
  await new Promise((res) => setTimeout(res, 50))
  writeFileSync(md, '# 書き換えたタイトル\n')
  const buf = await Promise.race([read, new Promise<string>((res) => setTimeout(() => res(''), 3000))])
  ac.abort()
  assert.match(buf, /"type":"reload"/)
  assert.match((await get('/?t=' + r.token)).body, /書き換えたタイトル/)
})

test('POST /cmd の JSON に改行があっても、SSE には 1 つの JSON として届く', async () => {
  const ac = new AbortController()
  const es = await fetch(base() + '/events?t=' + r.token, { signal: ac.signal })
  const reader = es.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (!buf.includes('retry:')) buf += dec.decode((await reader.read()).value)
  buf = ''
  await fetch(base() + '/cmd?t=' + r.token, { method: 'POST', body: JSON.stringify({ type: 'go', n: 1 }, null, 2) })
  while (!buf.includes('"go"')) buf += dec.decode((await reader.read()).value)
  ac.abort()
  const data = buf.split('\n').find((l) => l.includes('"go"'))!
  assert.equal(data, 'data: {"type":"go","n":1}')
})

test('/remote の <title> は frontmatter の title をエスケープする', async () => {
  const dir2 = mkdtempSync(join(tmpdir(), 'ippon-serve-'))
  const md2 = join(dir2, 'd.md')
  writeFileSync(md2, '---\ntitle: </title><script>alert(1)</script>\n---\n\n# x\n')
  const r2 = await serve(md2, { port: 0 })
  try {
    const body = await (await fetch(`http://localhost:${r2.port}/remote?t=${r2.token}`)).text()
    assert.ok(!body.includes('<script>alert(1)</script>'))
    assert.match(body, /<title>&lt;\/title&gt;&lt;script&gt;/)
  } finally {
    r2.server.close()
    rmSync(dir2, { recursive: true, force: true })
  }
})
