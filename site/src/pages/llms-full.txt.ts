// ドキュメント全部（英語、続けて日本語）を 1 つの Markdown にして返す。先頭に概要と謝辞を置く
import type { APIRoute } from 'astro'
import { CREDIT, SITE, absolute, docsOf } from '../llms'
import { COPY } from '../landing'

export const GET: APIRoute = async () => {
  const pages = [...(await docsOf('')), ...(await docsOf('ja/'))]
  const intro = `# ippon\n\n> ${COPY.en.description}\n\nSite: ${SITE}/ · Source: https://github.com/under18dev/ippon-slides\n\n${CREDIT}\n`
  const docs = pages.map((e) => `# ${e.data.title}\n\nSource: ${SITE}/${e.id}/\n\n${absolute(e.body ?? '').trim()}\n`).join('\n---\n\n')
  const body = `${intro}\n---\n\n${docs}`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
