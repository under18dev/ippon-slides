import assert from 'node:assert/strict'
import { test } from 'node:test'
import { httpKey, parse, parseHttp, parseQr, scanHttp, slideLines } from '../src/markdown.ts'
import type { HttpMap } from '../src/markdown.ts'
import { highlight } from '../src/highlight.ts'

test('--- でスライドを分ける（コードブロック内の --- は無視）', () => {
  const { sections } = parse('# a\n\n---\n\n```sh\n---\n```\n\n---\n\nc\n')
  assert.equal(sections.length, 3)
  assert.match(sections[1]!, /<pre data-lang="sh"><code>---<\/code><\/pre>/)
})

test('frontmatter を読む', () => {
  const { meta, sections } = parse('---\ntitle: "タイトル"\nauthor: me\n---\n\n# x\n')
  assert.deepEqual(meta, { title: 'タイトル', author: 'me' })
  assert.equal(sections.length, 1)
})

test('::center bg=blue size=2:: をスライドの指示にする', () => {
  const [s = ''] = parse('::center bg=blue size=2::\n\nhello\n').sections
  assert.match(s, /^<section class="slide center" style="background:#0d76bc;--slide-size:2;">/)
  assert.doesNotMatch(s, /::/)
})

test('bg=white は light クラスも付ける', () => {
  const [s = ''] = parse('::center bg=white::\n\nx\n').sections
  assert.match(s, /class="slide center light"/)
})

test('知らない指示はただの段落', () => {
  const [s = ''] = parse('::nope::\n\nx\n').sections
  assert.match(s, /<p>::nope::<\/p>/)
})

test('::right:: で 2 カラム、先頭の見出しはカラムの外', () => {
  const [s = ''] = parse('## 見出し\n\n- a\n\n::right::\n\nb\n').sections
  assert.match(s, /^<section class="slide"><h2>見出し<\/h2><div class="cols"><div><ul><li>a<\/li><\/ul><\/div><div><p>b<\/p><\/div><\/div>/)
})

test('::right right-wide:: でカラム幅を変える', () => {
  const [s = ''] = parse('- a\n\n::right right-wide::\n\nb\n').sections
  assert.match(s, /<div class="cols right-wide"><div><ul><li>a<\/li><\/ul><\/div><div><p>b<\/p><\/div><\/div>/)
  assert.doesNotMatch(s, /::/)
})

test('-# は注釈', () => {
  const [s = ''] = parse('-# small\n').sections
  assert.match(s, /<p class="note">small<\/p>/)
})

test('::note:: 以降は発表者ノート（本番 section には出ず notes に入る）', () => {
  const { sections, notes } = parse('hello\n\n::note::\n\nメモ\n')
  assert.equal(sections[0], '<section class="slide"><p>hello</p></section>')
  assert.equal(notes[0], '<p>メモ</p>')
})

test('::right center:: でカラムを上下中央揃えにする（幅指定と併用できる）', () => {
  const [a = ''] = parse('- a\n\n::right center::\n\nb\n').sections
  assert.match(a, /<div class="cols center"><div><ul><li>a<\/li><\/ul><\/div><div><p>b<\/p><\/div><\/div>/)
  const [b = ''] = parse('- a\n\n::right center right-wide::\n\nb\n').sections
  assert.match(b, /<div class="cols center right-wide">/)
  const [c = ''] = parse('- a\n\n::right left-wide center::\n\nb\n').sections
  assert.match(c, /<div class="cols left-wide center">/)
})

test('::note:: と ::right:: は共存できる', () => {
  const { sections, notes } = parse('- a\n\n::right::\n\nb\n\n::note::\n\nメモ\n')
  const s = sections[0] ?? ''
  assert.match(s, /<div class="cols">/)
  assert.doesNotMatch(s, /notes|::/)
  assert.equal(notes[0], '<p>メモ</p>')
})

test('入れ子のリスト', () => {
  const [s = ''] = parse('- a\n  - b\n- c\n').sections
  assert.match(s, /<ul><li>a<ul><li>b<\/li><\/ul><\/li><li>c<\/li><\/ul>/)
})

