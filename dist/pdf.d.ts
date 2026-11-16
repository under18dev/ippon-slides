/** --browser-path → CHROME_PATH → よくある場所 の順に探す */
export declare function findBrowser(explicit?: string): string | null;
export interface PdfOptions {
    /** 使うブラウザ。省略すると CHROME_PATH → よくある場所 の順に探す */
    browserPath?: string;
}
export interface PngOptions extends PdfOptions {
    /** 画像の幅（既定 1200。OGP の推奨サイズ） */
    width?: number;
    /** 画像の高さ（既定 630） */
    height?: number;
}
/**
 * @param html file:// URL の画像で組み立てた HTML
 * @param out  出力する PDF のパス
 */
export declare function toPdf(html: string, out: string, { browserPath }?: PdfOptions): Promise<void>;
/**
 * 表紙（1 枚目）を PNG で書き出す（OGP 画像用）
 * @param html file:// URL の画像で組み立てた HTML
 * @param out  出力する PNG のパス
 */
export declare function toPng(html: string, out: string, { browserPath, width, height }?: PngOptions): Promise<void>;
