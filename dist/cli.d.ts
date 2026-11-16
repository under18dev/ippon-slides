export interface Options {
    /** 位置引数 */
    _: string[];
    html?: boolean;
    pdf?: boolean;
    watch?: boolean;
    help?: boolean;
    version?: boolean;
    noFetch?: boolean;
    force?: boolean;
    output?: string;
    css?: string;
    browserPath?: string;
    port?: string;
}
export declare function parseArgs(argv: string[]): Options;
/** 出力先を決める */
export type Format = 'html' | 'pdf';
export declare function outputs(input: string, { html, pdf, output }: Pick<Options, 'html' | 'pdf' | 'output'>): {
    format: Format;
    path: string;
}[];
export declare function main(argv: string[]): Promise<void>;