test('表: \\| はセル内の文字、:-- の右寄せ', () => {
  const [s = ''] = parse('| k | v |\n|---|---:|\n| `a\\|b` | 1 |\n').sections
  assert.match(s, /<td><code>a\|b<\/code><\/td><td class="num">1<\/td>/)
})

test('インライン: 太字・コード・リンク・矢印・HTML エスケープ', () => {
  const [s = ''] = parse('**強** `<x>` [l](https://e.x) → <b>\n').sections
  assert.match(s, /<strong>強<\/strong>/)
  assert.match(s, /<code>&lt;x&gt;<\/code>/)
  assert.match(s, /<a href="https:\/\/e.x" target="_blank" rel="noopener">l<\/a>/)
  assert.match(s, /<span class="arrow">→<\/span>/)
  assert.match(s, /&lt;b&gt;/)
})

test('コード: ハイライトと !! 行の強調', () => {
  const [s = ''] = parse('```hcl\nvariable "x" {}\n!! output "y" {}\n```\n').sections
  assert.match(s, /<span class="hl-k">variable<\/span> <span class="hl-s">&quot;x&quot;<\/span>/)
  assert.match(s, /<span class="hl-mark"><span class="hl-k">output<\/span>/)
  assert.doesNotMatch(s, /!!/)
})

test('console: プロンプトとエラー', () => {
  const [s = ''] = parse('```console\n$ terraform apply\nError: boom\n```\n').sections
  assert.match(s, /<span class="hl-prompt">\$ <\/span><span class="hl-cmd">terraform apply<\/span>/)
  assert.match(s, /<span class="hl-err">Error: boom<\/span>/)
  assert.doesNotMatch(s, /data-lang/)
})

test('diff: 追加・削除・hunk・ファイルヘッダを行ごとに色分けし、!! も効く', () => {
  const code = ['--- a/x.ts', '+++ b/x.ts', '@@ -1,2 +1,2 @@', ' keep', '-old', '+new', '!! +mark'].join('\n')
  const s = highlight(code, 'diff')
  assert.match(s, /<span class="hl-meta">--- a\/x.ts<\/span>/)
  assert.match(s, /<span class="hl-meta">\+\+\+ b\/x.ts<\/span>/)
  assert.match(s, /<span class="hl-hunk">@@ -1,2 \+1,2 @@<\/span>/)
  assert.match(s, /\n keep\n/)
  assert.match(s, /<span class="hl-del">-old<\/span>/)
  assert.match(s, /<span class="hl-add">\+new<\/span>/)
  assert.match(s, /<span class="hl-mark"><span class="hl-add">\+mark<\/span><\/span>/)
  // フェンス内の --- はスライド区切りにならない
  assert.equal(parse('```diff\n--- a\n+++ b\n```\n').sections.length, 1)
})

