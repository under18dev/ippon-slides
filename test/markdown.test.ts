import assert from 'node:assert/strict'
import { test } from 'node:test'
import { httpKey, parse, parseBackground, parseHttp, parseQr, scanHttp, slideLines } from '../src/markdown.ts'
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

test('bg=constructor などの継承プロパティ名はそのまま色名として使う', () => {
  for (const name of ['constructor', '__proto__', 'toString']) {
    const [s = ''] = parse(`::bg=${name}::\n\nx\n`).sections
    assert.match(s, new RegExp(`style="background:${name};"`))
  }
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

test('インライン: javascript: などのリンクはリンクにしない', () => {
  for (const u of ['javascript:alert%281%29', 'JavaScript:x', 'vbscript:x', '\u0001javascript:x', 'data:text/html,x']) {
    const [s = ''] = parse(`[l](${u})\n`).sections
    assert.doesNotMatch(s, /<a /, u)
    assert.match(s, /<p>l<\/p>/)
  }
  assert.match(parse('[l](mailto:a@e.x)\n').sections[0]!, /<a href="mailto:a@e.x"/)
})

test('インライン: → や * を含む画像・リンクでも属性が壊れない', () => {
  const [s = ''] = parse('![前 → 後](a.png) [**x** →](https://e.x/a→b/*c*)\n').sections
  assert.match(s, /<img src="a.png" alt="前 → 後">/)
  assert.match(s, /<a href="https:\/\/e.x\/a→b\/\*c\*" target="_blank" rel="noopener"><strong>x<\/strong> <span class="arrow">→<\/span><\/a>/)
})

test('インライン: 閉じない [ ( が並んでも行の長さに比例する時間で終わる', () => {
  for (const md of ['[a]('.repeat(20_000), '[a'.repeat(20_000), '![a](b'.repeat(20_000), '![a'.repeat(20_000)]) {
    const t = performance.now()
    parse(md)
    const ms = performance.now() - t
    assert.ok(ms < 2000, `${md.slice(0, 6)}… に ${Math.round(ms)}ms`)
  }
  // 長い URL の画像・リンクもこれまでどおり
  const url = 'https://e.x/' + 'a'.repeat(3000)
  assert.match(parse(`[l](${url}) ![i](${url})\n`).sections[0]!, /<a href="https:\/\/e.x\/a+".*<img src="https:\/\/e.x\/a+"/)
})

test('引用: 深い入れ子でもスタックがあふれない（上限より深い > は文字のまま）', () => {
  const [s = ''] = parse('> '.repeat(20_000) + 'x\n').sections
  assert.equal(s.match(/<blockquote>/g)!.length, 17)
  assert.match(parse('> > a\n').sections[0]!, /<blockquote><blockquote><p>a<\/p><\/blockquote><\/blockquote>/)
})

test('インライン: 画像の alt・リンクの URL の中のインラインコードは中身の文字にする', () => {
  const [s = ''] = parse('![Run `npm test` <x>](a.png) [l](`https://e.x/`) [m](`javascript:alert(1)`)\n').sections
  assert.match(s, /<img src="a.png" alt="Run npm test &lt;x&gt;">/)
  assert.match(s, /<a href="https:\/\/e.x\/" target="_blank" rel="noopener">l<\/a>/)
  assert.doesNotMatch(s, /\u0000|href="javascript/)
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

test('ハイライト: constructor などの継承プロパティを言語名として扱わない（HTML はエスケープする）', () => {
  const evil = '<img src=x onerror=alert(1)>'
  for (const lang of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
    assert.equal(highlight(evil, lang), '&lt;img src=x onerror=alert(1)&gt;', lang)
    const html = parse('```' + lang + '\n' + evil + '\n```').sections[0]!
    assert.ok(!html.includes('<img'), lang)
  }
})

test('ハイライト: 長い 1 行でも行の長さに比例する時間で終わる', () => {
  const yaml = 'description: ' + 'some normal words '.repeat(3000)
  const lines: [string, string][] = [
    [yaml, 'yaml'],
    ['- a ' + ' '.repeat(20000) + 'b', 'yaml'],
    ['a: ' + '.'.repeat(20000), 'yaml'],
    ['a: ' + 'b:c '.repeat(10000), 'css'],
    ['a{b:c}'.repeat(5000), 'css'],
  ]
  for (const lang of ['yaml', 'py', 'go', 'rust', 'css', 'html', 'diff', 'js', 'sh', 'hcl', 'json']) {
    lines.push(['x = ' + '1'.repeat(20000) + 'x', lang], ['a ' + 'b: c '.repeat(5000), lang])
  }
  for (const [line, lang] of lines) {
    const t = performance.now()
    highlight(line, lang)
    const ms = performance.now() - t
    assert.ok(ms < 200, `${lang}: ${line.slice(0, 20)}… に ${Math.round(ms)}ms`)
  }
  assert.match(highlight(yaml, 'yaml'), /^<span class="hl-t">description<\/span>: some normal words /)
})

test('yaml: キーは行頭・"- " の後・フロー内の { , の後だけ', () => {
  const y = highlight('- name: x\nmap: {a: 1, b c: 2}\nnote: time: 10', 'yaml')
  assert.match(y, /^- <span class="hl-t">name<\/span>: x/)
  assert.match(y, /\{<span class="hl-t">a<\/span>: <span class="hl-n">1<\/span>, <span class="hl-t">b c<\/span>: <span class="hl-n">2<\/span>\}/)
  assert.match(y, /<span class="hl-t">note<\/span>: time: <span class="hl-n">10<\/span>/)
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

test('::background:: をパースする（path 必須・brightness / opacity は数値）', () => {
  assert.deepEqual(parseBackground('::background path=img/a.jpg::'), { path: 'img/a.jpg' })
  assert.deepEqual(parseBackground('::background img/a.jpg brightness=0.5 opacity=.8::'), {
    path: 'img/a.jpg',
    brightness: '0.5',
    opacity: '.8',
  })
  assert.equal(parseBackground('::background opacity=0.5::'), null)
  // = を含む URL もキー省略で書ける（知らない `名前=` は飛ばす）
  assert.deepEqual(parseBackground('::background https://e.x/a.jpg?w=1280&h=720 foo=1::'), {
    path: 'https://e.x/a.jpg?w=1280&h=720',
  })
  assert.throws(() => parseBackground('::background path=a.jpg brightness=red::'), /brightness は数値で/)
})

test('::background:: はスライド全体、::right:: の後ろなら右半分の背景画像になる', () => {
  const [full = '', right = '', wide = ''] = parse(
    '# a\n\n::background path=a.jpg brightness=0.6 opacity=0.8::\n\n---\n\n' +
      'b\n\n::right::\n\n::background path=b.jpg::\n\n---\n\n' +
      'c\n\n::right right-wide::\n\n::background path=c.jpg::\n'
  ).sections
  assert.match(full, /<img src="a\.jpg" class="slide-bg" alt="" style="opacity:0\.8;filter:brightness\(0\.6\)">/)
  assert.match(right, /<img src="b\.jpg" class="slide-bg right" alt="" style="--ratio:0\.5">/)
  assert.match(wide, /class="slide-bg right" alt="" style="--ratio:0\.4167"/)
  // コードフェンス内はそのまま
  const [code = ''] = parse('```\n::background path=a.jpg::\n```\n').sections
  assert.doesNotMatch(code, /slide-bg/)
})

test('::background:: はどこに書いてもスライドの先頭に置く（表紙の p:last-child を崩さない）', () => {
  const [s = ''] = parse('::title::\n\n# t\n\nname\n\n::background path=a.jpg::\n').sections
  assert.match(s, /^<section class="slide title"><img src="a\.jpg" class="slide-bg" alt=""><h1>t<\/h1><p>name<\/p><\/section>$/)
  const [r = ''] = parse('a\n\n::right::\n\n::background path=b.jpg::\n\nb\n').sections
  assert.match(r, /^<section class="slide"><img src="b\.jpg" class="slide-bg right" alt="" style="--ratio:0\.5"><div class="cols">/)
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
