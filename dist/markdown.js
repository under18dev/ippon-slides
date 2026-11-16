// Markdown → スライドの <section> 群
//
//   ---                       スライドの区切り
//   ::center::                1 行目に置くとスライドの指示（center / title / wide / bg=xxx / size=1.5）
//   ::right::                 ここから右カラム（left-wide / right-wide で幅を 1.4:1 / 1:1.4 に、center で上下中央揃え）
//   ::note::                  発表者ノート（この行以降は本番に出ず発表者ビューだけに出る）
//   ::qr url=... caption::    URL の QR コード（SVG。caption で下に URL も出す）
//   -# 注釈                   小さい注釈
//   ```hcl                    コード（hcl / console / sh / json / js / ts / diff / yaml / py / go / rust / html / css）
//   !! 行                     コードの行を強調（行頭の "!! " は消える）
import { esc, highlight } from './highlight.js';
import { qrSvg } from './qr.js';
export const BG = {
    blue: '#0d76bc',
    orange: '#ff6a00',
    purple: '#5c2d91',
    red: '#c0392b',
    green: '#188038',
    black: '#000000',
    white: '#fafafa',
};
const DIRECTIVES = /^(center|title|wide|bg=.+|size=.+)$/;
export const httpKey = (s) => `${s.method} ${s.url}`;
// ---------------------------------------------------------------
// inline
// ---------------------------------------------------------------
export function inline(text) {
    const codes = [];
    let s = text.replace(/`([^`]+)`/g, (_, c) => {
        codes.push(`<code>${esc(c)}</code>`);
        return `\u0000${codes.length - 1}\u0000`;
    });
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, title) => `<img src="${src}" alt="${alt}">` + (title ? `<span class="img-caption">${title}</span>` : ''));
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    s = s.replace(/→/g, '<span class="arrow">→</span>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}
function list(items) {
    const base = items[0].indent;
    const tag = items[0].ordered ? 'ol' : 'ul';
    let html = `<${tag}>`;
    let i = 0;
    while (i < items.length) {
        const item = items[i++];
        const children = [];
        while (i < items.length && items[i].indent > base)
            children.push(items[i++]);
        html += `<li>${inline(item.text)}${children.length ? list(children) : ''}</li>`;
    }
    return html + `</${tag}>`;
}
function table(rows) {
    // `\|` はセルの区切りではなく文字としての |
    const cells = (r) => r
        .trim()
        .replace(/^\||\|$/g, '')
        .split(/(?<!\\)\|/)
        .map((c) => c.trim().replace(/\\\|/g, '|'));
    const head = cells(rows[0]);
    const align = cells(rows[1]).map((c) => (/:$/.test(c) ? ' class="num"' : ''));
    let html = '<table><thead><tr>';
    head.forEach((c, i) => (html += `<th${align[i] || ''}>${inline(c)}</th>`));
    html += '</tr></thead><tbody>';
    for (const r of rows.slice(2)) {
        html += '<tr>';
        cells(r).forEach((c, i) => (html += `<td${align[i] || ''}>${inline(c)}</td>`));
        html += '</tr>';
    }
    return html + '</tbody></table>';
}
const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
export function blocks(src, http) {
    const lines = src.split('\n');
    let html = '';
    let para = [];
    const flush = () => {
        if (!para.length)
            return;
        const text = para.join('\n');
        para = [];
        if (text.startsWith('-# '))
            html += `<p class="note">${inline(text.slice(3)).replace(/\n/g, '<br>')}</p>`;
        else
            html += `<p>${inline(text).replace(/\n/g, '<br>')}</p>`;
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const fence = line.match(/^```([\w-]*)\s*$/);
        if (fence) {
            flush();
            const lang = fence[1];
            const body = [];
            while (++i < lines.length && !/^```\s*$/.test(lines[i]))
                body.push(lines[i]);
            const attr = lang && lang !== 'console' ? ` data-lang="${esc(lang)}"` : '';
            html += `<pre${attr}><code>${highlight(body.join('\n'), lang)}</code></pre>`;
            continue;
        }
        if (line.startsWith('::http')) {
            const spec = parseHttp(line);
            if (spec) {
                flush();
                html += httpBlock(spec, http);
                continue;
            }
        }
        if (line.startsWith('::qr')) {
            const spec = parseQr(line);
            if (spec) {
                flush();
                html += qrBlock(spec);
                continue;
            }
        }
        if (!line.trim()) {
            flush();
            continue;
        }
        const h = line.match(/^(#{1,3})\s+(.*)$/);
        if (h) {
            flush();
            const level = h[1].length;
            html += `<h${level}>${inline(h[2])}</h${level}>`;
            continue;
        }
        if (LIST_ITEM.test(line) && !line.startsWith('-# ')) {
            flush();
            const items = [];
            let m;
            while (i < lines.length && (m = lines[i].match(LIST_ITEM))) {
                items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] });
                i++;
            }
            i--;
            html += list(items);
            continue;
        }
        if (line.startsWith('|') && /^\|?\s*:?-+/.test(lines[i + 1] || '')) {
            flush();
            const rows = [];
            while (i < lines.length && lines[i].startsWith('|'))
                rows.push(lines[i++]);
            i--;
            html += table(rows);
            continue;
        }
        if (line.startsWith('> ')) {
            flush();
            const q = [];
            while (i < lines.length && lines[i].startsWith('> '))
                q.push(lines[i++].slice(2));
            i--;
            html += `<blockquote>${blocks(q.join('\n'), http)}</blockquote>`;
            continue;
        }
        para.push(line);
    }
    flush();
    return html;
}
const QR_LINE = /^::qr[ \t]+(.+?)[ \t]*::[ \t]*$/;
/** `::qr url=...::` 行をパースする。url が無ければ null（= ただの段落） */
export function parseQr(line) {
    const m = line.match(QR_LINE);
    if (!m)
        return null;
    let url = '';
    let caption = false;
    for (const tok of m[1].trim().split(/[ \t]+/)) {
        if (tok === 'caption')
            caption = true;
        else if (tok.startsWith('url='))
            url = tok.slice(4);
        // `::qr https://...::` のように URL を裸で書いた場合も許す
        else if (/^https?:\/\//i.test(tok))
            url = tok;
    }
    return url ? { url, caption } : null;
}
function qrBlock(spec) {
    let svg;
    try {
        svg = qrSvg(spec.url, 1);
    }
    catch {
        throw new Error(`::qr:: の URL が長すぎます（213 バイトまで）: ${spec.url}`);
    }
    const caption = spec.caption ? `<figcaption>${esc(spec.url)}</figcaption>` : '';
    return `<figure class="qr">${svg}${caption}</figure>`;
}
const HTTP_LINE = /^::http[ \t]+(.+?)[ \t]*::[ \t]*$/;
/** `::http method=GET url=...::` 行をパースする。url が無ければ null（= ただの段落） */
export function parseHttp(line) {
    const m = line.match(HTTP_LINE);
    if (!m)
        return null;
    let method = 'GET';
    let url = '';
    for (const tok of m[1].trim().split(/[ \t]+/)) {
        const kv = tok.match(/^([A-Za-z]+)=(.+)$/);
        if (!kv) {
            // `::http https://...::` のように URL を裸で書いた場合も許す
            if (/^https?:\/\//i.test(tok))
                url = tok;
            continue;
        }
        const k = kv[1].toLowerCase();
        if (k === 'method')
            method = kv[2].toUpperCase();
        else if (k === 'url')
            url = kv[2];
    }
    return url ? { method, url } : null;
}
/** Markdown 全体から `::http::` のリクエストを拾う（コードフェンス内は無視）。http.ts が使う */
export function scanHttp(md) {
    const specs = [];
    let inFence = false;
    for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
        if (/^```/.test(line))
            inFence = !inFence;
        else if (!inFence) {
            const spec = parseHttp(line);
            if (spec)
                specs.push(spec);
        }
    }
    return specs;
}
function statusClass(status) {
    if (status < 200)
        return 's-1xx';
    if (status < 300)
        return 's-2xx';
    if (status < 400)
        return 's-3xx';
    if (status < 500)
        return 's-4xx';
    return 's-5xx';
}
function httpBody(result) {
    const body = result.body ?? '';
    const isJson = /\bjson\b/i.test(result.contentType || '') || /^\s*[[{]/.test(body);
    if (isJson) {
        try {
            const pretty = JSON.stringify(JSON.parse(body), null, 2);
            return `<pre data-lang="json"><code>${highlight(pretty, 'json')}</code></pre>`;
        }
        catch {
            // JSON ではなかった → 素のテキストで出す
        }
    }
    return `<pre><code>${esc(body)}</code></pre>`;
}
/** 取得結果の `<div class="http-res">`（焼き込み済み / 未取得 / エラー） */
function httpRes(result) {
    if (!result) {
        return `<div class="http-res" data-state="pending"><p class="http-msg">未取得 — 「再送信」で取得します</p></div>`;
    }
    if (result.error) {
        return `<div class="http-res" data-state="error"><div class="http-status"><span class="http-errmsg">✗ ${esc(result.error)}</span></div></div>`;
    }
    const status = result.status ?? 0;
    const headers = result.headers ?? [];
    return (`<div class="http-res" data-state="ok">` +
        `<div class="http-status">` +
        `<span class="http-code ${statusClass(status)}">${status}</span>` +
        `<span class="http-statustext">${esc(result.statusText || '')}</span>` +
        `<span class="http-time">${result.ms ?? 0} ms</span>` +
        `</div>` +
        `<details class="http-headers"><summary>ヘッダー（${headers.length}）</summary><table>` +
        headers.map(([k, v]) => `<tr><td class="http-hk">${esc(k)}</td><td class="http-hv">${esc(v)}</td></tr>`).join('') +
        `</table></details>` +
        httpBody(result) +
        (result.truncated ? `<p class="http-msg">… レスポンスが長いため省略しました</p>` : '') +
        `</div>`);
}
function httpBlock(spec, http) {
    return (`<div class="http" data-method="${esc(spec.method)}" data-url="${esc(spec.url)}">` +
        `<div class="http-req">` +
        `<span class="http-method m-${esc(spec.method.toLowerCase())}">${esc(spec.method)}</span>` +
        `<span class="http-url">${esc(spec.url)}</span>` +
        `<button class="http-send" type="button">再送信</button>` +
        `</div>` +
        httpRes(http?.get(httpKey(spec))) +
        `</div>`);
}
// ---------------------------------------------------------------
// slide
// ---------------------------------------------------------------
/** `---` で区切ったスライドの塊（md 内の 0 始まりの開始行つき）。中身が空の塊は除く */
function chunks(md) {
    const out = [];
    let cur = [];
    let start = 0;
    let inFence = false;
    md.split('\n').forEach((line, i) => {
        if (/^```/.test(line))
            inFence = !inFence;
        if (!inFence && /^---\s*$/.test(line)) {
            out.push({ start, lines: cur });
            cur = [];
            start = i + 1;
        }
        else
            cur.push(line);
    });
    out.push({ start, lines: cur });
    return out.filter((c) => c.lines.join('\n').trim());
}
export function splitSlides(md) {
    return chunks(md).map((c) => c.lines.join('\n'));
}
/**
 * スライドごとの元ファイル上の行範囲 [開始, 終了]（1 始まり・両端を含む・前後の空行は除く）。
 * parse() の sections と同じ並び。ippon serve の /__current-slide が使う
 */