test('ハイライト: yaml / python / go / rust / html / css', () => {
  const yaml = highlight('name: "app" # c\nport: 8080\nenabled: true\n- &base x', 'yml')
  assert.match(yaml, /<span class="hl-t">name<\/span>: <span class="hl-s">&quot;app&quot;<\/span> <span class="hl-c"># c<\/span>/)
  assert.match(yaml, /<span class="hl-n">8080<\/span>/)
  assert.match(yaml, /<span class="hl-n">true<\/span>/)
  assert.match(yaml, /<span class="hl-i">&amp;base<\/span>/)

  const py = highlight('@app.get\ndef f(self):\n    return None  # c\nx = f"{a}"', 'python')
  assert.match(py, /<span class="hl-i">@app.get<\/span>/)
  assert.match(py, /<span class="hl-k">def<\/span> <span class="hl-f">f<\/span>\(<span class="hl-i">self<\/span>\)/)
  assert.match(py, /<span class="hl-k">return<\/span> <span class="hl-n">None<\/span>  <span class="hl-c"># c<\/span>/)
  assert.match(py, /<span class="hl-s">f&quot;\{a\}&quot;<\/span>/)

  const go = highlight('func main() {\n\tvar n int = 1 // c\n\tfmt.Println(nil)\n}', 'go')
  assert.match(go, /<span class="hl-k">func<\/span> <span class="hl-f">main<\/span>/)
  assert.match(go, /<span class="hl-k">var<\/span> n <span class="hl-t">int<\/span> = <span class="hl-n">1<\/span> <span class="hl-c">\/\/ c<\/span>/)
  assert.match(go, /<span class="hl-f">Println<\/span>\(<span class="hl-n">nil<\/span>\)/)

  const rs = highlight("#[derive(Debug)]\nfn f<'a>(s: &'a str) -> u32 {\n    println!(\"{}\", 'x');\n}", 'rs')
  assert.match(rs, /<span class="hl-i">#\[derive\(Debug\)\]<\/span>/)
  assert.match(rs, /<span class="hl-k">fn<\/span> <span class="hl-f">f<\/span>&lt;<span class="hl-i">'a<\/span>&gt;/)
  assert.match(rs, /<span class="hl-t">str<\/span>/)
  assert.match(rs, /<span class="hl-f">println!<\/span>\(<span class="hl-s">&quot;\{\}&quot;<\/span>, <span class="hl-s">'x'<\/span>\)/)

  const html = highlight('<!-- c -->\n<a href="/x" hidden>A &amp; B</a>', 'html')
  assert.match(html, /<span class="hl-c">&lt;!-- c --&gt;<\/span>/)
  assert.match(
    html,
    /<span class="hl-k">&lt;a<\/span> <span class="hl-t">href<\/span>=<span class="hl-s">&quot;\/x&quot;<\/span> <span class="hl-t">hidden<\/span><span class="hl-k">&gt;<\/span>A <span class="hl-n">&amp;amp;<\/span> B<span class="hl-k">&lt;\/a<\/span><span class="hl-k">&gt;<\/span>/,
  )
  assert.match(highlight('<?xml version="1.0"?>', 'xml'), /<span class="hl-k">&lt;\?xml<\/span>.*<span class="hl-k">\?&gt;<\/span>/)

  const css = highlight('@media (min-width: 600px) {\n  a:hover { color: #fff !important; }\n  .box { margin: 0 auto; }\n}', 'css')
  assert.match(css, /<span class="hl-k">@media<\/span>/)
  assert.match(css, /<span class="hl-t">min-width<\/span>: <span class="hl-n">600px<\/span>/)
  assert.match(css, /a<span class="hl-f">:hover<\/span>/)
  assert.match(css, /<span class="hl-t">color<\/span>: <span class="hl-n">#fff<\/span> <span class="hl-k">!important<\/span>/)
  assert.match(css, /<span class="hl-f">\.box<\/span>/)
})

test('::http:: をパースする（method 省略は GET・url 必須）', () => {
  assert.deepEqual(parseHttp('::http method=POST url=https://e.x/api::'), { method: 'POST', url: 'https://e.x/api' })
  assert.deepEqual(parseHttp('::http url=https://e.x/api::'), { method: 'GET', url: 'https://e.x/api' })
  assert.deepEqual(parseHttp('::http https://e.x/api::'), { method: 'GET', url: 'https://e.x/api' })
  assert.equal(parseHttp('::http method=GET::'), null)
  assert.equal(parseHttp('ふつうの段落'), null)
})

test('scanHttp はコードフェンス内の ::http:: を無視する', () => {
  const md = '::http url=https://a.x::\n\n```\n::http url=https://b.x::\n```\n\n::http method=POST url=https://c.x::\n'
  assert.deepEqual(scanHttp(md), [
    { method: 'GET', url: 'https://a.x' },
    { method: 'POST', url: 'https://c.x' },
  ])
})

test('::http:: は未取得だと pending 状態で焼き込まれる', () => {
  const [s = ''] = parse('::http url=https://e.x/api::\n').sections
  assert.match(s, /<div class="http" data-method="GET" data-url="https:\/\/e.x\/api">/)
  assert.match(s, /<span class="http-method m-get">GET<\/span>/)
  assert.match(s, /<button class="http-send" type="button">再送信<\/button>/)
  assert.match(s, /data-state="pending"/)
})

test('::http:: のレスポンスを焼き込む（ステータス色・時間・ヘッダー・JSON）', () => {
  const spec = { method: 'GET', url: 'https://e.x/api' }
  const http: HttpMap = new Map([
    [
      httpKey(spec),
      {
        status: 200,
        statusText: 'OK',
        ms: 42,
        headers: [['content-type', 'application/json']] as [string, string][],
        contentType: 'application/json',
        body: '{"ok":true,"n":1}',
      },
    ],
  ])
  const [s = ''] = parse('::http url=https://e.x/api::\n', http).sections
  assert.match(s, /data-state="ok"/)
  assert.match(s, /<span class="http-code s-2xx">200<\/span>/)
  assert.match(s, /<span class="http-time">42 ms<\/span>/)
  assert.match(s, /<summary>ヘッダー（1）<\/summary>/)
  assert.match(s, /<pre data-lang="json"><code>\{\n {2}<span class="hl-t">&quot;ok&quot;<\/span>: <span class="hl-n">true<\/span>/)
})

test('::http:: の取得失敗はエラー状態で焼き込む', () => {
  const spec = { method: 'GET', url: 'https://e.x/api' }
  const http: HttpMap = new Map([[httpKey(spec), { error: 'getaddrinfo ENOTFOUND e.x' }]])
  const [s = ''] = parse('::http url=https://e.x/api::\n', http).sections
  assert.match(s, /data-state="error"/)
  assert.match(s, /<span class="http-errmsg">✗ getaddrinfo ENOTFOUND e.x<\/span>/)
})

test('::qr:: をパースする（url 必須・caption はオプトイン）', () => {
  assert.deepEqual(parseQr('::qr url=https://e.x/a::'), { url: 'https://e.x/a', caption: false })
  assert.deepEqual(parseQr('::qr https://e.x/a caption::'), { url: 'https://e.x/a', caption: true })
  assert.equal(parseQr('::qr caption::'), null)
  assert.equal(parseQr('::qr url=https://e.x/a'), null)
})

test('::qr:: は SVG の QR になり、caption を付けたときだけ URL を出す', () => {
  const [plain = ''] = parse('::qr url=https://e.x/?a=1&b=2::\n').sections
  assert.match(plain, /<figure class="qr"><svg [^>]*viewBox="0 0 \d+ \d+"/)
  assert.doesNotMatch(plain, /figcaption/)
  const [withCap = ''] = parse('::qr url=https://e.x/?a=1&b=2 caption::\n').sections
  assert.match(withCap, /<figcaption>https:\/\/e\.x\/\?a=1&amp;b=2<\/figcaption><\/figure>/)
})

test('::qr:: の URL が長すぎるとエラーにする', () => {
  assert.throws(() => parse(`::qr url=https://e.x/${'a'.repeat(300)}::\n`), /::qr:: の URL が長すぎます/)
})

test('コードフェンス内の ::qr:: はそのまま', () => {
  const [s = ''] = parse('```\n::qr url=https://e.x::\n```\n').sections
  assert.doesNotMatch(s, /class="qr"/)
})

test('slideLines はスライドごとの元ファイル上の行範囲を返す（frontmatter・空行・コード内の --- を考慮）', () => {
  const md = '---\ntitle: t\n---\n\n# 1 枚目\n\n本文\n\n---\n\n```\n---\n```\n\n---\n---\n\n## 3 枚目\n'
  assert.deepEqual(slideLines(md), [
    [5, 7],
    [11, 13],
    [18, 18],
  ])
  assert.equal(slideLines(md).length, parse(md).sections.length)
  // CRLF でも同じ
  assert.deepEqual(slideLines(md.replace(/\n/g, '\r\n')), slideLines(md))
})
