// ゼロ依存の QR コード生成（Model 2 / byte モード / 誤り訂正レベル M）。
// LAN の URL をスマホで読めれば十分なので version 1–10 までを対象にする。
// 参考: ISO/IEC 18004。Reed-Solomon と配置は Nayuki の実装を踏襲。
//
// Nayuki の実装 (https://www.nayuki.io/page/qr-code-generator-library) の
// 著作権表示と許諾表示（MIT License）:
//
// Copyright (c) Project Nayuki. (MIT License)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
// - The above copyright notice and this permission notice shall be included in
//   all copies or substantial portions of the Software.
// - The Software is provided "as is", without warranty of any kind, express or
//   implied, including but not limited to the warranties of merchantability,
//   fitness for a particular purpose and noninfringement. In no event shall the
//   authors or copyright holders be liable for any claim, damages or other
//   liability, whether in an action of contract, tort or otherwise, arising from,
//   out of or in connection with the Software or the use or other dealings in the
//   Software.

// ---------------------------------------------------------------
// GF(256)
// ---------------------------------------------------------------

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d // 原始多項式 x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!
}

const gfMul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!)

/** 誤り訂正符号の生成多項式（最高次 1 を除いた degree 個の係数） */
function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j]!, root)
      if (j + 1 < degree) result[j] = result[j]! ^ result[j + 1]!
    }
    root = gfMul(root, 0x02)
  }
  return result
}

/** data を degree 個の EC コードワードで割った余り */
function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0)
  for (const b of data) {
    const factor = b ^ result.shift()!
    result.push(0)
    for (let i = 0; i < result.length; i++) result[i] = result[i]! ^ gfMul(divisor[i]!, factor)
  }
  return result
}

// ---------------------------------------------------------------
// version テーブル（誤り訂正レベル M, version 1–10）
// ---------------------------------------------------------------

interface VerInfo {
  /** 1 ブロックあたりの EC コードワード数 */
  ec: number
  /** [ブロック数, ブロックあたりのデータコードワード数] のグループ */
  blocks: [number, number][]
}

const VERSIONS: (VerInfo | null)[] = [
  null,
  { ec: 10, blocks: [[1, 16]] },
  { ec: 16, blocks: [[1, 28]] },
  { ec: 26, blocks: [[1, 44]] },
  { ec: 18, blocks: [[2, 32]] },
  { ec: 24, blocks: [[2, 43]] },
  { ec: 16, blocks: [[4, 27]] },
  { ec: 18, blocks: [[4, 31]] },
  { ec: 22, blocks: [[2, 38], [2, 39]] },
  { ec: 22, blocks: [[3, 36], [2, 37]] },
  { ec: 26, blocks: [[4, 43], [1, 44]] },
]

/** version の alignment パターン中心座標 */
const ALIGN: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
]

const dataCapacity = (v: VerInfo): number => v.blocks.reduce((s, [n, d]) => s + n * d, 0)

// ---------------------------------------------------------------
// ビット列 → コードワード列
// ---------------------------------------------------------------

function codewords(text: string): { version: number; bytes: number[] } {
  const data = [...new TextEncoder().encode(text)]
  let version = 0
  let info: VerInfo | null = null
  for (let v = 1; v < VERSIONS.length; v++) {
    const vi = VERSIONS[v]!
    const ccBits = v <= 9 ? 8 : 16
    const needed = 4 + ccBits + 8 * data.length
    if (needed <= dataCapacity(vi) * 8) {
      version = v
      info = vi
      break
    }
  }
  if (!info) throw new Error('QR にするには文字列が長すぎます')

  const total = dataCapacity(info)
  const ccBits = version <= 9 ? 8 : 16

  // ビット列を組む
  const bits: number[] = []
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }
  push(0b0100, 4) // byte モード
  push(data.length, ccBits)
  for (const b of data) push(b, 8)
  // ターミネータ
  for (let i = 0; i < 4 && bits.length < total * 8; i++) bits.push(0)
  // バイト境界まで 0 詰め
  while (bits.length % 8) bits.push(0)

  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]!
    bytes.push(b)
  }
  // 残りを 0xEC / 0x11 で埋める
  for (let pad = 0xec; bytes.length < total; pad ^= 0xec ^ 0x11) bytes.push(pad)

  // ブロック分割 → EC 付与 → インターリーブ
  const divisor = rsDivisor(info.ec)
  const dBlocks: number[][] = []
  const eBlocks: number[][] = []
  let offset = 0
  for (const [n, dpb] of info.blocks) {
    for (let i = 0; i < n; i++) {
      const d = bytes.slice(offset, offset + dpb)
      offset += dpb
      dBlocks.push(d)
      eBlocks.push(rsRemainder(d, divisor))
    }
  }
  const out: number[] = []
  const maxData = Math.max(...dBlocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) for (const b of dBlocks) if (i < b.length) out.push(b[i]!)
  for (let i = 0; i < info.ec; i++) for (const b of eBlocks) out.push(b[i]!)
  return { version, bytes: out }
}

