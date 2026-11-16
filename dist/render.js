// スライドの HTML を 1 ファイルに組み立てる（CSS / JS も全部埋め込む）
import { readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { esc } from './highlight.js';
import { parse } from './markdown.js';
const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i;
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** URL のパスをファイル名に戻す。%26 などの予約文字も戻す（decodeURI は戻さない）。壊れた % はそのまま */
const decodePath = (s) => {
    try {
        return decodeURIComponent(s);
    }
    catch {
        return s;
    }
};
/** ファイルの相対パスを URL のパスにする（区切りの / 以外をちょうど 1 回だけエンコード） */
const encodePath = (s) => s.split(sep).map(encodeURIComponent).join('/');
/** --inline で data URI にする画像の MIME */
const IMAGE_MIME = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
};
/**
 * 相対パスの画像を、出力先から見たパスに書き換える。
 *   - inline        → data URI（読めなかったものは missing に入れて下のどちらか）
 *   - outDir を渡す → 出力先からの相対パス（HTML 用）
 *   - outDir なし   → file:// の絶対 URL（PDF の一時ファイル用）
 */
function rewriteImages(html, baseDir, outDir, inline, missing) {
    return html.replace(/(<img src=")([^"]+)(")/g, (all, pre, attr, post) => {
        if (EXTERNAL.test(attr) || isAbsolute(attr))
            return all;
        // 属性値は esc() 済み。?v=1 や #id はファイルの場所に含めない
        const src = unesc(attr);
        const [, path, suffix] = src.match(/^([^?#]*)(.*)$/);
        const abs = resolve(baseDir, decodePath(path));
        if (inline) {
            const mime = IMAGE_MIME[extname(abs).toLowerCase()];
            try {
                if (!mime)
                    throw new Error();
                // SVG の #id は data URI でも効くので残す
                const hash = suffix.includes('#') ? suffix.slice(suffix.indexOf('#')) : '';
                return pre + esc(`data:${mime};base64,${readFileSync(abs).toString('base64')}${hash}`) + post;
            }
            catch {
                missing.push(src);
            }
        }
        const url = outDir ? encodePath(relative(outDir, abs)) : pathToFileURL(abs).href;
        return pre + esc(url + suffix) + post;
    });
}
/** SNS で共有したときのカード（OGP / X）。og:image は絶対 URL が要るので frontmatter の url: から作る */
function ogp(meta, ogImage) {
    const tags = [
        ['property', 'og:type', 'website'],
        ['property', 'og:title', meta.title],
        ['property', 'og:description', meta.description],
        ['property', 'og:url', meta.url],
    ];
    const image = meta.image || ogImage;
    if (image) {
        try {
            // url: が空なら無いものとして扱う（空の基準 URL を渡すと、image: が絶対 URL でも new URL が失敗する）
            tags.push(['property', 'og:image', new URL(image, meta.url || undefined).href]);
            tags.push(['name', 'twitter:card', 'summary_large_image']);
        }
        catch { } // url: が無く image も相対パスなら出さない（相対 URL の og:image は SNS が読まない）
    }
    return tags
        .filter(([, , v]) => v)
        .map(([k, n, v]) => `<meta ${k}="${n}" content="${esc(v)}">\n`)
        .join('');
}
export function render(md, { baseDir, outDir, css = '', http, inline = false, ogImage }) {
    const { meta, sections, notes } = parse(md, http);
    const style = readFileSync(join(assets, 'style.css'), 'utf8') + (css ? `\n/* --css */\n${css}` : '');
    const script = readFileSync(join(assets, 'deck.js'), 'utf8');
    const missing = [];
    const body = rewriteImages(sections.join('\n'), baseDir, outDir, inline, missing);
    // 発表者ノートは本番 DOM に入れず JSON で渡す（発表者ビューが読む）。</script> 対策で < をエスケープ
    // ノートの画像も発表者ビューに出るので同じように書き換える
    const notesJson = JSON.stringify(notes.map((n) => rewriteImages(n, baseDir, outDir, inline, missing))).replace(/</g, '\\u003c');
    const html = `<!doctype html>
<html lang="${esc(meta.lang || 'ja')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap">
<title>${esc(meta.title || 'slides')}</title>
${meta.description ? `<meta name="description" content="${esc(meta.description)}">\n` : ''}${meta.author ? `<meta name="author" content="${esc(meta.author)}">\n` : ''}<meta name="generator" content="ippon-slides">
${ogp(meta, ogImage)}<style>${style}</style>
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
`;
    return { html, count: sections.length, missing };
}
