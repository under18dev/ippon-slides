// /llms.txt と /llms-full.txt の中身（AI のクローラーやエージェント向けに、ドキュメントをただの Markdown で渡す）
import { getCollection } from 'astro:content'

export const SITE = 'https://ippon.under18.dev'

/** サイドバーと同じ順番 */
const ORDER = ['docs', 'docs/why', 'docs/getting-started', 'docs/syntax', 'docs/presenter', 'docs/theming', 'docs/http', 'docs/serve', 'docs/cli', 'docs/faq']

/** 言語ごとのドキュメントを並べて返す（英語は prefix なし、日本語は ja/） */
export async function docsOf(prefix: '' | 'ja/') {
  const all = await getCollection('docs')
  return ORDER.map((slug) => all.find((e) => e.id === prefix + slug)).filter((e) => e !== undefined)
}

/** 本文のサイト内リンク（/docs/foo/）を絶対 URL にする */
export const absolute = (md: string) => md.replace(/\]\(\//g, `](${SITE}/`)

/** 着想元への謝辞（README の「謝辞」と同じ内容） */
export const CREDIT =
  "Inspired by Yusuke Wada's ([@yusukebe](https://github.com/yusukebe)) personal slide application. ippon-slides is an independent implementation focused on portable, self-contained presentations."
