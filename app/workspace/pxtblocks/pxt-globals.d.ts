declare var pxt: any;
declare var ts: any;
declare var pxtc: any;
declare function lf(text: string, ...args: any[]): string;

declare namespace pxt {
    type Map<T> = { [index: string]: T };
}

declare namespace pxt.editor {
    export enum BlockLayout {
        Align,
        Flow,
        Clean
    }
}

declare namespace ts.pxtc {
    export var ON_START_TYPE: string;
    export var FUNCTION_DEFINITION_TYPE: string;
    export interface BlocksInfo {}
}
