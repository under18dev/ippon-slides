// ドキュメント全部（英語、続けて日本語）を 1 つの Markdown にして返す
import type { APIRoute } from 'astro'
import { SITE, absolute, docsOf } from '../llms'

export const GET: APIRoute = async () => {
  const pages = [...(await docsOf('')), ...(await docsOf('ja/'))]
  const body = pages.map((e) => `# ${e.data.title}\n\nSource: ${SITE}/${e.id}/\n\n${absolute(e.body ?? '').trim()}\n`).join('\n---\n\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
