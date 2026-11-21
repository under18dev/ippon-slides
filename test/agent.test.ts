import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { entries, pick, register, SKILL, skillsInit } from '../src/agent.ts'
import type { ServeEntry } from '../src/agent.ts'

const dir = mkdtempSync(join(tmpdir(), 'ippon-agent-'))
const state = join(dir, 'state')
process.env.IPPON_STATE_DIR = state
after(() => rmSync(dir, { recursive: true, force: true }))

const entry = (o: Partial<ServeEntry>): ServeEntry => ({ port: 1, file: '/a/x.md', pid: process.pid, startedAt: 0, ...o })

test('pick: 指定した Markdown > cwd 配下の新しいもの > 一番新しいもの', () => {
  const list = [
    entry({ port: 3, file: '/other/c.md', startedAt: 3 }),
    entry({ port: 2, file: '/work/talk/b.md', startedAt: 2 }),
    entry({ port: 1, file: '/work/a.md', startedAt: 1 }),
  ]
  assert.equal(pick(list, '/work', 'a.md')?.port, 1)
  assert.equal(pick(list, '/work', 'none.md'), undefined)
  assert.equal(pick(list, '/work')?.port, 2)
  assert.equal(pick(list, '/elsewhere')?.port, 3)
  assert.equal(pick([], '/work'), undefined)
})

test('register / entries: 終了したプロセスと壊れた登録は掃除する', () => {
  const unregister = register(entry({ port: 4001, startedAt: 1 }))
  register(entry({ port: 4002, startedAt: 2, pid: 2 ** 22 + 12345 })) // 存在しない pid
  writeFileSync(join(state, '4003.json'), '{broken')
  assert.deepEqual(
    entries().map((e) => e.port),
    [4001]
  )
  assert.deepEqual(readdirSync(state), ['4001.json'])
  unregister()
  assert.deepEqual(entries(), [])
})

test('skills init: .claude/skills と .agents/skills に SKILL.md を置き、既存は --force で上書き', () => {
  const root = join(dir, 'proj')
  const paths = ['.claude/skills', '.agents/skills'].map((b) => join(root, b, 'ippon-slides', 'SKILL.md'))
  assert.deepEqual(skillsInit(root), { written: paths, skipped: [] })
  for (const p of paths) assert.equal(readFileSync(p, 'utf8'), SKILL)

  writeFileSync(paths[0]!, 'カスタマイズ済み')
  assert.deepEqual(skillsInit(root), { written: [], skipped: paths })
  assert.equal(readFileSync(paths[0]!, 'utf8'), 'カスタマイズ済み')
  assert.deepEqual(skillsInit(root, true).written, paths)
  assert.equal(readFileSync(paths[0]!, 'utf8'), SKILL)
})

test('skills init: 途中にシンボリックリンクがあれば書かない（リポジトリの外を書き換えない）', () => {
  const outside = join(dir, 'outside')
  mkdirSync(outside)
  writeFileSync(join(outside, 'mine'), 'MINE')
  const cases: [string, string][] = [
    ['.claude/skills/ippon-slides/SKILL.md', join(outside, 'mine')], // 既存ファイルへ（--force でも）
    ['.claude/skills/ippon-slides/SKILL.md', join(outside, 'planted')], // 壊れたリンク
    ['.agents/skills/ippon-slides', outside], // ディレクトリ
    ['.claude', outside],
  ]
  cases.forEach(([link, target], i) => {
    const root = join(dir, `evil${i}`)
    mkdirSync(join(root, link, '..'), { recursive: true })
    symlinkSync(target, join(root, link))
    assert.throws(() => skillsInit(root, true), /シンボリックリンク/)
  })
  assert.equal(readFileSync(join(outside, 'mine'), 'utf8'), 'MINE')
  assert.deepEqual(readdirSync(outside), ['mine'])
})

test('SKILL.md は name / description の frontmatter を持ち、ippon current を使う', () => {
  const fm = SKILL.match(/^---\nname: (.+)\ndescription: (.+)\n---\n/)
  assert.ok(fm)
  assert.equal(fm[1], 'ippon-slides')
  assert.match(SKILL, /ippon current/)
})

// ---- CLI: ippon serve を起動して ippon current で読む ----

const bin = fileURLToPath(new URL('../bin/ippon.js', import.meta.url))
const exec = promisify(execFile)

test('ippon current: 起動中の ippon serve から表示中のスライドを読む', async () => {
  const work = join(dir, 'work')
  const md = join(work, 'talk.md')
  mkdirSync(work, { recursive: true })
  writeFileSync(md, '# 1 枚目\n\n---\n\n## 2 枚目\n')
  const env = { ...process.env, IPPON_STATE_DIR: state }
  const run = (...args: string[]) => exec(process.execPath, [bin, ...args], { cwd: work, env, encoding: 'utf8' })

  await assert.rejects(run('current'), /ippon serve が見つかりません/)

  const child = spawn(process.execPath, [bin, 'serve', 'talk.md'], { cwd: work, env })
  try {
    // 起動して URL（トークン付き）を出すまで待つ
    const out = await new Promise<string>((res, rej) => {
      let buf = ''
      child.stdout.on('data', (c) => {
        buf += c
        if (buf.includes('ippon current')) res(buf)
      })
      child.on('exit', () => rej(new Error('serve が終了した: ' + buf)))
    })
    const [, port, token] = out.match(/http:\/\/localhost:(\d+)\/\?t=([\w-]+)/)!

    await assert.rejects(run('current'), /デッキがまだ開かれていません/)
    await fetch(`http://localhost:${port}/cmd?t=${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'state', idx: 1, total: 2, elapsed: 0, running: false, sel: '2 枚目' }),
    })
    const cur = JSON.parse((await run('current')).stdout)
    assert.equal(cur.file, realpathSync(md))
    assert.equal(cur.slide, 2)
    assert.equal(cur.selection, '2 枚目')
    assert.equal(JSON.parse((await run('current', 'talk.md')).stdout).slide, 2)
    await assert.rejects(run('current', 'other.md'), /other\.md を配信している ippon serve が見つかりません/)
  } finally {
    const exited = new Promise((res) => child.on('exit', res))
    child.kill('SIGINT')
    await exited
  }
  // 終了したら登録は消える
  assert.equal(existsSync(state) ? readdirSync(state).length : 0, 0)
})