// ---------------------------------------------------------------
// マトリクス
// ---------------------------------------------------------------

type Grid = number[][]

function buildMatrix(version: number, bytes: number[]): Grid {
  const size = 17 + 4 * version
  const m: Grid = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (r: number, c: number, v: number) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      m[r]![c] = v
      fn[r]![c] = true
    }
  }

  // ファインダ + セパレータ
  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++)
      for (let j = -1; j <= 7; j++) {
        const outer = i === 0 || i === 6 || j === 0 || j === 6
        const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4
        const border = i === -1 || i === 7 || j === -1 || j === 7
        set(r + i, c + j, border ? 0 : outer || inner ? 1 : 0)
      }
  }
  finder(0, 0)
  finder(0, size - 7)
  finder(size - 7, 0)

  // タイミング
  for (let i = 8; i < size - 8; i++) {
    if (!fn[6]![i]) set(6, i, i % 2 === 0 ? 1 : 0)
    if (!fn[i]![6]) set(i, 6, i % 2 === 0 ? 1 : 0)
  }

  // alignment
  const centers = ALIGN[version]!
  const last = centers[centers.length - 1]
  for (const ar of centers)
    for (const ac of centers) {
      // ファインダと重なる 3 箇所は置かない
      if ((ar === 6 && ac === 6) || (ar === 6 && ac === last) || (ar === last && ac === 6)) continue
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++) set(ar + i, ac + j, Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0)
    }

  // ダークモジュール
  set(4 * version + 9, 8, 1)

  // フォーマット情報領域を予約（値は後で mask ごとに書く）
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      if (!fn[i]![8]) set(i, 8, 0)
      if (!fn[8]![i]) set(8, i, 0)
    }
  }
  for (let i = 0; i < 8; i++) if (!fn[8]![size - 1 - i]) set(8, size - 1 - i, 0)
  for (let i = 0; i < 7; i++) if (!fn[size - 1 - i]![8]) set(size - 1 - i, 8, 0)

  // バージョン情報領域を予約（v7+）
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        set(size - 11 + j, i, 0)
        set(i, size - 11 + j, 0)
      }
  }

  // データ配置（ジグザグ）
  let bitIndex = 0
  const totalBits = bytes.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j
        const upward = ((right + 1) & 2) === 0
        const row = upward ? size - 1 - vert : vert
        if (!fn[row]![col] && bitIndex < totalBits) {
          const b = bytes[bitIndex >> 3]!
          m[row]![col] = (b >> (7 - (bitIndex & 7))) & 1
          bitIndex++
        }
      }
    }
  }

  // マスク選定
  let best: Grid | null = null
  let bestPenalty = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const cand = m.map((row) => row.slice())
    applyMask(cand, fn, mask)
    writeFormat(cand, fn, mask)
    const p = penalty(cand)
    if (p < bestPenalty) {
      bestPenalty = p
      best = cand
    }
  }
  return best!
}

function maskFn(mask: number, i: number, j: number): boolean {
  switch (mask) {
    case 0: return (i + j) % 2 === 0
    case 1: return i % 2 === 0
    case 2: return j % 3 === 0
    case 3: return (i + j) % 3 === 0
    case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
    case 5: return ((i * j) % 2) + ((i * j) % 3) === 0
    case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0
    default: return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0
  }
}

function applyMask(m: Grid, fn: boolean[][], mask: number): void {
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m.length; j++) if (!fn[i]![j] && maskFn(mask, i, j)) m[i]![j] = m[i]![j]! ^ 1
}

