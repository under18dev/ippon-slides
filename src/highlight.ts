// コードのハイライト。1 行ずつ処理する（複数行にまたがるトークンは扱わない）。
// 行頭の "!! " はその行の強調マーカー。

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type Rule = [RegExp, string | null]

function tokenize(line: string, rules: Rule[]): string {
  let out = ''
  let rest = line
  outer: while (rest.length) {
    for (const [re, cls] of rules) {
      const m = rest.match(re)
      if (m && m[0].length) {
        out += cls ? `<span class="${cls}">${esc(m[0])}</span>` : esc(m[0])
        rest = rest.slice(m[0].length)
        continue outer
      }
    }
    out += esc(rest[0]!)
    rest = rest.slice(1)
  }
  return out
}

const HCL_KEYWORDS =
  'resource|data|variable|module|output|locals|terraform|provisioner|lifecycle|precondition|postcondition|backend|for|in|if|for_each|count|depends_on|when'

const HCL: Rule[] = [
  [/^(#|\/\/).*/, 'hl-c'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^<<-?EOT/, 'hl-s'],
  [/^(?:var|local|module|each|self|path|data)(?=\.)/, 'hl-i'],
  [new RegExp(`^(?:${HCL_KEYWORDS})\\b`), 'hl-k'],
  [/^(?:true|false|null)\b/, 'hl-n'],
  [/^\d+(\.\d+)?\b/, 'hl-n'],
  [/^[a-z_][a-z0-9_]*(?=\()/, 'hl-f'],
  [/^[a-z_][a-z0-9_]*(?=\s*=[^=>])/, 'hl-t'],
  [/^[A-Za-z_][A-Za-z0-9_]*/, null],
]

const SH: Rule[] = [
  [/^#.*/, 'hl-c'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^'[^']*'/, 'hl-s'],
  [/^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/, 'hl-i'],
  [/^(?:if|then|else|elif|fi|for|while|do|done|case|esac|set|echo|exit|export)\b/, 'hl-k'],
  [/^--?[a-z][a-z-]*/, 'hl-t'],
  [/^[A-Za-z_][A-Za-z0-9_]*/, null],
]

const JSON_: Rule[] = [
  [/^"(?:[^"\\]|\\.)*"(?=\s*:)/, 'hl-t'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^(?:true|false|null)\b/, 'hl-n'],
  [/^-?\d+(\.\d+)?/, 'hl-n'],
]

const JS_KEYWORDS =
  'const|let|var|function|return|if|else|for|while|of|in|new|class|extends|import|from|export|default|async|await|try|catch|throw|type|interface|as'

const JS: Rule[] = [
  [/^\/\/.*/, 'hl-c'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^'(?:[^'\\]|\\.)*'/, 'hl-s'],
  [/^`(?:[^`\\]|\\.)*`/, 'hl-s'],
  [new RegExp(`^(?:${JS_KEYWORDS})\\b`), 'hl-k'],
  [/^(?:true|false|null|undefined)\b/, 'hl-n'],
  [/^\d+(\.\d+)?\b/, 'hl-n'],
  [/^[A-Za-z_$][\w$]*(?=\()/, 'hl-f'],
  [/^[A-Z][\w$]*/, 'hl-t'],
  [/^[A-Za-z_$][\w$]*/, null],
]

const YAML: Rule[] = [
  [/^#.*/, 'hl-c'],
  [/^(?:---|\.\.\.)(?=\s*$)/, 'hl-k'],
  [/^"(?:[^"\\]|\\.)*"(?=\s*:(?:\s|$))/, 'hl-t'],
  [/^'[^']*'(?=\s*:(?:\s|$))/, 'hl-t'],
  [/^[\w.-][\w .-]*?(?=\s*:(?:\s|$))/, 'hl-t'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^'[^']*'/, 'hl-s'],
  [/^[&*][\w-]+/, 'hl-i'],
  [/^!!?[\w-]+/, 'hl-i'],
  [/^(?:true|false|null|yes|no|on|off|~)(?=\s*(?:#|$|,|\]|\}))/i, 'hl-n'],
  [/^-?\d+(\.\d+)?(?=\s*(?:#|$|,|\]|\}))/, 'hl-n'],
  [/^[A-Za-z_][\w-]*/, null],
]

const PY_KEYWORDS =
  'and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|case|nonlocal|not|or|pass|raise|return|try|while|with|yield'

const PY: Rule[] = [
  [/^#.*/, 'hl-c'],
  // 三連クォートは同じ行で閉じなければ行末まで文字列
  [/^[rRbBuUfF]{0,2}(?:"""|''')(?:.*?(?:"""|''')|.*)/, 'hl-s'],
  [/^[rRbBuUfF]{0,2}"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^[rRbBuUfF]{0,2}'(?:[^'\\]|\\.)*'/, 'hl-s'],
  [/^@[\w.]+/, 'hl-i'],
  [new RegExp(`^(?:${PY_KEYWORDS})\\b`), 'hl-k'],
  [/^(?:True|False|None)\b/, 'hl-n'],
  [/^(?:self|cls)\b/, 'hl-i'],
  [/^\d[\d_]*(\.\d+)?\b/, 'hl-n'],
  [/^[A-Za-z_]\w*(?=\()/, 'hl-f'],
  [/^[A-Z]\w*/, 'hl-t'],
  [/^[A-Za-z_]\w*/, null],
]

const GO_KEYWORDS =
  'break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var'
const GO_TYPES =
  'bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr|any'

const GO: Rule[] = [
  [/^\/\/.*/, 'hl-c'],
  [/^\/\*.*?(?:\*\/|$)/, 'hl-c'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^`[^`]*`?/, 'hl-s'],
  [/^'(?:[^'\\]|\\.)*'/, 'hl-s'],
  [new RegExp(`^(?:${GO_KEYWORDS})\\b`), 'hl-k'],
  [/^(?:true|false|nil|iota)\b/, 'hl-n'],
  [/^\d+(\.\d+)?\b/, 'hl-n'],
  [/^[A-Za-z_]\w*(?=\()/, 'hl-f'],
  [new RegExp(`^(?:${GO_TYPES})\\b`), 'hl-t'],
  [/^[A-Z]\w*/, 'hl-t'],
  [/^[A-Za-z_]\w*/, null],
]

const RUST_KEYWORDS =
  'as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|static|struct|super|trait|type|unsafe|use|where|while'
const RUST_TYPES = 'i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str'

const RUST: Rule[] = [
  [/^\/\/.*/, 'hl-c'],
  [/^\/\*.*?(?:\*\/|$)/, 'hl-c'],
  [/^#!?\[[^\]]*\]?/, 'hl-i'],
  [/^b?r(#*)"[^"]*"\1/, 'hl-s'],
  [/^b?"(?:[^"\\]|\\.)*"/, 'hl-s'],
  // 'a' は文字、'a 単体はライフタイム
  [/^b?'(?:[^'\\]|\\[^']*)'/, 'hl-s'],
  [/^'[A-Za-z_]\w*/, 'hl-i'],
  [/^(?:self|Self)\b/, 'hl-i'],
  [new RegExp(`^(?:${RUST_KEYWORDS})\\b`), 'hl-k'],
  [/^(?:true|false)\b/, 'hl-n'],
  [/^\d[\d_]*(\.\d+)?(?:[iuf]\d+|usize|isize)?\b/, 'hl-n'],
  [/^[a-z_]\w*!(?=[([{])/, 'hl-f'],
  // f(...) と f<'a, T>(...) / f::<T>(...)
  [/^[A-Za-z_]\w*(?=(?:(?:::)?<[^()]*>)?\()/, 'hl-f'],
  [new RegExp(`^(?:${RUST_TYPES})\\b`), 'hl-t'],
  [/^[A-Z]\w*/, 'hl-t'],
  [/^[A-Za-z_]\w*/, null],
]

const CSS: Rule[] = [
  [/^\/\*.*?(?:\*\/|$)/, 'hl-c'],
  [/^"(?:[^"\\]|\\.)*"/, 'hl-s'],
  [/^'(?:[^'\\]|\\.)*'/, 'hl-s'],
  [/^@[\w-]+/, 'hl-k'],
  [/^!important\b/, 'hl-k'],
  // `color: red;` のように : の後が値ならプロパティ（`a:hover {` はセレクタ）
  [/^-*[A-Za-z][\w-]*(?=\s*:\s*(?:[^{;()]|\([^()]*\))*[;})])/, 'hl-t'],
  [/^-*[A-Za-z][\w-]*(?=\s*:\s+[^{]*$)/, 'hl-t'],
  [/^#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/, 'hl-n'],
  [/^-?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?/, 'hl-n'],
  [/^[\w-]+(?=\()/, 'hl-f'],
  [/^(?:[.#]|::?)[A-Za-z_-][\w-]*/, 'hl-f'],
  [/^[A-Za-z_-][\w-]*/, null],
]

// HTML / XML のタグの中身（タグ名・属性名・属性値）
const TAG: Rule[] = [
  [/^<[!?/]?[\w:.-]+/, 'hl-k'],
  [/^[?/]?>/, 'hl-k'],
  [/^[\w:.@-]+(?=\s*=)/, 'hl-t'],
  [/^"[^"]*"?/, 'hl-s'],
  [/^'[^']*'?/, 'hl-s'],
  [/^[\w:.@-]+/, 'hl-t'],
]

/** HTML / XML。タグ・コメント・実体参照だけを色分けし、本文はそのまま */
function htmlLine(line: string): string {
  let out = ''
  let last = 0
  for (const m of line.matchAll(/<!--.*?(?:-->|$)|<[!?/]?[\w:.-]+(?:"[^"]*"|'[^']*'|[^>"'])*>?|&#?\w+;/g)) {
    out += esc(line.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('<!--')) out += `<span class="hl-c">${esc(t)}</span>`
    else if (t[0] === '&') out += `<span class="hl-n">${esc(t)}</span>`
    else out += tokenize(t, TAG)
    last = m.index + t.length
  }
  return out + esc(line.slice(last))
}

/** diff。追加・削除・hunk ヘッダ・ファイルヘッダを行ごとに色分けする */
function diffLine(line: string): string {
  let cls = ''
  if (/^(?:\+\+\+|---)(?:\s|$)|^(?:diff |index )/.test(line)) cls = 'hl-meta'
  else if (line.startsWith('@@')) cls = 'hl-hunk'
  else if (line.startsWith('+')) cls = 'hl-add'
  else if (line.startsWith('-')) cls = 'hl-del'
  return cls ? `<span class="${cls}">${esc(line)}</span>` : esc(line)
}

function consoleLine(line: string): string {
  const m = line.match(/^(\$ )(.*)$/)
  if (m) return `<span class="hl-prompt">$ </span><span class="hl-cmd">${esc(m[2]!)}</span>`
  if (/(^|\s)(Error|panic)\b|^make: \*\*\*/.test(line)) return `<span class="hl-err">${esc(line)}</span>`
  if (/^(✅|Apply complete|Destroy complete)/.test(line)) return `<span class="hl-ok">${esc(line)}</span>`
  return `<span class="hl-out">${esc(line)}</span>`
}

/** 言語名 → ルール表、または 1 行を丸ごと HTML にする関数 */
const LANGS: Record<string, Rule[] | ((line: string) => string)> = {
  console: consoleLine,
  diff: diffLine,
  patch: diffLine,
  html: htmlLine,
  xml: htmlLine,
  svg: htmlLine,
  yaml: YAML,
  yml: YAML,
  py: PY,
  python: PY,
  go: GO,
  golang: GO,
  rust: RUST,
  rs: RUST,
  css: CSS,
  hcl: HCL,
  tf: HCL,
  terraform: HCL,
  sh: SH,
  bash: SH,
  shell: SH,
  zsh: SH,
  json: JSON_,
  js: JS,
  javascript: JS,
  ts: JS,
  typescript: JS,
  jsx: JS,
  tsx: JS,
}

export function highlight(code: string, lang = ''): string {
  const rules = LANGS[lang.toLowerCase()]
  return code
    .split('\n')
    .map((raw) => {
      const marked = raw.startsWith('!! ')
      const line = marked ? raw.slice(3) : raw
      let html
      if (typeof rules === 'function') html = rules(line)
      else if (rules) html = tokenize(line, rules)
      else html = esc(line)
      return marked ? `<span class="hl-mark">${html}</span>` : html
    })
    .join('\n')
}
