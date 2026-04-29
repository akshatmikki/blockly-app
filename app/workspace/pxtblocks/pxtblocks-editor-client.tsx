"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import * as Blockly from "blockly/core";
import "blockly/blocks";
import "blockly/msg/en";

// Set explicit translations for builtin blocks to avoid raw message keys in toolbox
const msg = (Blockly as any).Msg;
msg.CONTROLS_IF_MSG_IF = "if";
msg.CONTROLS_IF_MSG_THEN = "then";
msg.CONTROLS_IF_MSG_ELSE = "else";
msg.CONTROLS_IF_MSG_ELSEIF = "else if";
msg.LOGIC_BOOLEAN_TRUE = "true";
msg.LOGIC_BOOLEAN_FALSE = "false";
msg.LOGIC_NEGATE_TITLE = "not %1";
msg.LOGIC_OPERATION_AND = "and";
msg.LOGIC_OPERATION_OR = "or";
import { javascriptGenerator, Order } from "blockly/javascript";
import { Search, Code, Info } from "lucide-react";

import "./index"; // Force block evaluation in the correct PXT order to avoid circular dependencies

import PxtSimulatorPane from "./pxt-simulator-pane";
import { FunctionEditor } from "./components/FunctionEditor";
import { FieldLedMatrix } from "./fields/field_ledmatrix";
import { FunctionManager } from "./plugins/functions/functionManager";
import { setDuplicateOnDrag } from "./plugins/duplicateOnDrag";

const toolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Basic",
      colour: "#1E90FF",
      contents: [
        {
          kind: "block",
          type: "device_show_number",
          inputs: {
            NUM: {
              shadow: { type: "math_number", fields: { NUM: 0 } }
            }
          }
        },
        { kind: "block", type: "device_show_leds" },
        { kind: "block", type: "device_show_icon", fields: { ICON: "Heart" } },
        {
          kind: "block",
          type: "device_show_string",
          inputs: {
            TEXT: {
              shadow: { type: "text", fields: { TEXT: "Hello!" } }
            }
          }
        },
        { kind: "block", type: "device_clear_screen" },
        { kind: "block", type: "device_forever" },
        { kind: "block", type: "device_on_start" },
        {
          kind: "block",
          type: "device_pause",
          inputs: {
            time: {
              shadow: { type: "math_number", fields: { NUM: 100 } }
            }
          }
        },
        { kind: "block", type: "device_show_arrow", fields: { ARROW: "North" } }
      ]
    },
    {
      kind: "category",
      name: "Input",
      colour: "#D400D4",
      contents: [
        { kind: "block", type: "input_on_button_pressed" },
        { kind: "block", type: "input_on_gesture" },
        { kind: "block", type: "input_on_pin_pressed" },
        { kind: "block", type: "input_button_is_pressed" },
        { kind: "block", type: "input_acceleration" },
        { kind: "block", type: "input_pin_is_pressed" },
        { kind: "block", type: "input_light_level" },
        { kind: "block", type: "input_compass_heading" },
        { kind: "block", type: "input_temperature" },
        {
          kind: "category",
          name: "more",
          colour: "#b400d6",
          contents: [
            { kind: "block", type: "input_is_gesture" },
            { kind: "block", type: "input_compass_calibrate" },
            { kind: "block", type: "device_get_magnetic_force" },
            { kind: "block", type: "device_get_rotation" },
            { kind: "block", type: "device_get_running_time" },
            { kind: "block", type: "device_get_running_time_micros" },
            { kind: "block", type: "input_on_pin_released" },
            { kind: "block", type: "device_set_accelerometer_range" },
            {
              kind: "block",
              type: "input_set_sound_threshold",
              inputs: {
                value: {
                  shadow: { type: "math_number", fields: { NUM: 128 } }
                }
              }
            }
          ]
        },
        { kind: "sep", gap: "12" },
        { kind: "label", text: "micro:bit (V2)" },
        { kind: "sep", gap: "8" },
        { kind: "block", type: "input_on_sound" },
        { kind: "block", type: "input_on_logo_event" },
        { kind: "block", type: "input_logo_is_pressed" },
        { kind: "block", type: "input_sound_level" }
      ]
    },
    {
      kind: "category",
      name: "Music",
      colour: "#E25822",
      contents: [
        { kind: "label", text: "Melody" },
        { kind: "block", type: "music_play_melody" },
        { kind: "sep", gap: "8" },
        { kind: "label", text: "Tone" },
        { kind: "block", type: "music_play_tone_note_beats" },
        { kind: "block", type: "music_ringtone_play" },
        { kind: "block", type: "music_rest_beat" },
        { kind: "block", type: "music_note_value" },
        { kind: "sep", gap: "8" },
        { kind: "label", text: "Volume" },
        { kind: "block", type: "music_set_volume" },
        { kind: "block", type: "music_get_volume" },
        { kind: "block", type: "music_stop_all_sounds" },
        { kind: "sep", gap: "8" },
        { kind: "label", text: "Tempo" },
        { kind: "block", type: "music_change_tempo" },
        { kind: "block", type: "music_set_tempo" },
        { kind: "block", type: "music_beat_value" },
        { kind: "block", type: "music_get_tempo" },
        { kind: "sep", gap: "8" },
        { kind: "label", text: "Melody Advanced" },
        { kind: "block", type: "music_play_melody_advanced" },
        { kind: "block", type: "music_stop_melody" },
        { kind: "block", type: "music_on_melody_note_played" },
        { kind: "sep", gap: "8" },
        { kind: "label", text: "micro:bit (V2)" },
        { kind: "block", type: "music_play_giggle" },
        { kind: "block", type: "music_play_sound_effect" },
        { kind: "block", type: "music_create_sound_effect" },
        { kind: "block", type: "music_sound_is_playing" },
        { kind: "sep", gap: "8" },
        { kind: "label", text: "Simple" },
        { kind: "block", type: "music_play_tone" }
      ]
    },
    {
      kind: "category",
      name: "LED",
      colour: "#5C2D91",
      contents: [
        {
          kind: "block",
          type: "led_plot",
          inputs: {
            X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "led_unplot",
          inputs: {
            X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "led_toggle",
          inputs: {
            X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "led_point",
          inputs: {
            X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "led_plot_bar_graph",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            HIGH: { shadow: { type: "math_number", fields: { NUM: 1023 } } }
          }
        },
        {
          kind: "category",
          name: "more",
          colour: "#5e35b1",
          contents: [
            {
              kind: "block",
              type: "led_plot_brightness",
              inputs: {
                X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
                Y: { shadow: { type: "math_number", fields: { NUM: 0 } } },
                BRIGHTNESS: { shadow: { type: "math_number", fields: { NUM: 255 } } }
              }
            },
            {
              kind: "block",
              type: "led_point_brightness",
              inputs: {
                X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
                Y: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            { kind: "block", type: "led_brightness" },
            {
              kind: "block",
              type: "led_set_brightness",
              inputs: {
                VALUE: { shadow: { type: "math_number", fields: { NUM: 255 } } }
              }
            },
            {
              kind: "block",
              type: "led_enable",
              fields: { ON: "false" }
            },
            { kind: "block", type: "led_stop_animation" },
            { kind: "block", type: "led_set_display_mode" }
          ]
        }
      ]
    },
    {
      kind: "category",
      name: "Radio",
      colour: "#E3008C",
      contents: [
        { kind: "label", text: "Group" },
        { kind: "sep", gap: "8" },
        {
          kind: "block",
          type: "radio_set_group",
          inputs: {
            GROUP: { shadow: { type: "math_number", fields: { NUM: 1 } } }
          }
        },
        { kind: "label", text: "Broadcast" },
        { kind: "sep", gap: "8" },
        {
          kind: "block",
          type: "radio_broadcast_message",
          inputs: {
            msg: { shadow: { type: "radio_message_code", fields: { message: "message1" } } }
          }
        },
        {
          kind: "block",
          type: "radio_on_message_received",
          inputs: {
            msg: { shadow: { type: "radio_message_code", fields: { message: "message1" } } }
          }
        },
        { kind: "label", text: "Send" },
        { kind: "sep", gap: "8" },
        {
          kind: "block",
          type: "radio_send_number",
          inputs: {
            NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "radio_send_value",
          inputs: {
            NAME: { shadow: { type: "text", fields: { TEXT: "name" } } },
            VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "radio_send_string",
          inputs: {
            TEXT: { shadow: { type: "text", fields: { TEXT: "" } } }
          }
        },
        { kind: "label", text: "Receive" },
        { kind: "sep", gap: "8" },
        {
          kind: "block",
          type: "radio_on_received_number",
          inputs: {
            receivedNumber: {
              block: {
                type: "argument_reporter_number",
                fields: { VALUE: "receivedNumber" }
              }
            }
          }
        },
        {
          kind: "block",
          type: "radio_on_received_value",
          inputs: {
            name: {
              block: {
                type: "argument_reporter_string",
                fields: { VALUE: "name" }
              }
            },
            value: {
              block: {
                type: "argument_reporter_number",
                fields: { VALUE: "value" }
              }
            }
          }
        },
        {
          kind: "block",
          type: "radio_on_received_string",
          inputs: {
            receivedString: {
              block: {
                type: "argument_reporter_string",
                fields: { VALUE: "receivedString" }
              }
            }
          }
        },
        {
          kind: "block",
          type: "radio_received_packet",
          fields: { TYPE: "SignalStrength" }
        },
        {
          kind: "category",
          name: "more",
          colour: "#d81b60",
          contents: [
            {
              kind: "block",
              type: "radio_set_transmit_power",
              inputs: {
                POWER: { shadow: { type: "math_number", fields: { NUM: 7 } } }
              }
            },
            {
              kind: "block",
              type: "radio_set_transmit_serial_number",
              fields: { TRANSMIT: "true" }
            },
            {
              kind: "block",
              type: "radio_set_frequency_band",
              inputs: {
                BAND: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "radio_raise_event",
              fields: {
                SRC: "1",
                VALUE: "0"
              }
            }
          ]
        }
      ]
    },
    { kind: "sep" },
    {
      kind: "category",
      name: "Loops",
      colour: "#00AA00",
      contents: [
        {
          kind: "block",
          type: "controls_repeat_ext",
          inputs: {
            TIMES: { shadow: { type: "math_number", fields: { NUM: 4 } } }
          }
        },
        {
          kind: "block",
          type: "controls_whileUntil",
          fields: { MODE: "WHILE" },
          inputs: {
            BOOL: { shadow: { type: "logic_boolean", fields: { BOOL: "FALSE" } } }
          }
        },
        {
          kind: "block",
          type: "controls_for",
          inputs: {
            FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            TO: { shadow: { type: "math_number", fields: { NUM: 4 } } },
            BY: { shadow: { type: "math_number", fields: { NUM: 1 } } }
          }
        },
        {
          kind: "block",
          type: "controls_forEach",
          inputs: {
            LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
          }
        },
        {
          kind: "block",
          type: "loops_every_interval",
          inputs: {
            TIME: { shadow: { type: "math_number", fields: { NUM: 500 } } }
          }
        },
        { kind: "block", type: "loops_break" },
        { kind: "block", type: "loops_continue" }
      ]
    },
    {
      kind: "category",
      name: "Logic",
      colour: "#00AAAA",
      contents: [
        { kind: "label", text: "Conditionals" },
        {
          kind: "block",
          type: "controls_if",
          inputs: {
            IF0: { shadow: { type: "logic_boolean", fields: { BOOL: "TRUE" } } }
          }
        },
        {
          kind: "block",
          type: "controls_if",
          extraState: { hasElse: true },
          inputs: {
            IF0: { shadow: { type: "logic_boolean", fields: { BOOL: "TRUE" } } }
          }
        },
        { kind: "label", text: "Comparison" },
        {
          kind: "block",
          type: "logic_compare",
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "logic_compare",
          fields: { OP: "LT" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "logic_compare",
          fields: { OP: "EQ" },
          inputs: {
            A: { shadow: { type: "text", fields: { TEXT: "" } } },
            B: { shadow: { type: "text", fields: { TEXT: "" } } }
          }
        },
        { kind: "label", text: "Boolean" },
        { kind: "block", type: "logic_operation", fields: { OP: "AND" } },
        { kind: "block", type: "logic_operation", fields: { OP: "OR" } },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean", fields: { BOOL: "TRUE" } },
        { kind: "block", type: "logic_boolean", fields: { BOOL: "FALSE" } },
      ]
    },
    {
      kind: "category",
      name: "Variables",
      custom: "VARIABLE",
      colour: "#DC143C"
    },
    {
      kind: "category",
      name: "Math",
      colour: "#9400D3",
      contents: [
        {
          kind: "block",
          type: "math_arithmetic",
          fields: { OP: "ADD" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_arithmetic",
          fields: { OP: "MINUS" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_arithmetic",
          fields: { OP: "MULTIPLY" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_arithmetic",
          fields: { OP: "DIVIDE" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        { kind: "block", type: "math_number", fields: { NUM: 0 } },
        {
          kind: "block",
          type: "math_modulo",
          inputs: {
            DIVIDEND: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            DIVISOR: { shadow: { type: "math_number", fields: { NUM: 1 } } }
          }
        },
        {
          kind: "block",
          type: "math_op2",
          fields: { OP: "min" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_op2",
          fields: { OP: "max" },
          inputs: {
            A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_single",
          fields: { OP: "ABS" },
          inputs: {
            NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_single",
          fields: { OP: "ROOT" },
          inputs: {
            NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_js_round",
          inputs: {
            ARG0: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_random_int",
          inputs: {
            FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            TO: { shadow: { type: "math_number", fields: { NUM: 10 } } }
          }
        },
        {
          kind: "block",
          type: "math_constrain",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            LOW: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            HIGH: { shadow: { type: "math_number", fields: { NUM: 0 } } }
          }
        },
        {
          kind: "block",
          type: "math_map_value",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            FROM_LOW: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            FROM_HIGH: { shadow: { type: "math_number", fields: { NUM: 1023 } } },
            TO_LOW: { shadow: { type: "math_number", fields: { NUM: 0 } } },
            TO_HIGH: { shadow: { type: "math_number", fields: { NUM: 4 } } }
          }
        },
        { kind: "block", type: "math_random_bool" },
        { kind: "block", type: "math_constant", fields: { CONSTANT: "PI" } }
      ]
    },
    {
      kind: "category",
      name: "Advanced",
      colour: "#374151",
      contents: [
        {
          kind: "category",
          name: "Functions",
          colour: "#3b82f6",
          contents: [
            { kind: "button", text: "Make a Function...", callbackKey: "MAKE_FUNCTION" }
          ]
        },
        {
          kind: "category",
          name: "Arrays",
          colour: "#f97316",
          contents: [
            { kind: "label", text: "Create" },
            {
              kind: "block",
              type: "variables_set",
              fields: { VAR: "list" },
              inputs: {
                VALUE: { shadow: { type: "lists_create_with", extraState: { itemCount: 2 } } }
              }
            },
            {
              kind: "block",
              type: "variables_set",
              fields: { VAR: "text list" },
              inputs: {
                VALUE: { shadow: { type: "lists_create_with", extraState: { itemCount: 3 } } }
              }
            },
            { kind: "block", type: "lists_create_empty" },
            { kind: "sep", gap: "8" },
            { kind: "label", text: "Read" },
            { kind: "block", type: "lists_length" },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "GET", WHERE: "FROM_START" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
                AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "GET_REMOVE", WHERE: "FROM_START" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
                AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "GET_REMOVE", WHERE: "LAST" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "GET_REMOVE", WHERE: "FIRST" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "GET", WHERE: "RANDOM" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            { kind: "sep", gap: "8" },
            { kind: "label", text: "Modify" },
            {
              kind: "block",
              type: "lists_setIndex",
              fields: { MODE: "SET", WHERE: "FROM_START" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
                AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "lists_setIndex",
              fields: { MODE: "INSERT", WHERE: "LAST" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "REMOVE", WHERE: "LAST" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "REMOVE", WHERE: "FIRST" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_setIndex",
              fields: { MODE: "INSERT", WHERE: "FIRST" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_setIndex",
              fields: { MODE: "INSERT", WHERE: "FROM_START" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
                AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "lists_getIndex",
              fields: { MODE: "REMOVE", WHERE: "FROM_START" },
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
                AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            { kind: "sep", gap: "8" },
            { kind: "label", text: "Operations" },
            {
              kind: "block",
              type: "lists_indexOf",
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            },
            {
              kind: "block",
              type: "lists_reverse",
              inputs: {
                LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
              }
            }
          ]
        },
        {
          kind: "category",
          name: "Text",
          colour: "#ca8a04",
          contents: [
            { kind: "block", type: "text", fields: { TEXT: "" } },
            {
              kind: "block",
              type: "text_length",
              inputs: {
                VALUE: { shadow: { type: "text", fields: { TEXT: "Hello" } } }
              }
            },
            {
              kind: "block",
              type: "text_join",
              extraState: { itemCount: 2 },
              inputs: {
                ADD0: { shadow: { type: "text", fields: { TEXT: "Hello" } } },
                ADD1: { shadow: { type: "text", fields: { TEXT: "World" } } }
              }
            },
            {
              kind: "block",
              type: "text_parse_to_number",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "123" } } }
              }
            },
            {
              kind: "block",
              type: "text_split_with",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "this" } } },
                SEP: { shadow: { type: "text", fields: { TEXT: " " } } }
              }
            },
            {
              kind: "block",
              type: "text_includes",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "this" } } },
                FIND: { shadow: { type: "text", fields: { TEXT: " " } } }
              }
            },
            {
              kind: "block",
              type: "text_indexOf",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "this" } } },
                SEARCH: { shadow: { type: "text", fields: { TEXT: " " } } }
              }
            },
            {
              kind: "block",
              type: "text_isEmpty",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "this" } } }
              }
            },
            {
              kind: "block",
              type: "text_substring_length",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "this" } } },
                FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } },
                LEN: { shadow: { type: "math_number", fields: { NUM: 10 } } }
              }
            },
            {
              kind: "block",
              type: "text_compare_to",
              inputs: {
                A: { shadow: { type: "text", fields: { TEXT: "this" } } },
                B: { shadow: { type: "text", fields: { TEXT: "" } } }
              }
            },
            {
              kind: "block",
              type: "text_charAt",
              inputs: {
                VALUE: { shadow: { type: "text", fields: { TEXT: "this" } } },
                INDEX: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "text_char_code_at",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "this" } } },
                INDEX: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "text_convert_number_to_text",
              inputs: {
                NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "text_from_char_code",
              inputs: {
                CODE: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            }
          ]
        },
        {
          kind: "category",
          name: "Game",
          colour: "#059669",
          contents: [
            { kind: "block", type: "game_create_sprite" },
            { kind: "block", type: "game_delete_sprite" },
            { kind: "block", type: "game_sprite_is_deleted" },
            { kind: "block", type: "game_sprite_move_by" },
            { kind: "block", type: "game_sprite_turn_by" },
            { kind: "block", type: "game_sprite_change_x_by" },
            { kind: "block", type: "game_sprite_set_x_to" },
            { kind: "block", type: "game_sprite_x" },
            { kind: "block", type: "game_sprite_is_touching" },
            { kind: "block", type: "game_sprite_is_touching_edge" },
            { kind: "block", type: "game_sprite_if_on_edge_bounce" },
            { kind: "block", type: "game_remove_life" },
            { kind: "block", type: "game_add_life" },
            { kind: "block", type: "game_set_life" },
            { kind: "block", type: "game_set_score" },
            { kind: "block", type: "game_change_score_by" },
            { kind: "block", type: "game_start_countdown" },
            { kind: "block", type: "game_score" },
            { kind: "block", type: "game_over" },
            { kind: "block", type: "game_is_over" },
            { kind: "block", type: "game_is_paused" },
            { kind: "block", type: "game_is_running" },
            {
              kind: "category",
              name: "more",
              colour: "#059669",
              contents: [
                { kind: "block", type: "game_resume" },
                { kind: "block", type: "game_pause" }
              ]
            }
          ]
        },
        {
          kind: "category",
          name: "Images",
          colour: "#7e22ce",
          contents: [
            {
              kind: "block",
              type: "images_show_image_offset",
              inputs: {
                IMG: { shadow: { type: "variables_get", fields: { VAR: "myImage" } } },
                OFFSET: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "images_scroll_image",
              inputs: {
                IMG: { shadow: { type: "variables_get", fields: { VAR: "myImage" } } },
                OFFSET: { shadow: { type: "math_number", fields: { NUM: 1 } } },
                INTERVAL: { shadow: { type: "math_number", fields: { NUM: 200 } } }
              }
            },
            { kind: "block", type: "images_create_image" },
            { kind: "block", type: "images_create_big_image" },
            { kind: "block", type: "images_direction" },
            { kind: "block", type: "images_icon_image" },
            { kind: "block", type: "images_arrow_image" }
          ]
        },
        {
          kind: "category",
          name: "Pins",
          colour: "#b91c1c",
          contents: [
            { kind: "block", type: "pins_digital_read_pin" },
            { kind: "block", type: "pins_digital_write_pin" },
            { kind: "block", type: "pins_analog_read_pin" },
            { kind: "block", type: "pins_analog_write_pin" },
            { kind: "block", type: "pins_map" },
            { kind: "block", type: "pins_analog_set_period_pin" },
            { kind: "block", type: "pins_set_audio_pin" },
            { kind: "block", type: "pins_set_audio_pin_enabled" },
            { kind: "label", text: "Servo" },
            { kind: "block", type: "pins_servo_write_pin" },
            { kind: "block", type: "pins_servo_set_pulse" }
          ]
        },
        {
          kind: "category",
          name: "more",
          colour: "#b91c1c",
          contents: [
            { kind: "block", type: "pins_digital_pin", fields: { PIN: "P0" } },
            { kind: "block", type: "pins_analog_pin", fields: { PIN: "P0" } },
            {
              kind: "block",
              type: "pins_set_pull",
              fields: { PIN: "P0", PULL: "UP" }
            },
            {
              kind: "block",
              type: "pins_analog_pitch",
              inputs: {
                freq: { shadow: { type: "math_number", fields: { NUM: 440 } } },
                ms: { shadow: { type: "math_number", fields: { NUM: 100 } } }
              }
            },
            {
              kind: "block",
              type: "pins_set_pin_events",
              fields: { PIN: "P0", EDGE: "Edge.None" }
            },
            { kind: "block", type: "pins_analog_set_pitch_pin", fields: { PIN: "P0" } },
            {
              kind: "block",
              type: "pins_neopixel_matrix_width",
              fields: { PIN: "P0" },
              inputs: {
                width: { shadow: { type: "math_number", fields: { NUM: 5 } } }
              }
            },
            { kind: "label", text: "Pulse" },
            { kind: "block", type: "pins_on_pulsed", fields: { PIN: "P0", PULSE: "PulseValue.High" } },
            { kind: "block", type: "pins_pulse_duration" },
            {
              kind: "block",
              type: "pins_pulse_in",
              fields: { PIN: "P0", PULSE: "PulseValue.High" }
            },
            { kind: "label", text: "I2C" },
            {
              kind: "block",
              type: "pins_i2c_read_number",
              inputs: {
                address: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              },
              fields: { format: "NumberFormat.Int8LE", repeated: "false" }
            },
            {
              kind: "block",
              type: "pins_i2c_write_number",
              inputs: {
                address: { shadow: { type: "math_number", fields: { NUM: 0 } } },
                value: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              },
              fields: { format: "NumberFormat.Int8LE", repeated: "false" }
            },
            { kind: "label", text: "SPI" },
            {
              kind: "block",
              type: "pins_spi_frequency",
              inputs: {
                frequency: { shadow: { type: "math_number", fields: { NUM: 1000000 } } }
              }
            },
            {
              kind: "block",
              type: "pins_spi_format",
              inputs: {
                bits: { shadow: { type: "math_number", fields: { NUM: 8 } } },
                mode: { shadow: { type: "math_number", fields: { NUM: 3 } } }
              }
            },
            {
              kind: "block",
              type: "pins_spi_write",
              inputs: {
                value: { shadow: { type: "math_number", fields: { NUM: 0 } } }
              }
            },
            {
              kind: "block",
              type: "pins_spi_set_pins",
              fields: { MOSI: "P0", MISO: "P0", SCK: "P0" }
            },
            { kind: "label", text: "micro:bit (V2)" },
            {
              kind: "block",
              type: "pins_set_touch_mode",
              fields: { PIN: "P0", MODE: "TouchMode.Capacitive" }
            }
          ]
        },
        {
          kind: "category",
          name: "Serial",
          colour: "#1d4ed8",
          contents: [
            { kind: "block", type: "serial_write_line" },
            { kind: "block", type: "serial_write_number" },
            { kind: "block", type: "serial_write_value_pair" },
            { kind: "block", type: "serial_write_string" },
            { kind: "block", type: "serial_write_numbers" },
            { kind: "block", type: "serial_read_line" },
            { kind: "block", type: "serial_read_until" },
            { kind: "block", type: "serial_on_data_received" },
            { kind: "block", type: "serial_read_string" },
            { kind: "block", type: "serial_redirect_to" },
            { kind: "block", type: "serial_redirect_to_usb" }
          ]
        },
        {
          kind: "category",
          name: "more",
          colour: "#1d4ed8",
          contents: [
            { kind: "block", type: "serial_set_tx_buffer_size" },
            { kind: "block", type: "serial_set_rx_buffer_size" },
            { kind: "block", type: "serial_write_buffer" },
            { kind: "block", type: "serial_read_buffer" },
            { kind: "block", type: "serial_set_write_line_padding" },
            { kind: "label", text: "Configuration" },
            { kind: "block", type: "serial_set_baud_rate" }
          ]
        },
        {
          kind: "category",
          name: "Control",
          colour: "#374151",
          contents: [
            { kind: "block", type: "control_wait_for_event" },
            { kind: "block", type: "control_run_in_background" },
            { kind: "block", type: "control_millis" },
            { kind: "block", type: "control_reset" },
            { kind: "block", type: "control_wait_micros" },
            { kind: "block", type: "control_raise_event" },
            { kind: "block", type: "control_on_event" },
            { kind: "block", type: "control_event_timestamp" },
            { kind: "block", type: "control_event_value" }
          ]
        },
        {
          kind: "category",
          name: "more",
          colour: "#374151",
          contents: [
            { kind: "block", type: "control_run_in_background" },
            { kind: "block", type: "control_event_value_id", fields: { VAL: "MICROBIT_EVT_ANY" } },
            { kind: "block", type: "control_event_source_id", fields: { SRC: "MICROBIT_ID_BUTTON_A" } },
            { kind: "block", type: "control_device_name" },
            { kind: "block", type: "control_device_serial_number" }
          ]
        }
      ]
    }
  ]
};

