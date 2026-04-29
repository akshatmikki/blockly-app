/// <reference path="../../built/pxtlib.d.ts" />
/// <reference path="../../built/pxtsim.d.ts" />

import * as Blockly from "blockly";
import { FieldMatrix } from "./field_matrix";
import { FieldCustom } from "./field_utils";

const rowRegex = /^.*[\.#].*$/;
const pointerEvents = ((globalThis as any).pxt?.BrowserUtils?.pointerEvents) || {
    down: ["pointerdown", "mousedown", "touchstart"],
    move: "pointermove",
    up: "pointerup",
    leave: "pointerleave"
};
const localize = (text: string, ...args: (string | number)[]) => {
    const lfFn = (globalThis as any).lf || (globalThis as any).pxt?.Util?.lf;
    if (typeof lfFn === "function") {
        return lfFn(text, ...args);
    }

    return text.replace(/\{(\d+)\}/g, (_, index) => String(args[Number(index)] ?? ""));
};

function createSvgRoot(width: number, height: number) {
    return Blockly.utils.dom.createSvgElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        id: "field-matrix",
        class: "blocklyMatrix",
        tabindex: "-1",
        role: "grid",
        width,
        height
    }, null) as SVGSVGElement;
}

function createSvgChild<T extends SVGElement>(parent: SVGElement, tagName: string, attributes: Record<string, string | number | undefined>) {
    const normalized: Record<string, string> = {};

    Object.keys(attributes).forEach(key => {
        const value = attributes[key];
        if (value !== undefined) {
            normalized[key] = String(value);
        }
    });

    return Blockly.utils.dom.createSvgElement(tagName, normalized, parent) as T;
}

enum LabelMode {
    None,
    Number,
    Letter
}

export class FieldLedMatrix extends FieldMatrix implements FieldCustom {
    private static CELL_WIDTH = 25;
    private static CELL_HORIZONTAL_MARGIN = 7;
    private static CELL_VERTICAL_MARGIN = 5;
    private static CELL_CORNER_RADIUS = 5;
    private static BOTTOM_MARGIN = 9;
    private static Y_AXIS_WIDTH = 9;
    private static X_AXIS_HEIGHT = 10;
    private static TAB = "        ";

    public isFieldCustom_ = true;
    public SERIALIZABLE = true;

    private params: any;
    private onColor = "#FFFFFF";
    private offColor: string;
    private static DEFAULT_OFF_COLOR = "#000000";

    private scale = 1;

    protected numMatrixCols: number = 5;
    protected numMatrixRows: number = 5;

    private yAxisLabel: LabelMode = LabelMode.None;
    private xAxisLabel: LabelMode = LabelMode.None;

    private cellState: boolean[][] = [];

    private currentDragState_: boolean;

    protected clearSelectionOnBlur = true;
    protected forceFocusVisible = true;

    constructor(text: string, params: any, validator?: Blockly.FieldValidator) {
        super(text, validator);
        this.params = params;

        if (this.params.rows !== undefined) {
            let val = parseInt(this.params.rows);
            if (!isNaN(val)) {
                this.numMatrixRows = val;
            }
        }

        if (this.params.columns !== undefined) {
            let val = parseInt(this.params.columns);
            if (!isNaN(val)) {
                this.numMatrixCols = val;
            }
        }

        if (this.params.onColor !== undefined) {
            this.onColor = this.params.onColor;
        }

        if (this.params.offColor !== undefined) {
            this.offColor = this.params.offColor;
        }

        if (this.params.scale !== undefined)
            this.scale = Math.max(0.6, Math.min(2, Number(this.params.scale)));
        else if (Math.max(this.numMatrixCols, this.numMatrixRows) > 15)
            this.scale = 0.85;
        else if (Math.max(this.numMatrixCols, this.numMatrixRows) > 10)
            this.scale = 0.9;

        this.size_.height = this.scale * Number(this.numMatrixRows) * (FieldLedMatrix.CELL_WIDTH + FieldLedMatrix.CELL_VERTICAL_MARGIN) + FieldLedMatrix.CELL_VERTICAL_MARGIN * 2 + FieldLedMatrix.BOTTOM_MARGIN + this.getXAxisHeight()
        this.size_.width = this.scale * Number(this.numMatrixCols) * (FieldLedMatrix.CELL_WIDTH + FieldLedMatrix.CELL_HORIZONTAL_MARGIN) + FieldLedMatrix.CELL_HORIZONTAL_MARGIN + this.getYAxisWidth();
    }

    protected getCellToggled(x: number, y: number): boolean {
        return this.cellState[x][y];
    }

