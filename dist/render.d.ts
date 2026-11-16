import type { HttpMap } from './markdown.ts';
export interface RenderOptions {
    /** 画像の相対パスの基準（= Markdown のあるディレクトリ） */
    baseDir: string;
    /** 出力先ディレクトリ。省略すると画像は file:// URL になる */
    outDir?: string;
    /** 追加の CSS（--css） */
    css?: string;
    /** ::http:: のビルド時取得結果（省略すると未取得状態で焼き込む） */
    http?: HttpMap;
    /** 相対パスの画像を data URI で埋め込む（--inline） */
    inline?: boolean;
    /**
     * og:image の既定のファイル名（ippon ogp が書き出す <input>.png）。
     * frontmatter に url: があるときだけ、それを基準にした絶対 URL で og:image を出す
     */
    ogImage?: string;
}
export interface RenderResult {
    html: string;
    /** スライドの枚数 */
    count: number;
    /** inline のときに埋め込めなかった画像（Markdown に書かれたパス） */
    missing: string[];
}
export declare function render(md: string, { baseDir, outDir, css, http, inline, ogImage }: RenderOptions): RenderResult;
