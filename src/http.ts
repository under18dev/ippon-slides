// ::http:: のレスポンスをビルド時に取得して焼き込む。
// Node 側（CORS 無し）で叩くので、ブラウザのライブ再送信と違いどんな API でも取得できる。

import { httpKey } from './markdown.ts'
import type { HttpMap, HttpResult, HttpSpec } from './markdown.ts'

const TIMEOUT = 10_000
const MAX_BODY = 20_000

/** 本文を MAX_BODY 文字まで読む。超えたらそこで接続を切る（終わらない・巨大なレスポンスを全部溜めない） */
async function readBody(res: Response): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: '', truncated: false }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return { text: text + decoder.decode(), truncated: false }
    text += decoder.decode(value, { stream: true })
    if (text.length > MAX_BODY) {
      await reader.cancel().catch(() => {})
      return { text: text.slice(0, MAX_BODY), truncated: true }
    }
  }
}

async function fetchOne(spec: HttpSpec): Promise<HttpResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  const t0 = performance.now()
  try {
    const res = await fetch(spec.url, { method: spec.method, signal: ctrl.signal, redirect: 'follow' })
    const { text, truncated } = await readBody(res)
    const ms = Math.round(performance.now() - t0)
    const headers: [string, string][] = []
    res.headers.forEach((v, k) => headers.push([k, v]))
    return {
      status: res.status,
      statusText: res.statusText,
      ms,
      headers,
      contentType: res.headers.get('content-type') || '',
      body: text,
      truncated,
    }
  } catch (e) {
    const err = e instanceof Error ? (e.name === 'AbortError' ? `タイムアウト（${TIMEOUT / 1000}s）` : e.message) : String(e)
    return { error: err }
  } finally {
    clearTimeout(timer)
  }
}

/** 同じ method+url は 1 回だけ叩き、結果を key → result のマップで返す */
export async function fetchAll(specs: HttpSpec[]): Promise<HttpMap> {
  const uniq = new Map<string, HttpSpec>()
  for (const s of specs) uniq.set(httpKey(s), s)
  const map: HttpMap = new Map()
  await Promise.all(
    [...uniq].map(async ([key, spec]) => {
      map.set(key, await fetchOne(spec))
    })
  )
  return map
}
