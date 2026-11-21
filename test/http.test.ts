import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { RequestListener } from 'node:http'
import { test } from 'node:test'
import { fetchAll } from '../src/http.ts'

/** handler を返すサーバを立てて url を取得する */
async function fetchFrom(handler: RequestListener) {
  const server = createServer(handler)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`
  try {
    return [...(await fetchAll([{ method: 'GET', url }])).values()][0]!
  } finally {
    server.closeAllConnections()
    server.close()
  }
}

test('レスポンスを取得する（ステータス・ヘッダー・本文）', async () => {
  const r = await fetchFrom((_, res) => {
    res.writeHead(201, { 'content-type': 'application/json' })
    res.end('{"ok":true}')
  })
  assert.equal(r.status, 201)
  assert.equal(r.contentType, 'application/json')
  assert.equal(r.body, '{"ok":true}')
  assert.equal(r.truncated, false)
})

test('長い本文は 20000 文字で打ち切る', async () => {
  const r = await fetchFrom((_, res) => res.end('あ'.repeat(30_000)))
  assert.equal(r.body!.length, 20_000)
  assert.equal(r.truncated, true)
})

test('終わらないレスポンスも、打ち切った時点ですぐ返る（タイムアウトまで読み続けない）', async () => {
  const t0 = Date.now()
  const r = await fetchFrom((_, res) => {
    const chunk = Buffer.alloc(16 * 1024, 'a')
    const pump = () => {
      while (res.write(chunk));
      res.once('drain', pump)
    }
    pump()
  })
  assert.equal(r.error, undefined)
  assert.equal(r.truncated, true)
  assert.ok(Date.now() - t0 < 3000)
})
