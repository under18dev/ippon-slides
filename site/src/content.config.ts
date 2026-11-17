// ドキュメントの中身はリポジトリの docs/（日本語）と docs/en/（英語）をそのまま読む。
// docs/ は GitHub 上でも読めるよう frontmatter を持たないので、ここで
//   - 先頭の `# 見出し` をページのタイトルにして本文から外す
//   - `syntax.md#...` のような相対リンクをサイトの URL に書き換える
// を行ってから Starlight に渡す。

import { defineCollection } from 'astro:content'
import type { Loader } from 'astro/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { readFile, readdir } from 'node:fs/promises'
import { posix, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESCRIPTIONS } from './descriptions'

const REPO = 'https://github.com/under18dev/ippon-slides/blob/main/'

/** 英語は / 、日本語は /ja/ の下に置く（Starlight の root ロケールが英語） */
const LOCALES = [
  { dir: 'docs/en/', prefix: '' },
  { dir: 'docs/', prefix: 'ja/' },
]

/** docs/syntax.md → docs/syntax、docs/README.md → docs（= ドキュメントのトップ） */
const slugOf = (file: string) => (file === 'README.md' ? 'docs' : `docs/${file.replace(/\.md$/, '')}`)

/**
 * Markdown 内の .md への相対リンクを、書かれているファイルの場所から解決してサイトの URL にする。
 * docs/ か docs/en/ の .md ならサイト内、それ以外（リポジトリの README.md など）は GitHub へ。
 * （docs/en/README.md の `../README.md` は日本語版の docs/README.md、`../../README.md` はリポジトリの README）
 */
function rewriteLinks(md: string, dir: string): string {
  return md.replace(/\]\((?!https?:|#|mailto:)([^)\s]+?\.md)(#[^)\s]*)?\)/g, (_, path: string, hash = '') => {
    const target = posix.normalize(posix.join(dir, path))
    const locale = LOCALES.find((l) => posix.dirname(target) + '/' === l.dir)
    if (locale) return `](/${locale.prefix}${slugOf(posix.basename(target))}/${hash})`
    return `](${REPO}${target}${hash})`
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
            const body = rewriteLinks(src.replace(h1[0], ''), dir)
            const id = prefix + slugOf(file)
            // description は descriptions.ts のもの。無ければ最初の段落（日本語の行の折り返しは詰めてつなぐ）
            const lead = body
              .split(/\n\n+/)
              .map((p) => p.trim())
              .find((p) => p && !/^[#>|`\-*!]/.test(p))
            const description =
              DESCRIPTIONS[id] ??
              lead
                ?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
                .replace(/[`*]/g, '')
                .replace(/([^\x00-\x7f])\s*\n\s*(?=[^\x00-\x7f])/g, '$1')
                .replace(/\s*\n\s*/g, ' ')
                .slice(0, 160)
            if (!DESCRIPTIONS[id]) logger.warn(`${id} の description が descriptions.ts にありません`)
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
