// コーディングエージェント向けの機能。
//
//   ippon current [input.md]   起動中の ippon serve から「いま表示中のスライド」を JSON で取る
//   ippon skills init [dir]    その使い方を教える SKILL.md を .claude/skills と .agents/skills に置く
//
// ippon serve はポートが毎回変わるので、起動中のサーバを ~/.ippon/serve/<port>.json に登録しておき、
// ippon current はそこから探す（IPPON_STATE_DIR で場所を変えられる。テスト用）。

import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'

// ---------------------------------------------------------------
// 起動中の ippon serve の登録
// ---------------------------------------------------------------

export interface ServeEntry {
  port: number
  /** Markdown の絶対パス */
  file: string
  pid: number
  startedAt: number
}

const stateDir = (): string => process.env.IPPON_STATE_DIR || join(homedir(), '.ippon', 'serve')

/** 起動中のサーバとして登録する。戻り値を呼ぶと登録を消す */
export function register(entry: ServeEntry): () => void {
  const dir = stateDir()
  const path = join(dir, `${entry.port}.json`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(entry) + '\n')
  return () => rmSync(path, { force: true })
}

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM' // 権限が無いだけなら生きている
  }
}

/** 登録されている起動中のサーバ（新しい順）。落ちたプロセスの登録はここで掃除する */
export function entries(): ServeEntry[] {
  const dir = stateDir()
  if (!existsSync(dir)) return []
  const list: ServeEntry[] = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    const path = join(dir, name)
    try {
      const e = JSON.parse(readFileSync(path, 'utf8')) as ServeEntry
      if (alive(e.pid)) list.push(e)
      else rmSync(path, { force: true })
    } catch {
      rmSync(path, { force: true })
    }
  }
  return list.sort((a, b) => b.startedAt - a.startedAt)
}

/** シンボリックリンクを解決した絶対パス（macOS の /var → /private/var など）。無ければそのまま */
export const real = (path: string): string => {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

const inside = (file: string, dir: string): boolean => {
  const rel = relative(dir, file)
  return rel !== '' && !rel.startsWith('..') && !rel.startsWith(sep) && !/^[a-z]:/i.test(rel)
}

/**
 * どのサーバに聞くか選ぶ。input があればその Markdown を配信しているもの、
 * 無ければ cwd 配下の Markdown を配信している新しいもの、それも無ければ一番新しいもの
 */
export function pick(list: ServeEntry[], cwd: string, input?: string): ServeEntry | undefined {
  if (input) return list.find((e) => e.file === real(resolve(cwd, input)))
  return list.find((e) => inside(e.file, real(cwd))) || list[0]
}

/** `ippon current`：表示中のスライドを JSON 文字列で返す */
export async function current(cwd: string, input?: string): Promise<string> {
  const e = pick(entries(), cwd, input)
  if (!e)
    throw new Error(
      input
        ? `${input} を配信している ippon serve が見つかりません（先に ippon serve ${input} を起動してください）`
        : 'ippon serve が見つかりません（先に ippon serve slide.md を起動してください）'
    )
  const res = await fetch(`http://localhost:${e.port}/__current-slide`)
  const body = await res.text()
  if (!res.ok) {
    let msg = body
    try {
      msg = (JSON.parse(body) as { error?: string }).error || body
    } catch {}
    throw new Error(msg.trim())
  }
  return body.trimEnd()
}

// ---------------------------------------------------------------
// ippon skills init
// ---------------------------------------------------------------

/** Claude Code（.claude/skills）と Codex など（.agents/skills）のスキルの置き場所 */
export const SKILL_DIRS = ['.claude/skills', '.agents/skills']
export const SKILL_NAME = 'ippon-slides'

export const SKILL = `---
name: ${SKILL_NAME}
description: ippon（ippon-slides）の Markdown スライドを編集する。ユーザーが ippon serve でプレビュー中に「ここ直して」「このスライド」「選択したところ」「今のページ」のように、ブラウザで表示・選択している箇所を指して修正を頼んだときは、必ず最初にこのスキルで表示中のスライドと選択中の文字列を取得する。
---

# ippon serve で表示中のスライドを直す

ユーザーは \`ippon serve slide.md\` でスライドをブラウザに表示しながら書いている。
ブラウザで**いま表示しているスライド**と、デッキ上で**選択している文字列**を取得できる。

## 手順

1. 次を実行する（\`ippon\` コマンドが無ければ \`npx -y ippon-slides current\`）。

   \`\`\`sh
   ippon current
   \`\`\`

   複数のデッキを serve している場合は \`ippon current talk.md\` のように Markdown を指定する。
   次のような JSON が返る。

   \`\`\`json
   {
     "file": "/abs/path/slide.md",
     "slide": 3,
     "total": 12,
     "lines": { "start": 21, "end": 30 },
     "source": "## 3 枚目\\n\\n- 選択された行\\n...",
     "selection": "選択された行"
   }
   \`\`\`

   - \`file\`: 編集する Markdown
   - \`slide\` / \`total\`: 表示中のスライド番号（1 始まり）と枚数
   - \`lines\`: そのスライドの \`file\` 上の行範囲（1 始まり・両端を含む）
   - \`source\`: そのスライドの Markdown（\`::note::\` 以降は発表者ノート）
   - \`selection\`: ブラウザで選択中の文字列（無ければ \`""\`）

2. \`selection\` があれば、それがユーザーの言う「ここ」。\`source\` の中から該当箇所を探す。
   表示された文字列なので、Markdown 側では \`**太字**\` や \`\` \`コード\` \`\`、リンクの記法が付いていることがある。
   \`selection\` が空なら、スライド全体（\`lines\` の範囲）が対象。

3. \`file\` の \`lines.start\`〜\`lines.end\` の範囲を編集する。頼まれていない他のスライドは変えない。

4. 保存すると、開いているデッキは自動で再読み込みされ、同じスライドに戻る。
   ユーザーにブラウザで確かめてもらう。

## 取得できないとき

- \`ippon serve が見つかりません\`: ユーザーに \`ippon serve slide.md\` を起動してもらう。
- \`デッキがまだ開かれていません\`: ippon serve が表示した「この PC で開く」の URL をブラウザで開いてもらう。

## ippon の記法（抜粋）

- \`---\` だけの行でスライドを区切る（コードフェンス内は除く）。1 枚に 1 メッセージが基本。
- スライドの 1 行目の \`::center::\` / \`::title::\` / \`::wide::\` / \`::bg=blue::\` / \`::size=1.5::\` で見せ方を指定する（\`::center bg=blue size=2::\` のようにまとめて書ける）。
- \`::right::\` の行から右カラム（\`left-wide\` / \`right-wide\` で幅、\`center\` で上下中央揃え）。
- \`::note::\` 以降は発表者ノート（スライドには出ない）。
- \`-# \` で始まる段落は小さい注釈。コードの行頭の \`!! \` はその行を強調する。
- \`::qr url=...::\` で QR コード、\`::http method=GET url=...::\` で HTTP リクエストのプレイグラウンド。
`

/** `ippon skills init`：SKILL.md を書き出し、書いた / 飛ばしたパスを返す */
export function skillsInit(dir: string, force = false): { written: string[]; skipped: string[] } {
  const written: string[] = []
  const skipped: string[] = []
  for (const base of SKILL_DIRS) {
    const path = join(dir, base, SKILL_NAME, 'SKILL.md')
    if (existsSync(path) && !force) {
      skipped.push(path)
      continue
    }
    mkdirSync(join(dir, base, SKILL_NAME), { recursive: true })
    writeFileSync(path, SKILL)
    written.push(path)
  }
  return { written, skipped }
}
