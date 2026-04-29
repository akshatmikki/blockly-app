declare var pxt: any;
declare var ts: any;
declare var pxtc: any;
declare var pxtlib: any;
declare var pxtsim: any;
declare function lf(text: string, ...args: any[]): string;

declare namespace pxt {
    export type Map<T> = { [index: string]: T };
    export var BrowserUtils: any;
    export var Util: any;
    export var blocks: any;
    export var appTarget: any;
    export var reportException: any;
    export var webConfig: any;
}

declare namespace pxt.editor {
    export enum BlockLayout {
        Align,
        Flow,
        Clean
    }
}

declare namespace pxtc {
    export interface BlocksInfo {}
    export var ON_START_TYPE: string;
    export var PAUSE_UNTIL_TYPE: string;
    export var TS_STATEMENT_TYPE: string;
    export var TS_OUTPUT_TYPE: string;
    export var TS_RETURN_STATEMENT_TYPE: string;
    export var TS_DEBUGGER_TYPE: string;
    export var TS_BREAK_TYPE: string;
    export var TS_CONTINUE_TYPE: string;
    export var FUNCTION_DEFINITION_TYPE: string;
}

declare namespace ts {
    export var pxtc: any;
}

declare namespace ts.pxtc {
    export interface BlocksInfo {}
    export var ON_START_TYPE: string;
    export var FUNCTION_DEFINITION_TYPE: string;
}
