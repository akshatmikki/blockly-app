import * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

export const registerMicrobitBlocks = () => {
    // Basic Block Definitions
    Blockly.common.defineBlocksWithJsonArray([
        // BASIC
        {
            type: "device_show_number",
            message0: "show number %1",
            args0: [{ type: "input_value", name: "NUM", check: "Number" }],
            previousStatement: null, nextStatement: null, colour: "#1E90FF",
        },
        {
            type: "device_show_leds",
            message0: "show leds %1",
            args0: [{ type: "field_input", name: "MATRIX", text: "# # # # #\n# . . . #\n# . # . #\n# . . . #\n# # # # #" }],
            previousStatement: null, nextStatement: null, colour: "#1E90FF",
        },
        {
            type: "device_show_icon",
            message0: "show icon %1",
            args0: [{ type: "field_dropdown", name: "ICON", options: [["Heart", "Heart"], ["SmallHeart", "SmallHeart"], ["Yes", "Yes"], ["No", "No"]] }],
            previousStatement: null, nextStatement: null, colour: "#1E90FF",
        },
        {
            type: "device_show_string",
            message0: "show string %1",
            args0: [{ type: "input_value", name: "TEXT", check: "String" }],
            previousStatement: null, nextStatement: null, colour: "#1E90FF",
        },
        { type: "device_clear_screen", message0: "clear screen", previousStatement: null, nextStatement: null, colour: "#1E90FF" },
        { type: "device_forever", message0: "forever %1 %2", args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }], colour: "#1E90FF" },
        { type: "device_on_start", message0: "on start %1 %2", args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }], colour: "#1E90FF" },
        { type: "device_pause", message0: "pause (ms) %1", args0: [{ type: "input_value", name: "time", check: "Number" }], previousStatement: null, nextStatement: null, colour: "#1E90FF" },

        // INPUT
        {
            type: "input_on_button_pressed",
            message0: "on button %1 pressed %2 %3",
            args0: [{ type: "field_dropdown", name: "BTN", options: [["A", "A"], ["B", "B"], ["A+B", "AB"]] }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }],
            colour: "#D400D4",
        },
        {
            type: "input_on_gesture",
            message0: "on gesture %1 %2 %3",
            args0: [{ type: "field_dropdown", name: "GESTURE", options: [["shake", "SHAKE"], ["logo up", "LOGO_UP"], ["logo down", "LOGO_DOWN"]] }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }],
            colour: "#D400D4",
        },
        { type: "input_button_is_pressed", message0: "button %1 is pressed", args0: [{ type: "field_dropdown", name: "BTN", options: [["A", "A"], ["B", "B"]] }], output: "Boolean", colour: "#D400D4" },

        // LOOPS
        { type: "loops_every_interval", message0: "every %1 ms %2 %3", args0: [{ type: "input_value", name: "TIME", check: "Number" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], colour: "#00AA00" },

        // RADIO
        { type: "radio_set_group", message0: "radio set group %1", args0: [{ type: "input_value", name: "GROUP", check: "Number" }], previousStatement: null, nextStatement: null, colour: "#E3008C" },
        { type: "radio_send_number", message0: "radio send number %1", args0: [{ type: "input_value", name: "NUM", check: "Number" }], previousStatement: null, nextStatement: null, colour: "#E3008C" },
        { type: "radio_send_string", message0: "radio send string %1", args0: [{ type: "input_value", name: "TEXT", check: "String" }], previousStatement: null, nextStatement: null, colour: "#E3008C" },

        // ADVANCED - GAME
        { type: "game_create_sprite", message0: "create sprite at x %1 y %2", args0: [{ type: "input_value", name: "X", check: "Number" }, { type: "input_value", name: "Y", check: "Number" }], output: "Sprite", colour: "#059669" },
        { type: "game_sprite_move_by", message0: "sprite move by %1", args0: [{ type: "input_value", name: "NUM", check: "Number" }], previousStatement: null, nextStatement: null, colour: "#059669" },

        // ADVANCED - PINS
        { type: "pins_digital_read_pin", message0: "digital read pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], output: "Number", colour: "#b91c1c" },
        { type: "pins_digital_write_pin", message0: "digital write pin %1 to %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "VALUE", check: "Number" }], previousStatement: null, nextStatement: null, colour: "#b91c1c" },
    ]);

    // Simple JavaScript Generators
    const asAny = javascriptGenerator as any;
    asAny.forBlock['device_show_number'] = (block: any, generator: any) => {
        const num = generator.valueToCode(block, 'NUM', Order.ATOMIC) || '0';
        return `microbit.showNumber(${num});\n`;
    };
    asAny.forBlock['device_show_string'] = (block: any, generator: any) => {
        const text = generator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
        return `microbit.showString(${text});\n`;
    };
    asAny.forBlock['device_clear_screen'] = () => `microbit.clearScreen();\n`;
    asAny.forBlock['device_pause'] = (block: any, generator: any) => {
        const time = generator.valueToCode(block, 'time', Order.ATOMIC) || '100';
        return `microbit.pause(${time});\n`;
    };
    asAny.forBlock['device_on_start'] = (block: any, generator: any) => {
        const branch = generator.statementToCode(block, 'DO');
        return `// on start\n${branch}`;
    };
    asAny.forBlock['device_forever'] = (block: any, generator: any) => {
        const branch = generator.statementToCode(block, 'DO');
        return `while(true) {\n${branch}  await microbit.pause(10);\n}\n`;
    };
};