    protected useTwoToneFocusIndicator(x: number, y: number): boolean {
        return this.getCellToggled(x, y);
    }

    /**
     * Show the inline free-text editor on top of the text.
     * @private
     */
    showEditor_() {
        this.selected = [0, 0];

        const matrixRect = this.matrixSvg.getBoundingClientRect();

        const widgetDiv = Blockly.WidgetDiv.getDiv();
        widgetDiv.append(this.matrixSvg);
        this.addKeyboardFocusHandlers();

        widgetDiv.style.left = matrixRect.left + "px";
        widgetDiv.style.top = matrixRect.top + "px";
        widgetDiv.style.transform = `scale(${(Blockly.getMainWorkspace() as Blockly.WorkspaceSvg).getScale()})`;
        widgetDiv.style.transformOrigin = "0 0";

        Blockly.WidgetDiv.show(this, this.sourceBlock_.RTL, () => {
            this.removeKeyboardFocusHandlers();
            this.clearCellSelection();
            this.fieldGroup_.append(this.matrixSvg);
            widgetDiv.style.left = "";
            widgetDiv.style.top = "";
            widgetDiv.style.transform = "";
            widgetDiv.style.transformOrigin = "";
        });

        this.matrixSvg.focus();
        this.focusCell(0, 0);
    }

    private initMatrix() {
        if (!this.sourceBlock_.isInsertionMarker()) {
            this.matrixSvg = createSvgRoot(this.size_.width, this.size_.height);
            this.matrixSvg.ariaLabel = localize("LED grid");
            const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg
            this.matrixSvg.style.boxShadow = `rgba(255, 255, 255, 0.3) 0 0 0 ${4 * workspace.getAbsoluteScale()}px`;
            this.matrixSvg.style.transition = "box-shadow 0.25s"
            this.matrixSvg.style.borderRadius = `${4 * workspace.getAbsoluteScale()}px`

            // Initialize the matrix that holds the state
            for (let i = 0; i < this.numMatrixCols; i++) {
                this.cellState.push([])
                for (let j = 0; j < this.numMatrixRows; j++) {
                    this.cellState[i].push(false);
                }
            }

            this.restoreStateFromString();

            this.createMatrixDisplay({
                cellWidth: FieldLedMatrix.CELL_WIDTH,
                cellHeight: FieldLedMatrix.CELL_WIDTH,
                cellLabel: localize("LED"),
                cellHorizontalMargin: FieldLedMatrix.CELL_HORIZONTAL_MARGIN,
                cellVerticalMargin: FieldLedMatrix.CELL_VERTICAL_MARGIN,
                cornerRadius: FieldLedMatrix.CELL_CORNER_RADIUS,
                cellFill: this.offColor,
                padLeft: this.getYAxisWidth(),
                scale: this.scale
            });

            this.updateValue();

            if (this.xAxisLabel !== LabelMode.None) {
                const y = this.scale * this.numMatrixRows * (FieldLedMatrix.CELL_WIDTH + FieldLedMatrix.CELL_VERTICAL_MARGIN) + FieldLedMatrix.CELL_VERTICAL_MARGIN * 2 + FieldLedMatrix.BOTTOM_MARGIN
                const xAxis = createSvgChild<SVGGElement>(this.matrixSvg, "g", { transform: `translate(${0} ${y})` });
                for (let i = 0; i < this.numMatrixCols; i++) {
                    const x = this.getYAxisWidth() + this.scale * i * (FieldLedMatrix.CELL_WIDTH + FieldLedMatrix.CELL_HORIZONTAL_MARGIN) + FieldLedMatrix.CELL_WIDTH / 2 + FieldLedMatrix.CELL_HORIZONTAL_MARGIN / 2;
                    const lbl = createSvgChild<SVGTextElement>(xAxis, "text", { x, class: "blocklyText" })
                    lbl.textContent = this.getLabel(i, this.xAxisLabel);
                }
            }

            if (this.yAxisLabel !== LabelMode.None) {
                const yAxis = createSvgChild<SVGGElement>(this.matrixSvg, "g", {});
                for (let i = 0; i < this.numMatrixRows; i++) {
                    const y = this.scale * i * (FieldLedMatrix.CELL_WIDTH + FieldLedMatrix.CELL_VERTICAL_MARGIN) + FieldLedMatrix.CELL_WIDTH / 2 + FieldLedMatrix.CELL_VERTICAL_MARGIN * 2;
                    const lbl = createSvgChild<SVGTextElement>(yAxis, "text", { x: 0, y, class: "blocklyText" })
                    lbl.textContent = this.getLabel(i, this.yAxisLabel);
                }
            }

            // Add rect so that different browsers interpret the matrixSvg clientBoundingRect
            // in the same way. Required for the widget div position.
            const rect = Blockly.utils.dom.createSvgElement('rect', {
                'x': 0,
                'y': 0,
                'fill': 'none',
                'width': this.size_.width,
                'height': this.size_.height,
            }, null) as SVGRectElement;
            this.matrixSvg.append(rect);

            this.fieldGroup_.classList.add("blocklyFieldLedMatrixGroup");
            this.fieldGroup_.append(this.matrixSvg);

            this.attachEventHandlersToMatrix();
        }
    }

