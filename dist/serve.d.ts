import type { Server } from 'node:http';
export interface ServeOptions {
    port?: number;
    css?: string;
    host?: string;
}
export interface ServeResult {
    server: Server;
    port: number;
    token: string;
    /** 発表者がこの PC で開く URL（トークン付き） */
    deckUrl: string;
    /** スマホで開くリモコン URL（LAN IP ごと、トークン付き） */
    remoteUrls: string[];
    /** 先頭のリモコン URL を表す QR の SVG */
    qrSvg: string;
    /** いま表示中のスライドを返す URL（コーディングエージェント向け。この PC からだけ） */
    currentUrl: string;
}
/** /__current-slide の応答 */
export interface CurrentSlide {
    /** Markdown の絶対パス */
    file: string;
    /** 表示中のスライド番号（1 始まり） */
    slide: number;
    total: number;
    /** そのスライドの Markdown 上の行範囲（1 始まり・両端を含む） */
    lines: {
        start: number;
        end: number;
    };
    /** そのスライドの Markdown */
    source: string;
    /** デッキで選択中の文字列（無ければ ''） */
    selection: string;
}
export declare function serve(input: string, opts?: ServeOptions): Promise<ServeResult>;
