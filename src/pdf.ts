// PDF 出力。ローカルの Chrome / Chromium / Edge をヘッドレスで起動して印刷する。
// 依存パッケージなし（puppeteer も使わない）。

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const CANDIDATES: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ],
  linux: ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser'],
  win32: [
    join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['LOCALAPPDATA'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
  ],
}

function which(cmd: string): string | null {
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    const p = join(dir, cmd)
    if (existsSync(p)) return p
  }
  return null
}

/** --browser-path → CHROME_PATH → よくある場所 の順に探す */
export function findBrowser(explicit?: string): string | null {
  if (explicit) return existsSync(explicit) ? explicit : null
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  for (const c of CANDIDATES[process.platform] || []) {
    const p = c.includes('/') || c.includes('\\') ? (existsSync(c) ? c : null) : which(c)
    if (p) return p
  }
  return null
}

export interface PdfOptions {
  /** 使うブラウザ。省略すると CHROME_PATH → よくある場所 の順に探す */
  browserPath?: string
}

/** HTML を一時ファイルに書き、ヘッドレスのブラウザに out を作らせる */
async function headless(html: string, out: string, what: string, browserPath: string | undefined, extra: string[]): Promise<void> {
  const browser = findBrowser(browserPath)
  if (!browser) {
    throw new Error(
      `${what} の出力には Chrome / Chromium / Edge が必要です。--browser-path か環境変数 CHROME_PATH で場所を指定してください。`
    )
  }

  const dir = mkdtempSync(join(tmpdir(), 'ippon-'))
  const src = join(dir, 'slide.html')
  writeFileSync(src, html)
  rmSync(out, { force: true })

  try {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${join(dir, 'profile')}`,
      '--virtual-time-budget=3000', // Web フォントの読み込みを待つ
      ...extra,
      pathToFileURL(src).href,
    ]
    const stderr = await new Promise<string>((ok, ng) => {
      const p = spawn(browser, args, { stdio: ['ignore', 'ignore', 'pipe'] })
      let err = ''
      p.stderr.on('data', (d: Buffer) => (err += d))
      p.on('error', ng)
      p.on('close', () => ok(err))
    })
    if (!existsSync(out) || statSync(out).size === 0) {
      throw new Error(`${what} の出力に失敗しました（${browser}）\n${stderr.trim()}`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * @param html file:// URL の画像で組み立てた HTML
 * @param out  出力する PDF のパス
 */
export async function toPdf(html: string, out: string, { browserPath }: PdfOptions = {}): Promise<void> {
  await headless(html, out, 'PDF', browserPath, ['--no-pdf-header-footer', `--print-to-pdf=${out}`])
}
