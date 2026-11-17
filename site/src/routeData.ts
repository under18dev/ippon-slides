// ページごとの <head> を足し引きする（Starlight の route middleware）。
//   - og:image を scripts/og.mjs が ippon で作ったそのページの画像にする
//   - トップの <title> を検索結果向けのものにする
//   - ドキュメントに構造化データ（TechArticle・パンくず、よくある質問は FAQPage）を付ける
import { defineRouteMiddleware } from '@astrojs/starlight/route-data'
import type { StarlightRouteData } from '@astrojs/starlight/route-data'
import { COPY, homeHead, langOf } from './landing'

const SITE = 'https://ippon.under18.dev'
type Head = StarlightRouteData['head']
type HeadEntry = Head[number]

/** 同じものがあれば置き換え、無ければ足す */
function put(head: Head, match: (e: HeadEntry) => boolean, entry: HeadEntry) {
  const i = head.findIndex(match)
  if (i >= 0) head[i] = entry
  else head.push(entry)
}
const meta = (property: string) => (e: HeadEntry) => e.tag === 'meta' && e.attrs?.property === property
const jsonLd = (data: object): HeadEntry => ({ tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify(data) })

/** Markdown を構造化データ用のただの文に（リンク・コード・強調の記号を外す） */
const plain = (md: string) =>
  md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim()

/** よくある質問のページ：`## 質問` と、その下の本文を組にする */
function faqItems(body: string) {
  return body
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const [q = '', ...rest] = part.split('\n')
      return { q: plain(q), a: plain(rest.join('\n')) }
    })
    .filter((x) => x.q && x.a)
}

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute
  const { head, entry } = route
  if (route.id === '404' || route.id.endsWith('/404')) return

  const lang = langOf(route.locale)
  const isHome = Boolean(entry.data.hero)
  const id = isHome ? (lang === 'ja' ? 'ja/index' : 'index') : route.id
  const url = SITE + context.url.pathname
  const t = COPY[lang]

  put(head, meta('og:image'), { tag: 'meta', attrs: { property: 'og:image', content: `${SITE}/og/${id}.png` } })
  put(head, meta('og:image:alt'), { tag: 'meta', attrs: { property: 'og:image:alt', content: entry.data.title } })

  if (isHome) {
    put(head, (e) => e.tag === 'title', { tag: 'title', content: t.pageTitle })
    put(head, meta('og:type'), { tag: 'meta', attrs: { property: 'og:type', content: 'website' } })
    head.push(...homeHead(lang))
    return
  }

  const home = `${SITE}${lang === 'ja' ? '/ja/' : '/'}`
  const docsHome = `${SITE}${lang === 'ja' ? '/ja' : ''}/docs/`
  const crumbs = [
    { name: 'ippon', item: home },
    { name: lang === 'ja' ? 'ドキュメント' : 'Docs', item: docsHome },
    ...(url === docsHome ? [] : [{ name: entry.data.title, item: url }]),
  ]
  head.push(
    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: entry.data.title,
      description: entry.data.description,
      inLanguage: lang,
      url,
      image: `${SITE}/og/${id}.png`,
      author: { '@type': 'Person', name: 'tanahiro2010', url: 'https://github.com/tanahiro2010' },
      isPartOf: { '@type': 'WebSite', name: 'ippon', url: home },
      about: { '@type': 'SoftwareApplication', name: 'ippon-slides', url: home },
    }),
    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
    })
  )

  if (/(^|\/)docs\/faq$/.test(route.id) && entry.body) {
    head.push(
      jsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: lang,
        mainEntity: faqItems(entry.body).map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      })
    )
  }
})
