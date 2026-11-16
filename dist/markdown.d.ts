export declare const BG: Record<string, string>;
/** frontmatter（`key: value` だけの簡易 YAML） */
export type Meta = Record<string, string>;
export interface Parsed {
    meta: Meta;
    /** スライドごとの `<section>` */
    sections: string[];
    /** スライドごとの発表者ノート（::note:: 以降の HTML。無ければ ''）。sections と同じ並び */
    notes: string[];
}
/** `::http method=GET url=...::` のリクエスト指定 */
export interface HttpSpec {
    method: string;
    url: string;
}
/** ビルド時に取得したレスポンス（http.ts が埋める）。error があれば取得失敗 */
export interface HttpResult {
    status?: number;
    statusText?: string;
    ms?: number;
    headers?: [string, string][];
    contentType?: string;
    body?: string;
    truncated?: boolean;
    error?: string;
}
/** method+url → 取得結果。同じリクエストは 1 エントリに集約される */
export type HttpMap = Map<string, HttpResult>;
export declare const httpKey: (s: HttpSpec) => string;
export declare function inline(text: string): string;
/**
 * @param ratio 右カラムのとき、左カラムが占める割合（::background:: を右半分に敷く）
 */
export declare function blocks(src: string, http?: HttpMap, ratio?: number): string;
/** `::qr url=... caption::` の指定 */
export interface QrSpec {
    url: string;
    /** QR の下に URL を出すか */
    caption: boolean;
}
/** `::qr url=...::` 行をパースする。url が無ければ null（= ただの段落） */
export declare function parseQr(line: string): QrSpec | null;
/** `::background path=... brightness=0.6 opacity=0.8::` の指定 */
export interface BackgroundSpec {
    path: string;
    /** 明るさ（1 がそのまま、0.5 で半分の暗さ） */
    brightness?: string;
    /** 濃さ（1 がそのまま、0 で見えない。下のスライドの背景色が透ける） */
    opacity?: string;
}
/** `::background path=...::` 行をパースする。path が無ければ null（= ただの段落） */
export declare function parseBackground(line: string): BackgroundSpec | null;
/** `::http method=GET url=...::` 行をパースする。url が無ければ null（= ただの段落） */
export declare function parseHttp(line: string): HttpSpec | null;
/** Markdown 全体から `::http::` のリクエストを拾う（コードフェンス内は無視）。http.ts が使う */
export declare function scanHttp(md: string): HttpSpec[];
export declare function splitSlides(md: string): string[];
/**
 * スライドごとの元ファイル上の行範囲 [開始, 終了]（1 始まり・両端を含む・前後の空行は除く）。
 * parse() の sections と同じ並び。ippon serve の /__current-slide が使う
 */
export declare function slideLines(md: string): [number, number][];
export declare function slide(src: string, http?: HttpMap): {
    section: string;
    note: string;
};
export declare function frontmatter(md: string): [Meta, string];
/** Markdown 全体 → { meta, sections } */
export declare function parse(md: string, http?: HttpMap): Parsed;
