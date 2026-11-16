// スライドの HTML を 1 ファイルに組み立てる（CSS / JS も全部埋め込む）

import { readFileSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { esc } from './highlight.ts'
import { parse } from './markdown.ts'
import type { HttpMap } from './markdown.ts'

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i

const unesc = (s: string): string =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** --inline で data URI にする画像の MIME */
const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
}

export interface RenderOptions {
  /** 画像の相対パスの基準（= Markdown のあるディレクトリ） */
  baseDir: string
  /** 出力先ディレクトリ。省略すると画像は file:// URL になる */
  outDir?: string
  /** 追加の CSS（--css） */
  css?: string
  /** ::http:: のビルド時取得結果（省略すると未取得状態で焼き込む） */
  http?: HttpMap
  /** 相対パスの画像を data URI で埋め込む（--inline） */
  inline?: boolean
}

export interface RenderResult {
  html: string
  /** スライドの枚数 */
  count: number
  /** inline のときに埋め込めなかった画像（Markdown に書かれたパス） */
  missing: string[]
}

/**
 * 相対パスの画像を、出力先から見たパスに書き換える。
 *   - inline        → data URI（読めなかったものは missing に入れて下のどちらか）
 *   - outDir を渡す → 出力先からの相対パス（HTML 用）
 *   - outDir なし   → file:// の絶対 URL（PDF の一時ファイル用）
 */
function rewriteImages(html: string, baseDir: string, outDir: string | undefined, inline: boolean, missing: string[]): string {
  return html.replace(/(<img src=")([^"]+)(")/g, (all, pre: string, attr: string, post: string) => {
    if (EXTERNAL.test(attr) || isAbsolute(attr)) return all
    // 属性値は esc() 済み。?v=1 や #id はファイルの場所に含めない
    const src = unesc(attr)
    const [, path, suffix] = src.match(/^([^?#]*)(.*)$/) as [string, string, string]
    const abs = resolve(baseDir, decodeURI(path))
    if (inline) {
      const mime = IMAGE_MIME[extname(abs).toLowerCase()]
      try {
        if (!mime) throw new Error()
        // SVG の #id は data URI でも効くので残す
        const hash = suffix.includes('#') ? suffix.slice(suffix.indexOf('#')) : ''
        return pre + esc(`data:${mime};base64,${readFileSync(abs).toString('base64')}${hash}`) + post
      } catch {
        missing.push(src)
      }
    }
    const url = outDir ? encodeURI(relative(outDir, abs).split(sep).join('/')) : pathToFileURL(abs).href
    return pre + esc(url + suffix) + post
  })
}

export function render(md: string, { baseDir, outDir, css = '', http, inline = false }: RenderOptions): RenderResult {
  const { meta, sections, notes } = parse(md, http)
  const style = readFileSync(join(assets, 'style.css'), 'utf8') + (css ? `\n/* --css */\n${css}` : '')
  const script = readFileSync(join(assets, 'deck.js'), 'utf8')
  const missing: string[] = []
  const body = rewriteImages(sections.join('\n'), baseDir, outDir, inline, missing)
  // 発表者ノートは本番 DOM に入れず JSON で渡す（発表者ビューが読む）。</script> 対策で < をエスケープ
  // ノートの画像も発表者ビューに出るので同じように書き換える
  const notesJson = JSON.stringify(notes.map((n) => rewriteImages(n, baseDir, outDir, inline, missing))).replace(/</g, '\\u003c')

  const html = `<!doctype html>
<html lang="${esc(meta.lang || 'ja')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap">
<title>${esc(meta.title || 'slides')}</title>
${meta.description ? `<meta name="description" content="${esc(meta.description)}">\n` : ''}${meta.author ? `<meta name="author" content="${esc(meta.author)}">\n` : ''}<meta name="generator" content="ippon-slides">
<style>${style}</style>
</head>
<body>
<div id="deck">
${body}
</div>
<div id="overview"></div>
<div id="presenter"></div>
<div id="progress"></div>
<div id="timer"></div>
<div id="counter"></div>
<div id="hint">← → 移動 ・ f フルスクリーン ・ o 一覧 ・ p 発表者</div>
<script id="notes" type="application/json">${notesJson}</script>
<script>${script}</script>
</body>
</html>
`
  return { html, count: sections.length, missing }
}