export const microbitToolbox = {
    kind: "categoryToolbox",
    contents: [
        {
            kind: "category",
            name: "Basic",
            colour: "#1E90FF",
            contents: [
                { kind: "block", type: "device_show_number", inputs: { NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } } } },
                { kind: "block", type: "device_show_leds" },
                { kind: "block", type: "device_show_icon" },
                { kind: "block", type: "device_show_string", inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "Hello!" } } } } },
                { kind: "block", type: "device_clear_screen" },
                { kind: "block", type: "device_forever" },
                { kind: "block", type: "device_on_start" },
                { kind: "block", type: "device_pause", inputs: { time: { shadow: { type: "math_number", fields: { NUM: 100 } } } } },
            ]
        },
        {
            kind: "category",
            name: "Input",
            colour: "#D400D4",
            contents: [
                { kind: "block", type: "input_on_button_pressed" },
                { kind: "block", type: "input_on_gesture" },
                { kind: "block", type: "input_button_is_pressed" },
            ]
        },
        { kind: "category", name: "Music", colour: "#E25822", contents: [] },
        {
            kind: "category",
            name: "Loops",
            colour: "#00AA00",
            contents: [
                { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 4 } } } } },
                { kind: "block", type: "controls_whileUntil" },
                { kind: "block", type: "loops_every_interval", inputs: { TIME: { shadow: { type: "math_number", fields: { NUM: 500 } } } } },
            ]
        },
        {
            kind: "category",
            name: "Logic",
            colour: "#00AAAA",
            contents: [
                { kind: "block", type: "controls_if" },
                { kind: "block", type: "logic_compare" },
                { kind: "block", type: "logic_operation" },
                { kind: "block", type: "logic_negate" },
                { kind: "block", type: "logic_boolean" },
            ]
        },
        { kind: "category", name: "Variables", custom: "VARIABLE", colour: "#DC143C" },
        {
            kind: "category",
            name: "Math",
            colour: "#9400D3",
            contents: [
                { kind: "block", type: "math_arithmetic" },
                { kind: "block", type: "math_number" },
                { kind: "block", type: "math_random_int", inputs: { FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } }, TO: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
            ]
        },
        { kind: "sep" },
        {
            kind: "category",
            name: "Radio",
            colour: "#E3008C",
            contents: [
                { kind: "block", type: "radio_set_group", inputs: { GROUP: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
                { kind: "block", type: "radio_send_number" },
                { kind: "block", type: "radio_send_string" },
            ]
        },
        {
            kind: "category",
            name: "Advanced",
            colour: "#374151",
            contents: [
                { 
                    kind: "category", name: "Functions", colour: "#3b82f6", 
                    contents: [{ kind: "button", text: "Make a Function...", callbackKey: "MAKE_FUNCTION" }] 
                },
                { 
                    kind: "category", name: "Arrays", colour: "#f97316", 
                    contents: [{ kind: "block", type: "lists_create_empty" }] 
                },
                { 
                    kind: "category", name: "Text", colour: "#ca8a04", 
                    contents: [{ kind: "block", type: "text" }, { kind: "block", type: "text_join" }] 
                },
                { 
                    kind: "category", name: "Game", colour: "#059669", 
                    contents: [{ kind: "block", type: "game_create_sprite" }, { kind: "block", type: "game_sprite_move_by" }] 
                },
                { 
                    kind: "category", name: "Pins", colour: "#b91c1c", 
                    contents: [{ kind: "block", type: "pins_digital_read_pin" }, { kind: "block", type: "pins_digital_write_pin" }] 
                },
                { kind: "category", name: "Serial", colour: "#1d4ed8", contents: [] },
                { kind: "category", name: "Control", colour: "#374151", contents: [] },
            ]
        }
    ]
};
