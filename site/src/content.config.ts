// ドキュメントの中身はリポジトリの docs/（日本語）と docs/en/（英語）をそのまま読む。
// docs/ は GitHub 上でも読めるよう frontmatter を持たないので、ここで
//   - 先頭の `# 見出し` をページのタイトルにして本文から外す
//   - `syntax.md#...` のような相対リンクをサイトの URL に書き換える
// を行ってから Starlight に渡す。

import { defineCollection } from 'astro:content'
import type { Loader } from 'astro/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { readFile, readdir } from 'node:fs/promises'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'https://github.com/under18dev/ippon-slides/blob/main/'

/** 英語は / 、日本語は /ja/ の下に置く（Starlight の root ロケールが英語） */
const LOCALES = [
  { dir: 'docs/en/', prefix: '' },
  { dir: 'docs/', prefix: 'ja/' },
]

/** docs/syntax.md → docs/syntax、docs/README.md → docs（= ドキュメントのトップ） */
const slugOf = (file: string) => (file === 'README.md' ? 'docs' : `docs/${file.replace(/\.md$/, '')}`)

/** Markdown 内の相対リンクをサイトの URL にする（他の .md はサイト内、それ以外は GitHub） */
function rewriteLinks(md: string, prefix: string): string {
  return md.replace(/\]\((?!https?:|#|mailto:)([^)\s]+?)(#[^)\s]*)?\)/g, (all, path: string, hash = '') => {
    // README.md（リポジトリのトップ）は GitHub へ
    if (/^(\.\.\/)+README\.md$/.test(path)) return `](${REPO}README.md${hash})`
    if (/^[\w-]+\.md$/.test(path)) return `](/${prefix}${slugOf(path)}/${hash})`
    return all
  })
}

function repoDocs(): Loader {
  return {
    name: 'ippon-repo-docs',
    async load({ store, parseData, renderMarkdown, generateDigest, config, watcher, logger }) {
      const root = new URL('../', config.root) // site/ の 1 つ上 = リポジトリのルート
      const loadAll = async () => {
        store.clear()
        for (const { dir, prefix } of LOCALES) {
          const base = new URL(dir, root)
          const files = (await readdir(base)).filter((f) => f.endsWith('.md'))
          for (const file of files) {
            const fileURL = new URL(file, base)
            // Astro はサイトのルートからの相対パスを求める（../docs/syntax.md）
            const filePath = relative(fileURLToPath(config.root), fileURLToPath(fileURL))
            const src = (await readFile(fileURL, 'utf8')).replace(/\r\n/g, '\n')
            const h1 = src.match(/^# (.+)\n/m)
            if (!h1) {
              logger.warn(`${dir}${file} に # 見出しが無いので飛ばします`)
              continue
            }
            const body = rewriteLinks(src.replace(h1[0], ''), prefix)
            // 最初の段落を description に（検索結果や OGP 用）
            const lead = body
              .split(/\n\n+/)
              .map((p) => p.trim())
              .find((p) => p && !/^[#>|`\-*!]/.test(p))
            const description = lead
              ?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
              .replace(/[`*]/g, '')
              .replace(/\s*\n\s*/g, ' ')
              .slice(0, 160)
            const id = prefix + slugOf(file)
            const data = await parseData({
              id,
              data: { title: h1[1]!.replace(/`/g, ''), ...(description ? { description } : {}) },
              filePath,
            })
            store.set({
              id,
              data,
              body,
              filePath,
              digest: generateDigest(src),
              rendered: await renderMarkdown(body, { fileURL }),
            })
          }
        }
      }
      await loadAll()
      // astro dev 中は docs/ の変更も拾う
      watcher?.add(new URL('docs/', root).pathname)
      watcher?.on('change', (path) => {
        if (path.includes('/docs/') && path.endsWith('.md') && !path.includes('/site/')) loadAll()
      })
    },
  }
}

export const collections = {
  docs: defineCollection({ loader: repoDocs(), schema: docsSchema() }),
}
