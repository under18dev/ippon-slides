// ページごとの OGP 画像を ippon 自身で作る（ippon ogp）。public/og/<ページの id>.png に書き出す。
//   トップ          → og/index.png、og/ja/index.png
//   docs/en/foo.md  → og/docs/foo.png（README.md は og/docs.png）
//   docs/foo.md     → og/ja/docs/foo.png
// ブラウザ（Chrome / Chromium / Edge）が無い環境では、代わりに public/og.png を置いて先へ進む。
import { execFile } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const site = fileURLToPath(new URL('../', import.meta.url))
const repo = fileURLToPath(new URL('../../', import.meta.url))
const bin = join(repo, 'bin/ippon.js')

const LOCALES = [
  { lang: 'en', dir: 'docs/en/', prefix: '', sub: 'ippon docs', home: ['One message per slide.', 'A CLI that turns Markdown into slides'] },
  { lang: 'ja', dir: 'docs/', prefix: 'ja/', sub: 'ippon ドキュメント', home: ['1 枚に、1 メッセージ。', 'Markdown でスライドを作る CLI'] },
]

/** 作る画像の一覧（id, 言語, 見出し, 副題） */
const jobs = []
for (const { lang, dir, prefix, sub, home } of LOCALES) {
  jobs.push({ id: `${prefix}index`, lang, title: home[0], sub: home[1] })
  for (const file of readdirSync(join(repo, dir)).filter((f) => f.endsWith('.md'))) {
    const h1 = readFileSync(join(repo, dir, file), 'utf8').match(/^# (.+)$/m)
    if (!h1) continue
    const slug = file === 'README.md' ? 'docs' : `docs/${file.replace(/\.md$/, '')}`
    jobs.push({ id: prefix + slug, lang, title: h1[1].replace(/`/g, ''), sub })
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'ippon-og-'))
let fallback = 0
async function render({ id, lang, title, sub }, i) {
  const out = join(site, 'public/og', `${id}.png`)
  mkdirSync(dirname(out), { recursive: true })
  const md = join(tmp, `${i}.md`)
  writeFileSync(md, `---\ntitle: ${title}\nlang: ${lang}\n---\n\n::title::\n\n# ${title}\n\n${sub}\n\nippon.under18.dev\n`)
  try {
    await run(process.execPath, [bin, 'ogp', md, '-o', out], { cwd: site })
  } catch {
    copyFileSync(join(site, 'public/og.png'), out)
    fallback++
  }
}

// Chrome を同時に立ち上げすぎないよう 4 つずつ
const queue = jobs.map((job, i) => () => render(job, i))
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let next; (next = queue.shift()); ) await next()
}))
rmSync(tmp, { recursive: true, force: true })

if (fallback) console.warn(`! OGP 画像を ${fallback} 枚作れず public/og.png で代用しました（ブラウザが見つからない？）`)
else console.log(`✓ OGP 画像 ${jobs.length} 枚 → public/og/`)