    private getLabel(index: number, mode: LabelMode) {
        switch (mode) {
            case LabelMode.Letter:
                return String.fromCharCode(index + /*char code for A*/ 65);
            default:
                return (index + 1).toString();
        }
    }

    private dontHandleMouseEvent_ = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
    }

    private clearLedDragHandler = (ev: MouseEvent) => {
        const svgRoot = (this.sourceBlock_ as Blockly.BlockSvg).getSvgRoot();
        pointerEvents.down.forEach((evid: string) => svgRoot.removeEventListener(evid, this.dontHandleMouseEvent_));
        svgRoot.removeEventListener(pointerEvents.move, this.dontHandleMouseEvent_);
        document.removeEventListener(pointerEvents.up, this.clearLedDragHandler);
        document.removeEventListener(pointerEvents.leave, this.clearLedDragHandler);

        (Blockly as any).Touch.clearTouchIdentifier();

        this.matrixSvg.removeEventListener(pointerEvents.move, this.handleRootMouseMoveListener);

        ev.stopPropagation();
        ev.preventDefault();
    }

    public updateEditable() {
        let group = this.fieldGroup_;
        if (!this.EDITABLE || !group) {
            return;
        }

        if (this.sourceBlock_.isEditable()) {
            this.fieldGroup_.setAttribute("cursor", "pointer");
        } else {
            this.fieldGroup_.removeAttribute("cursor");
        }

        super.updateEditable();
    }

    protected attachPointerEventHandlersToCell(x: number, y: number, cellRect: SVGElement) {
        pointerEvents.down.forEach((evid: string) => cellRect.addEventListener(evid, (ev: MouseEvent) => {
            if (!this.sourceBlock_.isEditable()) return;

            const svgRoot = (this.sourceBlock_ as Blockly.BlockSvg).getSvgRoot();
            this.currentDragState_ = !this.cellState[x][y];

            // select and hide chaff
            Blockly.hideChaff();
            Blockly.common.setSelected(this.sourceBlock_ as Blockly.BlockSvg);

            this.toggleCell(x, y);
            pointerEvents.down.forEach((evid: string) => svgRoot.addEventListener(evid, this.dontHandleMouseEvent_));
            svgRoot.addEventListener(pointerEvents.move, this.dontHandleMouseEvent_);

            document.addEventListener(pointerEvents.up, this.clearLedDragHandler);
            document.addEventListener(pointerEvents.leave, this.clearLedDragHandler);

            // Begin listening on the canvas and toggle any matches
            this.matrixSvg.addEventListener(pointerEvents.move, this.handleRootMouseMoveListener);

            ev.stopPropagation();
            ev.preventDefault();
            this.returnEphemeralFocus();
        }, false));
    }

    protected toggleCell = (x: number, y: number, value?: boolean) => {
        this.cellState[x][y] = value ?? this.currentDragState_;
        this.updateValue();
    }

    private handleRootMouseMoveListener = (ev: MouseEvent) => {
        if (!this.sourceBlock_.isEditable()) return;

        let clientX;
        let clientY;
        if ((ev as any).changedTouches && (ev as any).changedTouches.length == 1) {
            // Handle touch events
            clientX = (ev as any).changedTouches[0].clientX;
            clientY = (ev as any).changedTouches[0].clientY;
        } else {
            // All other events (pointer + mouse)
            clientX = ev.clientX;
            clientY = ev.clientY;
        }
        const target = document.elementFromPoint(clientX, clientY);
        if (!target) return;
        const x = target.getAttribute('data-x');
        const y = target.getAttribute('data-y');
        if (x != null && y != null) {
            this.toggleCell(parseInt(x), parseInt(y));
        }
    }

    private getColor(x: number, y: number) {
        return this.cellState[x][y] ? this.onColor : (this.offColor || FieldLedMatrix.DEFAULT_OFF_COLOR);
    }

    private getOpacity(x: number, y: number) {
        const offOpacity = this.offColor ? '1.0' : '0.2';
        return this.cellState[x][y] ? '1.0' : offOpacity;
    }

    private updateCell(x: number, y: number) {
        const cellRect = this.cells[x][y];
        cellRect.setAttribute("fill", this.getColor(x, y));
        cellRect.setAttribute("fill-opacity", this.getOpacity(x, y));
        cellRect.setAttribute('class', `blocklyLed${this.cellState[x][y] ? 'On' : 'Off'}`);
        cellRect.setAttribute("aria-checked", this.cellState[x][y].toString());
    }

    setValue(newValue: string | number, restoreState = true) {
        const shouldFireChangeEvent = newValue !== this.value_;
        super.setValue(String(newValue), shouldFireChangeEvent);
        if (this.matrixSvg) {
            if (restoreState) this.restoreStateFromString();

            for (let x = 0; x < this.numMatrixCols; x++) {
                for (let y = 0; y < this.numMatrixRows; y++) {
                    this.updateCell(x, y);
                }
            }
        }
    }

    render_() {
        if (!this.visible_) {
            this.markDirty();
            return;
        }

        if (!this.matrixSvg) {
            this.initMatrix();
        }

    }

    // The return value of this function is inserted in the code
    getValue() {
        return removeQuotes(this.value_);
    }

    getFieldDescription(): string {
        return localize("{0}x{1} LED Grid", this.numMatrixCols, this.numMatrixRows);
    }

    // Restores the block state from the text value of the field
    private restoreStateFromString() {
        let r = this.value_ as string;
        if (r) {
            const rows = r.split("\n").filter(r => rowRegex.test(r));

            for (let y = 0; y < rows.length && y < this.numMatrixRows; y++) {
                let x = 0;
                const row = rows[y];

                for (let j = 0; j < row.length && x < this.numMatrixCols; j++) {
                    if (isNegativeCharacter(row[j])) {
                        this.cellState[x][y] = false;
                        x++;
                    }
                    else if (isPositiveCharacter(row[j])) {
                        this.cellState[x][y] = true;
                        x++;
                    }
                }
            }
        }
    }

    // Composes the state into a string an updates the field's state
    private updateValue() {
        let res = "";
        for (let y = 0; y < this.numMatrixRows; y++) {
            for (let x = 0; x < this.numMatrixCols; x++) {
                res += (this.cellState[x][y] ? "#" : ".") + " "
            }
            res += "\n" + FieldLedMatrix.TAB
        }

        // Blockly stores the state of the field as a string
        this.setValue(res, false);
    }

    private getYAxisWidth() {
        return this.yAxisLabel === LabelMode.None ? 0 : FieldLedMatrix.Y_AXIS_WIDTH;
    }

    private getXAxisHeight() {
        return this.xAxisLabel === LabelMode.None ? 0 : FieldLedMatrix.X_AXIS_HEIGHT;
    }
}