export function slideLines(md) {
    const src = md.replace(/\r\n/g, '\n');
    const [, body] = frontmatter(src);
    const offset = src.slice(0, src.length - body.length).split('\n').length - 1;
    return chunks(body).map(({ start, lines }) => {
        let a = 0;
        let b = lines.length - 1;
        while (!lines[a].trim())
            a++;
        while (!lines[b].trim())
            b--;
        return [offset + start + a + 1, offset + start + b + 1];
    });
}
export function slide(src, http) {
    const classes = ['slide'];
    let style = '';
    let body = src.replace(/^\s+/, '');
    // 発表者ノート（::note:: 以降）。本番スライドの DOM には入れず、別で返す
    let note = '';
    const noteParts = body.split(/^::note::[ \t]*$/m);
    if (noteParts.length > 1) {
        body = noteParts[0];
        note = blocks(noteParts.slice(1).join('\n').trim(), http);
    }
    const d = body.match(/^::([^:]+)::[ \t]*(\n|$)/);
    const tokens = d ? d[1].trim().split(/\s+/) : [];
    if (d && tokens.every((t) => DIRECTIVES.test(t))) {
        for (const tok of tokens) {
            const bg = tok.match(/^bg=(.+)$/);
            const size = tok.match(/^size=(.+)$/);
            if (bg) {
                const name = bg[1];
                style += `background:${esc(BG[name] || name)};`;
                if (name === 'white')
                    classes.push('light');
            }
            else if (size)
                style += `--slide-size:${esc(size[1])};`;
            else
                classes.push(tok);
        }
        body = body.slice(d[0].length);
    }
    let html;
    // ::right::（1:1）/ ::right left-wide::（1.4:1）/ ::right right-wide::（1:1.4）
    // center を付けるとカラムを上下中央揃えにする（::right center:: / ::right right-wide center::）
    const parts = body.split(/^::right((?:[ \t]+(?:left-wide|right-wide|center))*)::[ \t]*$/m);
    if (parts.length === 3) {
        const [first, mods, right] = parts;
        // 先頭の見出しはカラムの外（上）に出す
        const head = first.match(/^\s*(#{1,3} .*)\n/);
        const left = head ? first.replace(head[0], '') : first;
        const cls = ['cols', ...new Set(mods.trim().split(/[ \t]+/).filter(Boolean))].join(' ');
        html =
            (head ? blocks(head[1], http) : '') +
                `<div class="${cls}"><div>${blocks(left, http)}</div><div>${blocks(right, http)}</div></div>`;
    }
    else {
        html = blocks(body, http);
    }
    const section = `<section class="${classes.join(' ')}"${style ? ` style="${style}"` : ''}>${html}</section>`;
    return { section, note };
}
export function frontmatter(md) {
    const m = md.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!m)
        return [{}, md];
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^(\w+):\s*(.*?)\s*$/);
        if (kv)
            meta[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, '$2');
    }
    return [meta, md.slice(m[0].length)];
}
/** Markdown 全体 → { meta, sections } */
export function parse(md, http) {
    const [meta, body] = frontmatter(md.replace(/\r\n/g, '\n'));
    const slides = splitSlides(body).map((s) => slide(s, http));
    return { meta, sections: slides.map((s) => s.section), notes: slides.map((s) => s.note) };
}
