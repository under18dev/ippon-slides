// トップページに埋め込むデモのデッキを、リポジトリの ippon で実際にビルドする（demo/*.md → public/demo/<lang>/）
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const site = fileURLToPath(new URL('../', import.meta.url))
const bin = fileURLToPath(new URL('../../bin/ippon.js', import.meta.url))

if (!existsSync(new URL('../../assets/deck.js', import.meta.url))) {
  console.error('✗ assets/deck.js がありません。先にリポジトリのルートで npm run build してください')
  process.exit(1)
}

for (const lang of ['en', 'ja']) {
  const out = `public/demo/${lang}/index.html`
  execFileSync(process.execPath, [bin, 'build', `demo/${lang}.md`, '-o', out], { cwd: site, stdio: 'inherit' })
}
