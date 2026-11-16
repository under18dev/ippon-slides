import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { outputs, parseArgs } from '../src/cli.ts'
import { findBrowser } from '../src/pdf.ts'

const bin = fileURLToPath(new URL('../bin/ippon.js', import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'ippon-test-'))
after(() => rmSync(dir, { recursive: true, force: true }))

const run = (...args: string[]) => execFileSync(process.execPath, [bin, ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

test('parseArgs', () => {
  assert.deepEqual(parseArgs(['build', 'a.md', '--pdf', '-o', 'out', '--css=x.css']), {
    _: ['build', 'a.md'],
    pdf: true,
    output: 'out',
    css: 'x.css',
  })
  assert.deepEqual(parseArgs(['serve', 'a.md', '-p', '8080']), { _: ['serve', 'a.md'], port: '8080' })
  assert.throws(() => parseArgs(['--nope']), /不明なオプション/)
  assert.throws(() => parseArgs(['-o']), /値が必要/)
  // 継承プロパティと同じ名前の引数もただの入力として扱う
  for (const a of ['constructor', '__proto__', 'toString']) assert.deepEqual(parseArgs([a]), { _: [a] })
})

test('outputs: 出力先の決め方', () => {
  const p = (o: Parameters<typeof outputs>[1]) => outputs('talk/slide.md', o).map((x) => x.path)
  assert.deepEqual(p({}), [resolve('talk/slide.html')])
  assert.deepEqual(p({ pdf: true }), [resolve('talk/slide.pdf')])
  assert.deepEqual(p({ html: true, pdf: true }), [resolve('talk/slide.html'), resolve('talk/slide.pdf')])
  assert.deepEqual(p({ html: true, output: 'dist/index.html' }), [resolve('dist/index.html')])
  assert.deepEqual(p({ pdf: true, output: 'dist/' }), [resolve('dist/slide.pdf')])
  assert.deepEqual(p({ html: true, pdf: true, output: 'dist/talk.pdf' }), [
    resolve('dist/talk.html'),
    resolve('dist/talk.pdf'),
  ])
})

test('init → build --html', () => {
  run('init')
  assert.throws(() => run('init'), /すでにあります/)
  const out = run('build', 'slide.md', '--html')
  assert.match(out, /✓ 9 slides → .*slide\.html/)
  const html = readFileSync(join(dir, 'slide.html'), 'utf8')
  assert.match(html, /<title>はじめての ippon<\/title>/)
  assert.equal(html.match(/<section /g)?.length, 9)
  // 発表者ノートは JSON で埋め込まれ、本番スライドの DOM には出ない
  assert.match(html, /<script id="notes" type="application\/json">/)
  assert.doesNotMatch(html, /class="notes"/)
})

test('画像の相対パスは出力先から見たパスに書き換える', () => {
  mkdirSync(join(dir, 'img'), { recursive: true })
  writeFileSync(join(dir, 'img/a.png'), '')
  writeFileSync(join(dir, 'img.md'), '![a](img/a.png)\n\n---\n\n![b](https://e.x/b.png)\n')
  run('img.md', '-o', 'dist/')
  const html = readFileSync(join(dir, 'dist/img.html'), 'utf8')
  assert.match(html, /<img src="..\/img\/a.png"/)
  assert.match(html, /<img src="https:\/\/e.x\/b.png"/)
})

test('--inline で画像を data URI で埋め込む', () => {
  writeFileSync(join(dir, 'img/c.png'), 'png')
  writeFileSync(join(dir, 'inline.md'), '![c](img/c.png)\n\n---\n\n![d](img/none.png)\n\n---\n\n![e](https://e.x/e.png)\n')
  const out = run('inline.md', '--inline', '-o', 'dist/')
  const html = readFileSync(join(dir, 'dist/inline.html'), 'utf8')
  assert.match(html, /<img src="data:image\/png;base64,cG5n"/)
  // 読めない画像はパスのまま残して知らせる
  assert.match(html, /<img src="..\/img\/none.png"/)
  assert.match(out, /埋め込めなかった画像.*img\/none\.png/)
  assert.match(html, /<img src="https:\/\/e.x\/e.png"/)
})

test('--inline: & を含む名前・?v=1 / #id 付き・ノートの画像も埋め込む', () => {
  writeFileSync(join(dir, 'img/r&r.png'), 'png')
  writeFileSync(join(dir, 'img/s.svg'), '<svg/>')
  writeFileSync(join(dir, 'inline2.md'), '![a](img/r&r.png)\n\n![b](img/c.png?v=1)\n\n![c](img/s.svg#x)\n\n::note::\n\n![n](img/c.png)\n')
  const out = run('inline2.md', '--inline', '-o', 'dist/')
  const html = readFileSync(join(dir, 'dist/inline2.html'), 'utf8')
  assert.doesNotMatch(out, /埋め込めなかった/)
  assert.equal(html.match(/<img src="data:image\/png;base64,cG5n"/g)?.length, 2)
  assert.match(html, /<img src="data:image\/svg\+xml;base64,PHN2Zy8\+#x"/)
  // ノートは JSON に入る（< は \u003c、" は \" になる）
  assert.match(html, /\\u003cimg src=\\"data:image\/png;base64,cG5n\\"/)
})

test('%26 などでエンコードしたパスを二重にエンコードしない', () => {
  writeFileSync(join(dir, 'pct.md'), '![a](img/r%26r.png)\n\n::note::\n\n![n](img/r%26r.png)\n')
  run('pct.md', '-o', 'dist/')
  const html = readFileSync(join(dir, 'dist/pct.html'), 'utf8')
  assert.match(html, /<img src="..\/img\/r%26r.png"/)
  assert.match(html, /\\u003cimg src=\\"..\/img\/r%26r.png\\"/)
  assert.doesNotMatch(html, /%2526/)
  // --inline でも実ファイル img/r&r.png を読める
  const out = run('pct.md', '--inline', '-o', 'dist/')
  assert.doesNotMatch(out, /埋め込めなかった/)
  assert.equal(readFileSync(join(dir, 'dist/pct.html'), 'utf8').match(/img src=\\?"data:image\/png;base64,cG5n/g)?.length, 2)
})

test('--css を埋め込む', () => {
  writeFileSync(join(dir, 'x.css'), ':root { --slide-accent: hotpink; }')
  run('build', 'slide.md', '--css', 'x.css', '-o', 'css.html')
  assert.match(readFileSync(join(dir, 'css.html'), 'utf8'), /--slide-accent: hotpink/)
})

test('存在しない入力はエラー', () => {
  assert.throws(() => run('build', 'none.md'), /none\.md が見つかりません/)
})

test('build --pdf', { skip: !findBrowser() && 'Chrome / Chromium / Edge がない' }, () => {
  run('build', 'slide.md', '--html', '--pdf', '-o', 'dist/both')
  assert.ok(existsSync(join(dir, 'dist/both.html')))
  const pdf = readFileSync(join(dir, 'dist/both.pdf'))
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.equal(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length, 9)
})