function writeFormat(m: Grid, fn: boolean[][], mask: number): void {
  const size = m.length
  // レベル M = 0b00
  const data = (0b00 << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) & 1 ? 0b10100110111 : 0)
  const bits = ((data << 10) | rem) ^ 0b101010000010010

  const place = (r: number, c: number, bit: number) => {
    m[r]![c] = bit
    fn[r]![c] = true
  }
  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1
    // 左上まわり
    if (i < 6) place(i, 8, bit)
    else if (i < 8) place(i + 1, 8, bit)
    else if (i === 8) place(8, 7, bit)
    else place(8, 14 - i, bit)
    // 右上 / 左下のコピー
    if (i < 8) place(8, size - 1 - i, bit)
    else place(size - 15 + i, 8, bit)
  }
  place(size - 8, 8, 1) // ダークモジュール（上書き保証）

  if (size >= 45) writeVersion(m, fn, (size - 17) / 4)
}

function writeVersion(m: Grid, fn: boolean[][], version: number): void {
  const size = m.length
  let rem = version
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) & 1 ? 0b1111100100101 : 0)
  const bits = (version << 12) | rem
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1
    const a = Math.floor(i / 3)
    const b = (i % 3) + size - 11
    m[a]![b] = bit
    fn[a]![b] = true
    m[b]![a] = bit
    fn[b]![a] = true
  }
}

// ---------------------------------------------------------------
// マスクのペナルティ評価
// ---------------------------------------------------------------

function penalty(m: Grid): number {
  const n = m.length
  let p = 0
  // 規則 1: 同色の連続
  for (let i = 0; i < n; i++)
    for (const line of [m[i]!, m.map((r) => r[i]!)]) {
      let run = 1
      for (let j = 1; j < n; j++) {
        if (line[j] === line[j - 1]) {
          run++
          if (run === 5) p += 3
          else if (run > 5) p += 1
        } else run = 1
      }
    }
  // 規則 2: 2x2 の同色ブロック
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < n - 1; j++) {
      const v = m[i]![j]!
      if (v === m[i]![j + 1] && v === m[i + 1]![j] && v === m[i + 1]![j + 1]) p += 3
    }
  // 規則 3: 1:1:3:1:1 パターン
  const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
  const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
  const match = (get: (k: number) => number, start: number, pat: number[]) =>
    pat.every((v, k) => get(start + k) === v)
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= n - 11; j++) {
      if (match((k) => m[i]![k]!, j, pat1) || match((k) => m[i]![k]!, j, pat2)) p += 40
      if (match((k) => m[k]![i]!, j, pat1) || match((k) => m[k]![i]!, j, pat2)) p += 40
    }
  // 規則 4: 暗モジュールの割合
  let dark = 0
  for (const row of m) for (const v of row) dark += v
  const ratio = (dark * 100) / (n * n)
  p += Math.floor(Math.abs(ratio - 50) / 5) * 10
  return p
}

// ---------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------

/** 文字列を QR のモジュール行列（1=暗 / 0=明、quiet zone なし）にする */
export function qrMatrix(text: string): Grid {
  const { version, bytes } = codewords(text)
  return buildMatrix(version, bytes)
}

/** QR を SVG 文字列にする（quiet zone 4 モジュール付き） */
export function qrSvg(text: string, scale = 4): string {
  const m = qrMatrix(text)
  const q = 4
  const dim = (m.length + q * 2) * scale
  let path = ''
  for (let i = 0; i < m.length; i++)
    for (let j = 0; j < m.length; j++)
      if (m[i]![j]) path += `M${(j + q) * scale} ${(i + q) * scale}h${scale}v${scale}h-${scale}z`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
  )
}

/** QR を端末に表示する文字列。1 モジュール = 縦 1 行・横 2 スペース（確実に読めるのを優先） */
export function qrTerminal(text: string): string {
  const m = qrMatrix(text)
  const q = 2
  const n = m.length
  const rows = n + q * 2
  const dark = (r: number, c: number): boolean => {
    const rr = r - q
    const cc = c - q
    return rr >= 0 && rr < n && cc >= 0 && cc < n ? m[rr]![cc]! === 1 : false
  }
  const W = '\x1b[48;2;255;255;255m'
  const B = '\x1b[48;2;0;0;0m'
  const R = '\x1b[0m'
  let out = ''
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < rows; c++) out += (dark(r, c) ? B : W) + '  '
    out += R + '\n'
  }
  return out
}
