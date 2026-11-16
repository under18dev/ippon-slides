// PDF / PNG（OGP 画像）出力。ローカルの Chrome / Chromium / Edge をヘッドレスで起動して印刷・撮影する。
// 依存パッケージなし（puppeteer も使わない）。
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const CANDIDATES = {
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
};
function which(cmd) {
    for (const dir of (process.env.PATH || '').split(delimiter)) {
        const p = join(dir, cmd);
        if (existsSync(p))
            return p;
    }
    return null;
}
/** --browser-path → CHROME_PATH → よくある場所 の順に探す */
export function findBrowser(explicit) {
    if (explicit)
        return existsSync(explicit) ? explicit : null;
    if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH))
        return process.env.CHROME_PATH;
    for (const c of CANDIDATES[process.platform] || []) {
        const p = c.includes('/') || c.includes('\\') ? (existsSync(c) ? c : null) : which(c);
        if (p)
            return p;
    }
    return null;
}
/** HTML を一時ファイルに書き、ヘッドレスのブラウザに out を作らせる */
async function headless(html, out, what, browserPath, extra) {
    const browser = findBrowser(browserPath);
    if (!browser) {
        throw new Error(`${what} の出力には Chrome / Chromium / Edge が必要です。--browser-path か環境変数 CHROME_PATH で場所を指定してください。`);
    }
    const dir = mkdtempSync(join(tmpdir(), 'ippon-'));
    const src = join(dir, 'slide.html');
    writeFileSync(src, html);
    rmSync(out, { force: true });
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
        ];
        const stderr = await new Promise((ok, ng) => {
            const p = spawn(browser, args, { stdio: ['ignore', 'ignore', 'pipe'] });
            let err = '';
            p.stderr.on('data', (d) => (err += d));
            p.on('error', ng);
            p.on('close', () => ok(err));
        });
        if (!existsSync(out) || statSync(out).size === 0) {
            throw new Error(`${what} の出力に失敗しました（${browser}）\n${stderr.trim()}`);
        }
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
/**
 * @param html file:// URL の画像で組み立てた HTML
 * @param out  出力する PDF のパス
 */
export async function toPdf(html, out, { browserPath } = {}) {
    await headless(html, out, 'PDF', browserPath, ['--no-pdf-header-footer', `--print-to-pdf=${out}`]);
}
// 表紙だけを、ナビの UI を隠しフェードインも止めて撮る
const COVER_CSS = '<style>#hint,#counter,#timer,#progress,.reading-toggle{display:none!important}.slide{animation:none!important}</style>';
/**
 * 表紙（1 枚目）を PNG で書き出す（OGP 画像用）
 * @param html file:// URL の画像で組み立てた HTML
 * @param out  出力する PNG のパス
 */
export async function toPng(html, out, { browserPath, width = 1200, height = 630 } = {}) {
    await headless(html.replace('</head>', `${COVER_CSS}\n</head>`), out, 'PNG', browserPath, [
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${width},${height}`,
        `--screenshot=${out}`,
    ]);
}