function isPositiveCharacter(c: string) {
    return c === "#" || c === "*" || c === "1";
}

function isNegativeCharacter(c: string) {
    return c === "." || c === "_" || c === "0";
}


const allQuotes = ["'", '"', "`"];

function removeQuotes(str: string) {
    str = (str || "").trim();
    const start = str.charAt(0);
    if (start === str.charAt(str.length - 1) && allQuotes.indexOf(start) !== -1) {
        return str.substr(1, str.length - 2).trim();
    }
    return str;
}

// Override the hover stroke which doesn't make sense here.
// Restate the keyboard nav stroke more specifically than the field hover override.
Blockly.Css.register(`
.pxt-renderer.classic-theme .blocklyDraggable:not(.blocklyDisabled) .blocklyFieldLedMatrixGroup.blocklyEditableField:not(.blocklyEditing):hover>rect {
    stroke: none;
}
.pxt-renderer.classic-theme .blocklyDraggable:not(.blocklyDisabled) .blocklyFieldLedMatrixGroup.blocklyActiveFocus.blocklyEditableField:not(.blocklyEditing):hover>rect {
    stroke: var(--blockly-active-node-color);
    stroke-width: var(--blockly-selection-width);
}
.pxt-renderer.classic-theme .blocklyDraggable:not(.blocklyDisabled) .blocklyFieldLedMatrixGroup.blocklyPassiveFocus.blocklyEditableField:not(.blocklyEditing):hover>rect {
    stroke: var(--blockly-active-node-color);
    stroke-dasharray: 5px 3px;
    stroke-width: var(--blockly-selection-width);
}
.blocklyFieldLedMatrixGroup > .blocklyFieldRect {
    fill: none !important;
}`);