const pythonBasicContents = [
  {
    kind: "block",
    type: "device_show_number",
    inputs: {
      NUM: {
        shadow: { type: "math_number", fields: { NUM: 0 } }
      }
    }
  },
  { kind: "label", text: "Scroll a number on the screen." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "device_show_leds" },
  { kind: "label", text: "Draws an image on the LED screen." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "device_show_icon" },
  { kind: "label", text: "Draws the selected icon on the LED screen." },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "device_show_string",
    inputs: {
      TEXT: {
        shadow: { type: "text", fields: { TEXT: "Hello!" } }
      }
    }
  },
  { kind: "label", text: "Display text on the display." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "device_clear_screen" },
  { kind: "label", text: "Turn off all LEDs." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "device_on_start" },
  { kind: "label", text: "Runs once when program starts." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "device_forever" },
  { kind: "label", text: "Repeats the code forever in the background." },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "device_pause",
    inputs: {
      time: {
        shadow: { type: "math_number", fields: { NUM: 100 } }
      }
    }
  },
  { kind: "label", text: "Pause for the specified time in milliseconds." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "device_show_arrow" },
  { kind: "label", text: "Draws an arrow on the LED screen." }
];

const pythonInputContents = [
  { kind: "block", type: "input_on_button_pressed" },
  { kind: "label", text: "Do something when a button (A, B or A+B) is pressed." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_on_gesture" },
  { kind: "label", text: "Do something when a gesture is done." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_on_pin_pressed" },
  { kind: "label", text: "Do something when a pin is touched and released." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_button_is_pressed" },
  { kind: "label", text: "Get the button state (pressed or not)." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_acceleration" },
  { kind: "label", text: "Get acceleration in milli-g's." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_pin_is_pressed" },
  { kind: "label", text: "Get pin touch state (pressed or not)." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_light_level" },
  { kind: "label", text: "Reads the light level from 0 to 255." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_compass_heading" },
  { kind: "label", text: "Gets the current compass heading in degrees." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_temperature" },
  { kind: "label", text: "Gets the temperature in degrees Celsius." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_is_gesture" },
  { kind: "label", text: "Tests if a gesture is currently detected." },
  { kind: "sep", gap: "10" },
  { kind: "label", text: "micro:bit (V2)" },
  { kind: "sep", gap: "4" },
  { kind: "block", type: "input_on_sound" },
  { kind: "label", text: "Run code when a sound is detected." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_on_logo_event" },
  { kind: "label", text: "Do something when the logo is touched and released." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_logo_is_pressed" },
  { kind: "label", text: "Gets the logo state (pressed or not)." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "input_sound_level" },
  { kind: "label", text: "Reads microphone loudness from 0 to 255." }
];

const pythonMusicContents = [
  { kind: "label", text: "Melody" },
  { kind: "block", type: "music_play_melody" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Tone" },
  { kind: "block", type: "music_play_tone_note_beats" },
  { kind: "block", type: "music_ringtone_play" },
  { kind: "block", type: "music_rest_beat" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Volume" },
  { kind: "block", type: "music_set_volume" },
  { kind: "block", type: "music_get_volume" },
  { kind: "block", type: "music_stop_all_sounds" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Tempo" },
  { kind: "block", type: "music_change_tempo" },
  { kind: "block", type: "music_set_tempo" },
  { kind: "block", type: "music_beat_value" },
  { kind: "block", type: "music_get_tempo" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Melody Advanced" },
  { kind: "block", type: "music_on_event" },
  { kind: "block", type: "music_play_melody_advanced" },
  { kind: "block", type: "music_stop_melody" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "micro:bit (V2)" },
  {
    kind: "block",
    type: "music_play_sound_effect",
    inputs: {
      EFFECT: {
        shadow: { type: "text", fields: { TEXT: "soundExpression.giggle" } }
      }
    }
  },
  { kind: "block", type: "music_create_sound_effect" },
  { kind: "block", type: "music_sound_is_playing" },
  { kind: "block", type: "music_set_built_in_speaker_enabled" },
  { kind: "block", type: "music_play_giggle" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Simple" },
  { kind: "block", type: "music_play_tone" }
];

const pythonLedContents = [
  { kind: "block", type: "led_plot" },
  {
    kind: "label",
    text: "Turn on the specified LED using x, y coordinates (x is horizontal, y is vertical). (0,0) is upper left."
  },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "led_toggle" },
  { kind: "label", text: "Toggles a particular pixel" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "led_unplot" },
  {
    kind: "label",
    text: "Turn off the specified LED using x, y coordinates (x is horizontal, y is vertical). (0,0) is upper left."
  },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "led_point" },
  {
    kind: "label",
    text: "Get the on/off state of the specified LED using x, y coordinates. (0,0) is upper left."
  },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "led_plot_bar_graph" },
  {
    kind: "label",
    text: "Displays a vertical bar graph based on the 'value' and 'high' value. If 'high' is 0, the chart gets adjusted automatically."
  },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Brightness" },
  { kind: "block", type: "led_plot_brightness" },
  { kind: "block", type: "led_point_brightness" },
  { kind: "block", type: "led_brightness" },
  { kind: "block", type: "led_set_brightness" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Animation" },
  { kind: "block", type: "led_stop_animation" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Advanced" },
  { kind: "block", type: "led_set_display_mode" },
  { kind: "block", type: "led_enable" }
];

const pythonRadioContents = [
  { kind: "label", text: "Group" },
  { kind: "block", type: "radio_set_group" },
  {
    kind: "label",
    text: "Sets the group id for radio communications. A micro:bit can only listen to one group id at any time."
  },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Send" },
  { kind: "block", type: "radio_send_number" },
  { kind: "label", text: "Broadcasts a number over radio to any connected micro:bit in the group." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "radio_send_value" },
  {
    kind: "label",
    text: "Broadcasts a name / value pair in the device serial number and running time."
  },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "radio_send_string" },
  {
    kind: "label",
    text: "Broadcasts a string with the device serial number and running time."
  },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Receive" },
  { kind: "block", type: "radio_on_received_number" },
  { kind: "label", text: "Registers code to run when the radio receives a number." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "radio_on_received_value" },
  { kind: "label", text: "Registers code to run when the radio receives a key value pair." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "radio_on_received_string" },
  { kind: "label", text: "Registers code to run when the radio receives a string." },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "radio_received_packet" },
  { kind: "label", text: "Returns properties of the last radio packet received." },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Advanced" },
  { kind: "block", type: "radio_set_transmit_power" },
  { kind: "block", type: "radio_set_transmit_serial_number" },
  { kind: "block", type: "radio_set_frequency_band" },
  { kind: "block", type: "radio_raise_event" }
];

const pythonLoopsContents = [
  {
    kind: "block",
    type: "controls_repeat_ext",
    inputs: {
      TIMES: { shadow: { type: "math_number", fields: { NUM: 4 } } }
    }
  },
  { kind: "label", text: "Repeat code a number of times in a loop" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "controls_whileUntil",
    fields: { MODE: "WHILE" },
    inputs: {
      BOOL: { shadow: { type: "logic_boolean", fields: { BOOL: "FALSE" } } }
    }
  },
  { kind: "label", text: "Repeat code while condition is true" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "controls_for",
    inputs: {
      FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      TO: { shadow: { type: "math_number", fields: { NUM: 4 } } },
      BY: { shadow: { type: "math_number", fields: { NUM: 1 } } }
    }
  },
  { kind: "label", text: "For loop" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "controls_forEach",
    inputs: {
      LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } }
    }
  },
  { kind: "label", text: "For each element in a list" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "loops_every_interval",
    inputs: {
      TIME: { shadow: { type: "math_number", fields: { NUM: 500 } } }
    }
  },
  {
    kind: "label",
    text: "Repeats the code forever in the background. After each iteration, allows other codes to run for a set duration so that it runs on a timer"
  },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "loops_break" },
  { kind: "label", text: "Break out of the loop" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "loops_continue" },
  { kind: "label", text: "Continue with the next iteration of the loop" }
];

const pythonLogicContents = [
  { kind: "label", text: "Conditionals" },
  { kind: "block", type: "logic_if_simple" },
  { kind: "label", text: "Runs code if the condition is true" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "logic_if_else_simple" },
  { kind: "label", text: "Runs code if the condition is true; else run other code" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Comparison" },
  {
    kind: "block",
    type: "logic_compare",
    inputs: {
      A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Compare two numbers" },
  { kind: "sep", gap: "8" },
  { kind: "label", text: "Boolean" },
  { kind: "block", type: "logic_operation", fields: { OP: "AND" } },
  { kind: "label", text: "Runs code if both specified conditions are true" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "logic_operation", fields: { OP: "OR" } },
  { kind: "label", text: "Runs code if either of two specified conditions is true" }
];

const pythonVariablesContents = [
  {
    kind: "block",
    type: "variables_change",
    fields: { VAR: "item" },
    inputs: {
      VALUE: { shadow: { type: "math_number", fields: { NUM: 1 } } }
    }
  },
  { kind: "label", text: "Changes the value of item by 1" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "variables_set",
    fields: { VAR: "item" },
    inputs: {
      VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Assigns a value to a variable" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "variables_item_equals_number" },
  { kind: "label", text: "Declares a variable named 'item'" }
];

const pythonMathContents = [
  {
    kind: "block",
    type: "math_arithmetic",
    fields: { OP: "ADD" },
    inputs: {
      A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Adds two numbers together" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_arithmetic",
    fields: { OP: "MINUS" },
    inputs: {
      A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Subtracts one number from another" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_arithmetic",
    fields: { OP: "MULTIPLY" },
    inputs: {
      A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Multiplies two numbers together" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_arithmetic",
    fields: { OP: "DIVIDE" },
    inputs: {
      A: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      B: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Returns the quotient of one number divided by another" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_modulo",
    inputs: {
      DIVIDEND: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      DIVISOR: { shadow: { type: "math_number", fields: { NUM: 1 } } }
    }
  },
  { kind: "label", text: "Returns the remainder of one number divided by another" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_op2", fields: { OP: "max" }, inputs: { A: { shadow: { type: "math_number", fields: { NUM: 0 } } }, B: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
  { kind: "label", text: "Returns the largest of two numbers" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_op2", fields: { OP: "min" }, inputs: { A: { shadow: { type: "math_number", fields: { NUM: 0 } } }, B: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
  { kind: "label", text: "Returns the smallest of two numbers" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_single", fields: { OP: "ABS" }, inputs: { NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } } } },
  { kind: "label", text: "Returns the absolute value of a number" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_single", fields: { OP: "ROOT" }, inputs: { NUM: { shadow: { type: "math_number", fields: { NUM: 0 } } } } },
  { kind: "label", text: "Returns the square root of the number" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_js_round" },
  { kind: "label", text: "Rounds the number to the nearest integer" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_random_int",
    inputs: {
      FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      TO: { shadow: { type: "math_number", fields: { NUM: 10 } } }
    }
  },
  { kind: "label", text: "Returns a random number between min and max" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_constrain",
    inputs: {
      VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      LOW: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      HIGH: { shadow: { type: "math_number", fields: { NUM: 0 } } }
    }
  },
  { kind: "label", text: "Constrains a number to be within a range" },
  { kind: "sep", gap: "8" },
  {
    kind: "block",
    type: "math_map_value",
    inputs: {
      VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      FROM_LOW: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      FROM_HIGH: { shadow: { type: "math_number", fields: { NUM: 1023 } } },
      TO_LOW: { shadow: { type: "math_number", fields: { NUM: 0 } } },
      TO_HIGH: { shadow: { type: "math_number", fields: { NUM: 4 } } }
    }
  },
  { kind: "label", text: "Maps a value from one range to another" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_random_bool" },
  { kind: "label", text: "Generates a random true or false value" },
  { kind: "sep", gap: "8" },
  { kind: "block", type: "math_constant", fields: { CONSTANT: "PI" } },
  { kind: "label", text: "The PI constant" }
];

const pythonAdvancedContents = [
  {
    kind: "category",
    name: "Functions",
    colour: "#3b82f6",
    contents: [
      { kind: "button", text: "Make a Function...", callbackKey: "MAKE_FUNCTION" },
      { kind: "label", text: "Adds a Python function definition in the editor." }
    ]
  },
  {
    kind: "category",
    name: "Arrays",
    colour: "#f97316",
    contents: [
      { kind: "label", text: "Create" },
      {
        kind: "block",
        type: "variables_set",
        inputs: {
          VALUE: {
            block: {
              type: "lists_create_with",
              extraState: { itemCount: 2 },
              inputs: {
                ADD0: { shadow: { type: "math_number", fields: { NUM: 0 } } },
                ADD1: { shadow: { type: "math_number", fields: { NUM: 1 } } }
              }
            }
          }
        }
      },
      {
        kind: "block",
        type: "variables_set",
        fields: { VAR: { name: "text list", type: "" } },
        inputs: {
          VALUE: {
            block: {
              type: "lists_create_with",
              extraState: { itemCount: 3 },
              inputs: {
                ADD0: { shadow: { type: "text", fields: { TEXT: "a" } } },
                ADD1: { shadow: { type: "text", fields: { TEXT: "b" } } },
                ADD2: { shadow: { type: "text", fields: { TEXT: "c" } } }
              }
            }
          }
        }
      },
      { kind: "block", type: "lists_create_with", extraState: { itemCount: 0 } },
      { kind: "sep", gap: "8" },
      { kind: "label", text: "Read" },
      {
        kind: "block",
        type: "lists_length",
        inputs: { VALUE: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_getIndex_get",
        inputs: {
          LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
          AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
        }
      },
      {
        kind: "block",
        type: "lists_getIndex_get_remove",
        inputs: {
          LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
          AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
        }
      },
      {
        kind: "block",
        type: "lists_getIndex_get_remove_last",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_getIndex_get_remove_first",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_getIndex_get_random",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      { kind: "sep", gap: "8" },
      { kind: "label", text: "Modify" },
      {
        kind: "block",
        type: "lists_setIndex_set",
        inputs: {
          LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
          AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
        }
      },
      {
        kind: "block",
        type: "lists_setIndex_add",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_getIndex_remove_last",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_getIndex_remove_first",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_setIndex_insert_first",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_setIndex_insert_at",
        inputs: {
          LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
          AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
        }
      },
      {
        kind: "block",
        type: "lists_getIndex_remove_at",
        inputs: {
          LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } },
          AT: { shadow: { type: "math_number", fields: { NUM: 0 } } }
        }
      },
      { kind: "sep", gap: "8" },
      { kind: "label", text: "Operations" },
      {
        kind: "block",
        type: "lists_indexOf",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      },
      {
        kind: "block",
        type: "lists_reverse",
        inputs: { LIST: { shadow: { type: "variables_get", fields: { VAR: "list" } } } }
      }
    ]
  },
  {
    kind: "category",
    name: "Text",
    colour: "#ca8a04",
    contents: [
      { kind: "block", type: "text" },
      {
        kind: "block",
        type: "text_length",
        inputs: {
          VALUE: { shadow: { type: "text", fields: { TEXT: "abc" } } }
        }
      },
      { kind: "block", type: "text_join", extraState: { itemCount: 2 } },
      {
        kind: "block",
        type: "text_charAt",
        inputs: {
          VALUE: { shadow: { type: "text", fields: { TEXT: "abc" } } },
          INDEX: { shadow: { type: "math_number", fields: { NUM: 0 } } }
        }
      },
      {
        kind: "block",
        type: "text_substring_length",
        inputs: {
          TEXT: { shadow: { type: "text", fields: { TEXT: "abc" } } },
          FROM: { shadow: { type: "math_number", fields: { NUM: 0 } } },
          LEN: { shadow: { type: "math_number", fields: { NUM: 1 } } }
        }
      },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "text_parse_to_number" },
      { kind: "block", type: "text_includes" },
      { kind: "block", type: "text_split_with" },
      { kind: "block", type: "text_indexOf" },
      { kind: "block", type: "text_isEmpty" },
      { kind: "block", type: "text_compare_to" },
      { kind: "block", type: "text_char_code_at" },
      { kind: "block", type: "text_convert_number_to_text" },
      { kind: "block", type: "text_from_char_code" }
    ]
  },
  {
    kind: "category",
    name: "Game",
    colour: "#059669",
    contents: [
      { kind: "block", type: "game_create_sprite" },
      { kind: "label", text: "Creates a new LED sprite" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_delete_sprite" },
      { kind: "label", text: "Deletes the sprite from the game engine." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_is_deleted" },
      { kind: "label", text: "Reports whether the sprite has been deleted" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_move_by" },
      { kind: "label", text: "Move a certain number of LEDs in current direction" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_turn_by" },
      { kind: "label", text: "Turn the sprite" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_change_x_by" },
      { kind: "label", text: "Changes a property of the sprite" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_set_x_to" },
      { kind: "label", text: "Sets a property of the sprite" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_x" },
      { kind: "label", text: "Gets a property of the sprite" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_is_touching" },
      { kind: "label", text: "Reports true if sprite has same position as specified sprite" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_is_touching_edge" },
      { kind: "label", text: "Reports true if sprite is touching an edge" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_sprite_if_on_edge_bounce" },
      { kind: "label", text: "If touching edge, bounce" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "game_remove_life" },
      { kind: "block", type: "game_add_life" },
      { kind: "block", type: "game_set_life" },
      { kind: "block", type: "game_set_score" },
      { kind: "block", type: "game_change_score_by" },
      { kind: "block", type: "game_start_countdown" },
      { kind: "block", type: "game_score" },
      { kind: "block", type: "game_over" },
      { kind: "block", type: "game_is_over" },
      { kind: "block", type: "game_is_paused" },
      { kind: "block", type: "game_is_running" }
    ]
  },
  {
    kind: "category",
    name: "more",
    colour: "#059669",
    contents: [
      { kind: "block", type: "game_resume" },
      { kind: "block", type: "game_pause" }
    ]
  },
  {
    kind: "category",
    name: "Images",
    colour: "#7e22ce",
    contents: [
      { kind: "block", type: "images_show_image_offset" },
      { kind: "label", text: "Shows an image at a given offset on the LED display." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "images_scroll_image" },
      { kind: "label", text: "Scrolls an image with offset and interval." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "images_create_image" },
      { kind: "label", text: "Creates a 5x5 image from LED pattern." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "images_create_big_image" },
      { kind: "label", text: "Creates a 5x10 image for scrolling." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "images_direction" },
      { kind: "label", text: "Direction value used by image APIs." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "images_icon_image" },
      { kind: "label", text: "Creates a built-in icon image." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "images_arrow_image" },
      { kind: "label", text: "Creates a built-in arrow image." }
    ]
  },
  {
    kind: "category",
    name: "Pins",
    colour: "#b91c1c",
    contents: [
      { kind: "block", type: "pins_set_audio_pin_enabled" },
      { kind: "label", text: "Sets whether or not audio will be output using a pin" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "pins_digital_read_pin" },
      { kind: "block", type: "pins_digital_write_pin" },
      { kind: "block", type: "pins_analog_read_pin" },
      { kind: "block", type: "pins_analog_write_pin" },
      { kind: "block", type: "pins_map" },
      { kind: "block", type: "pins_analog_set_period_pin" },
      { kind: "block", type: "pins_set_audio_pin" },
      { kind: "label", text: "Servo" },
      { kind: "block", type: "pins_servo_write_pin" },
      { kind: "block", type: "pins_servo_set_pulse" }
    ]
  },
  {
    kind: "category",
    name: "more",
    colour: "#b91c1c",
    contents: [
      { kind: "block", type: "pins_set_audio_pin_enabled" }
    ]
  },
  {
    kind: "category",
    name: "Serial",
    colour: "#1d4ed8",
    contents: [
      { kind: "block", type: "serial_write_line" },
      { kind: "label", text: "Print a line of text to the serial port" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "serial_write_number" },
      { kind: "label", text: "Print a numeric value to the serial port" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "serial_write_value_pair" },
      { kind: "label", text: "Write a name-value pair as a line to the serial port" },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "serial_write_string" },
      { kind: "block", type: "serial_write_numbers" },
      { kind: "block", type: "serial_read_line" },
      { kind: "block", type: "serial_read_until" },
      { kind: "block", type: "serial_on_data_received" },
      { kind: "block", type: "serial_read_string" },
      { kind: "block", type: "serial_redirect_to" },
      { kind: "block", type: "serial_redirect_to_usb" }
    ]
  },
  {
    kind: "category",
    name: "more",
    colour: "#1d4ed8",
    contents: [
      { kind: "block", type: "serial_set_tx_buffer_size" },
      { kind: "block", type: "serial_set_rx_buffer_size" },
      { kind: "block", type: "serial_write_buffer" },
      { kind: "block", type: "serial_read_buffer" },
      { kind: "block", type: "serial_set_write_line_padding" },
      { kind: "label", text: "Configuration" },
      { kind: "block", type: "serial_set_baud_rate" }
    ]
  },
  {
    kind: "category",
    name: "Control",
    colour: "#374151",
    contents: [
      { kind: "block", type: "control_wait_for_event" },
      { kind: "label", text: "Blocks the calling thread until event is raised." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "control_run_in_background" },
      { kind: "label", text: "Schedules code that run in background." },
      { kind: "sep", gap: "8" },
      { kind: "block", type: "control_millis" },
      { kind: "block", type: "control_reset" },
      { kind: "block", type: "control_wait_micros" },
      { kind: "block", type: "control_raise_event" },
      { kind: "block", type: "control_on_event" },
      { kind: "block", type: "control_event_timestamp" },
      { kind: "block", type: "control_event_value" }
    ]
  }
];

const pythonToolbox = {
  ...toolbox,
  contents: toolbox.contents.reduce<(typeof toolbox.contents)[number][]>((acc, entry) => {
    if (entry.kind === "category" && "name" in entry) {
      const name = (entry as any).name as string;
      if (name.includes("Text") || name.includes("Functions")) {
        return acc;
      }
      if (name.includes("Basic")) {
        acc.push({ ...entry, contents: pythonBasicContents } as any);
        return acc;
      }
      if (name.includes("Input")) {
        acc.push({ ...entry, contents: pythonInputContents } as any);
        return acc;
      }
      if (name.includes("Music")) {
        acc.push({ ...entry, contents: pythonMusicContents } as any);
        return acc;
      }
      if (name.includes("LED")) {
        acc.push({ ...entry, contents: pythonLedContents } as any);
        return acc;
      }
      if (name.includes("Radio")) {
        acc.push({ ...entry, contents: pythonRadioContents } as any);
        return acc;
      }
      if (name.includes("Loops")) {
        acc.push({ ...entry, contents: pythonLoopsContents } as any);
        return acc;
      }
      if (name.includes("Logic")) {
        acc.push({ ...entry, contents: pythonLogicContents } as any);
        return acc;
      }
      if (name.includes("Variables")) {
        acc.push({ ...entry, contents: pythonVariablesContents } as any);
        return acc;
      }
      if (name.includes("Math")) {
        acc.push({ ...entry, contents: pythonMathContents } as any);
        return acc;
      }
      if (name.includes("Advanced")) {
        acc.push({ ...entry, contents: pythonAdvancedContents } as any);
        return acc;
      }
    }
    acc.push(entry);
    return acc;
  }, [])
};

let pxtLikeBlocksRegistered = false;

function registerPxtLikeBlocks() {
  if (pxtLikeBlocksRegistered) return;
  pxtLikeBlocksRegistered = true;

  const asAny = javascriptGenerator as any;

  if (!Blockly.Msg.CONTROLS_REPEAT_TITLE || !Blockly.Msg.CONTROLS_REPEAT_TITLE.includes("%1")) {
    Blockly.Msg.CONTROLS_REPEAT_TITLE = "repeat %1";
  }

  // Consolidate all blocks with correct input names and labels
  // Define missing messages to fix rendering errors like ATE_EMPTY_TITLE
  Blockly.Msg['LISTS_CREATE_EMPTY_TITLE'] = "empty array";
  Blockly.Msg['LISTS_CREATE_WITH_INPUT_WITH'] = "array of";
  Blockly.Msg['TEXT_APPEND_APPENDTEXT'] = "append text";
  Blockly.Msg['NEW_VARIABLE_DROPDOWN'] = "New variable...";
  Blockly.Msg['NEW_VARIABLE_ID'] = "new_variable";
  if (!Blockly.Msg.PROCEDURE_ALREADY_EXISTS) {
    Blockly.Msg.PROCEDURE_ALREADY_EXISTS = "A function named %1 already exists.";
  }
  if (!Blockly.Msg.VARIABLE_ALREADY_EXISTS) {
    Blockly.Msg.VARIABLE_ALREADY_EXISTS = "A variable named %1 already exists.";
  }
  if (!Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE) {
    Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE = "do something";
  }
  if (!Blockly.Msg.PROCEDURES_DEFRETURN_PROCEDURE) {
    Blockly.Msg.PROCEDURES_DEFRETURN_PROCEDURE = "do something";
  }

  // Fallback translations for builtin and variables blocks to prevent crash and raw keys
  Blockly.Msg.MATH_CHANGE_TITLE = "change %1 by %2";
  Blockly.Msg.VARIABLES_SET = "set %1 to %2";
  Blockly.Msg.LOGIC_BOOLEAN_TRUE = "true";
  Blockly.Msg.LOGIC_BOOLEAN_FALSE = "false";
  Blockly.Msg.LOGIC_NEGATE_TITLE = "not %1";
  Blockly.Msg.LOGIC_OPERATION_AND = "and";
  Blockly.Msg.LOGIC_OPERATION_OR = "or";
  Blockly.Msg.CONTROLS_IF_MSG_IF = "if";
  Blockly.Msg.CONTROLS_IF_MSG_THEN = "then";
  Blockly.Msg.CONTROLS_IF_MSG_ELSE = "else";
  Blockly.Msg.CONTROLS_IF_MSG_ELSEIF = "else if";

  // Manual block registration for critical blocks to bypass mutator issues
  const defineBlock = (type: string, spec: any) => {
    delete (Blockly.Blocks as any)[type];
    if (spec.init) {
      (Blockly.Blocks as any)[type] = {
        mutationToDom: () => null,
        domToMutation: () => { },
        ...spec
      };
    } else {
      Blockly.common.defineBlocksWithJsonArray([spec]);
    }
  };

  // Override lists_create_with to strictly match MakeCode Array looks
  const origListsCreateWith = (Blockly.Blocks as any)['lists_create_with'];
  if (origListsCreateWith && origListsCreateWith.init) {
    const origInit = origListsCreateWith.init;
    origListsCreateWith.init = function() {
      origInit.call(this);
      this.setColour("#f97316");
      this.setInputsInline(true);
    };
  }

  // Redefine lists_getIndex manually to fix "Missing LIST connection"
  defineBlock('lists_getIndex', {
    init: function (this: any) {
      const modeField = new Blockly.FieldDropdown([
        ["get", "GET"],
        ["get and remove", "GET_REMOVE"],
        ["remove", "REMOVE"]
      ]);
      const whereField = new Blockly.FieldDropdown([
        ["from start", "FROM_START"],
        ["from end", "FROM_END"],
        ["first", "FIRST"],
        ["last", "LAST"],
        ["random", "RANDOM"]
      ], (value: string) => {
        this.updateShape_(value);
        return value;
      });

      this.appendDummyInput()
        .appendField(modeField, "MODE")
        .appendField(whereField, "WHERE");
      this.appendValueInput('LIST').setCheck('Array').appendField('list');
      this.setOutput(true);
      this.setColour(260);
      this.setInputsInline(true);
      this.updateShape_(whereField.getValue());
    },
    updateShape_: function (this: any, where: string) {
      const atInput = this.getInput('AT');
      const needsAt = where === 'FROM_START' || where === 'FROM_END';
      if (needsAt) {
        if (!atInput) {
          this.appendValueInput('AT').setCheck('Number').appendField('at');
        }
      } else {
        if (atInput) {
          this.removeInput('AT');
        }
      }
    },
    saveExtraState: function (this: any) {
      return { 'where': this.getFieldValue('WHERE') };
    },
    loadExtraState: function (this: any, state: any) {
      this.updateShape_(state['where']);
    }
  });

  asAny.forBlock['lists_getIndex'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const mode = block.getFieldValue('MODE') || 'GET';
    const where = block.getFieldValue('WHERE') || 'FROM_START';
    let at = '';
    if (where === 'FROM_START' || where === 'FROM_END') {
      at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    }

    if (mode === 'GET') {
      if (where === 'FIRST') return [`${list}[0]`, Order.MEMBER];
      if (where === 'LAST') return [`${list}[${list}.length - 1]`, Order.MEMBER];
      if (where === 'FROM_START') return [`${list}[${at}]`, Order.MEMBER];
      return [`${list}[${at || 0}]`, Order.MEMBER];
    } else {
      return [`${list}.pop()`, Order.FUNCTION_CALL];
    }
  };

  defineBlock('lists_setIndex', {
    init: function (this: any) {
      const modeField = new Blockly.FieldDropdown([
        ["set", "SET"],
        ["insert", "INSERT"]
      ]);
      const whereField = new Blockly.FieldDropdown([
        ["from start", "FROM_START"],
        ["from end", "FROM_END"],
        ["first", "FIRST"],
        ["last", "LAST"],
        ["random", "RANDOM"]
      ], (value: string) => {
        this.updateShape_(value);
        return value;
      });

      this.appendDummyInput()
        .appendField(modeField, "MODE")
        .appendField(whereField, "WHERE");
      this.appendValueInput('LIST').setCheck('Array').appendField('list');
      this.appendValueInput('VALUE').appendField('to');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(260);
      this.setInputsInline(true);
      this.updateShape_(whereField.getValue());
    },
    updateShape_: function (this: any, where: string) {
      const atInput = this.getInput('AT');
      const needsAt = where === 'FROM_START' || where === 'FROM_END';
      if (needsAt) {
        if (!atInput) {
          // Find the index of the LIST input to insert AT after it
          let inputIndex = -1;
          for (let i = 0; i < this.inputList.length; i++) {
            if (this.inputList[i].name === 'LIST') {
              inputIndex = i;
              break;
            }
          }
          this.appendValueInput('AT')
            .setCheck('Number')
            .appendField(this.getFieldValue('MODE') === 'INSERT' ? 'at' : 'at');
          // Move AT to the correct position if necessary (Blockly handles ordering based on append sequence usually)
        }
      } else {
        if (atInput) {
          this.removeInput('AT');
        }
      }
    },
    saveExtraState: function (this: any) {
      return { 'where': this.getFieldValue('WHERE') };
    },
    loadExtraState: function (this: any, state: any) {
      this.updateShape_(state['where']);
    }
  });

  asAny.forBlock['lists_setIndex'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const mode = block.getFieldValue('MODE') || 'SET';
    const where = block.getFieldValue('WHERE') || 'FROM_START';
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
    let at = '';
    if (where === 'FROM_START' || where === 'FROM_END') {
      at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    }

    if (mode === 'SET') {
      if (where === 'FIRST') return `${list}[0] = ${value};\n`;
      if (where === 'LAST') return `${list}[${list}.length - 1] = ${value};\n`;
      return `${list}[${at || 0}] = ${value};\n`;
    } else {
      return `${list}.push(${value});\n`;
    }
  };

  asAny.forBlock['lists_getIndex_get'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    return [`${list}[${at}]`, Order.MEMBER];
  };
  asAny.forBlock['lists_getIndex_get_remove'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    return [`${list}.splice(${at}, 1)[0]`, Order.FUNCTION_CALL];
  };
  asAny.forBlock['lists_getIndex_get_remove_last'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    return [`${list}.pop()`, Order.FUNCTION_CALL];
  };
  asAny.forBlock['lists_getIndex_get_remove_first'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    return [`${list}.shift()`, Order.FUNCTION_CALL];
  };
  asAny.forBlock['lists_getIndex_get_random'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    return [`${list}[Math.floor(Math.random() * ${list}.length)]`, Order.MEMBER];
  };
  asAny.forBlock['lists_setIndex_set'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
    return `${list}[${at}] = ${value};\n`;
  };
  asAny.forBlock['lists_setIndex_add'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
    return `${list}.push(${value});\n`;
  };
  asAny.forBlock['lists_getIndex_remove_last'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    return `${list}.pop();\n`;
  };
  asAny.forBlock['lists_getIndex_remove_first'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    return `${list}.shift();\n`;
  };
  asAny.forBlock['lists_setIndex_insert_first'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
    return `${list}.unshift(${value});\n`;
  };
  asAny.forBlock['lists_setIndex_insert_at'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
    return `${list}.splice(${at}, 0, ${value});\n`;
  };
  asAny.forBlock['lists_getIndex_remove_at'] = (block: any, generator: any) => {
    const list = generator.valueToCode(block, 'LIST', Order.MEMBER) || '[]';
    const at = generator.valueToCode(block, 'AT', Order.NONE) || '0';
    return `${list}.splice(${at}, 1);\n`;
  };

  defineBlock('controls_for', {
    init: function (this: any) {
      this.appendValueInput('FROM')
        .setCheck('Number')
        .appendField('for')
        .appendField(new Blockly.FieldVariable('i'), 'VAR')
        .appendField('from');
      this.appendValueInput('TO').setCheck('Number').appendField('to');
      this.appendValueInput('BY').setCheck('Number').appendField('by');
      this.appendStatementInput('DO').appendField('do');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
      this.setTooltip('Count with a variable from start to end');
      this.setHelpUrl('');
    }
  });

  defineBlock('controls_forEach', {
    init: function (this: any) {
      this.appendValueInput('LIST')
        .setCheck('Array')
        .appendField('for each')
        .appendField(new Blockly.FieldVariable('item'), 'VAR')
        .appendField('in');
      this.appendStatementInput('DO').appendField('do');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
      this.setTooltip('Iterate over each item in a list');
      this.setHelpUrl('');
    }
  });

  defineBlock('logic_negate', {
    init: function (this: any) {
      this.appendValueInput('BOOL').setCheck('Boolean').appendField('not');
      this.setOutput(true, 'Boolean');
      this.setColour(210);
      this.setTooltip('Returns true if input is false');
      this.setHelpUrl('');
    }
  });

  defineBlock('math_constrain', {
    init: function (this: any) {
      this.appendValueInput('VALUE').setCheck('Number').appendField('constrain');
      this.appendValueInput('LOW').setCheck('Number').appendField('between');
      this.appendValueInput('HIGH').setCheck('Number').appendField('and');
      this.setOutput(true, 'Number');
      this.setColour(230);
      this.setTooltip('Constrain a number between limits');
      this.setHelpUrl('');
    }
  });

  // Json definitions for others
  Blockly.common.defineBlocksWithJsonArray([
    // Math Blocks
    {
      type: "math_arithmetic",
      message0: "%1 %2 %3",
      args0: [
        { type: "input_value", name: "A", check: "Number" },
        {
          type: "field_dropdown",
          name: "OP",
          options: [["+", "ADD"], ["-", "MINUS"], ["*", "MULTIPLY"], ["/", "DIVIDE"], ["**", "POWER"]]
        },
        { type: "input_value", name: "B", check: "Number" }
      ],
      output: "Number", colour: 230, inputsInline: true
    },
    {
      type: "math_modulo",
      message0: "remainder of %1 ÷ %2",
      args0: [
        { type: "input_value", name: "DIVIDEND", check: "Number" },
        { type: "input_value", name: "DIVISOR", check: "Number" }
      ],
      output: "Number", colour: 230, inputsInline: true
    },
    {
      type: "math_random_int",
      message0: "pick random %1 to %2",
      args0: [
        { type: "input_value", name: "FROM", check: "Number" },
        { type: "input_value", name: "TO", check: "Number" }
      ],
      output: "Number", colour: 230, inputsInline: true
    },
    {
      type: "math_single",
      message0: "%1 %2",
      args0: [
        {
          type: "field_dropdown",
          name: "OP",
          options: [
            ["square root", "ROOT"],
            ["absolute", "ABS"],
            ["-", "NEG"],
            ["ln", "LN"],
            ["log10", "LOG10"],
            ["e^", "EXP"],
            ["10^", "POW10"],
            ["sin", "SIN"],
            ["cos", "COS"],
            ["tan", "TAN"]
          ]
        },
        { type: "input_value", name: "NUM", check: "Number" }
      ],
      output: "Number", colour: 230
    },
    {
      type: "math_js_op",
      message0: "%1 of %2",
      args0: [
        {
          type: "field_dropdown",
          name: "OP",
          options: [
            ["abs", "ABS"],
            ["round up", "ROUNDUP"],
            ["round down", "ROUNDDOWN"]
          ]
        },
        { type: "input_value", name: "ARG0", check: "Number" }
      ],
      output: "Number",
      colour: 230,
      inputsInline: true
    },
    {
      type: "math_op2",
      message0: "%1 of %2 and %3",
      args0: [
        {
          type: "field_dropdown",
          name: "OP",
          options: [
            ["min", "min"],
            ["max", "max"]
          ]
        },
        { type: "input_value", name: "A", check: "Number" },
        { type: "input_value", name: "B", check: "Number" }
      ],
      output: "Number", colour: 230, inputsInline: true
    },
    {
      type: "math_js_round",
      message0: "round %1",
      args0: [{ type: "input_value", name: "ARG0", check: "Number" }],
      output: "Number",
      colour: 230,
      inputsInline: true
    },
    {
      type: "math_constrain",
      message0: "constrain %1 between %2 and %3",
      args0: [
        { type: "input_value", name: "VALUE", check: "Number" },
        { type: "input_value", name: "LOW", check: "Number" },
        { type: "input_value", name: "HIGH", check: "Number" }
      ],
      output: "Number", colour: 230, inputsInline: true
    },
    {
      type: "math_random_bool",
      message0: "pick random true or false",
      output: "Boolean", colour: 230
    },
    {
      type: "math_map_value",
      message0: "map %1 from low %2 high %3 to low %4 high %5",
      args0: [
        { type: "input_value", name: "VALUE", check: "Number" },
        { type: "input_value", name: "FROM_LOW", check: "Number" },
        { type: "input_value", name: "FROM_HIGH", check: "Number" },
        { type: "input_value", name: "TO_LOW", check: "Number" },
        { type: "input_value", name: "TO_HIGH", check: "Number" }
      ],
      output: "Number", colour: 230, inputsInline: true
    },
    {
      type: "math_constant",
      message0: "%1",
      args0: [
        {
          type: "field_dropdown",
          name: "CONSTANT",
          options: [
            ["π", "PI"],
            ["e", "E"],
            ["φ", "GOLDEN_RATIO"],
            ["sqrt(2)", "SQRT2"],
            ["sqrt(½)", "SQRT1_2"],
            ["∞", "INFINITY"]
          ]
        }
      ],
      output: "Number", colour: 230
    },

    // Variables Blocks
    {
      type: "variables_set",
      message0: "set %1 to %2",
      args0: [
        { type: "field_variable", name: "VAR", variable: "item" },
        { type: "input_value", name: "VALUE" }
      ],
      previousStatement: null, nextStatement: null, colour: 350
    },

    // Arrays Blocks
    {
      type: "lists_length",
      message0: "length of array %1",
      args0: [{ type: "input_value", name: "VALUE", check: "Array" }],
      output: "Number", colour: "#f97316"
    },
    {
      type: "lists_create_empty",
      message0: "empty array",
      output: "Array", colour: "#f97316"
    },
    {
      type: "lists_indexOf",
      message0: "%1 find index of %2",
      args0: [
        { type: "input_value", name: "LIST", check: "Array" },
        { type: "input_value", name: "VALUE" }
      ],
      output: "Number", colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_reverse",
      message0: "reverse %1",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }],
      previousStatement: null, nextStatement: null, colour: "#f97316"
    },
    {
      type: "lists_getIndex_get",
      message0: "%1 get value at %2",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "AT", check: "Number" }],
      output: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_get_remove",
      message0: "%1 get and remove value at %2",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "AT", check: "Number" }],
      output: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_get_remove_last",
      message0: "get and remove last value from %1",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }],
      output: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_get_remove_first",
      message0: "get and remove first value from %1",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }],
      output: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_get_random",
      message0: "get random value from %1",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }],
      output: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_setIndex_set",
      message0: "%1 set value at %2 to %3",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "AT", check: "Number" }, { type: "input_value", name: "VALUE" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_setIndex_add",
      message0: "%1 add value %2 to end",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "VALUE" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_remove_last",
      message0: "remove last value from %1",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_remove_first",
      message0: "remove first value from %1",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_setIndex_insert_first",
      message0: "%1 insert %2 at beginning",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "VALUE" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_setIndex_insert_at",
      message0: "%1 insert at %2 value %3",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "AT", check: "Number" }, { type: "input_value", name: "VALUE" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },
    {
      type: "lists_getIndex_remove_at",
      message0: "%1 remove value at %2",
      args0: [{ type: "input_value", name: "LIST", check: "Array" }, { type: "input_value", name: "AT", check: "Number" }],
      previousStatement: null, nextStatement: null, colour: "#f97316", inputsInline: true
    },

    // Text Blocks
    {
      type: "text_length",
      message0: "length of string %1",
      args0: [{ type: "input_value", name: "VALUE", check: "String" }],
      output: "Number", colour: 160
    },
    {
      type: "text_charAt",
      message0: "char at %2 from %1",
      args0: [
        { type: "input_value", name: "VALUE", check: "String" },
        { type: "input_value", name: "INDEX", check: "Number" }
      ],
      output: "String", colour: 160, inputsInline: true
    },
    {
      type: "text_join",
      message0: "join %1 %2",
      args0: [
        { type: "input_value", name: "ADD0", check: "String" },
        { type: "input_value", name: "ADD1", check: "String" }
      ],
      output: "String", colour: 160, inputsInline: true
    },
    {
      type: "text_substring_length",
      message0: "substring of %1 from %2 with length %3",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "FROM", check: "Number" },
        { type: "input_value", name: "LEN", check: "Number" }
      ],
      output: "String", colour: 160, inputsInline: true
    },
    {
      type: "text_parse_to_number",
      message0: "parse to number %1",
      args0: [{ type: "input_value", name: "TEXT", check: "String" }],
      output: "Number", colour: 160
    },
    {
      type: "text_includes",
      message0: "%1 includes %2",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "SEARCH", check: "String" }
      ],
      output: "Boolean", colour: 160, inputsInline: true
    },
    {
      type: "text_split_with",
      message0: "split %1 with delimiter %2",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "DELIM", check: "String" }
      ],
      output: "Array", colour: 160, inputsInline: true
    },
    {
      type: "text_indexOf",
      message0: "index of %2 in string %1",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "SEARCH", check: "String" }
      ],
      output: "Number", colour: 160, inputsInline: true
    },
    {
      type: "text_isEmpty",
      message0: "is string %1 empty",
      args0: [{ type: "input_value", name: "TEXT", check: "String" }],
      output: "Boolean", colour: 160
    },
    {
      type: "text_compare_to",
      message0: "compare string %1 to %2",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "OTHER", check: "String" }
      ],
      output: "Number", colour: 160, inputsInline: true
    },
    {
      type: "text_char_code_at",
      message0: "char code at %2 from string %1",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "INDEX", check: "Number" }
      ],
      output: "Number", colour: 160, inputsInline: true
    },
    {
      type: "text_convert_number_to_text",
      message0: "convert number %1 to text",
      args0: [{ type: "input_value", name: "NUM", check: "Number" }],
      output: "String", colour: 160
    },
    {
      type: "text_from_char_code",
      message0: "char from code %1",
      args0: [{ type: "input_value", name: "CODE", check: "Number" }],
      output: "String", colour: 160
    },

    {
      type: "device_show_number",
      message0: "show number %1",
      args0: [{ type: "input_value", name: "NUM", check: ["Number", "String"] }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Show number on LED display",
      helpUrl: ""
    },
    {
      type: "device_show_string",
      message0: "show string %1",
      args0: [{ type: "input_value", name: "TEXT", check: ["String", "Number"] }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Show text on LED display",
      helpUrl: ""
    },
    {
      type: "device_show_icon",
      message0: "show icon %1",
      args0: [
        {
          type: "field_dropdown",
          name: "ICON",
          options: [
            ["Heart", "Heart"],
            ["SmallHeart", "SmallHeart"],
            ["Yes", "Yes"],
            ["No", "No"],
            ["Happy", "Happy"],
            ["Sad", "Sad"],
            ["Confused", "Confused"],
            ["Angry", "Angry"],
            ["Asleep", "Asleep"],
            ["Surprised", "Surprised"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Show built-in icon",
      helpUrl: ""
    },
    {
      type: "device_show_arrow",
      message0: "show arrow %1",
      args0: [
        {
          type: "field_dropdown",
          name: "ARROW",
          options: [
            ["North", "North"],
            ["NorthEast", "NorthEast"],
            ["East", "East"],
            ["SouthEast", "SouthEast"],
            ["South", "South"],
            ["SouthWest", "SouthWest"],
            ["West", "West"],
            ["NorthWest", "NorthWest"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Show built-in arrow",
      helpUrl: ""
    },
    {
      type: "device_show_leds",
      message0: "show leds %1",
      args0: [
        {
          type: "field_input",
          name: "MATRIX",
          text: "# # # # #\n# . . . #\n# . # . #\n# . . . #\n# # # # #"
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Show 5x5 LED pattern",
      helpUrl: ""
    },
    {
      type: "device_on_start",
      message0: "on start %1 %2",
      args0: [
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Run once on start",
      helpUrl: ""
    },
    {
      type: "device_forever",
      message0: "forever %1 %2",
      args0: [
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Repeat the code forever",
      helpUrl: ""
    },
    {
      type: "device_pause",
      message0: "pause (ms) %1",
      args0: [{ type: "input_value", name: "time", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Pause for the specified time",
      helpUrl: ""
    },
    {
      type: "device_clear_screen",
      message0: "clear screen",
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "Clear LED display",
      helpUrl: ""
    },
    {
      type: "input_on_button_pressed",
      message0: "on button %1 pressed %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "BTN",
          options: [["A", "A"], ["B", "B"], ["A+B", "AB"]]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Run when button is pressed",
      helpUrl: ""
    },
    {
      type: "input_on_gesture",
      message0: "on gesture %1 %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "GESTURE",
          options: [
            ["shake", "SHAKE"],
            ["logo up", "LOGO_UP"],
            ["logo down", "LOGO_DOWN"],
            ["free fall", "FREE_FALL"]
          ]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Run when gesture is detected",
      helpUrl: ""
    },
    {
      type: "input_button_is_pressed",
      message0: "button %1 is pressed",
      args0: [
        {
          type: "field_dropdown",
          name: "BTN",
          options: [["A", "A"], ["B", "B"], ["A+B", "AB"]]
        }
      ],
      output: "Boolean",
      colour: 290,
      tooltip: "Checks if button is currently pressed",
      helpUrl: ""
    },
    {
      type: "input_on_pin_pressed",
      message0: "run code on pin %1 pressed %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [["TouchPin.P0", "P0"], ["TouchPin.P1", "P1"], ["TouchPin.P2", "P2"]]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Run when touch pin is pressed and released",
      helpUrl: ""
    },
    {
      type: "input_acceleration",
      message0: "acceleration (mg) %1",
      args0: [
        {
          type: "field_dropdown",
          name: "DIM",
          options: [["Dimension.X", "X"], ["Dimension.Y", "Y"], ["Dimension.Z", "Z"], ["strength", "Strength"]]
        }
      ],
      output: "Number",
      colour: 290,
      tooltip: "Get acceleration in milli-g",
      helpUrl: ""
    },
    {
      type: "input_pin_is_pressed",
      message0: "pin %1 is pressed",
      args0: [
        {
          type: "field_dropdown",
          name: "PIN",
          options: [["TouchPin.P0", "P0"], ["TouchPin.P1", "P1"], ["TouchPin.P2", "P2"]]
        }
      ],
      output: "Boolean",
      colour: 290,
      tooltip: "Check if touch pin is pressed",
      helpUrl: ""
    },
    {
      type: "input_light_level",
      message0: "light level",
      output: "Number",
      colour: 290,
      tooltip: "Get ambient light level (0-255)",
      helpUrl: ""
    },
    {
      type: "input_compass_heading",
      message0: "compass heading (°)",
      output: "Number",
      colour: 290,
      tooltip: "Get compass heading in degrees",
      helpUrl: ""
    },
    {
      type: "input_temperature",
      message0: "temperature (°C)",
      output: "Number",
      colour: 290,
      tooltip: "Get temperature in celsius",
      helpUrl: ""
    },
    {
      type: "input_is_gesture",
      message0: "is %1 gesture",
      args0: [
        {
          type: "field_dropdown",
          name: "GESTURE",
          options: [
            ["Gesture.SHAKE", "SHAKE"],
            ["Gesture.LOGO_UP", "LOGO_UP"],
            ["Gesture.LOGO_DOWN", "LOGO_DOWN"],
            ["Gesture.FREE_FALL", "FREE_FALL"]
          ]
        }
      ],
      output: "Boolean",
      colour: 290,
      tooltip: "Tests if a gesture is currently detected",
      helpUrl: ""
    },
    {
      type: "input_on_sound",
      message0: "run code on sound %1 %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "SOUND",
          options: [["DetectedSound.Loud", "Loud"], ["DetectedSound.Quiet", "Quiet"]]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Run when a sound is detected (micro:bit V2)",
      helpUrl: ""
    },
    {
      type: "input_compass_calibrate",
      message0: "calibrate compass",
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Calibrate the compass",
      helpUrl: ""
    },
    {
      type: "device_get_magnetic_force",
      message0: "magnetic force (µT) %1",
      args0: [
        {
          type: "field_dropdown",
          name: "NAME",
          options: [["x", "x"], ["y", "y"], ["z", "z"], ["strength", "strength"]]
        }
      ],
      output: "Number",
      colour: 290,
      tooltip: "Get magnetic force in micro-tesla",
      helpUrl: ""
    },
    {
      type: "device_get_rotation",
      message0: "rotation (°) %1",
      args0: [
        {
          type: "field_dropdown",
          name: "NAME",
          options: [["pitch", "pitch"], ["roll", "roll"]]
        }
      ],
      output: "Number",
      colour: 290,
      tooltip: "Get rotation in degrees",
      helpUrl: ""
    },
    {
      type: "device_get_running_time",
      message0: "running time (ms)",
      output: "Number",
      colour: 290,
      tooltip: "Get program running time in milliseconds",
      helpUrl: ""
    },
    {
      type: "device_get_running_time_micros",
      message0: "running time (micros)",
      output: "Number",
      colour: 290,
      tooltip: "Get program running time in microseconds",
      helpUrl: ""
    },
    {
      type: "input_on_pin_released",
      message0: "on pin %1 released %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "NAME",
          options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Run code when pin is released",
      helpUrl: ""
    },
    {
      type: "device_set_accelerometer_range",
      message0: "set accelerometer range %1",
      args0: [
        {
          type: "field_dropdown",
          name: "NAME",
          options: [["1g", "1g"], ["2g", "2g"], ["4g", "4g"], ["8g", "8g"]]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Set the accelerometer range",
      helpUrl: ""
    },
    {
      type: "input_set_sound_threshold",
      message0: "set %1 sound threshold to %2",
      args0: [
        {
          type: "field_dropdown",
          name: "sound",
          options: [["loud", "Loud"], ["quiet", "Quiet"]]
        },
        { type: "input_value", name: "value", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Set the sound threshold",
      helpUrl: ""
    },
    {
      type: "input_on_logo_event",
      message0: "run code on logo %1 %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "ACTION",
          options: [["action", "Pressed"], ["released", "Released"], ["long pressed", "LongPressed"]]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: "Run when logo touch event happens (micro:bit V2)",
      helpUrl: ""
    },
    {
      type: "input_logo_is_pressed",
      message0: "logo is pressed",
      output: "Boolean",
      colour: 290,
      tooltip: "Checks if logo is currently pressed",
      helpUrl: ""
    },
    {
      type: "input_sound_level",
      message0: "sound level",
      output: "Number",
      colour: 290,
      tooltip: "Microphone sound level (0-255)",
      helpUrl: ""
    },
    {
      type: "radio_broadcast_message",
      message0: "radio send %1",
      args0: [
        {
          type: "input_value",
          name: "msg",
          check: "Number"
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#e91e63",
      tooltip: "Broadcasts a message over radio",
      helpUrl: ""
    },
    {
      type: "radio_on_message_received",
      message0: "on radio %1 received %2 %3",
      args0: [
        {
          type: "input_value",
          name: "msg",
          check: "Number"
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#e91e63",
      tooltip: "Registers code to run for a particular message",
      helpUrl: ""
    },
    {
      type: "radio_message_code",
      message0: "%1",
      args0: [
        {
          type: "field_dropdown",
          name: "message",
          options: [["message1", "message1"]]
        }
      ],
      output: "Number",
      colour: "#e91e63",
      tooltip: "A radio message",
      helpUrl: ""
    },
    {
      type: "music_play_melody",
      message0: "play melody %1 at tempo %2 (bpm) %3",
      args0: [
        {
          type: "field_dropdown",
          name: "MELODY",
          options: [
            ["dadadum", "DADADUM"],
            ["entertainer", "ENTERTAINER"],
            ["blues", "BLUES"],
            ["birthday", "BIRTHDAY"],
            ["wedding", "WEDDING"],
            ["funk", "FUNK"]
          ]
        },
        {
          type: "field_number",
          name: "TEMPO",
          value: 120,
          min: 40,
          max: 300,
          precision: 1
        },
        {
          type: "field_dropdown",
          name: "PLAYMODE",
          options: [
            ["until done", "UNTIL_DONE"],
            ["in background", "IN_BACKGROUND"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Play built-in melody",
      helpUrl: ""
    },
    {
      type: "music_play_tone",
      message0: "play tone %1 Hz for %2 ms",
      args0: [
        { type: "input_value", name: "HZ", check: "Number" },
        { type: "input_value", name: "MS", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Play tone",
      helpUrl: ""
    },
    {
      type: "music_play_tone_note_beats",
      message0: "play tone %1 for %2 beat %3",
      args0: [
        {
          type: "field_dropdown",
          name: "NOTE",
          options: [
            ["Middle C", "C"],
            ["D", "D"],
            ["E", "E"],
            ["F", "F"],
            ["G", "G"],
            ["A", "A"],
            ["B", "B"]
          ]
        },
        {
          type: "field_number",
          name: "BEATS",
          value: 1,
          min: 0.25,
          max: 16,
          precision: 0.25
        },
        {
          type: "field_dropdown",
          name: "PLAYMODE",
          options: [
            ["until done", "UNTIL_DONE"],
            ["in background", "IN_BACKGROUND"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Play note for beats",
      helpUrl: ""
    },
    {
      type: "music_ringtone_play",
      message0: "ring tone (Hz) %1",
      args0: [
        {
          type: "field_dropdown",
          name: "NOTE",
          options: [
            ["Middle C", "C"],
            ["D", "D"],
            ["E", "E"],
            ["F", "F"],
            ["G", "G"],
            ["A", "A"],
            ["B", "B"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Ring tone continuously",
      helpUrl: ""
    },
    {
      type: "music_rest_beat",
      message0: "rest for %1 beat",
      args0: [
        {
          type: "field_number",
          name: "BEATS",
          value: 1,
          min: 0.25,
          max: 16,
          precision: 0.25
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Rest for beat duration",
      helpUrl: ""
    },
    {
      type: "music_note_value",
      message0: "%1",
      args0: [
        {
          type: "field_dropdown",
          name: "NOTE",
          options: [
            ["Middle C", "C"],
            ["D", "D"],
            ["E", "E"],
            ["F", "F"],
            ["G", "G"],
            ["A", "A"],
            ["B", "B"]
          ]
        }
      ],
      output: "Number",
      colour: 20,
      tooltip: "Note value reporter",
      helpUrl: ""
    },
    {
      type: "music_set_volume",
      message0: "set volume %1",
      args0: [
        {
          type: "field_number",
          name: "VOL",
          value: 127,
          min: 0,
          max: 255,
          precision: 1
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Set volume",
      helpUrl: ""
    },
    {
      type: "music_get_volume",
      message0: "volume",
      output: "Number",
      colour: 20,
      tooltip: "Current volume",
      helpUrl: ""
    },
    {
      type: "music_stop_all_sounds",
      message0: "stop all sounds",
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Stop all music output",
      helpUrl: ""
    },
    {
      type: "music_change_tempo",
      message0: "change tempo by (bpm) %1",
      args0: [
        {
          type: "field_number",
          name: "DELTA",
          value: 20,
          min: -300,
          max: 300,
          precision: 1
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Change tempo",
      helpUrl: ""
    },
    {
      type: "music_set_tempo",
      message0: "set tempo to (bpm) %1",
      args0: [
        {
          type: "field_number",
          name: "TEMPO",
          value: 120,
          min: 40,
          max: 300,
          precision: 1
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Set tempo",
      helpUrl: ""
    },
    {
      type: "music_beat_value",
      message0: "%1 beat",
      args0: [
        {
          type: "field_number",
          name: "BEATS",
          value: 1,
          min: 0.25,
          max: 16,
          precision: 0.25
        }
      ],
      output: "Number",
      colour: 20,
      tooltip: "Beat duration value",
      helpUrl: ""
    },
    {
      type: "music_get_tempo",
      message0: "tempo (bpm)",
      output: "Number",
      colour: 20,
      tooltip: "Current tempo",
      helpUrl: ""
    },
    {
      type: "music_on_event",
      message0: "run code music on %1 %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "EVENT",
          options: [
            ["value", "MelodyNotePlayed"],
            ["background melody ended", "BackgroundMelodyEnded"]
          ]
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Run code when selected music event occurs",
      helpUrl: ""
    },
    {
      type: "music_play_melody_advanced",
      message0: "play melody %1 %2",
      args0: [
        {
          type: "field_dropdown",
          name: "MELODY",
          options: [
            ["dadadum", "DADADUM"],
            ["entertainer", "ENTERTAINER"],
            ["blues", "BLUES"],
            ["birthday", "BIRTHDAY"],
            ["wedding", "WEDDING"],
            ["funk", "FUNK"]
          ]
        },
        {
          type: "field_dropdown",
          name: "PLAYMODE",
          options: [
            ["in background", "IN_BACKGROUND"],
            ["until done", "UNTIL_DONE"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Play melody advanced",
      helpUrl: ""
    },
    {
      type: "music_stop_melody",
      message0: "stop melody %1",
      args0: [
        {
          type: "field_dropdown",
          name: "STOPMODE",
          options: [
            ["all", "All"],
            ["foreground", "Foreground"],
            ["background", "Background"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Stop melody",
      helpUrl: ""
    },
    {
      type: "music_on_melody_note_played",
      message0: "music on melody note played %1 %2",
      args0: [
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Event when melody note plays",
      helpUrl: ""
    },
    {
      type: "music_play_giggle",
      message0: "play giggle %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PLAYMODE",
          options: [
            ["until done", "UNTIL_DONE"],
            ["in background", "IN_BACKGROUND"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Play built-in sound effect",
      helpUrl: ""
    },
    {
      type: "music_play_sound_effect",
      message0: "play soundExpression %1 %2",
      args0: [
        { type: "input_value", name: "EFFECT", check: "String" },
        {
          type: "field_dropdown",
          name: "PLAYMODE",
          options: [
            ["until done", "UNTIL_DONE"],
            ["in background", "IN_BACKGROUND"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Play custom sound effect",
      helpUrl: ""
    },
    {
      type: "music_create_sound_effect",
      message0: "sound effect %1",
      args0: [
        {
          type: "field_dropdown",
          name: "SHAPE",
          options: [
            ["sine", "Sine"],
            ["sawtooth", "Sawtooth"],
            ["triangle", "Triangle"],
            ["square", "Square"]
          ]
        }
      ],
      output: "String",
      colour: 20,
      tooltip: "Create sound effect value",
      helpUrl: ""
    },
    {
      type: "music_sound_is_playing",
      message0: "sound is playing",
      output: "Boolean",
      colour: 20,
      tooltip: "Returns whether sound is currently playing",
      helpUrl: ""
    },
    {
      type: "music_set_built_in_speaker_enabled",
      message0: "set built-in speaker %1",
      args0: [
        {
          type: "field_dropdown",
          name: "ENABLED",
          options: [
            ["enabled", "true"],
            ["disabled", "false"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "Enable or disable built-in speaker",
      helpUrl: ""
    },
    {
      type: "led_plot",
      message0: "plot x %1 y %2",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Turn on single LED",
      helpUrl: ""
    },
    {
      type: "led_unplot",
      message0: "unplot x %1 y %2",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Turn off single LED",
      helpUrl: ""
    },
    {
      type: "led_toggle",
      message0: "toggle x %1 y %2",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Toggle LED state",
      helpUrl: ""
    },
    {
      type: "led_point",
      message0: "point x %1 y %2",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" }
      ],
      output: "Boolean",
      colour: 260,
      tooltip: "Read LED state",
      helpUrl: ""
    },
    {
      type: "led_plot_bar_graph",
      message0: "plot bar graph of %1 up to %2",
      args0: [
        { type: "input_value", name: "VALUE", check: "Number" },
        { type: "input_value", name: "HIGH", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Displays a vertical bar graph",
      helpUrl: ""
    },
    {
      type: "led_set_brightness",
      message0: "set brightness %1",
      args0: [{ type: "input_value", name: "VALUE", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Set the screen brightness",
      helpUrl: ""
    },
    {
      type: "led_brightness",
      message0: "brightness",
      output: "Number",
      colour: 260,
      tooltip: "Get the screen brightness",
      helpUrl: ""
    },
    {
      type: "led_stop_animation",
      message0: "stop animation",
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Stop current animation",
      helpUrl: ""
    },
    {
      type: "led_set_display_mode",
      message0: "set display mode %1",
      args0: [
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["black and white", "BlackAndWhite"],
            ["greyscale", "Greyscale"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Set display mode",
      helpUrl: ""
    },
    {
      type: "led_enable",
      message0: "led enable %1",
      args0: [
        {
          type: "field_dropdown",
          name: "ON",
          options: [
            ["true", "true"],
            ["false", "false"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Enable or disable LED display",
      helpUrl: ""
    },
    {
      type: "led_plot_brightness",
      message0: "plot x %1 y %2 brightness %3",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" },
        { type: "input_value", name: "BRIGHTNESS", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 260,
      tooltip: "Turn on single LED with brightness",
      helpUrl: ""
    },
    {
      type: "led_point_brightness",
      message0: "point x %1 y %2 brightness",
      args0: [
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" }
      ],
      output: "Number",
      colour: 260,
      tooltip: "Read LED brightness",
      helpUrl: ""
    },
    {
      type: "radio_set_group",
      message0: "radio set group %1",
      args0: [{ type: "input_value", name: "GROUP", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Set radio group",
      helpUrl: ""
    },
    {
      type: "radio_send_number",
      message0: "radio send number %1",
      args0: [{ type: "input_value", name: "NUM", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Send a number on radio",
      helpUrl: ""
    },
    {
      type: "radio_send_string",
      message0: "radio send string %1",
      args0: [{ type: "input_value", name: "TEXT", check: "String" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Send text on radio",
      helpUrl: ""
    },
    {
      type: "radio_send_value",
      message0: "radio send value %1 = %2",
      args0: [
        { type: "input_value", name: "NAME", check: "String" },
        { type: "input_value", name: "VALUE", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Send a name and numeric value on radio",
      helpUrl: ""
    },
    {
      type: "radio_on_received_number",
      message0: "on radio received %1",
      args0: [
        { type: "input_value", name: "receivedNumber", check: "Number" }
      ],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      inputsInline: true,
      tooltip: "Run when radio receives number",
      helpUrl: ""
    },
    {
      type: "radio_on_received_string",
      message0: "on radio received %1",
      args0: [
        { type: "input_value", name: "receivedString", check: "String" }
      ],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      inputsInline: true,
      tooltip: "Run when radio receives text",
      helpUrl: ""
    },
    {
      type: "radio_on_received_value",
      message0: "on radio received %1 %2",
      args0: [
        { type: "input_value", name: "name", check: "String" },
        { type: "input_value", name: "value", check: "Number" }
      ],
      message1: "%1",
      args1: [{ type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      inputsInline: true,
      tooltip: "Run when radio receives a name and value",
      helpUrl: ""
    },
    {
      type: "radio_received_packet",
      message0: "received packet %1",
      args0: [
        {
          type: "field_dropdown",
          name: "TYPE",
          options: [
            ["signal strength", "SignalStrength"],
            ["time", "Time"],
            ["serial number", "SerialNumber"]
          ]
        }
      ],
      output: "Number",
      colour: "#E3008C",
      tooltip: "Properties of last received packet",
      helpUrl: ""
    },
    {
      type: "radio_set_transmit_power",
      message0: "radio set transmit power %1",
      args0: [{ type: "input_value", name: "POWER", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Set transmit power",
      helpUrl: ""
    },
    {
      type: "radio_set_transmit_serial_number",
      message0: "radio set transmit serial number %1",
      args0: [
        {
          type: "field_dropdown",
          name: "TRANSMIT",
          options: [
            ["true", "true"],
            ["false", "false"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Set transmit serial number",
      helpUrl: ""
    },
    {
      type: "radio_set_frequency_band",
      message0: "radio set frequency band %1",
      args0: [{ type: "input_value", name: "BAND", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Set frequency band",
      helpUrl: ""
    },
    {
      type: "radio_raise_event",
      message0: "radio raise event",
      message1: "from source %1",
      args1: [
        {
          type: "field_dropdown",
          name: "SRC",
          options: [
            ["MICROBIT_ID_BUTTON_A", "1"],
            ["MICROBIT_ID_BUTTON_B", "2"],
            ["MICROBIT_ID_BUTTON_AB", "3"],
            ["MICROBIT_ID_RADIO", "9"],
            ["MICROBIT_ID_GESTURE", "13"],
            ["MICROBIT_ID_ACCELEROMETER", "5"],
            ["MICROBIT_ID_IO_P0", "100"],
            ["MICROBIT_ID_IO_P1", "101"],
            ["MICROBIT_ID_IO_P2", "102"]
          ]
        }
      ],
      message2: "with value %1",
      args2: [
        {
          type: "field_dropdown",
          name: "VALUE",
          options: [
            ["MICROBIT_EVT_ANY", "0"],
            ["MICROBIT_BUTTON_EVT_DOWN", "1"],
            ["MICROBIT_BUTTON_EVT_UP", "2"],
            ["MICROBIT_BUTTON_EVT_CLICK", "3"],
            ["MICROBIT_RADIO_EVT_DATAGRAM", "1"],
            ["MICROBIT_PIN_EVT_RISE", "2"],
            ["MICROBIT_PIN_EVT_FALL", "3"]
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#E3008C",
      tooltip: "Raise an event over radio",
      helpUrl: ""
    },
    {
      type: "loops_every_interval",
      message0: "every %1 ms %2 %3",
      args0: [
        { type: "input_value", name: "TIME", check: "Number" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
      tooltip: "Run code at fixed interval in milliseconds",
      helpUrl: ""
    },
    {
      type: "loops_break",
      message0: "break",
      previousStatement: null,
      colour: 120,
      tooltip: "Break out of the loop",
      helpUrl: ""
    },
    {
      type: "loops_continue",
      message0: "continue",
      previousStatement: null,
      colour: 120,
      tooltip: "Continue with the next iteration of the loop",
      helpUrl: ""
    },
    {
      type: "logic_if_simple",
      message0: "if %1 %2 %3",
      args0: [
        { type: "input_value", name: "COND", check: "Boolean" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 200,
      tooltip: "If condition is true, run enclosed code",
      helpUrl: ""
    },
    {
      type: "logic_if_else_simple",
      message0: "if %1 %2 %3 else %4 %5",
      args0: [
        { type: "input_value", name: "COND", check: "Boolean" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
        { type: "input_dummy" },
        { type: "input_statement", name: "ELSE" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 200,
      tooltip: "If/else control block",
      helpUrl: ""
    },
    {
      type: "variables_item_equals_number",
      message0: "item = %1",
      args0: [{ type: "input_value", name: "VALUE", check: "Number" }],
      previousStatement: null,
      nextStatement: null,
      colour: 350,
      tooltip: "Declare a variable named item",
      helpUrl: ""
    },
    {
      type: "math_max2",
      message0: "max %1 %2",
      args0: [
        { type: "input_value", name: "A", check: "Number" },
        { type: "input_value", name: "B", check: "Number" }
      ],
      output: "Number",
      colour: 230,
      tooltip: "Largest of two numbers",
      helpUrl: ""
    },
    {
      type: "math_min2",
      message0: "min %1 %2",
      args0: [
        { type: "input_value", name: "A", check: "Number" },
        { type: "input_value", name: "B", check: "Number" }
      ],
      output: "Number",
      colour: 230,
      tooltip: "Smallest of two numbers",
      helpUrl: ""
    },
    {
      type: "math_trunc",
      message0: "trunc %1",
      args0: [{ type: "input_value", name: "NUM", check: "Number" }],
      output: "Number",
      colour: 230,
      tooltip: "Truncate decimal part of number",
      helpUrl: ""
    },
    {
      type: "math_random_bool",
      message0: "pick random true or false",
      output: "Boolean",
      colour: 230,
      tooltip: "Random boolean value",
      helpUrl: ""
    },
    {
      type: "math_map_value",
      message0: "map value %1 from low %2 high %3 to low %4 high %5",
      args0: [
        { type: "input_value", name: "VALUE", check: "Number" },
        { type: "input_value", name: "FROM_LOW", check: "Number" },
        { type: "input_value", name: "FROM_HIGH", check: "Number" },
        { type: "input_value", name: "TO_LOW", check: "Number" },
        { type: "input_value", name: "TO_HIGH", check: "Number" }
      ],
      output: "Number",
      colour: 230,
      tooltip: "Map a number from one range to another",
      helpUrl: ""
    },
    {
      type: "text_parse_to_number",
      message0: "parse to number %1",
      args0: [{ type: "input_value", name: "TEXT", check: "String" }],
      output: "Number",
      colour: 160,
      tooltip: "Convert text to number",
      helpUrl: ""
    },
    {
      type: "text_split_with",
      message0: "split %1 at %2",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "SEP", check: "String" }
      ],
      output: "Array",
      colour: 160,
      tooltip: "Split text into array by separator",
      helpUrl: ""
    },
    {
      type: "text_includes",
      message0: "%1 includes %2",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "FIND", check: "String" }
      ],
      output: "Boolean",
      colour: 160,
      tooltip: "True if text includes another text",
      helpUrl: ""
    },
    {
      type: "text_substring_length",
      message0: "substring of %1 from %2 of length %3",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "FROM", check: "Number" },
        { type: "input_value", name: "LEN", check: "Number" }
      ],
      output: "String",
      colour: 160,
      tooltip: "Get substring by start and length",
      helpUrl: ""
    },
    {
      type: "text_compare_to",
      message0: "compare %1 to %2",
      args0: [
        { type: "input_value", name: "A", check: "String" },
        { type: "input_value", name: "B", check: "String" }
      ],
      output: "Number",
      colour: 160,
      tooltip: "Compare two strings",
      helpUrl: ""
    },
    {
      type: "text_char_code_at",
      message0: "char code from %1 at %2",
      args0: [
        { type: "input_value", name: "TEXT", check: "String" },
        { type: "input_value", name: "INDEX", check: "Number" }
      ],
      output: "Number",
      colour: 160,
      tooltip: "Character code at index",
      helpUrl: ""
    },
    {
      type: "text_convert_number_to_text",
      message0: "convert %1 to text",
      args0: [{ type: "input_value", name: "NUM", check: "Number" }],
      output: "String",
      colour: 160,
      tooltip: "Convert number to string",
      helpUrl: ""
    },
    {
      type: "text_from_char_code",
      message0: "text from char code %1",
      args0: [{ type: "input_value", name: "CODE", check: "Number" }],
      output: "String",
      colour: 160,
      tooltip: "Convert character code to text",
      helpUrl: ""
    },
    {
      type: "game_create_sprite",
      message0: "create %1 at x %2 y %3",
      args0: [
        { type: "field_variable", name: "VAR", variable: "sprite" },
        { type: "input_value", name: "X", check: "Number" },
        { type: "input_value", name: "Y", check: "Number" }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 160
    },
    {
      type: "game_delete_sprite",
      message0: "delete %1",
      args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }],
      previousStatement: null,
      nextStatement: null,
      colour: 160
    },
    { type: "game_sprite_is_deleted", message0: "is %1 deleted", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }], output: "Boolean", colour: 160 },
    { type: "game_sprite_move_by", message0: "%1 move by %2", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }, { type: "input_value", name: "BY", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_sprite_turn_by", message0: "%1 turn %2 by (°) %3", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }, { type: "field_dropdown", name: "DIR", options: [["right", "Right"], ["left", "Left"]] }, { type: "input_value", name: "DEG", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_sprite_change_x_by", message0: "%1 change x by %2", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }, { type: "input_value", name: "BY", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_sprite_set_x_to", message0: "%1 set x to %2", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }, { type: "input_value", name: "X", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_sprite_x", message0: "%1 x", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }], output: "Number", colour: 160 },
    { type: "game_sprite_is_touching", message0: "is %1 touching %2", args0: [{ type: "field_variable", name: "A", variable: "sprite" }, { type: "field_variable", name: "B", variable: "otherSprite" }], output: "Boolean", colour: 160 },
    { type: "game_sprite_is_touching_edge", message0: "is %1 touching edge", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }], output: "Boolean", colour: 160 },
    { type: "game_sprite_if_on_edge_bounce", message0: "%1 if on edge, bounce", args0: [{ type: "field_variable", name: "SPRITE", variable: "sprite" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_remove_life", message0: "remove life %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_add_life", message0: "add life %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_set_life", message0: "set life %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_set_score", message0: "set score %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_change_score_by", message0: "change score by %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_start_countdown", message0: "start countdown (ms) %1", args0: [{ type: "input_value", name: "MS", check: "Number" }], previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_score", message0: "score", output: "Number", colour: 160 },
    { type: "game_over", message0: "game over", previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_is_over", message0: "is game over", output: "Boolean", colour: 160 },
    { type: "game_is_paused", message0: "is paused", output: "Boolean", colour: 160 },
    { type: "game_is_running", message0: "is running", output: "Boolean", colour: 160 },
    { type: "game_resume", message0: "resume", previousStatement: null, nextStatement: null, colour: 160 },
    { type: "game_pause", message0: "pause", previousStatement: null, nextStatement: null, colour: 160 },
    { type: "images_show_image_offset", message0: "show image %1 at offset %2", args0: [{ type: "input_value", name: "IMG" }, { type: "input_value", name: "OFFSET", check: "Number" }], previousStatement: null, nextStatement: null, colour: 280 },
    { type: "images_scroll_image", message0: "scroll image %1 with offset %2 and interval (ms) %3", args0: [{ type: "input_value", name: "IMG" }, { type: "input_value", name: "OFFSET", check: "Number" }, { type: "input_value", name: "INTERVAL", check: "Number" }], previousStatement: null, nextStatement: null, colour: 280 },
    { type: "images_create_image", message0: "create image %1", args0: [{ type: "field_input", name: "MATRIX", text: "# # # # #\n# . . . #\n# . # . #\n# . . . #\n# # # # #" }], output: "String", colour: 280 },
    { type: "images_create_big_image", message0: "create big image %1", args0: [{ type: "field_input", name: "MATRIX", text: "# # # # # # # # # #\n# . . . # # . . . #\n# . # . # # . # . #\n# . . . # # . . . #\n# # # # # # # # # #" }], output: "String", colour: 280 },
    { type: "images_direction", message0: "%1", args0: [{ type: "field_dropdown", name: "DIR", options: [["North", "North"], ["East", "East"], ["South", "South"], ["West", "West"]] }], output: "String", colour: 280 },
    { type: "images_icon_image", message0: "icon image %1", args0: [{ type: "field_dropdown", name: "ICON", options: [["heart", "Heart"], ["small heart", "SmallHeart"], ["yes", "Yes"], ["no", "No"]] }], output: "String", colour: 280 },
    { type: "images_arrow_image", message0: "arrow image %1", args0: [{ type: "field_dropdown", name: "ARROW", options: [["North", "North"], ["East", "East"], ["South", "South"], ["West", "West"]] }], output: "String", colour: 280 },
    { type: "pins_digital_read_pin", message0: "digital read pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], output: "Number", colour: 0 },
    { type: "pins_digital_write_pin", message0: "digital write pin %1 to %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "VAL", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_analog_read_pin", message0: "analog read pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], output: "Number", colour: 0 },
    { type: "pins_analog_write_pin", message0: "analog write pin %1 to %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "VAL", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_map", message0: "map %1 from low %2 from high %3 to low %4 to high %5", args0: [{ type: "input_value", name: "VALUE", check: "Number" }, { type: "input_value", name: "FROM_LOW", check: "Number" }, { type: "input_value", name: "FROM_HIGH", check: "Number" }, { type: "input_value", name: "TO_LOW", check: "Number" }, { type: "input_value", name: "TO_HIGH", check: "Number" }], output: "Number", colour: 0 },
    { type: "pins_analog_set_period_pin", message0: "analog set period pin %1 to (us) %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "US", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_set_audio_pin", message0: "set audio pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_set_audio_pin_enabled", message0: "set audio pin enabled %1", args0: [{ type: "field_dropdown", name: "EN", options: [["false", "false"], ["true", "true"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_servo_write_pin", message0: "servo write pin %1 to %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "VAL", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_servo_set_pulse", message0: "servo set pulse pin %1 to (us) %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "US", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "serial_write_line", message0: "serial write line %1", args0: [{ type: "input_value", name: "TEXT", check: "String" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_write_number", message0: "serial write number %1", args0: [{ type: "input_value", name: "NUM", check: "Number" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_write_value_pair", message0: "serial write value %1 = %2", args0: [{ type: "input_value", name: "NAME", check: "String" }, { type: "input_value", name: "VAL", check: "Number" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_write_string", message0: "serial write string %1", args0: [{ type: "input_value", name: "TEXT", check: "String" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_write_numbers", message0: "serial write numbers %1", args0: [{ type: "input_value", name: "ARR", check: "Array" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_read_line", message0: "serial read line", output: "String", colour: 220 },
    { type: "serial_read_until", message0: "serial read until %1", args0: [{ type: "field_dropdown", name: "DELIM", options: [["new line ( )", "\\n"], ["comma (,)", ","], ["space", " "]] }], output: "String", colour: 220 },
    { type: "serial_on_data_received", message0: "serial on data received %1 %2 %3", args0: [{ type: "field_dropdown", name: "DELIM", options: [["new line ( )", "\\n"], ["comma (,)", ","], ["space", " "]] }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_read_string", message0: "serial read string", output: "String", colour: 220 },
    { type: "serial_redirect_to", message0: "serial redirect to TX %1 RX %2 at baud rate %3", args0: [{ type: "field_dropdown", name: "TX", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "RX", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "BAUD", options: [["115200", "115200"], ["9600", "9600"], ["57600", "57600"]] }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_redirect_to_usb", message0: "serial redirect to USB", previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_set_tx_buffer_size", message0: "serial set tx buffer size to %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_set_rx_buffer_size", message0: "serial set rx buffer size to %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_write_buffer", message0: "serial write buffer %1", args0: [{ type: "input_value", name: "BUF" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_read_buffer", message0: "serial read buffer %1", args0: [{ type: "input_value", name: "N", check: "Number" }], output: "Array", colour: 220 },
    { type: "serial_set_write_line_padding", message0: "serial set write line padding to %1", args0: [{ type: "input_value", name: "N", check: "Number" }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "serial_set_baud_rate", message0: "serial set baud rate %1", args0: [{ type: "field_dropdown", name: "BAUD", options: [["115200", "115200"], ["9600", "9600"], ["57600", "57600"]] }], previousStatement: null, nextStatement: null, colour: 220 },
    { type: "control_wait_for_event", message0: "wait for event from %1 with value %2", args0: [{ type: "input_value", name: "SRC", check: "Number" }, { type: "input_value", name: "VAL", check: "Number" }], previousStatement: null, nextStatement: null, colour: 210 },
    { type: "control_run_in_background", message0: "run in background %1 %2", args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, colour: 210 },
    { type: "control_millis", message0: "millis (ms)", output: "Number", colour: 210 },
    { type: "control_reset", message0: "reset", previousStatement: null, nextStatement: null, colour: 210 },
    { type: "control_wait_micros", message0: "wait (us) %1", args0: [{ type: "input_value", name: "US", check: "Number" }], previousStatement: null, nextStatement: null, colour: 210 },
    { type: "control_raise_event", message0: "raise event from source %1 with value %2", args0: [{ type: "field_dropdown", name: "SRC", options: [["MICROBIT_ID_BUTTON_A", "MICROBIT_ID_BUTTON_A"], ["MICROBIT_ID_BUTTON_B", "MICROBIT_ID_BUTTON_B"]] }, { type: "field_dropdown", name: "VAL", options: [["MICROBIT_EVT_ANY", "MICROBIT_EVT_ANY"], ["MICROBIT_BUTTON_EVT_CLICK", "MICROBIT_BUTTON_EVT_CLICK"]] }], previousStatement: null, nextStatement: null, colour: 210 },
    { type: "control_on_event", message0: "on event from %1 with value %2 %3 %4", args0: [{ type: "field_dropdown", name: "SRC", options: [["MICROBIT_ID_BUTTON_A", "MICROBIT_ID_BUTTON_A"], ["MICROBIT_ID_BUTTON_B", "MICROBIT_ID_BUTTON_B"]] }, { type: "field_dropdown", name: "VAL", options: [["MICROBIT_EVT_ANY", "MICROBIT_EVT_ANY"], ["MICROBIT_BUTTON_EVT_CLICK", "MICROBIT_BUTTON_EVT_CLICK"]] }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, colour: 210 },
    { type: "control_event_timestamp", message0: "event timestamp", output: "Number", colour: 210 },
    { type: "control_event_value", message0: "event value", output: "Number", colour: 210 },
    { type: "pins_digital_pin", message0: "digital pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], output: "String", colour: 0 },
    { type: "pins_analog_pin", message0: "analog pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], output: "String", colour: 0 },
    { type: "pins_set_pull", message0: "set pull pin %1 to %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "PULL", options: [["up", "UP"], ["down", "DOWN"], ["none", "NONE"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_analog_pitch", message0: "analog pitch %1 for (ms) %2", args0: [{ type: "input_value", name: "freq", check: "Number" }, { type: "input_value", name: "ms", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_set_pin_events", message0: "set pin %1 to emit %2 events", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "EDGE", options: [["edge", "Edge.None"], ["pulse", "Edge.Pulse"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_analog_set_pitch_pin", message0: "analog set pitch pin %1", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_neopixel_matrix_width", message0: "neopixel matrix width pin %1 %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "input_value", name: "width", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_on_pulsed", message0: "on pin %1 pulsed %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "PULSE", options: [["high", "PulseValue.High"], ["low", "PulseValue.Low"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_pulse_duration", message0: "pulse duration (µs)", output: "Number", colour: 0 },
    { type: "pins_pulse_in", message0: "pulse in (µs) pin %1 pulsed %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "PULSE", options: [["high", "PulseValue.High"], ["low", "PulseValue.Low"]] }], output: "Number", colour: 0 },
    { type: "pins_i2c_read_number", message0: "i2c read number at address %1 of format %2 repeated %3", args0: [{ type: "input_value", name: "address", check: "Number" }, { type: "field_dropdown", name: "format", options: [["Int8LE", "NumberFormat.Int8LE"], ["UInt8LE", "NumberFormat.UInt8LE"]] }, { type: "field_dropdown", name: "repeated", options: [["false", "false"], ["true", "true"]] }], output: "Number", colour: 0 },
    { type: "pins_i2c_write_number", message0: "i2c write number at address %1 with value %2 of format %3 repeated %4", args0: [{ type: "input_value", name: "address", check: "Number" }, { type: "input_value", name: "value", check: "Number" }, { type: "field_dropdown", name: "format", options: [["Int8LE", "NumberFormat.Int8LE"], ["UInt8LE", "NumberFormat.UInt8LE"]] }, { type: "field_dropdown", name: "repeated", options: [["false", "false"], ["true", "true"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_spi_frequency", message0: "spi frequency %1", args0: [{ type: "input_value", name: "frequency", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_spi_format", message0: "spi format bits %1 mode %2", args0: [{ type: "input_value", name: "bits", check: "Number" }, { type: "input_value", name: "mode", check: "Number" }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_spi_write", message0: "spi write %1", args0: [{ type: "input_value", name: "value", check: "Number" }], output: "Number", colour: 0 },
    { type: "pins_spi_set_pins", message0: "spi set pins MOSI %1 MISO %2 SCK %3", args0: [{ type: "field_dropdown", name: "MOSI", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "MISO", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "SCK", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "pins_set_touch_mode", message0: "set %1 to touch mode %2", args0: [{ type: "field_dropdown", name: "PIN", options: [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]] }, { type: "field_dropdown", name: "MODE", options: [["capacitive", "TouchMode.Capacitive"], ["resistive", "TouchMode.Resistive"]] }], previousStatement: null, nextStatement: null, colour: 0 },
    { type: "control_event_value_id", message0: "%1", args0: [{ type: "field_dropdown", name: "VAL", options: [["MICROBIT_EVT_ANY", "MICROBIT_EVT_ANY"], ["MICROBIT_BUTTON_EVT_CLICK", "MICROBIT_BUTTON_EVT_CLICK"]] }], output: "Number", colour: 210 },
    { type: "control_event_source_id", message0: "%1", args0: [{ type: "field_dropdown", name: "SRC", options: [["MICROBIT_ID_BUTTON_A", "MICROBIT_ID_BUTTON_A"], ["MICROBIT_ID_BUTTON_B", "MICROBIT_ID_BUTTON_B"]] }], output: "Number", colour: 210 },
    { type: "control_device_name", message0: "device name", output: "String", colour: 210 },
    { type: "control_device_serial_number", message0: "device serial number", output: "String", colour: 210 }
  ]);

  setDuplicateOnDrag("radio_on_received_number", "receivedNumber");
  setDuplicateOnDrag("radio_on_received_string", "receivedString");
  setDuplicateOnDrag("radio_on_received_value", "name");
  setDuplicateOnDrag("radio_on_received_value", "value");

  defineBlock("device_show_leds", {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField("show leds")
        .appendField(
          new FieldLedMatrix(". . . . .\n. . . . .\n. . . . .\n. . . . .\n. . . . .", {
            columns: 5,
            rows: 5,
            scale: 0.72,
            onColor: "#9fd0ff",
            offColor: "#1d73c9"
          }),
          "MATRIX"
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
      this.setTooltip("Show 5x5 LED pattern");
      this.setHelpUrl("");
    }
  });

  asAny.forBlock["on_start"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const body = generator.statementToCode(block, "DO");
    return `// on start\n${body}`;
  };

  asAny.forBlock["device_on_start"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const body = generator.statementToCode(block, "DO");
    return `\n${body}\n`;
  };

  asAny.forBlock["basic_forever"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const body = generator.statementToCode(block, "DO");
    return `basic.forever(function () {\n${body}});\n`;
  };

  asAny.forBlock["device_forever"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const body = generator.statementToCode(block, "DO");
    return `basic.forever(function () {\n${body}});\n`;
  };

  asAny.forBlock["basic_pause"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const time = generator.valueToCode(block, "TIME", Order.NONE) || "100";
    return `basic.pause(${time});\n`;
  };

  asAny.forBlock["device_pause"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const time = generator.valueToCode(block, "time", Order.NONE) || "100";
    return `basic.pause(${time});\n`;
  };

  asAny.forBlock["device_show_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const num = generator.valueToCode(block, "NUM", Order.NONE) || "0";
    return `basic.showNumber(${num});\n`;
  };

  asAny.forBlock["device_show_string"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"\"";
    // Ensure we are passing a string to showString
    return `basic.showString("" + ${text});\n`;
  };

  asAny.forBlock["device_show_icon"] = (block: Blockly.Block) => {
    const icon = block.getFieldValue("ICON") || "Heart";
    return `basic.showIcon(IconNames.${icon});\n`;
  };

  asAny.forBlock["device_show_arrow"] = (block: Blockly.Block) => {
    const arrow = block.getFieldValue("ARROW") || "North";
    return `basic.showArrow(ArrowNames.${arrow});\n`;
  };

  asAny.forBlock["device_show_leds"] = (block: Blockly.Block) => {
    const matrix = String(block.getFieldValue("MATRIX") || "");
    const lines = matrix
      .split("\n")
      .filter((row) => /[.#01]/.test(row))
      .map((row) => row.replace(/\./g, "0").replace(/#/g, "1").replace(/\s+/g, ""));
    const normalized = [...lines, "00000", "00000", "00000", "00000", "00000"].slice(0, 5);
    return `basic.showLeds(\`\n${normalized.join("\n")}\n\`);\n`;
  };

  asAny.forBlock["device_clear_screen"] = () => "basic.clearScreen();\n";

  asAny.forBlock["input_on_button_pressed"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const btn = block.getFieldValue("BTN") || "A";
    const body = generator.statementToCode(block, "DO");
    return `input.onButtonPressed(Button.${btn}, function () {\n${body}});\n`;
  };

  asAny.forBlock["input_on_gesture"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const gesture = block.getFieldValue("GESTURE") || "SHAKE";
    const body = generator.statementToCode(block, "DO");
    return `input.onGesture(Gesture.${gesture}, function () {\n${body}});\n`;
  };

  asAny.forBlock["input_button_is_pressed"] = (block: Blockly.Block) => {
    const btn = block.getFieldValue("BTN") || "A";
    return [`input.buttonIsPressed(Button.${btn})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["input_on_pin_pressed"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const pin = block.getFieldValue("PIN") || "P0";
    const body = generator.statementToCode(block, "DO");
    return `input.onPinPressed(TouchPin.${pin}, function () {\n${body}});\n`;
  };

  asAny.forBlock["input_acceleration"] = (block: Blockly.Block) => {
    const dim = block.getFieldValue("DIM") || "X";
    return [`input.acceleration(Dimension.${dim})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["input_pin_is_pressed"] = (block: Blockly.Block) => {
    const pin = block.getFieldValue("PIN") || "P0";
    return [`input.pinIsPressed(TouchPin.${pin})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["input_light_level"] = () => ["input.lightLevel()", Order.FUNCTION_CALL];

  asAny.forBlock["input_compass_heading"] = () => ["input.compassHeading()", Order.FUNCTION_CALL];

  asAny.forBlock["input_temperature"] = () => ["input.temperature()", Order.FUNCTION_CALL];

  asAny.forBlock["input_is_gesture"] = (block: Blockly.Block) => {
    const gesture = block.getFieldValue("GESTURE") || "SHAKE";
    return [`input.isGesture(Gesture.${gesture})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["input_on_sound"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const sound = block.getFieldValue('SOUND');
    const branch = generator.statementToCode(block, 'DO');
    return `input.onSound(${sound}, () => {\n${branch}});\n`;
  };

  asAny.forBlock["input_compass_calibrate"] = () => "input.calibrateCompass();\n";
  asAny.forBlock["device_get_magnetic_force"] = (block: Blockly.Block) => {
    const name = block.getFieldValue('NAME');
    return [`input.magneticForce(${name})`, Order.FUNCTION_CALL];
  };
  asAny.forBlock["device_get_rotation"] = (block: Blockly.Block) => {
    const name = block.getFieldValue('NAME');
    return [`input.rotation(${name})`, Order.FUNCTION_CALL];
  };
  asAny.forBlock["device_get_running_time"] = () => ["input.runningTime()", Order.FUNCTION_CALL];
  asAny.forBlock["device_get_running_time_micros"] = () => ["input.runningTimeMicros()", Order.FUNCTION_CALL];
  asAny.forBlock["input_on_pin_released"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const name = block.getFieldValue('NAME');
    const branch = generator.statementToCode(block, 'DO');
    return `input.onPinReleased(${name}, () => {\n${branch}});\n`;
  };
  asAny.forBlock["device_set_accelerometer_range"] = (block: Blockly.Block) => {
    const name = block.getFieldValue('NAME');
    return `input.setAccelerometerRange(${name});\n`;
  };
  asAny.forBlock["input_set_sound_threshold"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const sound = block.getFieldValue('sound');
    const value = generator.valueToCode(block, 'value', Order.ATOMIC) || "128";
    return `input.setSoundThreshold(${sound}, ${value});\n`;
  };

  asAny.forBlock["radio_broadcast_message"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const msg = generator.valueToCode(block, 'msg', Order.ATOMIC) || "0";
    return `radio.sendMessage(${msg});\n`;
  };

  asAny.forBlock["radio_on_message_received"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const msg = generator.valueToCode(block, 'msg', Order.ATOMIC) || "0";
    const branch = generator.statementToCode(block, 'DO');
    return `radio.onReceivedMessage(${msg}, () => {\n${branch}});\n`;
  };

  asAny.forBlock["radio_message_code"] = (block: Blockly.Block) => {
    const message = block.getFieldValue('message');
    return [`RadioMessage.${message}`, Order.ATOMIC];
  };

  asAny.forBlock["input_on_logo_event"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const action = block.getFieldValue("ACTION") || "Pressed";
    const body = generator.statementToCode(block, "DO");
    return `input.onLogoEvent(TouchButtonEvent.${action}, function () {\n${body}});\n`;
  };

  asAny.forBlock["input_logo_is_pressed"] = () => ["input.logoIsPressed()", Order.FUNCTION_CALL];

  asAny.forBlock["input_sound_level"] = () => ["input.soundLevel()", Order.FUNCTION_CALL];

  asAny.forBlock["music_play_melody"] = (block: Blockly.Block) => {
    const melody = block.getFieldValue("MELODY") || "DADADUM";
    const tempo = block.getFieldValue("TEMPO") || "120";
    const playMode = block.getFieldValue("PLAYMODE") || "UNTIL_DONE";
    const melodyOption = playMode === "UNTIL_DONE" ? "MelodyOptions.Once" : "MelodyOptions.OnceInBackground";
    return `music.setTempo(${tempo});\nmusic.startMelody(music.builtInMelody(Melodies.${melody}), ${melodyOption});\n`;
  };

  asAny.forBlock["music_play_tone"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const hz = generator.valueToCode(block, "HZ", Order.NONE) || "262";
    const ms = generator.valueToCode(block, "MS", Order.NONE) || "500";
    return `music.playTone(${hz}, ${ms});\n`;
  };

  asAny.forBlock["music_play_tone_note_beats"] = (block: Blockly.Block) => {
    const note = block.getFieldValue("NOTE") || "C";
    const beats = block.getFieldValue("BEATS") || "1";
    const playMode = block.getFieldValue("PLAYMODE") || "UNTIL_DONE";
    const melodyOption = playMode === "UNTIL_DONE" ? "MelodyOptions.Once" : "MelodyOptions.OnceInBackground";
    return `music.startMelody([music.noteFrequency(Note.${note})], ${melodyOption});\nmusic.rest(music.beat(BeatFraction.Whole) * ${beats});\n`;
  };

  asAny.forBlock["music_ringtone_play"] = (block: Blockly.Block) => {
    const note = block.getFieldValue("NOTE") || "C";
    return `music.ringTone(music.noteFrequency(Note.${note}));\n`;
  };

  asAny.forBlock["music_rest_beat"] = (block: Blockly.Block) => {
    const beats = block.getFieldValue("BEATS") || "1";
    return `music.rest(music.beat(BeatFraction.Whole) * ${beats});\n`;
  };

  asAny.forBlock["music_note_value"] = (block: Blockly.Block) => {
    const note = block.getFieldValue("NOTE") || "C";
    return [`music.noteFrequency(Note.${note})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["music_set_volume"] = (block: Blockly.Block) => {
    const vol = block.getFieldValue("VOL") || "127";
    return `music.setVolume(${vol});\n`;
  };

  asAny.forBlock["music_get_volume"] = () => ["music.volume()", Order.FUNCTION_CALL];

  asAny.forBlock["music_stop_all_sounds"] = () => "music.stopAllSounds();\n";

  asAny.forBlock["music_change_tempo"] = (block: Blockly.Block) => {
    const delta = block.getFieldValue("DELTA") || "20";
    return `music.changeTempoBy(${delta});\n`;
  };

  asAny.forBlock["music_set_tempo"] = (block: Blockly.Block) => {
    const tempo = block.getFieldValue("TEMPO") || "120";
    return `music.setTempo(${tempo});\n`;
  };

  asAny.forBlock["music_beat_value"] = (block: Blockly.Block) => {
    const beats = block.getFieldValue("BEATS") || "1";
    return [`music.beat(BeatFraction.Whole) * ${beats}`, Order.MULTIPLICATION];
  };

  asAny.forBlock["music_get_tempo"] = () => ["music.tempo()", Order.FUNCTION_CALL];

  asAny.forBlock["music_on_event"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const eventName = block.getFieldValue("EVENT") || "MelodyNotePlayed";
    const body = generator.statementToCode(block, "DO");
    return `music.onEvent(MusicEvent.${eventName}, function () {\n${body}});\n`;
  };

  asAny.forBlock["music_play_melody_advanced"] = (block: Blockly.Block) => {
    const melody = block.getFieldValue("MELODY") || "DADADUM";
    const playMode = block.getFieldValue("PLAYMODE") || "IN_BACKGROUND";
    const melodyOption = playMode === "UNTIL_DONE" ? "MelodyOptions.Once" : "MelodyOptions.OnceInBackground";
    return `music.startMelody(music.builtInMelody(Melodies.${melody}), ${melodyOption});\n`;
  };

  asAny.forBlock["music_stop_melody"] = (block: Blockly.Block) => {
    const stopMode = block.getFieldValue("STOPMODE") || "All";
    return `music.stopMelody(MelodyStopOptions.${stopMode});\n`;
  };

  asAny.forBlock["music_on_melody_note_played"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const body = generator.statementToCode(block, "DO");
    return `music.onEvent(MusicEvent.MelodyNotePlayed, function () {\n${body}});\n`;
  };

  asAny.forBlock["music_play_giggle"] = (block: Blockly.Block) => {
    const playMode = block.getFieldValue("PLAYMODE") || "UNTIL_DONE";
    const melodyOption = playMode === "UNTIL_DONE" ? "MelodyOptions.Once" : "MelodyOptions.OnceInBackground";
    return `music.startMelody(music.builtInMelody(Melodies.Giggle), ${melodyOption});\n`;
  };

  asAny.forBlock["music_play_sound_effect"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const effect = generator.valueToCode(block, "EFFECT", Order.NONE) || "\"soundExpression.giggle\"";
    const playMode = block.getFieldValue("PLAYMODE") || "UNTIL_DONE";
    const mode = playMode === "UNTIL_DONE" ? "SoundExpressionPlayMode.UntilDone" : "SoundExpressionPlayMode.InBackground";
    return `music.play(${effect}, ${mode});\n`;
  };

  asAny.forBlock["music_create_sound_effect"] = (block: Blockly.Block) => {
    const shape = block.getFieldValue("SHAPE") || "Sine";
    return [`music.createSoundEffect(WaveShape.${shape}, 5000, 0, 255, 0, 500, SoundExpressionEffect.None, InterpolationCurve.Linear)`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["music_sound_is_playing"] = () => ["music.isSoundPlaying()", Order.FUNCTION_CALL];

  asAny.forBlock["music_set_built_in_speaker_enabled"] = (block: Blockly.Block) => {
    const enabled = block.getFieldValue("ENABLED") || "true";
    return `music.setBuiltInSpeakerEnabled(${enabled});\n`;
  };

  asAny.forBlock["led_plot"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    return `led.plot(${x}, ${y});\n`;
  };

  asAny.forBlock["led_unplot"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    return `led.unplot(${x}, ${y});\n`;
  };

  asAny.forBlock["led_toggle"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    return `led.toggle(${x}, ${y});\n`;
  };

  asAny.forBlock["led_point"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    return [`led.point(${x}, ${y})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["led_plot_bar_graph"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
    const high = generator.valueToCode(block, "HIGH", Order.NONE) || "0";
    return `led.plotBarGraph(${value}, ${high});\n`;
  };

  asAny.forBlock["led_set_brightness"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "255";
    return `led.setBrightness(${value});\n`;
  };

  asAny.forBlock["led_brightness"] = () => ["led.brightness()", Order.FUNCTION_CALL];

  asAny.forBlock["led_stop_animation"] = () => "led.stopAnimation();\n";

  asAny.forBlock["led_set_display_mode"] = (block: Blockly.Block) => {
    const mode = block.getFieldValue("MODE") || "BlackAndWhite";
    return `led.setDisplayMode(DisplayMode.${mode});\n`;
  };

  asAny.forBlock["led_enable"] = (block: Blockly.Block) => {
    const on = block.getFieldValue("ON") || "true";
    return `led.enable(${on});\n`;
  };

  asAny.forBlock["led_plot_brightness"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    const brightness = generator.valueToCode(block, "BRIGHTNESS", Order.NONE) || "255";
    return `led.plotBrightness(${x}, ${y}, ${brightness});\n`;
  };

  asAny.forBlock["led_point_brightness"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const x = generator.valueToCode(block, "X", Order.NONE) || "0";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "0";
    return [`led.pointBrightness(${x}, ${y})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["radio_set_group"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const group = generator.valueToCode(block, "GROUP", Order.NONE) || "1";
    return `radio.setGroup(${group});\n`;
  };

  asAny.forBlock["radio_send_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const num = generator.valueToCode(block, "NUM", Order.NONE) || "0";
    return `radio.sendNumber(${num});\n`;
  };

  asAny.forBlock["radio_send_string"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"\"";
    return `radio.sendString(${text});\n`;
  };

  asAny.forBlock["radio_send_value"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const name = generator.valueToCode(block, "NAME", Order.NONE) || "\"name\"";
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
    return `radio.sendValue(${name}, ${value});\n`;
  };

  asAny.forBlock["radio_on_received_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const variable = generator.valueToCode(block, "receivedNumber", Order.NONE) || "receivedNumber";
    const body = generator.statementToCode(block, "DO");
    return `radio.onReceivedNumber(function (${variable}) {\n${body}});\n`;
  };

  asAny.forBlock["radio_on_received_string"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const variable = generator.valueToCode(block, "receivedString", Order.NONE) || "receivedString";
    const body = generator.statementToCode(block, "DO");
    return `radio.onReceivedString(function (${variable}) {\n${body}});\n`;
  };

  asAny.forBlock["radio_on_received_value"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const nameVar = generator.valueToCode(block, "name", Order.NONE) || "name";
    const valueVar = generator.valueToCode(block, "value", Order.NONE) || "value";
    const body = generator.statementToCode(block, "DO");
    return `radio.onReceivedValue(function (${nameVar}, ${valueVar}) {\n${body}});\n`;
  };

  asAny.forBlock["radio_received_packet"] = (block: Blockly.Block) => {
    const type = block.getFieldValue("TYPE") || "Time";
    if (type === "SignalStrength") return ["radio.receivedPacket(RadioPacketProperty.SignalStrength)", Order.FUNCTION_CALL];
    if (type === "Time") return ["radio.receivedPacket(RadioPacketProperty.Time)", Order.FUNCTION_CALL];
    if (type === "SerialNumber") return ["radio.receivedPacket(RadioPacketProperty.SerialNumber)", Order.FUNCTION_CALL];
    return ["radio.receivedPacket(RadioPacketProperty.Time)", Order.FUNCTION_CALL];
  };

  asAny.forBlock["radio_set_transmit_power"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const power = generator.valueToCode(block, "POWER", Order.NONE) || "7";
    return `radio.setTransmitPower(${power});\n`;
  };

  asAny.forBlock["radio_set_transmit_serial_number"] = (block: Blockly.Block) => {
    const transmit = block.getFieldValue("TRANSMIT") || "true";
    return `radio.setTransmitSerialNumber(${transmit});\n`;
  };

  asAny.forBlock["radio_set_frequency_band"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const band = generator.valueToCode(block, "BAND", Order.NONE) || "0";
    return `radio.setFrequencyBand(${band});\n`;
  };

  asAny.forBlock["radio_raise_event"] = (block: Blockly.Block) => {
    const src = block.getFieldValue("SRC") || "1";
    const value = block.getFieldValue("VALUE") || "0";
    return `radio.raiseEvent(${src}, ${value});\n`;
  };

  asAny.forBlock["loops_every_interval"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const time = generator.valueToCode(block, "TIME", Order.NONE) || "1000";
    const body = generator.statementToCode(block, "DO");
    return `loops.everyInterval(${time}, function () {\n${body}});\n`;
  };

  asAny.forBlock["loops_break"] = (block: Blockly.Block) => {
    return "break;\n";
  };

  asAny.forBlock["loops_continue"] = (block: Blockly.Block) => {
    return "continue;\n";
  };

  asAny.forBlock["logic_if_simple"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const cond = generator.valueToCode(block, "COND", Order.NONE) || "false";
    const body = generator.statementToCode(block, "DO");
    return `if (${cond}) {\n${body}}\n`;
  };

  asAny.forBlock["logic_if_else_simple"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const cond = generator.valueToCode(block, "COND", Order.NONE) || "false";
    const body = generator.statementToCode(block, "DO");
    const elseBody = generator.statementToCode(block, "ELSE");
    return `if (${cond}) {\n${body}} else {\n${elseBody}}\n`;
  };

  asAny.forBlock["variables_item_equals_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
    return `let item = ${value};\n`;
  };

  asAny.forBlock["math_max2"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const a = generator.valueToCode(block, "A", Order.NONE) || "0";
    const b = generator.valueToCode(block, "B", Order.NONE) || "0";
    return [`Math.max(${a}, ${b})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_min2"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const a = generator.valueToCode(block, "A", Order.NONE) || "0";
    const b = generator.valueToCode(block, "B", Order.NONE) || "0";
    return [`Math.min(${a}, ${b})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_trunc"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const num = generator.valueToCode(block, "NUM", Order.NONE) || "0";
    return [`Math.trunc(${num})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_js_op"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const op = block.getFieldValue("OP") || "ABS";
    const arg = generator.valueToCode(block, "ARG0", Order.NONE) || "0";
    if (op === "ROUNDUP") return [`Math.ceil(${arg})`, Order.FUNCTION_CALL];
    if (op === "ROUNDDOWN") return [`Math.floor(${arg})`, Order.FUNCTION_CALL];
    return [`Math.abs(${arg})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_js_round"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const arg = generator.valueToCode(block, "ARG0", Order.NONE) || "0";
    return [`Math.round(${arg})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_map_value"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
    const fromLow = generator.valueToCode(block, "FROM_LOW", Order.NONE) || "0";
    const fromHigh = generator.valueToCode(block, "FROM_HIGH", Order.NONE) || "1023";
    const toLow = generator.valueToCode(block, "TO_LOW", Order.NONE) || "0";
    const toHigh = generator.valueToCode(block, "TO_HIGH", Order.NONE) || "4";
    return [`Math.map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_op2"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const op = block.getFieldValue("OP") || "min";
    const a = generator.valueToCode(block, "A", Order.NONE) || "0";
    const b = generator.valueToCode(block, "B", Order.NONE) || "0";
    return [`Math.${op}(${a}, ${b})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_constrain"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const value = generator.valueToCode(block, "VALUE", Order.NONE) || "0";
    const low = generator.valueToCode(block, "LOW", Order.NONE) || "0";
    const high = generator.valueToCode(block, "HIGH", Order.NONE) || "100";
    return [`Math.constrain(${value}, ${low}, ${high})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["math_constant"] = (block: Blockly.Block) => {
    const constant = block.getFieldValue("CONSTANT") || "PI";
    if (constant === "PI") return ["Math.PI", Order.ATOMIC];
    if (constant === "E") return ["Math.E", Order.ATOMIC];
    if (constant === "GOLDEN_RATIO") return ["(1 + Math.sqrt(5)) / 2", Order.ATOMIC];
    if (constant === "SQRT2") return ["Math.SQRT2", Order.ATOMIC];
    if (constant === "SQRT1_2") return ["Math.SQRT1_2", Order.ATOMIC];
    if (constant === "INFINITY") return ["Infinity", Order.ATOMIC];
    return ["0", Order.ATOMIC];
  };

  asAny.forBlock["math_random_bool"] = () => ["Math.random() < 0.5", Order.RELATIONAL];

  asAny.forBlock["text_parse_to_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"0\"";
    return [`parseFloat(${text})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_split_with"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"\"";
    const sep = generator.valueToCode(block, "SEP", Order.NONE) || "\"\"";
    return [`${text}.split(${sep})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_includes"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"\"";
    const find = generator.valueToCode(block, "FIND", Order.NONE) || "\"\"";
    return [`${text}.includes(${find})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_substring_length"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"\"";
    const from = generator.valueToCode(block, "FROM", Order.NONE) || "0";
    const len = generator.valueToCode(block, "LEN", Order.NONE) || "0";
    return [`${text}.substr(${from}, ${len})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_compare_to"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const a = generator.valueToCode(block, "A", Order.NONE) || "\"\"";
    const b = generator.valueToCode(block, "B", Order.NONE) || "\"\"";
    return [`${a}.localeCompare(${b})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_char_code_at"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const text = generator.valueToCode(block, "TEXT", Order.NONE) || "\"\"";
    const index = generator.valueToCode(block, "INDEX", Order.NONE) || "0";
    return [`${text}.charCodeAt(${index})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_convert_number_to_text"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const num = generator.valueToCode(block, "NUM", Order.NONE) || "0";
    return [`String(${num})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["text_from_char_code"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const code = generator.valueToCode(block, "CODE", Order.NONE) || "0";
    return [`String.fromCharCode(${code})`, Order.FUNCTION_CALL];
  };

  asAny.forBlock["game_create_sprite"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const v = (block.getFieldValue("VAR") || "sprite").replace(/\s+/g, "_");
    const x = generator.valueToCode(block, "X", Order.NONE) || "2";
    const y = generator.valueToCode(block, "Y", Order.NONE) || "2";
    return `let ${v} = game.createSprite(${x}, ${y});\n`;
  };
  asAny.forBlock["game_delete_sprite"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    return `if (${sprite}) ${sprite}.delete();\n`;
  };
  asAny.forBlock["game_sprite_is_deleted"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    return [`${sprite} ? ${sprite}.isDeleted() : false`, Order.CONDITIONAL || 13];
  };
  asAny.forBlock["game_sprite_move_by"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    const dist = generator.valueToCode(block, "BY", Order.NONE) || "1";
    return `if (${sprite}) ${sprite}.move(${dist});\n`;
  };
  asAny.forBlock["game_sprite_turn_by"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    const deg = generator.valueToCode(block, "DEG", Order.NONE) || "45";
    return `if (${sprite}) ${sprite}.turn(Direction.${block.getFieldValue("DIR") || "Right"}, ${deg});\n`;
  };
  asAny.forBlock["game_sprite_change_x_by"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    const by = generator.valueToCode(block, "BY", Order.NONE) || "1";
    return `if (${sprite}) ${sprite}.change(LedSpriteProperty.${block.getFieldValue("PROP") || "X"}, ${by});\n`;
  };
  asAny.forBlock["game_sprite_set_x_to"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    const val = generator.valueToCode(block, "X", Order.NONE) || "0";
    return `if (${sprite}) ${sprite}.set(LedSpriteProperty.${block.getFieldValue("PROP") || "X"}, ${val});\n`;
  };
  asAny.forBlock["game_sprite_x"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    return [`${sprite} ? ${sprite}.get(LedSpriteProperty.${block.getFieldValue("PROP") || "X"}) : 0`, Order.CONDITIONAL || 13];
  };
  asAny.forBlock["game_sprite_is_touching"] = (block: Blockly.Block, generator: any) => {
    const a = generator.valueToCode(block, "A", Order.MEMBER) || "sprite";
    const b = generator.valueToCode(block, "B", Order.MEMBER) || "otherSprite";
    return [`(${a} && ${b}) ? ${a}.isTouching(${b}) : false`, Order.LOGICAL_AND || 11];
  };
  asAny.forBlock["game_sprite_is_touching_edge"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    return [`${sprite} ? ${sprite}.isTouchingEdge() : false`, Order.CONDITIONAL || 13];
  };
  asAny.forBlock["game_sprite_if_on_edge_bounce"] = (block: Blockly.Block, generator: any) => {
    const sprite = generator.valueToCode(block, "SPRITE", Order.MEMBER) || "sprite";
    return `if (${sprite}) ${sprite}.ifOnEdgeBounce();\n`;
  };
  asAny.forBlock["game_remove_life"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `game.removeLife(${generator.valueToCode(block, "N", Order.NONE) || "1"});\n`;
  asAny.forBlock["game_add_life"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `game.addLife(${generator.valueToCode(block, "N", Order.NONE) || "1"});\n`;
  asAny.forBlock["game_set_life"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `game.setLife(${generator.valueToCode(block, "N", Order.NONE) || "0"});\n`;
  asAny.forBlock["game_set_score"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `game.setScore(${generator.valueToCode(block, "N", Order.NONE) || "0"});\n`;
  asAny.forBlock["game_change_score_by"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `game.changeScoreBy(${generator.valueToCode(block, "N", Order.NONE) || "1"});\n`;
  asAny.forBlock["game_start_countdown"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `game.startCountdown(${generator.valueToCode(block, "MS", Order.NONE) || "10000"});\n`;
  asAny.forBlock["game_score"] = () => ["game.score()", Order.FUNCTION_CALL];
  asAny.forBlock["game_over"] = () => "game.gameOver();\n";
  asAny.forBlock["game_is_over"] = () => ["game.isGameOver()", Order.FUNCTION_CALL];
  asAny.forBlock["game_is_paused"] = () => ["game.isPaused()", Order.FUNCTION_CALL];
  asAny.forBlock["game_is_running"] = () => ["game.isRunning()", Order.FUNCTION_CALL];
  asAny.forBlock["game_resume"] = () => "game.resume();\n";
  asAny.forBlock["game_pause"] = () => "game.pause();\n";

  asAny.forBlock["images_show_image_offset"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `${generator.valueToCode(block, "IMG", Order.NONE) || "images.createImage(`\\n00000\\n00000\\n00000\\n00000\\n00000\\n`)"} .showImage(${generator.valueToCode(block, "OFFSET", Order.NONE) || "0"});\n`;
  asAny.forBlock["images_scroll_image"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `${generator.valueToCode(block, "IMG", Order.NONE) || "images.createImage(`\\n00000\\n00000\\n00000\\n00000\\n00000\\n`)"} .scrollImage(${generator.valueToCode(block, "OFFSET", Order.NONE) || "1"}, ${generator.valueToCode(block, "INTERVAL", Order.NONE) || "200"});\n`;
  asAny.forBlock["images_create_image"] = (block: Blockly.Block) => [`images.createImage(\`\n${String(block.getFieldValue("MATRIX") || "").replace(/\./g, "0").replace(/#/g, "1")}\n\`)`, Order.FUNCTION_CALL];
  asAny.forBlock["images_create_big_image"] = (block: Blockly.Block) => [`images.createBigImage(\`\n${String(block.getFieldValue("MATRIX") || "").replace(/\./g, "0").replace(/#/g, "1")}\n\`)`, Order.FUNCTION_CALL];
  asAny.forBlock["images_direction"] = (block: Blockly.Block) => [`ImageScrollDirection.${block.getFieldValue("DIR") || "North"}`, Order.ATOMIC];
  asAny.forBlock["images_icon_image"] = (block: Blockly.Block) => [`images.iconImage(IconNames.${block.getFieldValue("ICON") || "Heart"})`, Order.FUNCTION_CALL];
  asAny.forBlock["images_arrow_image"] = (block: Blockly.Block) => [`images.arrowImage(ArrowNames.${block.getFieldValue("ARROW") || "North"})`, Order.FUNCTION_CALL];

  asAny.forBlock["pins_digital_read_pin"] = (block: Blockly.Block) => [`pins.digitalReadPin(DigitalPin.${block.getFieldValue("PIN") || "P0"})`, Order.FUNCTION_CALL];
  asAny.forBlock["pins_digital_write_pin"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.digitalWritePin(DigitalPin.${block.getFieldValue("PIN") || "P0"}, ${generator.valueToCode(block, "VAL", Order.NONE) || "0"});\n`;
  asAny.forBlock["pins_analog_read_pin"] = (block: Blockly.Block) => [`pins.analogReadPin(AnalogPin.${block.getFieldValue("PIN") || "P0"})`, Order.FUNCTION_CALL];
  asAny.forBlock["pins_analog_write_pin"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.analogWritePin(AnalogPin.${block.getFieldValue("PIN") || "P0"}, ${generator.valueToCode(block, "VAL", Order.NONE) || "1023"});\n`;
  asAny.forBlock["pins_map"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [`Math.map(${generator.valueToCode(block, "VALUE", Order.NONE) || "0"}, ${generator.valueToCode(block, "FROM_LOW", Order.NONE) || "0"}, ${generator.valueToCode(block, "FROM_HIGH", Order.NONE) || "1023"}, ${generator.valueToCode(block, "TO_LOW", Order.NONE) || "0"}, ${generator.valueToCode(block, "TO_HIGH", Order.NONE) || "4"})`, Order.FUNCTION_CALL];
  asAny.forBlock["pins_analog_set_period_pin"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.analogSetPeriod(AnalogPin.${block.getFieldValue("PIN") || "P0"}, ${generator.valueToCode(block, "US", Order.NONE) || "20000"});\n`;
  asAny.forBlock["pins_set_audio_pin"] = (block: Blockly.Block) => `pins.setAudioPin(AnalogPin.${block.getFieldValue("PIN") || "P0"});\n`;
  asAny.forBlock["pins_set_audio_pin_enabled"] = (block: Blockly.Block) => `pins.setAudioPinEnabled(${block.getFieldValue("EN") || "false"});\n`;
  asAny.forBlock["pins_servo_write_pin"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.servoWritePin(AnalogPin.${block.getFieldValue("PIN") || "P0"}, ${generator.valueToCode(block, "VAL", Order.NONE) || "180"});\n`;
  asAny.forBlock["pins_servo_set_pulse"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.servoSetPulse(AnalogPin.${block.getFieldValue("PIN") || "P0"}, ${generator.valueToCode(block, "US", Order.NONE) || "1500"});\n`;

  asAny.forBlock["serial_write_line"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.writeLine(${generator.valueToCode(block, "TEXT", Order.NONE) || "\"\""});\n`;
  asAny.forBlock["serial_write_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.writeNumber(${generator.valueToCode(block, "NUM", Order.NONE) || "0"});\n`;
  asAny.forBlock["serial_write_value_pair"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.writeValue(${generator.valueToCode(block, "NAME", Order.NONE) || "\"x\""}, ${generator.valueToCode(block, "VAL", Order.NONE) || "0"});\n`;
  asAny.forBlock["serial_write_string"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.writeString(${generator.valueToCode(block, "TEXT", Order.NONE) || "\"\""});\n`;
  asAny.forBlock["serial_write_numbers"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.writeNumbers(${generator.valueToCode(block, "ARR", Order.NONE) || "[]"});\n`;
  asAny.forBlock["serial_read_line"] = () => ["serial.readLine()", Order.FUNCTION_CALL];
  asAny.forBlock["serial_read_until"] = (block: Blockly.Block) => [`serial.readUntil("${block.getFieldValue("DELIM") || "\\n"}")`, Order.FUNCTION_CALL];
  asAny.forBlock["serial_on_data_received"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.onDataReceived("${block.getFieldValue("DELIM") || "\\n"}", function () {\n${generator.statementToCode(block, "DO")}});\n`;
  asAny.forBlock["serial_read_string"] = () => ["serial.readString()", Order.FUNCTION_CALL];
  asAny.forBlock["serial_redirect_to"] = (block: Blockly.Block) => `serial.redirect(SerialPin.${block.getFieldValue("TX") || "P0"}, SerialPin.${block.getFieldValue("RX") || "P1"}, BaudRate.BaudRate${block.getFieldValue("BAUD") || "115200"});\n`;
  asAny.forBlock["serial_redirect_to_usb"] = () => "serial.redirectToUSB();\n";
  asAny.forBlock["serial_set_tx_buffer_size"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.setTxBufferSize(${generator.valueToCode(block, "N", Order.NONE) || "32"});\n`;
  asAny.forBlock["serial_set_rx_buffer_size"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.setRxBufferSize(${generator.valueToCode(block, "N", Order.NONE) || "32"});\n`;
  asAny.forBlock["serial_write_buffer"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.writeBuffer(${generator.valueToCode(block, "BUF", Order.NONE) || "serial.readBuffer(0)"});\n`;
  asAny.forBlock["serial_read_buffer"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [`serial.readBuffer(${generator.valueToCode(block, "N", Order.NONE) || "0"})`, Order.FUNCTION_CALL];
  asAny.forBlock["serial_set_write_line_padding"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `serial.setWriteLinePadding(${generator.valueToCode(block, "N", Order.NONE) || "0"});\n`;
  asAny.forBlock["serial_set_baud_rate"] = (block: Blockly.Block) => `serial.setBaudRate(BaudRate.BaudRate${block.getFieldValue("BAUD") || "115200"});\n`;

  asAny.forBlock["control_wait_for_event"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `control.waitForEvent(${generator.valueToCode(block, "SRC", Order.NONE) || "0"}, ${generator.valueToCode(block, "VAL", Order.NONE) || "0"});\n`;
  asAny.forBlock["control_run_in_background"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `control.inBackground(function () {\n${generator.statementToCode(block, "DO")}});\n`;
  asAny.forBlock["control_millis"] = () => ["input.runningTime()", Order.FUNCTION_CALL];
  asAny.forBlock["control_reset"] = () => "control.reset();\n";
  asAny.forBlock["control_wait_micros"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `control.waitMicros(${generator.valueToCode(block, "US", Order.NONE) || "4"});\n`;
  asAny.forBlock["control_raise_event"] = (block: Blockly.Block) => `control.raiseEvent(${block.getFieldValue("SRC") || "MICROBIT_ID_BUTTON_A"}, ${block.getFieldValue("VAL") || "MICROBIT_EVT_ANY"});\n`;
  asAny.forBlock["control_on_event"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `control.onEvent(${block.getFieldValue("SRC") || "MICROBIT_ID_BUTTON_A"}, ${block.getFieldValue("VAL") || "MICROBIT_EVT_ANY"}, function () {\n${generator.statementToCode(block, "DO")}});\n`;
  asAny.forBlock["control_event_timestamp"] = () => ["control.eventTimestamp()", Order.FUNCTION_CALL];

  asAny.forBlock["control_event_value"] = () => ["control.eventValue()", Order.FUNCTION_CALL];

  asAny.forBlock["pins_digital_pin"] = (block: Blockly.Block) => [`DigitalPin.${block.getFieldValue("PIN") || "P0"}`, Order.ATOMIC];
  asAny.forBlock["pins_analog_pin"] = (block: Blockly.Block) => [`AnalogPin.${block.getFieldValue("PIN") || "P0"}`, Order.ATOMIC];
  asAny.forBlock["pins_set_pull"] = (block: Blockly.Block) => `pins.setPull(DigitalPin.${block.getFieldValue("PIN") || "P0"}, PinPullMode.${block.getFieldValue("PULL") || "UP"});\n`;
  asAny.forBlock["pins_analog_pitch"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.analogPitch(${generator.valueToCode(block, "freq", Order.NONE) || "440"}, ${generator.valueToCode(block, "ms", Order.NONE) || "100"});\n`;
  asAny.forBlock["pins_set_pin_events"] = (block: Blockly.Block) => `pins.setEvents(DigitalPin.${block.getFieldValue("PIN") || "P0"}, PinEventType.${block.getFieldValue("EDGE") || "Edge.None"});\n`;
  asAny.forBlock["pins_analog_set_pitch_pin"] = (block: Blockly.Block) => `pins.analogSetPitchPin(AnalogPin.${block.getFieldValue("PIN") || "P0"});\n`;
  asAny.forBlock["pins_neopixel_matrix_width"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.neopixelMatrixWidth(DigitalPin.${block.getFieldValue("PIN") || "P0"}, ${generator.valueToCode(block, "width", Order.NONE) || "5"});\n`;
  asAny.forBlock["pins_on_pulsed"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const pin = block.getFieldValue("PIN") || "P0";
    const pulse = block.getFieldValue("PULSE") || "PulseValue.High";
    const body = generator.statementToCode(block, "DO");
    return `pins.onPulsed(DigitalPin.${pin}, ${pulse}, function () {\n${body}});\n`;
  };
  asAny.forBlock["pins_pulse_duration"] = () => ["pins.pulseDuration()", Order.FUNCTION_CALL];
  asAny.forBlock["pins_pulse_in"] = (block: Blockly.Block) => {
    const pin = block.getFieldValue("PIN") || "P0";
    const pulse = block.getFieldValue("PULSE") || "PulseValue.High";
    return [`pins.pulseIn(DigitalPin.${pin}, ${pulse})`, Order.FUNCTION_CALL];
  };
  asAny.forBlock["pins_i2c_read_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const addr = generator.valueToCode(block, "address", Order.NONE) || "0";
    const format = block.getFieldValue("format") || "NumberFormat.Int8LE";
    const repeated = block.getFieldValue("repeated") || "false";
    return [`pins.i2cReadNumber(${addr}, ${format}, ${repeated})`, Order.FUNCTION_CALL];
  };
  asAny.forBlock["pins_i2c_write_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const addr = generator.valueToCode(block, "address", Order.NONE) || "0";
    const value = generator.valueToCode(block, "value", Order.NONE) || "0";
    const format = block.getFieldValue("format") || "NumberFormat.Int8LE";
    const repeated = block.getFieldValue("repeated") || "false";
    return `pins.i2cWriteNumber(${addr}, ${value}, ${format}, ${repeated});\n`;
  };
  asAny.forBlock["pins_spi_frequency"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.spiFrequency(${generator.valueToCode(block, "frequency", Order.NONE) || "1000000"});\n`;
  asAny.forBlock["pins_spi_format"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => `pins.spiFormat(${generator.valueToCode(block, "bits", Order.NONE) || "8"}, ${generator.valueToCode(block, "mode", Order.NONE) || "3"});\n`;
  asAny.forBlock["pins_spi_write"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [`pins.spiWrite(${generator.valueToCode(block, "value", Order.NONE) || "0"})`, Order.FUNCTION_CALL];
  asAny.forBlock["pins_spi_set_pins"] = (block: Blockly.Block) => `pins.spiSetPins(DigitalPin.${block.getFieldValue("MOSI") || "P0"}, DigitalPin.${block.getFieldValue("MISO") || "P0"}, DigitalPin.${block.getFieldValue("SCK") || "P0"});\n`;
  asAny.forBlock["pins_set_touch_mode"] = (block: Blockly.Block) => `pins.setTouchMode(DigitalPin.${block.getFieldValue("PIN") || "P0"}, ${block.getFieldValue("MODE") || "TouchMode.Capacitive"});\n`;
  asAny.forBlock["control_event_value_id"] = (block: Blockly.Block) => [`EventValue.${block.getFieldValue("VAL") || "MICROBIT_EVT_ANY"}`, Order.ATOMIC];
  asAny.forBlock["control_event_source_id"] = (block: Blockly.Block) => [`EventBusSource.${block.getFieldValue("SRC") || "MICROBIT_ID_BUTTON_A"}`, Order.ATOMIC];
  asAny.forBlock["control_device_name"] = () => ["control.deviceName()", Order.FUNCTION_CALL];
  asAny.forBlock["control_device_serial_number"] = () => ["control.deviceSerialNumber()", Order.FUNCTION_CALL];

  asAny.forBlock["function_definition"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const name = generator.getVariableName(block.getFieldValue("function_name") || "doSomething");
    const body = generator.statementToCode(block, "STACK");
    const args = (block as any).arguments_?.map((a: any) => generator.getVariableName(a.name)).join(", ") || "";
    return `function ${name}(${args}) {\n${body}}\n`;
  };
  asAny.forBlock["function_call"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const name = generator.getVariableName(block.getFieldValue("function_name") || "doSomething");
    const args = (block as any).arguments_?.map((a: any) => generator.valueToCode(block, a.id, Order.NONE) || "null").join(", ") || "";
    return `${name}(${args});\n`;
  };
  asAny.forBlock["function_call_output"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => {
    const name = generator.getVariableName(block.getFieldValue("function_name") || "doSomething");
    const args = (block as any).arguments_?.map((a: any) => generator.valueToCode(block, a.id, Order.NONE) || "null").join(", ") || "";
    return [`${name}(${args})`, Order.FUNCTION_CALL];
  };
  asAny.forBlock["function_declaration"] = () => "";
  asAny.forBlock["argument_reporter_boolean"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [generator.getVariableName(block.getFieldValue("VALUE")), Order.ATOMIC];
  asAny.forBlock["argument_reporter_number"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [generator.getVariableName(block.getFieldValue("VALUE")), Order.ATOMIC];
  asAny.forBlock["argument_reporter_string"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [generator.getVariableName(block.getFieldValue("VALUE")), Order.ATOMIC];
  asAny.forBlock["argument_reporter_array"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [generator.getVariableName(block.getFieldValue("VALUE")), Order.ATOMIC];
  asAny.forBlock["argument_reporter_custom"] = (block: Blockly.Block, generator: Blockly.CodeGenerator) => [generator.getVariableName(block.getFieldValue("VALUE")), Order.ATOMIC];
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function registerWorkspaceCallbacks(
  workspace: Blockly.WorkspaceSvg,
  onMakeFunction?: (name: string) => boolean
) {
  workspace.registerButtonCallback("MAKE_FUNCTION", () => {
    const defaultName = "do something";
    const rawName = window.prompt("Function name", defaultName);
    if (rawName === null) return;
    const trimmed = rawName.trim();
    if (!trimmed) return;

    if (onMakeFunction && onMakeFunction(trimmed)) return;

    const definition = workspace.newBlock("procedures_defnoreturn");
    definition.setFieldValue(trimmed, "NAME");
    definition.initSvg();
    definition.render();

    const view = workspace.getMetrics();
    const x = view ? view.viewLeft + 40 : 40;
    const y = view ? view.viewTop + 40 : 40;
    definition.moveBy(x, y);
    definition.select();
  });
}

export default function BlocklyEditorClient() {
  const blocklyHostRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualCodeEditRef = useRef(false);
  const editorModeRef = useRef<"blocks" | "python">("blocks");
  const blocksXmlRef = useRef<string | null>(null);

  const [editorMode, setEditorMode] = useState<"blocks" | "python">("blocks");
  const [searchQuery, setSearchQuery] = useState("");
  const [toolboxSearchHost, setToolboxSearchHost] = useState<HTMLElement | null>(null);
  const [generatedCode, setGeneratedCode] = useState("// Drag blocks to generate MakeCode-like TypeScript");
  const [codeEditorValue, setCodeEditorValue] = useState("// Drag blocks to generate MakeCode-like TypeScript");
  const [toolboxWidth, setToolboxWidth] = useState(180); // Total offset including flyout
  const [sidebarWidth, setSidebarWidth] = useState(180); // Just the category bar

  const [functionEditorConfig, setFunctionEditorConfig] = useState<{
    isOpen: boolean,
    mutation?: Element,
    cb?: (mutation: Element) => void
  }>({ isOpen: false });

  const [isCompiling, setIsCompiling] = useState(false);
  const [showJsCode, setShowJsCode] = useState(false);

  const normalizeSearch = (value: string) => value.trim().toLowerCase();
  const getEntryText = (entry: any) => {
    if (!entry) return "";
    if (entry.kind === "category") return String(entry.name || "");
    if (entry.kind === "label") return String(entry.text || "");
    if (entry.kind === "button") return String(entry.text || "");
    if (entry.kind === "block") {
      const fieldValues = entry.fields
        ? Object.values(entry.fields).map((v) => String(v)).join(" ")
        : "";
      return `${entry.type || ""} ${fieldValues}`.trim();
    }
    return "";
  };

  const filterContents = (contents: any[], query: string): any[] => {
    if (!query) return contents;
    const q = normalizeSearch(query);
    const result: any[] = [];
    for (const entry of contents) {
      if (entry?.kind === "category") {
        const name = String(entry.name || "");
        const nameMatches = normalizeSearch(name).includes(q);
        if (nameMatches) {
          result.push(entry);
          continue;
        }
        const childContents = Array.isArray(entry.contents) ? entry.contents : [];
        const filteredChildren = filterContents(childContents, query);
        if (filteredChildren.length) {
          result.push({ ...entry, contents: filteredChildren });
        }
        continue;
      }
      const text = getEntryText(entry);
      if (normalizeSearch(text).includes(q)) {
        result.push(entry);
      }
    }
    return result;
  };

  const currentToolbox = editorMode === "blocks" ? toolbox : pythonToolbox;
  const filteredToolbox = useMemo(
    () =>
      searchQuery
        ? { ...currentToolbox, contents: filterContents(currentToolbox.contents, searchQuery) }
        : currentToolbox,
    [currentToolbox, searchQuery]
  );

  const syncCode = (workspace: Blockly.Workspace) => {
    if (editorModeRef.current === "python") return;
    javascriptGenerator.init(workspace);
    const nextCode = javascriptGenerator.workspaceToCode(workspace) || "// No code generated yet";
    setGeneratedCode(nextCode);
    if (!manualCodeEditRef.current || editorModeRef.current === "blocks") {
      setCodeEditorValue(nextCode);
    }
  };

  const normalizeBlockCode = (raw: string | string[]) => {
    const code = Array.isArray(raw) ? raw[0] : raw;
    return String(code || "").trim();
  };

  const appendPythonSnippet = (snippet: string) => {
    const trimmed = snippet.trim();
    if (!trimmed) return;
    setCodeEditorValue((prev) => {
      const separator = prev.trim().length ? "\n\n" : "";
      return `${prev}${separator}${trimmed}\n`;
    });
    manualCodeEditRef.current = true;
  };

  const translateToPython = (jsCode: string) => {
    if (!jsCode) return jsCode;

    // Convert the default "No code" message
    if (jsCode.includes("No code generated yet")) {
      return "# No code generated yet";
    }

    // Process line by line to handle comments and basic syntax
    const lines = jsCode.split("\n").map(line => {
      let l = line.trim();
      if (!l || l.startsWith("//")) {
        // Convert JS comment to Python comment
        if (l.startsWith("//")) return "#" + l.substring(2);
        return l;
      }

      l = l.replace(/basic\.showNumber\(/g, "basic.show_number(");
      l = l.replace(/basic\.showString\(/g, "basic.show_string(");
      l = l.replace(/basic\.showIcon\(IconNames\.(\w+)\);/g, "basic.show_icon(IconNames.$1)");
      l = l.replace(/basic\.showArrow\(ArrowNames\.(\w+)\);/g, "basic.show_arrow(ArrowNames.$1)");
      l = l.replace(/basic\.clearScreen\(\);/g, "basic.clear_screen()");
      l = l.replace(/basic\.pause\(/g, "basic.pause(");
      l = l.replace(/;/g, "");
      l = l.replace(/let (\w+) =/g, "$1 =");
      l = l.replace(/function \(\)/g, "lambda:");
      return l;
    });

    let py = lines.join("\n");
    // Handle complex multiline blocks on the joined result
    py = py.replace(/input\.onButtonPressed\(Button\.(\w+), lambda: \{([\s\S]*?)\}\)/g, (_, btn, body) => {
      const pBody = body.trim().split("\n").map((l: string) => "    " + l.trim()).filter(Boolean).join("\n") || "    pass";
      return `def on_button_pressed_${btn.toLowerCase()}():\n${pBody}\ninput.on_button_pressed(Button.${btn}, on_button_pressed_${btn.toLowerCase()})`;
    });

    return py.trim();
  };

  const activeCode = editorMode === "python"
    ? (manualCodeEditRef.current ? codeEditorValue : translateToPython(generatedCode))
    : generatedCode;
  const lineCount = Math.max(1, activeCode.split("\n").length);
  const lineNumbers = Array.from({ length: lineCount }, (_, index) => index + 1);

  useEffect(() => {
    editorModeRef.current = editorMode;
  }, [editorMode]);

  useEffect(() => {
    if (!blocklyHostRef.current) return;

    registerPxtLikeBlocks();

    const workspace = Blockly.inject(blocklyHostRef.current, {
      toolbox: filteredToolbox,
      renderer: "pxt",
      trashcan: true,
      media: "/blockly/media/",
      grid: {
        spacing: 24,
        length: 3,
        colour: "#d1d5db",
        snap: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.95,
        maxScale: 2,
        minScale: 0.3
      }
    });

    registerWorkspaceCallbacks(workspace, (name) => {
      if (editorModeRef.current !== "python") return false;
      const safeName = name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/^(\d)/, "fn_$1");
      appendPythonSnippet(`def ${safeName}():\n    pass`);
      return true;
    });

    workspace.registerButtonCallback('MAKE_FUNCTION', () => {
      setFunctionEditorConfig({ isOpen: true, mutation: undefined, cb: undefined });
    });

    FunctionManager.getInstance().setEditFunctionExternal((mutation, cb) => {
      setFunctionEditorConfig({ isOpen: true, mutation: mutation, cb });
    });

    workspaceRef.current = workspace;
    syncCode(workspace);

    const host = blocklyHostRef.current;
    const ensureSearchHost = () => {
      const toolboxDiv = host?.querySelector(".blocklyToolboxDiv") as HTMLDivElement | null;
      if (!toolboxDiv) return;
      let searchHost = toolboxDiv.querySelector(".toolbox-search-host") as HTMLDivElement | null;
      if (!searchHost) {
        searchHost = document.createElement("div");
        searchHost.className = "toolbox-search-host";
        toolboxDiv.prepend(searchHost);
      }
      setToolboxSearchHost(searchHost);
    };

    ensureSearchHost();
    const updateFlyoutVisibility = () => {
      const flyout = (workspace as any).getFlyout?.();
      const visible = flyout?.isVisible?.() ?? true;
      host?.classList.toggle("flyout-hidden", !visible);
    };

    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return;
      if (editorModeRef.current === "python") {
        if (event.type === Blockly.Events.BLOCK_CREATE) {
          const createEvent = event as Blockly.Events.BlockCreate;
          const ids = createEvent.ids ?? [];
          const blocks = ids
            .map((id) => workspace.getBlockById(id))
            .filter((block): block is Blockly.Block => Boolean(block))
            .filter((block) => !block.isShadow() && !block.getParent());

          blocks.forEach((block) => {
            javascriptGenerator.init(workspace);
            const snippet = normalizeBlockCode(javascriptGenerator.blockToCode(block));
            appendPythonSnippet(snippet);
            block.dispose(true);
          });

          // Blocks are consumed into Python code, no workspace status needed.
        }
        return;
      }
      syncCode(workspace);
    };
    workspace.addChangeListener(listener);
    workspace.addChangeListener(updateFlyoutVisibility as any);
    workspace.addChangeListener(ensureSearchHost as any);
    updateFlyoutVisibility();

    return () => {
      workspace.removeChangeListener(listener);
      workspace.removeChangeListener(updateFlyoutVisibility as any);
      workspace.removeChangeListener(ensureSearchHost as any);
      if (toolboxSearchHost?.parentElement) {
        toolboxSearchHost.parentElement.removeChild(toolboxSearchHost);
      }
      setToolboxSearchHost(null);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    workspace.updateToolbox(filteredToolbox);
    if (editorMode === "python") {
      blocksXmlRef.current = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
      workspace.clear();
      return;
    }

    if (blocksXmlRef.current) {
      workspace.clear();
      const xmlDom = Blockly.utils.xml.textToDom(blocksXmlRef.current);
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
      blocksXmlRef.current = null;
    }

    setCodeEditorValue(generatedCode);
    manualCodeEditRef.current = false;
  }, [editorMode, generatedCode, filteredToolbox]);

  useEffect(() => {
    const host = blocklyHostRef.current;
    if (!host) return;
    const toolboxDiv = host.querySelector(".blocklyToolboxDiv") as HTMLDivElement | null;
    if (!toolboxDiv) return;
    let searchHost = toolboxDiv.querySelector(".toolbox-search-host") as HTMLDivElement | null;
    if (!searchHost) {
      searchHost = document.createElement("div");
      searchHost.className = "toolbox-search-host";
      toolboxDiv.prepend(searchHost);
      setToolboxSearchHost(searchHost);
    } else if (searchHost !== toolboxSearchHost) {
      setToolboxSearchHost(searchHost);
    }
  }, [filteredToolbox, toolboxSearchHost]);

  useEffect(() => {
    const host = blocklyHostRef.current;
    if (!host) return;

    const updateWidth = () => {
      const toolboxDiv = host.querySelector(".blocklyToolboxDiv") as HTMLDivElement | null;
      const treeRoot = host.querySelector(".blocklyToolboxDiv .blocklyTreeRoot") as SVGGElement | null;
      // Flyout is the popup that shows blocks
      const flyout = host.querySelector(".blocklyFlyout") as SVGElement | null;
      const flyoutHidden = host.classList.contains("flyout-hidden");

      const hostRect = host.getBoundingClientRect();
      let currentSidebarWidth = 180;
      let currentTotalWidth = 0;

      if (treeRoot) {
        const treeRect = treeRoot.getBoundingClientRect();
        currentSidebarWidth = Math.round(treeRect.right - hostRect.left);
        currentTotalWidth = currentSidebarWidth;
      } else if (toolboxDiv) {
        const toolboxRect = toolboxDiv.getBoundingClientRect();
        currentSidebarWidth = Math.round(toolboxRect.right - hostRect.left);
        currentTotalWidth = currentSidebarWidth;
      } else {
        currentTotalWidth = 180;
      }

      // Check if flyout is visible and add its width
      if (!flyoutHidden && flyout && flyout.getAttribute("display") !== "none" && flyout.style.display !== "none") {
        const flyoutRect = flyout.getBoundingClientRect();
        currentTotalWidth = Math.max(currentTotalWidth, Math.round(flyoutRect.right - hostRect.left));
      }
      if (flyoutHidden) {
        currentTotalWidth = currentSidebarWidth;
      }

      setSidebarWidth(currentSidebarWidth);
      setToolboxWidth(currentTotalWidth);
    };

    let rafId = 0;
    let attempts = 0;
    const tick = () => {
      updateWidth();
      attempts += 1;
      // Continue polling for a while to catch late-renders and flyout animations
      if (attempts < 150) {
        rafId = requestAnimationFrame(tick);
      }
    };

    tick();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(host); // Observe host for layout changes

    // Also observe the workspace for category clicks which change flyout visibility
    const workspace = workspaceRef.current;
    const listener = () => {
      // Small delay to let Blockly finish rendering the flyout
      setTimeout(updateWidth, 50);
    };
    if (workspace) {
      workspace.addChangeListener(listener);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      if (workspace) {
        workspace.removeChangeListener(listener);
      }
    };
  }, [editorMode, searchQuery]);

  const handleReset = () => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    workspace.clear();
    syncCode(workspace);
  };

  const handleExportXml = () => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const xmlText = Blockly.Xml.domToPrettyText(Blockly.Xml.workspaceToDom(workspace));
    downloadTextFile("pxt-blocks-workspace.xml", xmlText);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadHex = async () => {
    if (editorMode === "python" && !manualCodeEditRef.current) {
      // In python mode, if not manually edited, the code is from blocks.
      // But we should use the actual generated TypeScript for microbit.
    }

    const mainTs = editorMode === "python" ? translateToPython(generatedCode) : generatedCode;
    // Actually, makecode build always wants TypeScript (main.ts).
    // If the user is in python mode, we might need a different compilation route or translate back.
    // For now, PXT blocks always generate valid microbit TypeScript in 'generatedCode'.
    
    setIsCompiling(true);
    try {
      let data;
      const electronAPI = (window as any).electronAPI;
      
      if (electronAPI?.compileMakeCode) {
        // Use Electron IPC for offline/packaged app
        const result = await electronAPI.compileMakeCode({
          mainTs: generatedCode,
          projectName: "microbit-project"
        });
        if (!result.success) throw new Error(result.message || "Compilation failed");
        data = result;
      } else {
        // Fallback to Next.js API (for web/dev mode)
        const res = await fetch("/api/makecode/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mainTs: generatedCode,
            projectName: "microbit-project"
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Compilation failed");
        }
        data = await res.json();
      }

      const blob = new Blob([Buffer.from(data.base64, "base64")], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName || "microbit.hex";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleImportXml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const workspace = workspaceRef.current;
    if (!file || !workspace) return;

    try {
      const xmlText = await file.text();
      workspace.clear();
      const xmlDom = Blockly.utils.xml.textToDom(xmlText);
      Blockly.Xml.domToWorkspace(xmlDom, workspace);
      syncCode(workspace);
    } catch {
    } finally {
      event.currentTarget.value = "";
    }
  };

  return (
    <main
      className="h-screen w-full bg-slate-100 text-slate-900"
      data-editor={editorMode}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-300 bg-blue-700 px-4 text-white">
        <h1 className="text-sm font-semibold sm:text-base">PXT Blocks Editor</h1>
        <div className="hidden items-center rounded-full border border-blue-900 bg-blue-800 p-0.5 md:flex">
          <button
            type="button"
            onClick={() => setEditorMode("blocks")}
            className={`rounded-full px-6 py-1.5 text-sm font-semibold transition ${editorMode === "blocks" ? "bg-white text-blue-700" : "text-blue-100 hover:bg-blue-700"
              }`}
          >
            Blocks
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("python")}
            className={`rounded-full px-6 py-1.5 text-sm font-semibold transition ${editorMode === "python" ? "bg-white text-blue-700" : "text-blue-100 hover:bg-blue-700"
              }`}
          >
            Python
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJsCode(!showJsCode)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              showJsCode ? "bg-white text-blue-700" : "bg-blue-800 text-blue-100 hover:bg-blue-600"
            }`}
          >
            {showJsCode ? "Hide JS" : "Show JS"}
          </button>
          <button
            type="button"
            onClick={handleDownloadHex}
            disabled={isCompiling}
            className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-medium hover:bg-green-500 disabled:opacity-50 sm:text-sm"
          >
            {isCompiling ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download size={14} />
            )}
            Download
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600 sm:text-sm"
          >
            Import XML
          </button>
          <button
            type="button"
            onClick={handleExportXml}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500 sm:text-sm"
          >
            Export XML
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded bg-rose-500 px-3 py-1.5 text-xs font-medium hover:bg-rose-400 sm:text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-3.5rem)] flex-row overflow-hidden">
        <aside className="w-[340px] shrink-0 border-r border-slate-300 bg-white">
          <PxtSimulatorPane code={activeCode} />
        </aside>

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
          {toolboxSearchHost
            ? createPortal(
              <div className="toolbox-search flex h-10 items-center px-3 text-slate-400">
                <Search size={14} className="mr-2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="bg-transparent text-xs outline-none"
                />
              </div>,
              toolboxSearchHost
            )
            : null}
          <div ref={blocklyHostRef} className="h-full w-full" />
          
          {/* Side-by-side JS Code Preview in Blocks Mode */}
          {editorMode === "blocks" && showJsCode && (
            <div className="absolute inset-y-0 right-0 z-20 flex w-1/3 flex-col border-l border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-2 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500">Generated TypeScript</span>
                <button onClick={() => setShowJsCode(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={generatedCode}
                readOnly
                className="flex-1 resize-none p-4 font-mono text-xs leading-5 text-slate-700 outline-none"
              />
            </div>
          )}

          {editorMode === "python" ? (
            <div
              className="absolute inset-y-0 right-0 z-10 flex flex-col border-l border-slate-200 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.02)] transition-[left] duration-200"
              style={{ left: toolboxWidth }}
            >

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <div className="select-none bg-slate-50/50 px-3 py-4 text-right font-mono text-[11px] leading-6 text-slate-300">
                  {lineNumbers.map((line) => (
                    <div key={line} className="h-6">
                      {line}
                    </div>
                  ))}
                </div>
                <textarea
                  value={activeCode}
                  onChange={(event) => {
                    setCodeEditorValue(event.target.value);
                    manualCodeEditRef.current = true;
                  }}
                  spellCheck={false}
                  className="min-h-0 w-full flex-1 resize-none overflow-auto border-0 bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none"
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,text/xml"
        className="hidden"
        onChange={handleImportXml}
      />

      <FunctionEditor
        isOpen={functionEditorConfig.isOpen}
        mutation={functionEditorConfig.mutation}
        onClose={() => setFunctionEditorConfig({ isOpen: false })}
        onDone={(mut) => {
          const { cb } = functionEditorConfig;
          setFunctionEditorConfig({ isOpen: false });

          if (cb) {
            // This was an edit action
            cb(mut);
          } else if (workspaceRef.current) {
            // This was a create action
            const workspace = workspaceRef.current;

            // Generate an XML block using the mutation
            let xml = Blockly.utils.xml.createElement('xml');
            let block = Blockly.utils.xml.createElement('block');
            block.setAttribute('type', 'function_definition');

            // Give it a reasonable starting position
            let topBlock = workspace.getTopBlocks(true)[0];
            let x = 10, y = 10;
            if (topBlock) {
              let xy = topBlock.getRelativeToSurfaceXY();
              x = xy.x + (Blockly as any).SNAP_RADIUS * (topBlock.RTL ? -1 : 1);
              y = xy.y + (Blockly as any).SNAP_RADIUS * 2;
            }
            block.setAttribute('x', String(x));
            block.setAttribute('y', String(y));

            // Copy mutation attributes
            const mutationXml = Blockly.utils.xml.createElement('mutation');
            for (let i = 0; i < mut.attributes.length; i++) {
              const attr = mut.attributes[i];
              mutationXml.setAttribute(attr.name, attr.value);
            }

            // Copy mutation child nodes (e.g. <arg> tags for parameters)
            for (let i = 0; i < mut.childNodes.length; i++) {
              mutationXml.appendChild(mut.childNodes[i].cloneNode(true));
            }

            block.appendChild(mutationXml);

            // Ensure name field is set
            let field = Blockly.utils.xml.createElement('field');
            field.setAttribute('name', 'NAME');
            field.appendChild(document.createTextNode(mut.getAttribute("name") || "doSomething"));
            block.appendChild(field);

            xml.appendChild(block);

            try {
              Blockly.Events.disable();
              Blockly.Xml.domToWorkspace(xml, workspace);
            } finally {
              Blockly.Events.enable();
              // Fire create event to sync UI / code
              Blockly.Events.fire(new Blockly.Events.BlockCreate(workspace.getTopBlocks(false).pop()!));
              syncCode(workspace);
            }
          }
        }}
      />

      <style jsx global>{`
        [data-editor="python"] .blocklyMainBackground,
        [data-editor="python"] .blocklyBlockCanvas,
        [data-editor="python"] .blocklyBubbleCanvas,
        [data-editor="python"] .blocklyGrid,
        [data-editor="python"] .blocklyScrollbarHorizontal,
        [data-editor="python"] .blocklyScrollbarVertical,
        [data-editor="python"] .blocklyScrollbar {
          display: none !important;
        }
        /* Restore visibility for blocks inside the flyout */
        [data-editor="python"] .blocklyFlyout .blocklyBlockCanvas {
          display: block !important;
        }
        .blocklyFlyout .blocklyFlyoutBackground {
          fill: #4a4a4e !important;
          fill-opacity: 1 !important;
        }
        .blocklyFlyout .blocklyText,
        .blocklyFlyoutLabelText {
          fill: #f8fafc !important;
        }
        .blocklyTreeRow {
          height: 34px !important;
          line-height: 34px !important;
          border-left: 4px solid transparent;
          margin-bottom: 2px !important;
          border-radius: 0 4px 4px 0 !important;
        }
        .blocklyTreeLabel {
          font-family: 'Inter', sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
        }
        .blocklyTreeSelected {
          background: rgba(43, 145, 234, 0.15) !important;
          color: #2b91ea !important;
          border-left-color: #2b91ea !important;
        }
        .blocklyTreeSelected .blocklyTreeLabel {
          font-weight: 600 !important;
        }
        .blocklyToolboxDiv {
          background-color: #f8fafc !important;
          border-right: 1px solid #e2e8f0 !important;
          padding-top: 0 !important;
          position: relative !important;
        }
        .toolbox-search-host {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
        }
        .toolbox-search {
          pointer-events: auto;
        }
        .toolbox-search input {
          width: 100%;
        }
        .blocklyFlyoutButton .blocklyFlyoutButtonBackground {
          fill: transparent !important;
          stroke: #6366f1 !important;
          stroke-width: 2px !important;
          rx: 8px !important;
          ry: 8px !important;
        }
        .blocklyFlyoutButton:hover .blocklyFlyoutButtonBackground {
          fill: rgba(99, 102, 241, 0.1) !important;
        }
        .blocklyFlyoutButton .blocklyText {
          fill: #ffffff !important;
          font-weight: 600 !important;
        }
        .flyout-hidden .blocklyFlyout,
        .flyout-hidden .blocklyFlyoutBackground,
        .flyout-hidden .blocklyFlyoutScrollbar,
        .flyout-hidden .blocklyFlyoutScrollbarHorizontal,
        .flyout-hidden .blocklyFlyoutScrollbarVertical {
          display: none !important;
        }
      `}</style>
    </main>
  );
}
