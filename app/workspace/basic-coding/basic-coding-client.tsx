// @ts-nocheck
"use client";
import { useEffect, useRef, useState, useMemo } from 'react';
import * as Blockly from 'blockly';
import { pythonGenerator, Order as PythonOrder } from 'blockly/python';
import 'blockly/msg/en';
import 'blockly/blocks';
import Sk from 'skulpt';
import 'skulpt/dist/skulpt-stdlib.js';
import { useSearchParams } from "next/navigation"
import { javascriptGenerator } from "blockly/javascript";
import { createTurtle } from "@/lib/turtleEngine";

const turtleEngineRef = { current: null as any };


const variablesRef = { current: {} as Record<string, any> }

class CleanNumberInput extends Blockly.FieldNumber {
  showEditor_() {
    if (this.textElement_) {
      this.textElement_.style.display = 'none';
    }

    super.showEditor_();

    const htmlInput = this.htmlInput_;
    if (!htmlInput) return;
    const oldDispose = htmlInput.onblur;
    htmlInput.onblur = (e) => {
      if (this.textElement_) {
        this.textElement_.style.display = '';
      }
      oldDispose?.(e);
    };
  }
}

class CleanTextInput extends Blockly.FieldTextInput {
  showEditor_() {
    if (this.textElement_) {
      this.textElement_.style.display = 'none';
    }

    super.showEditor_();

    const htmlInput = this.htmlInput_;
    if (!htmlInput) return;
    const oldDispose = htmlInput.onblur;
    htmlInput.onblur = (e) => {
      if (this.textElement_) {
        this.textElement_.style.display = '';
      }
      oldDispose?.(e);
    };
  }
}


function appendConsole(text: string) {
  console.log(text)
}

function showInputPrompt(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const value = window.prompt(prompt) ?? ""
    resolve(value)
  })
}


// Custom Blockly Blocks Definitions
const defineBlocks = () => {
  Blockly.Blocks['math_number'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new CleanNumberInput(0), 'NUM');

      this.setOutput(true, 'Number');
      this.setColour(230);
    }
  };

  /* =========================
     SPEAK BLOCK
  ========================= */

  Blockly.Blocks['speak_text'] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("Speak");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(20);
      this.setTooltip("Speak the given text");
    }
  };
  /* =========================
     SPRITE BLOCK
  ========================= */

  Blockly.Blocks['sprite_show'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Sprite")
        .appendField(
          new Blockly.FieldDropdown([
            ["Laugh", "Laugh"],
            ["Angry", "Angry"],
            ["Cry", "Cry"]
          ]),
          "SPRITE"
        )
        .appendField("webcam")
        .appendField(
          new Blockly.FieldDropdown([
            ["off", "off"],
            ["on", "on"]
          ]),
          "CAM"
        );

      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(200);
    }
  };
  /* =========================
     FILE HANDLING
  ========================= */
  Blockly.Blocks['file_upload'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(
          new Blockly.FieldImage(
            "https://cdn-icons-png.flaticon.com/512/716/716784.png",
            20,
            20,
            "*"
          )
        )
        .appendField("Upload file");

      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
      this.setTooltip("Upload a file from your device");
    }
  };


  Blockly.Blocks['file_open'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Open file")
        .appendField(new Blockly.FieldTextInput("file.txt"), "FILENAME")
        .appendField("in")
        .appendField(
          new Blockly.FieldDropdown([
            ["read", "r"],
            ["write", "w"]
          ]),
          "MODE"
        )
        .appendField("mode");

      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
    }
  };

  Blockly.Blocks['file_read'] = {
    init: function () {
      this.appendDummyInput().appendField("Read file");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
    }
  };

  Blockly.Blocks['file_write'] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("Write to file");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
    }
  };

  Blockly.Blocks['file_close'] = {
    init: function () {
      this.appendDummyInput().appendField("Close file");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(120);
    }
  };

  /* =========================
     SERIAL
  ========================= */

  Blockly.Blocks['serial_send'] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("Serial send");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(240);
    }
  };


  function pygalChartBlock(type, label) {
    Blockly.Blocks[`pygal_${type}`] = {
      init: function () {
        this.appendDummyInput()
          .appendField(label);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(280);
      }
    };
  }

  pygalChartBlock("bar", "Bar Chart");
  pygalChartBlock("hbar", "Horizontal Bar Chart");
  pygalChartBlock("line", "Line Chart");
  pygalChartBlock("pie", "Pie Chart");
  pygalChartBlock("radar", "Radar Chart");
  pygalChartBlock("stacked_bar", "Stacked Bar Chart");
  pygalChartBlock("stacked_line", "Stacked Line Chart");
  pygalChartBlock("xy", "XY Chart");

  // Add series
  Blockly.Blocks['pygal_add'] = {
    init: function () {
      this.appendValueInput("LABEL")
        .setCheck("String")
        .appendField("add");
      this.appendValueInput("VALUES")
        .setCheck("Array")
        .appendField("values");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  // Title
  Blockly.Blocks['pygal_title'] = {
    init: function () {
      this.appendValueInput("TITLE")
        .setCheck("String")
        .appendField("Title Chart");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  // X labels
  Blockly.Blocks['pygal_xlabels'] = {
    init: function () {
      this.appendValueInput("LABELS")
        .setCheck("Array")
        .appendField("X Labels");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  // Render
  Blockly.Blocks['pygal_render'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Render Chart");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['turtle_create'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("create new turtle")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Create a new turtle");
    }
  };

  // Turtle: Forward
  Blockly.Blocks['turtle_forward'] = {
    init: function () {
      this.appendValueInput("DISTANCE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("forward");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Move turtle forward");
    }
  };

  // Turtle: Turn Right
  Blockly.Blocks['turtle_right'] = {
    init: function () {
      this.appendValueInput("ANGLE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("turn right");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Turn turtle right");
    }
  };

  // Turtle: Turn Left
  Blockly.Blocks['turtle_left'] = {
    init: function () {
      this.appendValueInput("ANGLE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("turn left");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Turn turtle left");
    }
  };

  Blockly.Blocks["turtle_move"] = {
    init() {
      this.appendValueInput("DISTANCE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField(
          new Blockly.FieldDropdown([
            ["forward", "FORWARD"],
            ["backward", "BACKWARD"]
          ]),
          "DIRECTION"
        );

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(330);
      this.setTooltip("Move turtle forward or backward");
    },
  }

  // Turtle: Pen Color

  Blockly.Blocks["turtle_pencolor"] = {
  init: function () {
    this.appendValueInput("COLOR")
      .appendField("set")
      .appendField(new Blockly.FieldVariable("t"), "VAR")
      .appendField("pen color");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};

  // Turtle: Background Color
 Blockly.Blocks["turtle_bgcolor"] = {
  init: function () {
    this.appendValueInput("COLOR")
      .appendField("set background color");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};


  // For Loop
  Blockly.Blocks['controls_repeat'] = {
    init: function () {
      this.appendValueInput("TIMES")
        .setCheck("Number")
        .appendField("repeat");
      this.appendDummyInput()
        .appendField("times");
      this.appendStatementInput("DO")
        .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("Repeat actions");
    }
  };

  // Input: Text
  Blockly.Blocks['text'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
      this.setOutput(true, "String");
      this.setColour(160);
      this.setTooltip("Text value");
    }
  };

  // Input: Input with Prompt
  Blockly.Blocks['input_prompt'] = {
    init: function () {
      this.appendValueInput("PROMPT")
        .setCheck("String")
        .appendField("input with prompt");
      this.setOutput(true, "String");
      this.setColour(0);
      this.setTooltip("Get user input with a prompt");
    }
  };

  // Output: Print
  Blockly.Blocks['output_print'] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck(null)
        .appendField("print");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Print output");
    }
  };

  // Output: Print Separated By
  Blockly.Blocks['output_print_sep'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("print separated by")
        .appendField(new Blockly.FieldTextInput(","), "SEP");
      this.appendStatementInput("ITEMS")
        .appendField("items");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Print items separated by a delimiter");
    }
  };

  // Output: Print End With
  Blockly.Blocks['output_print_end'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("print end with")
        .appendField(new Blockly.FieldTextInput("\\n"), "END");
      this.appendStatementInput("ITEMS")
        .appendField("items");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Print with custom end character");
    }
  };

  // Output: Comment
  Blockly.Blocks['output_comment'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Comment: ")
        .appendField(new Blockly.FieldTextInput(""), "COMMENT");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Add a comment (ignored in execution)");
    }
  };

  // Output: Print Item (used within print separated by / print end with)
  Blockly.Blocks['output_print_item'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck(null);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Item to print");
    }
  };

  // String: Text input
  Blockly.Blocks['text_input'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("String")
        .appendField(new Blockly.FieldTextInput("Enter text"), "TEXT");
      this.setOutput(true, "String");
      this.setColour(160);
      this.setTooltip("Text string");
    }
  };

  // Boolean: True
  Blockly.Blocks['logic_true'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("True");
      this.setOutput(true, "Boolean");
      this.setColour(270);
      this.setTooltip("Boolean true value");
    }
  };

  // Boolean: False
  Blockly.Blocks['logic_false'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("False");
      this.setOutput(true, "Boolean");
      this.setColour(270);
      this.setTooltip("Boolean false value");
    }
  };

  // Boolean: Null
  Blockly.Blocks['logic_null'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("null");
      this.setOutput(true, null);
      this.setColour(270);
      this.setTooltip("Null value");
    }
  };

  // Logic: If condition
  Blockly.Blocks['logic_if'] = {
    init: function () {
      this.appendValueInput("IF0")
        .setCheck("Boolean")
        .appendField("if");
      this.appendStatementInput("DO0")
        .appendField("do");
      this.setColour(210);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("If condition");
    }
  };

  // Logic: Comparison
  Blockly.Blocks['logic_compare'] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["==", "EQ"],
          ["!=", "NEQ"],
          ["<", "LT"],
          ["<=", "LTE"],
          [">", "GT"],
          [">=", "GTE"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck(null);
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Compare values");
    }
  };

  // Logic: And/Or
  Blockly.Blocks['logic_operation'] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck("Boolean");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["and", "AND"],
          ["or", "OR"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck("Boolean");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Logical operation");
    }
  };

  // Logic: Not
  Blockly.Blocks['logic_not'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck("Boolean")
        .appendField("not");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("Logical not");
    }
  };

  // Logic: Ternary (if true/if false)
  Blockly.Blocks['logic_ternary'] = {
    init: function () {
      this.appendValueInput("TEST")
        .setCheck("Boolean")
        .appendField("test");
      this.appendValueInput("IF_TRUE")
        .setCheck(null)
        .appendField("if true");
      this.appendValueInput("IF_FALSE")
        .setCheck(null)
        .appendField("if false");
      this.setOutput(true, null);
      this.setColour(210);
      this.setTooltip("If true/if false");
    }
  };

  // Functions: Define function
  Blockly.Blocks['procedures_defnoreturn'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("define")
        .appendField(new Blockly.FieldTextInput("do_something"), "NAME");

      this.appendStatementInput("STACK");

      this.setColour(290);
      this.setTooltip("Define a new function");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };

  Blockly.Blocks['procedures_defreturn'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("define")
        .appendField(new Blockly.FieldTextInput("do_something"), "NAME");

      this.appendStatementInput("STACK");

      this.appendValueInput("RETURN")
        .appendField("return");

      this.setColour(290);
      this.setTooltip("Define function with return");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };


  // Functions: Return
  Blockly.Blocks['procedures_return'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck(null)
        .appendField("return");
      this.setPreviousStatement(true, null);
      this.setColour(290);
      this.setTooltip("Return from function");
    }
  };

  // Functions: If return
  Blockly.Blocks['procedures_ifreturn'] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean");
      this.appendValueInput("VALUE")
        .setCheck(null)
        .appendField("return");
      this.setPreviousStatement(true, null);
      this.setColour(290);
      this.setTooltip("Return if condition");
    }
  };

  // Tuples: Create tuple
  Blockly.Blocks['tuples_create'] = {
    init: function () {
      this.appendValueInput("ITEM1")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["+", "ADD"],
          ["-", "REMOVE"]
        ]), "OP");
      this.setOutput(true, "Tuple");
      this.setColour(30);
      this.setTooltip("Create tuple");
    }
  };

  // Tuples: Get item
  Blockly.Blocks['tuples_get_item'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("get item number");
      this.appendValueInput("INDEX")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("of");
      this.appendValueInput("TUPLE")
        .setCheck("Tuple");
      this.setOutput(true, null);
      this.setColour(30);
      this.setTooltip("Get item from tuple");
    }
  };

  // Tuples: Count element
  Blockly.Blocks['tuples_count'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("count element");
      this.appendValueInput("ELEMENT")
        .setCheck(null);
      this.appendDummyInput()
        .appendField("in tuple");
      this.appendValueInput("TUPLE")
        .setCheck("Tuple");
      this.setOutput(true, "Number");
      this.setColour(30);
      this.setTooltip("Count element in tuple");
    }
  };

  // Tuples: Position
  Blockly.Blocks['tuples_position'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("position of element");
      this.appendValueInput("ELEMENT")
        .setCheck(null);
      this.appendDummyInput()
        .appendField("in tuple");
      this.appendValueInput("TUPLE")
        .setCheck("Tuple");
      this.setOutput(true, "Number");
      this.setColour(30);
      this.setTooltip("Position of element in tuple");
    }
  };

  // Tuples: Length
  Blockly.Blocks['tuples_length'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("length of");
      this.appendValueInput("TUPLE")
        .setCheck("Tuple");
      this.setOutput(true, "Number");
      this.setColour(30);
      this.setTooltip("Length of tuple");
    }
  };

  // Conversion: To Int
  Blockly.Blocks['convert_to_int'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Int");
      this.appendValueInput("VALUE")
        .setCheck(null);
      this.setOutput(true, "Number");
      this.setColour(100);
      this.setTooltip("Convert to integer");
    }
  };

 // Conversion: To Float
Blockly.Blocks['convert_to_float'] = {
  init: function () {
    this.appendValueInput("VALUE")
      .setCheck(null)
      .appendField("float");

    this.setOutput(true, "Number");
    this.setColour(100);
    this.setTooltip("Convert value to float");
  }
};

// Conversion: To String
Blockly.Blocks['convert_to_string'] = {
  init: function () {
    this.appendValueInput("VALUE")
      .setCheck(null)
      .appendField("str");

    this.setOutput(true, "String");
    this.setColour(100);
    this.setTooltip("Convert value to string");
  }
};

// Conversion: To Boolean
Blockly.Blocks['convert_to_bool'] = {
  init: function () {
    this.appendValueInput("VALUE")
      .setCheck(null)
      .appendField("bool");

    this.setOutput(true, "Boolean");
    this.setColour(100);
    this.setTooltip("Convert value to boolean");
  }
};

  // Conversion: Upper case
  Blockly.Blocks['convert_upper_case'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck("String")
        .appendField("Convert to upper case");
      this.setOutput(true, "String");
      this.setColour(100);
      this.setTooltip("Convert to upper case");
    }
  };

  // Conversion: Lower case
  Blockly.Blocks['convert_lower_case'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck("String")
        .appendField("Convert to lower case");
      this.setOutput(true, "String");
      this.setColour(100);
      this.setTooltip("Convert to lower case");
    }
  };

  // LOOPS: Repeat While
  Blockly.Blocks['controls_repeat_while'] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean")
        .appendField("repeat while");
      this.appendStatementInput("DO")
        .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("Repeat while condition is true");
    }
  };

  // LOOPS: For (Count with from/to)
  Blockly.Blocks['controls_for'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("count with")
        .appendField(new Blockly.FieldVariable("i"), "VAR")
        .appendField("from");
      this.appendValueInput("FROM")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("to");
      this.appendValueInput("TO")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("by");
      this.appendValueInput("BY")
        .setCheck("Number");
      this.appendStatementInput("DO")
        .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("Count from/to with step");
    }
  };

  // LOOPS: For Each
  Blockly.Blocks['controls_forEach'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("for each item")
        .appendField(new Blockly.FieldVariable("item"), "VAR")
        .appendField("in iterable");
      this.appendValueInput("LIST")
        .setCheck(["Array", "String"]);
      this.appendStatementInput("DO")
        .appendField("do");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("For each item in iterable");
    }
  };

  // LOOPS: Break
  Blockly.Blocks['controls_flow_statements'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("break out of loop");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("Break out of loop");
    }
  };

  // MATH: Range
  Blockly.Blocks['math_range'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("range");
      this.setOutput(true, "Array");
      this.setColour(230);
      this.setTooltip("Create range");
    }
  };

  // MATH: Range with to
  Blockly.Blocks['math_range_to'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("range");
      this.appendValueInput("START")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("to");
      this.appendValueInput("END")
        .setCheck("Number");
      this.setOutput(true, "Array");
      this.setColour(230);
      this.setTooltip("Create range from to");
    }
  };

  // MATH: Square root
  Blockly.Blocks['math_sqrt'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("square root");
      this.appendValueInput("VALUE")
        .setCheck("Number");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Square root");
    }
  };

  // MATH: Round
  Blockly.Blocks['math_round'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("round");
      this.appendValueInput("VALUE")
        .setCheck("Number");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Round to nearest integer");
    }
  };

  // MATH: Sin
  Blockly.Blocks['math_sin'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("sin");
      this.appendValueInput("VALUE")
        .setCheck("Number");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Sine");
    }
  };

  // MATH: Pi
  Blockly.Blocks['math_pi'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("π");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Pi constant");
    }
  };

  // MATH: Sum of list
  Blockly.Blocks['math_sum'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("sum of list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Sum of list");
    }
  };

  // MATH: Remainder (modulo)
  Blockly.Blocks['math_remainder'] = {
    init: function () {
      this.appendValueInput("DIVIDEND")
        .setCheck("Number")
        .appendField("remainder of");
      this.appendValueInput("DIVISOR")
        .setCheck("Number")
        .appendField("÷");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Remainder (modulo)");
    }
  };

  // MATH: Random integer
  Blockly.Blocks['math_random_int'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("random integer from");
      this.appendValueInput("FROM")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("to");
      this.appendValueInput("TO")
        .setCheck("Number");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Random integer");
    }
  };

  // MATH: Random fraction
  Blockly.Blocks['math_random_fraction'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("random fraction");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("Random fraction 0.0 to 1.0");
    }
  };

  /* =========================
   CONVERSION BLOCKS
========================= */


  // Convert to Upper Case
  Blockly.Blocks['convert_upper_case'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck("String")
        .appendField("Convert to upper case");
      this.setOutput(true, "String");
      this.setColour(100);
      this.setTooltip("Convert string to upper case");
    }
  };

  // Convert to Lower Case
  Blockly.Blocks['convert_lower_case'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .setCheck("String")
        .appendField("Convert to lower case");
      this.setOutput(true, "String");
      this.setColour(100);
      this.setTooltip("Convert string to lower case");
    }
  };

  // LISTS: Create list
  Blockly.Blocks['lists_create_with'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("create list of");
      this.appendDummyInput()
        .appendField(new Blockly.FieldImage("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiNGRkEwMDAiLz48L3N2Zz4=", 15, 15));
      this.setOutput(true, "Array");
      this.setColour(245);
      this.setTooltip("Create list");
    }
  };

  // LISTS: Get item
  Blockly.Blocks['lists_getIndex'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("get item number");
      this.appendValueInput("INDEX")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("of");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setOutput(true, null);
      this.setColour(245);
      this.setTooltip("Get item from list");
    }
  };

  // LISTS: Append item
  Blockly.Blocks['lists_append'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("to list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.appendDummyInput()
        .appendField("append item");
      this.appendValueInput("ITEM");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Append item to list");
    }
  };

  // LISTS: Remove item
  Blockly.Blocks['lists_remove_item'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("from list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.appendDummyInput()
        .appendField("remove item");
      this.appendValueInput("ITEM");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Remove item from list");
    }
  };

  // LISTS: Remove at position
  Blockly.Blocks['lists_remove_at'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("remove element at position");
      this.appendValueInput("INDEX")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("in list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Remove element at position");
    }
  };

  // LISTS: Sort
  Blockly.Blocks['lists_sort'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("sort the list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Sort list");
    }
  };

  // LISTS: Reverse
  Blockly.Blocks['lists_reverse'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("reverse lists");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Reverse list");
    }
  };

  // LISTS: Insert at position
  Blockly.Blocks['lists_insert_at'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("insert");
      this.appendValueInput("ITEM");
      this.appendDummyInput()
        .appendField("at position");
      this.appendValueInput("INDEX")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("in list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Insert at position");
    }
  };

  // SETS: Create set
  Blockly.Blocks['sets_create_with'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("create set of");
      this.setOutput(true, "Set");
      this.setColour(260);
      this.setTooltip("Create set");
    }
  };

  // SETS: Add item
  Blockly.Blocks['sets_add_item'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("to set");
      this.appendValueInput("SET")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("add item");
      this.appendValueInput("ITEM");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Add item to set");
    }
  };

  // SETS: Union
  Blockly.Blocks['sets_union'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Union of set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("and");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Set");
      this.setColour(260);
      this.setTooltip("Union of sets");
    }
  };

  // SETS: Intersection
  Blockly.Blocks['sets_intersection'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Intersection of set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("and");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Set");
      this.setColour(260);
      this.setTooltip("Intersection of sets");
    }
  };

  // SETS: Difference
  Blockly.Blocks['sets_difference'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("difference with set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Set");
      this.setColour(260);
      this.setTooltip("Difference of sets");
    }
  };

  // DICTIONARIES: Create dict
  Blockly.Blocks['dicts_create_with'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("dictionary of");
      this.appendDummyInput()
        .appendField("key1:");
      this.appendValueInput("KEY1");
      this.appendDummyInput()
        .appendField("value1:");
      this.appendValueInput("VALUE1");
      this.setOutput(true, "Object");
      this.setColour(10);
      this.setTooltip("Create dictionary");
    }
  };

  // DICTIONARIES: Get value by key
  Blockly.Blocks['dicts_get_value'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("get value of key");
      this.appendValueInput("KEY");
      this.appendDummyInput()
        .appendField("in dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.setOutput(true, null);
      this.setColour(10);
      this.setTooltip("Get value from dictionary");
    }
  };

  // DICTIONARIES: Get keys
  Blockly.Blocks['dicts_get_keys'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("get keys of dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.setOutput(true, "Array");
      this.setColour(10);
      this.setTooltip("Get all keys from dictionary");
    }
  };

  // DICTIONARIES: Get values
  Blockly.Blocks['dicts_get_values'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("get all values from dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.setOutput(true, "Array");
      this.setColour(10);
      this.setTooltip("Get all values from dictionary");
    }
  };

  // DICTIONARIES: Remove all elements
  Blockly.Blocks['dicts_clear'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("remove all elements of dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(10);
      this.setTooltip("Clear dictionary");
    }
  };

  // MOTION: Move backward
  Blockly.Blocks['turtle_backward'] = {
    init: function () {
      this.appendValueInput("DISTANCE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("move backward by");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Move turtle backward");
    }
  };

  // MOTION: Dot (circle)
  Blockly.Blocks['turtle_dot'] = {
    init: function () {
      this.appendValueInput("SIZE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("a dot of radius");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Draw a dot");
    }
  };

  // MOTION: Set heading (direction)
  Blockly.Blocks['turtle_heading'] = {
    init: function () {
      this.appendValueInput("ANGLE")
        .setCheck("Number")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("set heading");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Set turtle heading");
    }
  };

  // MOTION: Position to
  Blockly.Blocks['turtle_position'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("set turtle")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("position to (");
      this.appendValueInput("X")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField(",");
      this.appendValueInput("Y")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField(")");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Set turtle position");
    }
  };

  // MOTION: Pen up
  Blockly.Blocks['turtle_penup'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("make turtle")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("pen-up");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Pen up");
    }
  };

  // MOTION: Pen down
  Blockly.Blocks['turtle_pendown'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("make turtle")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("pen-down");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Pen down");
    }
  };

  // MOTION: Begin fill
  Blockly.Blocks['turtle_begin_fill'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("make turtle")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("begin fill");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("Begin fill");
    }
  };

  // MOTION: End fill
  Blockly.Blocks['turtle_end_fill'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("make turtle")
        .appendField(new Blockly.FieldVariable("turtle"), "VAR")
        .appendField("end fill");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(90);
      this.setTooltip("End fill");
    }
  };

  // TURTLE: Shape
 Blockly.Blocks['turtle_shape'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("set turtle")
      .appendField(new Blockly.FieldVariable("turtle"), "VAR")
      .appendField("shape in")
      .appendField(
        new Blockly.FieldDropdown([
          ["turtle", "turtle"],   // 🐢 added
          ["triangle", "triangle"],
          ["circle", "circle"],
          ["square", "square"]
        ]),
        "SHAPE"
      );

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
    this.setTooltip("Set turtle shape");
  }
};

  // TURTLE: Speed
 Blockly.Blocks["turtle_speed"] = {
  init: function () {
    this.appendValueInput("SPEED")
      .appendField("set")
      .appendField(new Blockly.FieldVariable("t"), "VAR")
      .appendField("speed");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};

  // TURTLE: Width
 Blockly.Blocks["turtle_width"] = {
  init: function () {
    this.appendValueInput("WIDTH")
      .appendField("set")
      .appendField(new Blockly.FieldVariable("t"), "VAR")
      .appendField("width");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};

  // TURTLE: Fill color
Blockly.Blocks["turtle_fill_color"] = {
  init: function () {
    this.appendValueInput("COLOR")
      .appendField("set")
      .appendField(new Blockly.FieldVariable("t"), "VAR")
      .appendField("fill color");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};

  // TURTLE: Color (pen color via value input)
 Blockly.Blocks["turtle_color"] = {
  init: function () {
    this.appendValueInput("COLOR")
      .appendField("set")
      .appendField(new Blockly.FieldVariable("t"), "VAR")
      .appendField("color");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};


  // CONTROL: On key press
  Blockly.Blocks['controls_onkey'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Call")
        .appendField(new Blockly.FieldVariable("function"), "FUNC")
        .appendField("on key press");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["Up", "Up"],
          ["Down", "Down"],
          ["Left", "Left"],
          ["Right", "Right"]
        ]), "KEY");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(0);
      this.setTooltip("Call on key press");
    }
  };

  // CONTROL: On mouse click
  Blockly.Blocks['controls_onclick'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Call")
        .appendField(new Blockly.FieldVariable("function"), "FUNC")
        .appendField("On mouse click");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(0);
      this.setTooltip("Call on mouse click");
    }
  };

  // CONTROL: Clear screen
  Blockly.Blocks['controls_clear_screen'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Clear Screen");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(0);
      this.setTooltip("Clear the screen");
    }
  };

  // COLORS: Red
  Blockly.Blocks['colour_red'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("RED");
      this.setOutput(true, "String");
      this.setColour(0);
      this.setTooltip("Red color");
    }
  };

  // COLORS: Green
  Blockly.Blocks['colour_green'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("GREEN");
      this.setOutput(true, "String");
      this.setColour(120);
      this.setTooltip("Green color");
    }
  };

  // COLORS: Blue
  Blockly.Blocks['colour_blue'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("BLUE");
      this.setOutput(true, "String");
      this.setColour(240);
      this.setTooltip("Blue color");
    }
  };

  // COLORS: Yellow
  Blockly.Blocks['colour_yellow'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("YELLOW");
      this.setOutput(true, "String");
      this.setColour(60);
      this.setTooltip("Yellow color");
    }
  };

  // COLORS: Purple
  Blockly.Blocks['colour_purple'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("PURPLE");
      this.setOutput(true, "String");
      this.setColour(270);
      this.setTooltip("Purple color");
    }
  };

  // COLORS: Pink
  Blockly.Blocks['colour_pink'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("PINK");
      this.setOutput(true, "String");
      this.setColour(330);
      this.setTooltip("Pink color");
    }
  };

  // COLORS: Color picker
  Blockly.Blocks['colour_picker'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Select Colour")
        .appendField(
          new Blockly.FieldDropdown([
            ["Red", "#ff0000"],
            ["Green", "#00ff00"],
            ["Blue", "#0000ff"],
            ["Yellow", "#ffff00"],
            ["Purple", "#800080"],
            ["Pink", "#ff69b4"],
            ["Orange", "#ffa500"],
            ["Cyan", "#00ffff"],
            ["Magenta", "#ff00ff"],
            ["Lime", "#32cd32"],
            ["Navy", "#000080"],
            ["Teal", "#008080"],
            ["Maroon", "#800000"],
            ["Gray", "#808080"],
            ["White", "#ffffff"],
            ["Black", "#000000"]
          ]),
          "COLOUR"
        );
      this.setOutput(true, "String");
      this.setColour(0);
      this.setTooltip("Select a color");
    }
  };

  // LISTS: First occurrence
  Blockly.Blocks['lists_first_occurrence'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("first occurrence of");
      this.appendValueInput("ITEM");
      this.appendDummyInput()
        .appendField("in list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setOutput(true, "Number");
      this.setColour(245);
      this.setTooltip("Get first occurrence of item");
    }
  };

  // LISTS: Count element
  Blockly.Blocks['lists_count_element'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("count element");
      this.appendValueInput("ITEM");
      this.appendDummyInput()
        .appendField("in list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.setOutput(true, "Number");
      this.setColour(245);
      this.setTooltip("Count occurrences of item");
    }
  };

  // LISTS: Extend list
  Blockly.Blocks['lists_extend'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("extend list");
      this.appendValueInput("LIST1")
        .setCheck("Array");
      this.appendDummyInput()
        .appendField("with list");
      this.appendValueInput("LIST2")
        .setCheck("Array");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(245);
      this.setTooltip("Extend list with another list");
    }
  };

  // LISTS: Get sub-list
  Blockly.Blocks['lists_sub_list'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("in list");
      this.appendValueInput("LIST")
        .setCheck("Array");
      this.appendDummyInput()
        .appendField("get sub-list from");
      this.appendDummyInput()
        .appendField("#");
      this.appendValueInput("START")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("to");
      this.appendDummyInput()
        .appendField("#");
      this.appendValueInput("END")
        .setCheck("Number");
      this.setOutput(true, "Array");
      this.setColour(245);
      this.setTooltip("Get sublist from indices");
    }
  };

  // SETS: Remove random element
  Blockly.Blocks['sets_remove_random'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("remove random element");
      this.appendValueInput("SET")
        .setCheck("Set");
      this.setOutput(true, null);
      this.setColour(260);
      this.setTooltip("Remove and return random element");
    }
  };

  // SETS: Is superset
  Blockly.Blocks['sets_is_superset'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("is superset of set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Boolean");
      this.setColour(260);
      this.setTooltip("Check if superset");
    }
  };

  // SETS: Is subset
  Blockly.Blocks['sets_is_subset'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("is subset of set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Boolean");
      this.setColour(260);
      this.setTooltip("Check if subset");
    }
  };

  // SETS: Is disjoint
  Blockly.Blocks['sets_is_disjoint'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("is set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("is disjoint with set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Boolean");
      this.setColour(260);
      this.setTooltip("Check if disjoint sets");
    }
  };

  // SETS: Update with difference
  Blockly.Blocks['sets_update_difference'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("update set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("with difference on set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Update with difference");
    }
  };

  // SETS: Symmetric difference
  Blockly.Blocks['sets_symmetric_difference'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("symmetric difference on set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setOutput(true, "Set");
      this.setColour(260);
      this.setTooltip("Symmetric difference");
    }
  };

  // SETS: Update with symmetric difference
  Blockly.Blocks['sets_update_symmetric_difference'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("update set");
      this.appendValueInput("SET1")
        .setCheck("Set");
      this.appendDummyInput()
        .appendField("with symmetric difference on set");
      this.appendValueInput("SET2")
        .setCheck("Set");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(260);
      this.setTooltip("Update with symmetric difference");
    }
  };

  // DICTIONARIES: Get items
  Blockly.Blocks['dicts_get_items'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("get items of dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.setOutput(true, "Array");
      this.setColour(10);
      this.setTooltip("Get all items (key-value pairs)");
    }
  };

  // DICTIONARIES: Remove key
  Blockly.Blocks['dicts_remove_key'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("remove key");
      this.appendValueInput("KEY");
      this.appendDummyInput()
        .appendField("from dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(10);
      this.setTooltip("Remove key from dictionary");
    }
  };

  // DICTIONARIES: Update dictionary
  Blockly.Blocks['dicts_update'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("update dictionary");
      this.appendValueInput("DICT")
        .setCheck("Object");
      this.appendDummyInput()
        .appendField("with key");
      this.appendValueInput("KEY");
      this.appendDummyInput()
        .appendField(", value");
      this.appendValueInput("VALUE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(10);
      this.setTooltip("Update dictionary with key-value");
    }
  };

  // TURTLE: Hide
  Blockly.Blocks["turtle_hide"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("hide turtle")
      .appendField(new Blockly.FieldVariable("t"), "VAR");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};


  // TURTLE: Show
 Blockly.Blocks["turtle_show"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("show turtle")
      .appendField(new Blockly.FieldVariable("t"), "VAR");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(330);
  }
};


  // CONTROL: Listen
  Blockly.Blocks['controls_listen'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("make turtle listen");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(0);
      this.setTooltip("Make turtle listen for events");
    }
  };

  // CONTROL: Button
  Blockly.Blocks['controls_button'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Button")
        .appendField(
          new Blockly.FieldDropdown([
            ["Up", "Up"],
            ["Down", "Down"],
            ["Left", "Left"],
            ["Right", "Right"]
          ]),
          "DIRECTION"
        );
      this.setOutput(true, "String");
      this.setColour(0);
      this.setTooltip("Button direction");
    }
  };

  /* =========================
    GRAPH PLOT BLOCKS
 ========================= */

  // plot line (single list, y only)
  Blockly.Blocks['plot_line'] = {
    init: function () {
      this.appendValueInput("Y")
        .setCheck("Array")
        .appendField("plot line");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // plot Xs vs Ys
  Blockly.Blocks['plot_xs_ys'] = {
    init: function () {
      this.appendValueInput("X")
        .setCheck("Array")
        .appendField("plot Xs");
      this.appendValueInput("Y")
        .setCheck("Array")
        .appendField("vs Ys");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // plot scatter
  Blockly.Blocks['plot_scatter'] = {
    init: function () {
      this.appendValueInput("X")
        .setCheck("Array")
        .appendField("plot scatter vs");
      this.appendValueInput("Y")
        .setCheck("Array");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // plot histogram
  Blockly.Blocks['plot_histogram'] = {
    init: function () {
      this.appendValueInput("DATA")
        .setCheck("Array")
        .appendField("plot histogram");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // show plot
  Blockly.Blocks['plot_show'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("show plot canvas");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // title
  Blockly.Blocks['plot_title'] = {
    init: function () {
      this.appendValueInput("TITLE")
        .setCheck("String")
        .appendField("make plot's title");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // x label
  Blockly.Blocks['plot_xlabel'] = {
    init: function () {
      this.appendValueInput("LABEL")
        .setCheck("String")
        .appendField("make plot's x-axis label");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  // y label
  Blockly.Blocks['plot_ylabel'] = {
    init: function () {
      this.appendValueInput("LABEL")
        .setCheck("String")
        .appendField("make plot's y-axis label");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
    }
  };

  /* =========================
   INPUT
========================= */

  Blockly.Blocks['input_prompt'] = {
    init: function () {
      this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("input with prompt");
      this.setOutput(true);
      this.setColour(30);
    }
  };

  Blockly.Blocks['string_literal'] = {
    init: function () {
      this.appendDummyInput()
        .appendField('"')
        .appendField(new CleanTextInput('text'), 'VALUE')
        .appendField('"');

      this.setOutput(true, 'String');
      this.setColour(160);
    }
  };

  Blockly.Blocks['number_literal'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new CleanNumberInput(0, -Infinity, Infinity, 1), 'VALUE');

      this.setOutput(true, 'Number');
      this.setColour(120);
      this.setTooltip('Integer number');
      this.setHelpUrl('');
    }
  };


  Blockly.Blocks['boolean_literal'] = {
    init: function () {
      this.appendDummyInput()
        .appendField(
          new Blockly.FieldDropdown([
            ["true", "True"],
            ["false", "False"]
          ]),
          "BOOL"
        );
      this.setOutput(true, "Boolean");
      this.setColour(30);
    }
  };
  /* =========================
     OUTPUT
  ========================= */

  Blockly.Blocks['print_simple'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .appendField("print");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
    }
  };

  Blockly.Blocks['print_sep'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .appendField("print separated by");
      this.appendValueInput("SEP")
        .setCheck("String");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
    }
  };

  Blockly.Blocks['print_end'] = {
    init: function () {
      this.appendValueInput("VALUE")
        .appendField("print end with");
      this.appendValueInput("END")
        .setCheck("String");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
    }
  };

  Blockly.Blocks['comment'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Comment:")
        .appendField(new Blockly.FieldTextInput("will be ignored"), "TEXT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
    }
  };
};

const defineJavascriptGenerators = () => {

  /* ==========================
     CREATE TURTLE (NO-OP)
     ========================== */
javascriptGenerator.forBlock["turtle_create"] = function (block) {
  return "";
};


javascriptGenerator.forBlock['colour_red'] = function () {
  return ['"red"', javascriptGenerator.ORDER_ATOMIC];
};

javascriptGenerator.forBlock['colour_green'] = function () {
  return ['"green"', javascriptGenerator.ORDER_ATOMIC];
};

javascriptGenerator.forBlock['colour_blue'] = function () {
  return ['"blue"', javascriptGenerator.ORDER_ATOMIC];
};

javascriptGenerator.forBlock['colour_yellow'] = function () {
  return ['"yellow"', javascriptGenerator.ORDER_ATOMIC];
};

javascriptGenerator.forBlock['colour_purple'] = function () {
  return ['"purple"', javascriptGenerator.ORDER_ATOMIC];
};

javascriptGenerator.forBlock['colour_pink'] = function () {
  return ['"pink"', javascriptGenerator.ORDER_ATOMIC];
};
javascriptGenerator.forBlock['colour_picker'] = function (block) {
  const color = block.getFieldValue('COLOUR');
  return [`"${color}"`, javascriptGenerator.ORDER_ATOMIC];
};


  /* ==========================
     MOVE (FORWARD / BACKWARD)
     ========================== */
  javascriptGenerator.forBlock["turtle_move"] = function (block) {
    const distance =
      javascriptGenerator.valueToCode(block, "DISTANCE", 0) || "0";
    const direction = block.getFieldValue("DIRECTION");

    if (direction === "BACKWARD") {
      return `__turtle.backward(${distance});\n`;
    }

    return `__turtle.forward(${distance});\n`;
  };

  javascriptGenerator.forBlock["turtle_forward"] = function (block) {
    const distance =
      javascriptGenerator.valueToCode(block, "DISTANCE", 0) || "0";
    return `__turtle.forward(${distance});\n`;
  };

  javascriptGenerator.forBlock["turtle_backward"] = function (block) {
    const distance =
      javascriptGenerator.valueToCode(block, "DISTANCE", 0) || "0";
    return `__turtle.backward(${distance});\n`;
  };

  /* ==========================
     TURN
     ========================== */
  javascriptGenerator.forBlock["turtle_right"] = function (block) {
    const angle =
      javascriptGenerator.valueToCode(block, "ANGLE", 0) || "0";
    return `__turtle.right(${angle});\n`;
  };

  javascriptGenerator.forBlock["turtle_left"] = function (block) {
    const angle =
      javascriptGenerator.valueToCode(block, "ANGLE", 0) || "0";
    return `__turtle.left(${angle});\n`;
  };

  /* ==========================
     HEADING
     ========================== */
  javascriptGenerator.forBlock["turtle_heading"] = function (block) {
    const angle =
      javascriptGenerator.valueToCode(block, "ANGLE", 0) || "0";
    return `__turtle.setHeading(${angle});\n`;
  };

  /* ==========================
     POSITION
     ========================== */
  javascriptGenerator.forBlock["turtle_position"] = function (block) {
    const x =
      javascriptGenerator.valueToCode(block, "X", 0) || "0";
    const y =
      javascriptGenerator.valueToCode(block, "Y", 0) || "0";
    return `__turtle.goto(${x}, ${y});\n`;
  };

  /* ==========================
     DOT
     ========================== */
  javascriptGenerator.forBlock["turtle_dot"] = function (block) {
    const size =
      javascriptGenerator.valueToCode(block, "SIZE", 0) || "10";
    return `__turtle.dot(${size});\n`;
  };

  /* ==========================
     PEN CONTROL
     ========================== */
  javascriptGenerator.forBlock["turtle_penup"] = () =>
    "__turtle.penUp();\n";

  javascriptGenerator.forBlock["turtle_pendown"] = () =>
    "__turtle.penDown();\n";

javascriptGenerator.forBlock["turtle_width"] = function (block) {
  const t = javascriptGenerator.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const w = javascriptGenerator.valueToCode(block, "WIDTH", javascriptGenerator.ORDER_NONE) || "1";
  return `__turtle.width(${w});\n`;
};


  /* ==========================
     COLORS
     ========================== */
 javascriptGenerator.forBlock["turtle_color"] =
javascriptGenerator.forBlock["turtle_pencolor"] = function (block) {
  const t = javascriptGenerator.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const c = javascriptGenerator.valueToCode(block, "COLOR", javascriptGenerator.ORDER_NONE) || '"#000000"';
  return `__turtle.pencolor(${c});\n`;
};

  javascriptGenerator.forBlock["turtle_fill_color"] = function (block) {
  const t = javascriptGenerator.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const c = javascriptGenerator.valueToCode(block, "COLOR", javascriptGenerator.ORDER_NONE) || '"#000000"';
  return `__turtle.fillcolor(${c});\n`;
};

 javascriptGenerator.forBlock["turtle_bgcolor"] = function (block) {
  const c = javascriptGenerator.valueToCode(block, "COLOR", javascriptGenerator.ORDER_NONE) || '"#ffffff"';
  return `__turtle.bgcolor(${c});\n`;
};

  /* ==========================
     FILL
     ========================== */
  javascriptGenerator.forBlock["turtle_begin_fill"] = () =>
    "__turtle.beginFill();\n";

  javascriptGenerator.forBlock["turtle_end_fill"] = () =>
    "__turtle.endFill();\n";

  /* ==========================
     SHAPE
     ========================== */
 javascriptGenerator.forBlock["turtle_shape"] = function (block) {
  const shape = block.getFieldValue("SHAPE");
  return `__turtle.setShape("${shape}");\n`;
};

  /* ==========================
     SPEED
     ========================== */
  javascriptGenerator.forBlock["turtle_speed"] = function (block) {
  const t = javascriptGenerator.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const s = javascriptGenerator.valueToCode(block, "SPEED", javascriptGenerator.ORDER_NONE) || "5";
  return `__turtle.speed(${s});\n`;
};

  /* ==========================
     VISIBILITY
     ========================== */
 javascriptGenerator.forBlock["turtle_hide"] = function (block) {
  const t = javascriptGenerator.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  return `__turtle.hideturtle();\n`;
};

 javascriptGenerator.forBlock["turtle_show"] = function (block) {
  const t = javascriptGenerator.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  return `__turtle.showturtle();\n`;
};

};

const definePythonGenerators = () => {
  /* =========================
     PYGAL GENERATORS
  ========================= */
  pythonGenerator.forBlock['speak_text'] = function (block, gen) {
    const text =
      gen.valueToCode(block, "TEXT", PythonOrder.NONE) || '""';

    return `playsound.say(${text})\n`;
  };

  pythonGenerator.forBlock['sprite_show'] = function (block) {
    const sprite = block.getFieldValue("SPRITE"); // Laugh
    const cam = block.getFieldValue("CAM");       // on / off

    return `sprites.show("${sprite}", "${cam}")\n`;
  };

  /* =========================
   FILE HANDLING GENERATORS
========================= */

  pythonGenerator.forBlock['file_upload'] = function () {
    // Marker only – handled in JS
    return "__UPLOAD_FILE__\n";
  };

  pythonGenerator.forBlock['file_open'] = function (block, generator) {
    generator.definitions_['file_runtime'] =
      `from io import StringIO
def open_uploaded(filename, mode="r"):
print("DEBUG FILES:", list(__uploaded_files.keys()))
    if filename not in __uploaded_files:
        raise FileNotFoundError(filename)
    return StringIO(__uploaded_files[filename])

file_handle = None
`;


    const filename = block.getFieldValue("FILENAME");
    const mode = block.getFieldValue("MODE");

    return `file_handle = open_uploaded("${filename}", "${mode}")\n`;
  };

  pythonGenerator.forBlock['file_read'] = function () {
    return `print(file_handle.read())\n`;
  };

  pythonGenerator.forBlock['file_write'] = function (block, gen) {
    const text =
      gen.valueToCode(block, "TEXT", PythonOrder.NONE) || '""';
    return `file_handle.write(${text})\n`;
  };

  pythonGenerator.forBlock['file_close'] = function () {
    return `file_handle.close()\n`;
  };

  pythonGenerator.forBlock['serial_send'] = function (block, gen) {
    const text =
      gen.valueToCode(block, "TEXT", PythonOrder.NONE) || '""';
    return `
import serial
serial.send(${text})
`;
  };

  let currentPygalChartVar = "chart";
  let currentPygalChartType = "Bar";
  pythonGenerator.forBlock['pygal_bar'] = function () {
    currentPygalChartVar = "bar_chart";
    currentPygalChartType = "Bar";
    return `${currentPygalChartVar} = pygal.Bar()\n`;
  };

  pythonGenerator.forBlock['pygal_hbar'] = function () {
    currentPygalChartVar = "bar_chart";
    currentPygalChartType = "HorizontalBar";
    return `${currentPygalChartVar} = pygal.HorizontalBar()\n`;
  };

  pythonGenerator.forBlock['pygal_line'] = function () {
    currentPygalChartVar = "line_chart";
    currentPygalChartType = "Line";
    return `${currentPygalChartVar} = pygal.Line()\n`;
  };

  pythonGenerator.forBlock['pygal_pie'] = function () {
    currentPygalChartVar = "pie_chart";
    currentPygalChartType = "Pie";
    return `${currentPygalChartVar} = pygal.Pie()\n`;
  };

  pythonGenerator.forBlock['pygal_radar'] = function () {
    currentPygalChartVar = "radar_chart";
    currentPygalChartType = "Radar";
    return `${currentPygalChartVar} = pygal.Radar()\n`;
  };

  pythonGenerator.forBlock['pygal_stacked_bar'] = function () {
    currentPygalChartVar = "stacked_bar_chart";
    currentPygalChartType = "StackedBar";
    return `${currentPygalChartVar} = pygal.StackedBar()\n`;
  };

  pythonGenerator.forBlock['pygal_stacked_line'] = function () {
    currentPygalChartVar = "stacked_line_chart";
    currentPygalChartType = "StackedLine";
    return `${currentPygalChartVar} = pygal.StackedLine()\n`;
  };

  pythonGenerator.forBlock['pygal_xy'] = function () {
    currentPygalChartVar = "xy_chart";
    currentPygalChartType = "XY";
    return `${currentPygalChartVar} = pygal.XY()\n`;
  };
  pythonGenerator.forBlock['pygal_add'] = function (block, gen) {
    const label =
      gen.valueToCode(block, "LABEL", PythonOrder.NONE) || "''";
    const values =
      gen.valueToCode(block, "VALUES", PythonOrder.NONE) || "[]";

    return `${currentPygalChartVar}.add(${label}, ${values})\n`;
  };
  pythonGenerator.forBlock['pygal_title'] = function (block, gen) {
    const title =
      gen.valueToCode(block, "TITLE", PythonOrder.NONE) || "''";

    return `${currentPygalChartVar}.title = ${title}\n`;
  };
  pythonGenerator.forBlock['pygal_xlabels'] = function (block, gen) {
    const labels =
      gen.valueToCode(block, "LABELS", PythonOrder.NONE) || "[]";

    return `${currentPygalChartVar}.x_labels = ${labels}\n`;
  };
  pythonGenerator.forBlock['pygal_render'] = function () {
    return `${currentPygalChartVar}.render()\n`;
  };


  pythonGenerator.forBlock['input_prompt'] = function (block, gen) {
    const text =
      gen.valueToCode(block, "TEXT", PythonOrder.NONE) || '""';
    return [`input(${text})`, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['string_literal'] = function (block) {
    const text = block.getFieldValue("VALUE");
    return [`"${text}"`, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['turtle_move'] = function (block, generator) {
    const varName = generator.nameDB_?.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );
    const distance =
      generator.valueToCode(block, 'DISTANCE', PythonOrder.NONE) || '0';
    const direction = block.getFieldValue('DIRECTION');

    if (direction === 'BACKWARD') {
      return `${varName}.backward(${distance})\n`;
    }

    return `${varName}.forward(${distance})\n`;
  };

  pythonGenerator.forBlock['number_literal'] = function (block) {
    const value = parseInt(block.getFieldValue("NUM"), 10);
    return [value.toString(), PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['boolean_literal'] = function (block) {
    return [block.getFieldValue("BOOL"), PythonOrder.ATOMIC];
  };
  pythonGenerator.forBlock['print_simple'] = function (block, gen) {
    const value =
      gen.valueToCode(block, "VALUE", PythonOrder.NONE) || "";
    return `print(${value})\n`;
  };

  pythonGenerator.forBlock['print_sep'] = function (block, gen) {
    const value =
      gen.valueToCode(block, "VALUE", PythonOrder.NONE) || "";
    const sep =
      gen.valueToCode(block, "SEP", PythonOrder.NONE) || '" "';
    return `print(${value}, sep=${sep})\n`;
  };

  pythonGenerator.forBlock['print_end'] = function (block, gen) {
    const value =
      gen.valueToCode(block, "VALUE", PythonOrder.NONE) || "";
    const end =
      gen.valueToCode(block, "END", PythonOrder.NONE) || '""';
    return `print(${value}, end=${end})\n`;
  };

  pythonGenerator.forBlock['comment'] = function () {
    return ""; // ignored
  };

pythonGenerator.forBlock["turtle_create"] = function (block, gen) {
  gen.definitions_["import_turtle"] = `
import turtle
_screen = turtle.Screen()
`;

  const t = gen.nameDB_.getName(
    block.getFieldValue("VAR"),
    Blockly.Names.NameType.VARIABLE
  );

  return `${t} = turtle.Turtle()\n`;
};

pythonGenerator.forBlock['turtle_forward'] = function (block, generator) {
  const varName = generator.nameDB_.getName(
    block.getFieldValue('VAR'),
    Blockly.Names.NameType.VARIABLE
  );
  const distance =
    generator.valueToCode(block, 'DISTANCE', PythonOrder.ATOMIC) || '0';

  return `${varName}.forward(${distance})\n`;
};

  pythonGenerator.forBlock['turtle_right'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const angle = generator.valueToCode(block, 'ANGLE', PythonOrder.ATOMIC) || '0';
    const code = `${varName}.right(${angle})\n`;
    return code;
  };

  pythonGenerator.forBlock['turtle_left'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const angle = generator.valueToCode(block, 'ANGLE', PythonOrder.ATOMIC) || '0';
    const code = `${varName}.left(${angle})\n`;
    return code;
  };

  /* =========================
     CONVERSION GENERATORS
  ========================= */

pythonGenerator.forBlock['convert_to_int'] = function (block, generator) {
  const value =
    generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_FUNCTION_CALL) || '0';

  const code = `int(${value})`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

 pythonGenerator.forBlock['convert_to_float'] = function (block, generator) {
  const value =
    generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_FUNCTION_CALL) || '0';
  return [`float(${value})`, pythonGenerator.ORDER_FUNCTION_CALL];
};

pythonGenerator.forBlock['convert_to_string'] = function (block, generator) {
  const value =
    generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_FUNCTION_CALL) || '""';
  return [`str(${value})`, pythonGenerator.ORDER_FUNCTION_CALL];
};

pythonGenerator.forBlock['convert_to_bool'] = function (block, generator) {
  const value =
    generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_FUNCTION_CALL) || 'False';
  return [`bool(${value})`, pythonGenerator.ORDER_FUNCTION_CALL];
};

  pythonGenerator.forBlock['convert_upper_case'] = function (block, gen) {
    const value =
      gen.valueToCode(block, 'VALUE', gen.ORDER_MEMBER) || '""';
    return [`${value}.upper()`, gen.ORDER_MEMBER];
  };

  pythonGenerator.forBlock['convert_lower_case'] = function (block, gen) {
    const value =
      gen.valueToCode(block, 'VALUE', gen.ORDER_MEMBER) || '""';
    return [`${value}.lower()`, gen.ORDER_MEMBER];
  };

pythonGenerator.forBlock["turtle_bgcolor"] = function (block, gen) {
  const c = gen.valueToCode(block, "COLOR", PythonOrder.NONE) || '"#ffffff"';
  return `_screen.bgcolor(${c})\n`;
};


  pythonGenerator.forBlock['controls_repeat'] = function (block, generator) {
    const times = generator.valueToCode(block, 'TIMES', PythonOrder.ATOMIC) || '0';
    let branch = generator.statementToCode(block, 'DO');
    branch = generator.addLoopTrap(branch, block.id) || generator.PASS;
    const code = `for __count in range(int(${times})):\n${branch}`;
    return code;
  };

  // Math blocks
  pythonGenerator.forBlock['math_number'] = function (block, generator) {
    const num = block.getFieldValue('NUM');
    const code = num;
    return [code, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['math_arithmetic'] = function (block, generator) {
    const operator = block.getFieldValue('OP');
    const arg0 = generator.valueToCode(block, 'A', pythonGenerator.ORDER_ADDITIVE) || '0';
    const arg1 = generator.valueToCode(block, 'B', pythonGenerator.ORDER_ADDITIVE) || '0';

    const operations = {
      'ADD': [arg0 + ' + ' + arg1, pythonGenerator.ORDER_ADDITIVE],
      'MINUS': [arg0 + ' - ' + arg1, pythonGenerator.ORDER_ADDITIVE],
      'MULTIPLY': [arg0 + ' * ' + arg1, pythonGenerator.ORDER_MULTIPLICATIVE],
      'DIVIDE': [arg0 + ' / ' + arg1, pythonGenerator.ORDER_MULTIPLICATIVE],
      'POWER': [arg0 + ' ** ' + arg1, pythonGenerator.ORDER_EXPONENTIATION]
    };

    return operations[operator] || [arg0, PythonOrder.ATOMIC];
  };

  // Variable blocks (these are built-in Blockly blocks)
  pythonGenerator.forBlock['variables_get'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    return [varName, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['variables_set'] = function (block, generator) {
    const varName = generator.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const arg0 =
      generator.valueToCode(block, 'VALUE', PythonOrder.NONE) || 'None';

    return `${varName} = ${arg0}\n`;
  };


  // Input blocks
  pythonGenerator.forBlock['text'] = function (block, generator) {
    const text = block.getFieldValue('TEXT');
    const code = `"${text}"`;
    return [code, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['input_prompt'] = function (block, generator) {
    const prompt = generator.valueToCode(block, 'PROMPT', PythonOrder.ATOMIC) || '""';
    const code = `input(${prompt})`;
    return [code, PythonOrder.ATOMIC];
  };

  // Output blocks
  pythonGenerator.forBlock['output_print'] = function (block, generator) {
    const text = generator.valueToCode(block, 'TEXT', PythonOrder.ATOMIC) || '""';
    const code = `print(${text})\n`;
    return code;
  };

  pythonGenerator.forBlock['output_print_sep'] = function (block, generator) {
    const sep = block.getFieldValue('SEP');
    let items = generator.statementToCode(block, 'ITEMS') || '';
    const code = `__print_items = []\n${items}print(*__print_items, sep='${sep}')\n`;
    return code;
  };

  pythonGenerator.forBlock['output_print_end'] = function (block, generator) {
    const end = block.getFieldValue('END');
    let items = generator.statementToCode(block, 'ITEMS') || '';
    const code = `__print_items = []\n${items}print(*__print_items, end='${end}')\n`;
    return code;
  };

  pythonGenerator.forBlock['output_comment'] = function (block, generator) {
    const comment = block.getFieldValue('COMMENT');
    const code = `# ${comment}\n`;
    return code;
  };

  pythonGenerator.forBlock['output_print_item'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.ATOMIC) || '""';
    const code = `__print_items.append(${value})\n`;
    return code;
  };

  // String generators
  pythonGenerator.forBlock['text_input'] = function (block, generator) {
    const text = block.getFieldValue('TEXT');
    const code = `"${text.replace(/"/g, '\\"')}"`;
    return [code, PythonOrder.ATOMIC];
  };

  // Boolean generators
  pythonGenerator.forBlock['logic_true'] = function (block, generator) {
    return ['True', PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['logic_false'] = function (block, generator) {
    return ['False', PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['logic_null'] = function (block, generator) {
    return ['None', PythonOrder.ATOMIC];
  };

  // Logic generators
  pythonGenerator.forBlock['logic_if'] = function (block, generator) {
    const condition = generator.valueToCode(block, 'IF0', PythonOrder.ATOMIC) || 'True';
    let statements = generator.statementToCode(block, 'DO0');
    const code = `if ${condition}:\n${statements}`;
    return code;
  };

  pythonGenerator.forBlock['logic_compare'] = function (block, generator) {
    const operator = block.getFieldValue('OP');
    const arg0 = generator.valueToCode(block, 'A', pythonGenerator.ORDER_RELATIONAL) || '0';
    const arg1 = generator.valueToCode(block, 'B', pythonGenerator.ORDER_RELATIONAL) || '0';

    const operators = {
      'EQ': '==',
      'NEQ': '!=',
      'LT': '<',
      'LTE': '<=',
      'GT': '>',
      'GTE': '>='
    };

    const op = operators[operator];
    const code = `${arg0} ${op} ${arg1}`;
    return [code, pythonGenerator.ORDER_RELATIONAL];
  };

  pythonGenerator.forBlock['logic_operation'] = function (block, generator) {
    const operator = block.getFieldValue('OP');
    const arg0 = generator.valueToCode(block, 'A', pythonGenerator.ORDER_LOGICAL_AND) || 'True';
    const arg1 = generator.valueToCode(block, 'B', pythonGenerator.ORDER_LOGICAL_AND) || 'True';

    const op = operator === 'AND' ? ' and ' : ' or ';
    const code = `${arg0}${op}${arg1}`;
    return [code, pythonGenerator.ORDER_LOGICAL_AND];
  };

  pythonGenerator.forBlock['logic_not'] = function (block, generator) {
    const arg0 = generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_LOGICAL_NOT) || 'True';
    const code = `not ${arg0}`;
    return [code, pythonGenerator.ORDER_LOGICAL_NOT];
  };

  pythonGenerator.forBlock['logic_ternary'] = function (block, generator) {
    const test = generator.valueToCode(block, 'TEST', pythonGenerator.ORDER_CONDITIONAL) || 'True';
    const ifTrue = generator.valueToCode(block, 'IF_TRUE', pythonGenerator.ORDER_CONDITIONAL) || 'None';
    const ifFalse = generator.valueToCode(block, 'IF_FALSE', pythonGenerator.ORDER_CONDITIONAL) || 'None';
    const code = `${ifTrue} if ${test} else ${ifFalse}`;
    return [code, pythonGenerator.ORDER_CONDITIONAL];
  };

  // Function generators
  pythonGenerator.forBlock['procedures_defnoreturn'] = function (block, generator) {
    const funcName = block.getFieldValue('NAME');
    let branch = generator.statementToCode(block, 'STACK');
    if (!branch) {
      branch = '    pass\n';
    }
    const code = `def ${funcName}():\n${branch}\n`;
    return code;
  };

  pythonGenerator.forBlock['procedures_defreturn'] = function (block, generator) {
    const funcName = block.getFieldValue('NAME');
    let branch = generator.statementToCode(block, 'STACK');
    const returnVal = generator.valueToCode(block, 'RETURN', PythonOrder.ATOMIC) || 'None';
    if (!branch) {
      branch = '    pass\n';
    }
    const code = `def ${funcName}():\n${branch}    return ${returnVal}\n`;
    return code;
  };

  pythonGenerator.forBlock['procedures_return'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.ATOMIC) || 'None';
    const code = `return ${value}\n`;
    return code;
  };

  pythonGenerator.forBlock['procedures_ifreturn'] = function (block, generator) {
    const condition = generator.valueToCode(block, 'CONDITION', PythonOrder.ATOMIC) || 'True';
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.ATOMIC) || 'None';
    const code = `if ${condition}:\n    return ${value}\n`;
    return code;
  };

  // Tuple generators
  pythonGenerator.forBlock['tuples_create'] = function (block, generator) {
    const item1 = generator.valueToCode(block, 'ITEM1', PythonOrder.ATOMIC) || 'None';
    const code = `(${item1},)`;
    return [code, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['tuples_get_item'] = function (block, generator) {
    const index = generator.valueToCode(block, 'INDEX', PythonOrder.ATOMIC) || '0';
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `${tuple}[${index}]`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  pythonGenerator.forBlock['tuples_count'] = function (block, generator) {
    const element = generator.valueToCode(block, 'ELEMENT', PythonOrder.ATOMIC) || 'None';
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `${tuple}.count(${element})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  pythonGenerator.forBlock['tuples_position'] = function (block, generator) {
    const element = generator.valueToCode(block, 'ELEMENT', PythonOrder.ATOMIC) || 'None';
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `${tuple}.index(${element})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  pythonGenerator.forBlock['tuples_length'] = function (block, generator) {
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `len(${tuple})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Conversion generators

  pythonGenerator.forBlock['convert_upper_case'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_MEMBER) || '""';
    const code = `${value}.upper()`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  pythonGenerator.forBlock['convert_lower_case'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_MEMBER) || '""';
    const code = `${value}.lower()`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Loops: Repeat while
  pythonGenerator.forBlock['controls_repeat_while'] = function (block, generator) {
    const condition = generator.valueToCode(block, 'CONDITION', PythonOrder.NONE) || 'False';
    const body = generator.statementToCode(block, 'DO');
    const code = `while ${condition}:\n${body}`;
    return code;
  };

  // Loops: For (count with from/to)
  pythonGenerator.forBlock['controls_for'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const start = generator.valueToCode(block, 'FROM', PythonOrder.NONE) || '0';
    const end = generator.valueToCode(block, 'TO', PythonOrder.NONE) || '10';
    const by = generator.valueToCode(block, 'BY', PythonOrder.NONE) || '1';
    const body = generator.statementToCode(block, 'DO');
    const code = `for ${varName} in range(${start}, ${end}, ${by}):\n${body}`;
    return code;
  };

  // Loops: For each
  pythonGenerator.forBlock['controls_forEach'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const list = generator.valueToCode(block, 'LIST', PythonOrder.NONE) || '[]';
    const body = generator.statementToCode(block, 'DO');
    const code = `for ${varName} in ${list}:\n${body}`;
    return code;
  };

  // Loops: Break
  pythonGenerator.forBlock['controls_flow_statements'] = function (block, generator) {
    return 'break\n';
  };

  // Math: Range
  pythonGenerator.forBlock['math_range'] = function (block, generator) {
    return ['range(10)', PythonOrder.ATOMIC];
  };

  // Math: Range with to
  pythonGenerator.forBlock['math_range_to'] = function (block, generator) {
    const start = generator.valueToCode(block, 'START', PythonOrder.NONE) || '0';
    const end = generator.valueToCode(block, 'END', PythonOrder.NONE) || '10';
    const code = `range(${start}, ${end})`;
    return [code, PythonOrder.ATOMIC];
  };

  // Math: Square root
  pythonGenerator.forBlock['math_sqrt'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_MEMBER) || '0';
    const code = `math.sqrt(${value})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Math: Round
  pythonGenerator.forBlock['math_round'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_MEMBER) || '0';
    const code = `round(${value})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Math: Sin
  pythonGenerator.forBlock['math_sin'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_MEMBER) || '0';
    const code = `math.sin(${value})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Math: Pi
  pythonGenerator.forBlock['math_pi'] = function (block, generator) {
    return ['math.pi', pythonGenerator.ORDER_MEMBER];
  };

  // Math: Sum of list
  pythonGenerator.forBlock['math_sum'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const code = `sum(${list})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Math: Remainder (modulo)
  pythonGenerator.forBlock['math_remainder'] = function (block, generator) {
    const dividend = generator.valueToCode(block, 'DIVIDEND', pythonGenerator.ORDER_MODULUS) || '0';
    const divisor = generator.valueToCode(block, 'DIVISOR', pythonGenerator.ORDER_MODULUS) || '1';
    const code = `${dividend} % ${divisor}`;
    return [code, pythonGenerator.ORDER_MODULUS];
  };

  // Math: Random integer
  pythonGenerator.forBlock['math_random_int'] = function (block, generator) {
    // Ensure import is added once at top
    generator.definitions_['import_random'] = 'import random';

    const from =
      generator.valueToCode(block, 'FROM', PythonOrder.NONE) || '1';
    const to =
      generator.valueToCode(block, 'TO', PythonOrder.NONE) || '100';

    const code = `random.randint(${from}, ${to})`;
    return [code, pythonGenerator.ORDER_FUNCTION_CALL];
  };

  // Math: Random fraction
  pythonGenerator.forBlock['math_random_fraction'] = function (block, generator) {
    // ✅ ensure import added once
    generator.definitions_['import_random'] = 'import random';

    return ['random.random()', pythonGenerator.ORDER_FUNCTION_CALL];
  };

  // Lists: Create list
  pythonGenerator.forBlock['lists_create_with'] = function (block, generator) {
    const code = `[]`;
    return [code, PythonOrder.ATOMIC];
  };

  // Lists: Get item
  pythonGenerator.forBlock['lists_getIndex'] = function (block, generator) {
    const index = generator.valueToCode(block, 'INDEX', PythonOrder.NONE) || '0';
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const code = `${list}[${index}]`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Lists: Append item
  pythonGenerator.forBlock['lists_append'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.append(${item})\n`;
    return code;
  };

  // Lists: Remove item
  pythonGenerator.forBlock['lists_remove_item'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.remove(${item})\n`;
    return code;
  };

  // Lists: Remove at position
  pythonGenerator.forBlock['lists_remove_at'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const index = generator.valueToCode(block, 'INDEX', PythonOrder.NONE) || '0';
    const code = `${list}.pop(${index})\n`;
    return code;
  };

  // Lists: Sort
  pythonGenerator.forBlock['lists_sort'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const code = `${list}.sort()\n`;
    return code;
  };

  // Lists: Reverse
  pythonGenerator.forBlock['lists_reverse'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const code = `${list}.reverse()\n`;
    return code;
  };

  // Lists: Insert at position
  pythonGenerator.forBlock['lists_insert_at'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const index = generator.valueToCode(block, 'INDEX', PythonOrder.NONE) || '0';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.insert(${index}, ${item})\n`;
    return code;
  };

  // Sets: Create set
  pythonGenerator.forBlock['sets_create_with'] = function (block, generator) {
    return ['set()', PythonOrder.ATOMIC];
  };

  // Sets: Add item
  pythonGenerator.forBlock['sets_add_item'] = function (block, generator) {
    const set = generator.valueToCode(block, 'SET', pythonGenerator.ORDER_MEMBER) || 'set()';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${set}.add(${item})\n`;
    return code;
  };

  // Sets: Union
  pythonGenerator.forBlock['sets_union'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1} | ${set2}`;
    return [code, pythonGenerator.ORDER_BITWISE_OR];
  };

  // Sets: Intersection
  pythonGenerator.forBlock['sets_intersection'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1} & ${set2}`;
    return [code, pythonGenerator.ORDER_BITWISE_AND];
  };

  // Sets: Difference
  pythonGenerator.forBlock['sets_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1} - ${set2}`;
    return [code, pythonGenerator.ORDER_ARITHMETIC];
  };

  // Dictionaries: Create dict
  pythonGenerator.forBlock['dicts_create_with'] = function (block, generator) {
    const key1 = generator.valueToCode(block, 'KEY1', PythonOrder.NONE) || '"key1"';
    const value1 = generator.valueToCode(block, 'VALUE1', PythonOrder.NONE) || 'None';
    const code = `{${key1}: ${value1}}`;
    return [code, PythonOrder.ATOMIC];
  };

  // Dictionaries: Get value by key
  pythonGenerator.forBlock['dicts_get_value'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', PythonOrder.NONE) || '"key"';
    const code = `${dict}[${key}]`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Dictionaries: Get keys
  pythonGenerator.forBlock['dicts_get_keys'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const code = `list(${dict}.keys())`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Dictionaries: Get values
  pythonGenerator.forBlock['dicts_get_values'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const code = `list(${dict}.values())`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Dictionaries: Clear
  pythonGenerator.forBlock['dicts_clear'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const code = `${dict}.clear()\n`;
    return code;
  };

  // Motion: Backward
  pythonGenerator.forBlock['turtle_backward'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const distance = generator.valueToCode(block, 'DISTANCE', PythonOrder.NONE) || '50';
    const code = `print(f"[DEBUG] Moving ${varName} backward by {${distance}}")\n${varName}.backward(${distance})\nprint("[DEBUG] Backward move complete")\n`;
    return code;
  };

  // Motion: Dot
  pythonGenerator.forBlock['turtle_dot'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const size = generator.valueToCode(block, 'SIZE', PythonOrder.NONE) || '10';
    const code = `${varName}.dot(${size})\n`;
    return code;
  };

  // Motion: Heading
  pythonGenerator.forBlock['turtle_heading'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const angle = generator.valueToCode(block, 'ANGLE', PythonOrder.NONE) || '0';
    const code = `${varName}.setheading(${angle})\n`;
    return code;
  };

  // Motion: Position
  pythonGenerator.forBlock['turtle_position'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const x = generator.valueToCode(block, 'X', PythonOrder.NONE) || '0';
    const y = generator.valueToCode(block, 'Y', PythonOrder.NONE) || '0';
    const code = `${varName}.goto(${x}, ${y})\n`;
    return code;
  };

  // Motion: Pen up
  pythonGenerator.forBlock['turtle_penup'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const code = `${varName}.penup()\n`;
    return code;
  };

  // Motion: Pen down
  pythonGenerator.forBlock['turtle_pendown'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const code = `${varName}.pendown()\n`;
    return code;
  };

  // Motion: Begin fill
  pythonGenerator.forBlock['turtle_begin_fill'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const code = `${varName}.begin_fill()\n`;
    return code;
  };

  // Motion: End fill
  pythonGenerator.forBlock['turtle_end_fill'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const code = `${varName}.end_fill()\n`;
    return code;
  };

  // Turtle: Shape
  pythonGenerator.forBlock['turtle_shape'] = function (block, generator) {
    const varName = generator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const shape = block.getFieldValue('SHAPE');
    const code = `${varName}.shape('${shape}')\n`;
    return code;
  };

  // Turtle: Speed
  pythonGenerator.forBlock["turtle_speed"] = function (block, gen) {
  const t = gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const s = gen.valueToCode(block, "SPEED", PythonOrder.NONE) || "5";
  return `${t}.speed(${s})\n`;
};


  // Turtle: Width
 pythonGenerator.forBlock["turtle_width"] = function (block, gen) {
  const t = gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const w = gen.valueToCode(block, "WIDTH", PythonOrder.NONE) || "1";
  return `${t}.width(${w})\n`;
};


  // Turtle: Fill color
  pythonGenerator.forBlock["turtle_fill_color"] = function (block, gen) {
  const t = gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const c = gen.valueToCode(block, "COLOR", PythonOrder.NONE) || '"#000000"';
  return `${t}.fillcolor(${c})\n`;
};

  // Turtle: Color (pen color)
  pythonGenerator.forBlock["turtle_color"] =
pythonGenerator.forBlock["turtle_pencolor"] = function (block, gen) {
  const t = gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  const c = gen.valueToCode(block, "COLOR", PythonOrder.NONE) || '"#000000"';
  return `${t}.color(${c})\n`;
};


  // Control: On key press
  pythonGenerator.forBlock['controls_onkey'] = function (block, generator) {
    const key = block.getFieldValue('KEY');
    const code = `# On key press: ${key}\n`;
    return code;
  };

  // Control: On click
  pythonGenerator.forBlock['controls_onclick'] = function (block, generator) {
    const code = `# On mouse click\n`;
    return code;
  };

  // Control: Clear screen
  pythonGenerator.forBlock['controls_clear_screen'] = function (block, generator) {
    const code = `screen.clear()\n`;
    return code;
  };

  // Colors: Red
  pythonGenerator.forBlock['colour_red'] = function (block, generator) {
    return ['"red"', PythonOrder.ATOMIC];
  };

  // Colors: Green
  pythonGenerator.forBlock['colour_green'] = function (block, generator) {
    return ['"green"', PythonOrder.ATOMIC];
  };

  // Colors: Blue
  pythonGenerator.forBlock['colour_blue'] = function (block, generator) {
    return ['"blue"', PythonOrder.ATOMIC];
  };

  // Colors: Yellow
  pythonGenerator.forBlock['colour_yellow'] = function (block, generator) {
    return ['"yellow"', PythonOrder.ATOMIC];
  };

  // Colors: Purple
  pythonGenerator.forBlock['colour_purple'] = function (block, generator) {
    return ['"purple"', PythonOrder.ATOMIC];
  };

  // Colors: Pink
  pythonGenerator.forBlock['colour_pink'] = function (block, generator) {
    return ['"pink"', PythonOrder.ATOMIC];
  };

  // Colors: Picker
  pythonGenerator.forBlock['colour_picker'] = function (block, generator) {
    const color = block.getFieldValue('COLOUR');
    return [`'${color}'`, PythonOrder.ATOMIC];
  };

  // Lists: First occurrence
  pythonGenerator.forBlock['lists_first_occurrence'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.index(${item})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Lists: Count element
  pythonGenerator.forBlock['lists_count_element'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.count(${item})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Lists: Extend list
  pythonGenerator.forBlock['lists_extend'] = function (block, generator) {
    const list1 = generator.valueToCode(block, 'LIST1', pythonGenerator.ORDER_MEMBER) || '[]';
    const list2 = generator.valueToCode(block, 'LIST2', pythonGenerator.ORDER_MEMBER) || '[]';
    const code = `${list1}.extend(${list2})\n`;
    return code;
  };

  // Lists: Get sub-list
  pythonGenerator.forBlock['lists_sub_list'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', pythonGenerator.ORDER_MEMBER) || '[]';
    const start = generator.valueToCode(block, 'START', PythonOrder.NONE) || '0';
    const end = generator.valueToCode(block, 'END', PythonOrder.NONE) || 'len(list)';
    const code = `${list}[${start}:${end}]`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Sets: Remove random element
  pythonGenerator.forBlock['sets_remove_random'] = function (block, generator) {
    const set = generator.valueToCode(block, 'SET', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set}.pop()`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Sets: Is superset
  pythonGenerator.forBlock['sets_is_superset'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1} >= ${set2}`;
    return [code, pythonGenerator.ORDER_COMPARISON];
  };

  // Sets: Is subset
  pythonGenerator.forBlock['sets_is_subset'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1} <= ${set2}`;
    return [code, pythonGenerator.ORDER_COMPARISON];
  };

  // Sets: Is disjoint
  pythonGenerator.forBlock['sets_is_disjoint'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1}.isdisjoint(${set2})`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Sets: Update with difference
  pythonGenerator.forBlock['sets_update_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1}.difference_update(${set2})\n`;
    return code;
  };

  // Sets: Symmetric difference
  pythonGenerator.forBlock['sets_symmetric_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1} ^ ${set2}`;
    return [code, pythonGenerator.ORDER_BITWISE_XOR];
  };

  // Sets: Update with symmetric difference
  pythonGenerator.forBlock['sets_update_symmetric_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', pythonGenerator.ORDER_MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', pythonGenerator.ORDER_MEMBER) || 'set()';
    const code = `${set1}.symmetric_difference_update(${set2})\n`;
    return code;
  };

  // Dictionaries: Get items
  pythonGenerator.forBlock['dicts_get_items'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const code = `list(${dict}.items())`;
    return [code, pythonGenerator.ORDER_MEMBER];
  };

  // Dictionaries: Remove key
  pythonGenerator.forBlock['dicts_remove_key'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', PythonOrder.NONE) || '"key"';
    const code = `del ${dict}[${key}]\n`;
    return code;
  };

  // Dictionaries: Update dictionary
  pythonGenerator.forBlock['dicts_update'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', pythonGenerator.ORDER_MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', PythonOrder.NONE) || '"key"';
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.NONE) || 'None';
    const code = `${dict}[${key}] = ${value}\n`;
    return code;
  };

  // Turtle: Hide
 pythonGenerator.forBlock["turtle_hide"] = function (block, gen) {
  const t = gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  return `${t}.hideturtle()\n`;
};

  // Turtle: Show
pythonGenerator.forBlock["turtle_show"] = function (block, gen) {
  const t = gen.nameDB_.getName(block.getFieldValue("VAR"), Blockly.Names.NameType.VARIABLE);
  return `${t}.showturtle()\n`;
};

  // Control: Listen
  pythonGenerator.forBlock['controls_listen'] = function (block, generator) {
    const code = `screen.listen()\n`;
    return code;
  };

  // Control: Button
  pythonGenerator.forBlock['controls_button'] = function (block, generator) {
    const direction = block.getFieldValue('DIRECTION');
    return [`"${direction}"`, PythonOrder.ATOMIC];
  };
  /* =========================
   MATPLOTLIB GENERATORS
========================= */

  /* =========================
    GRAPH PLOT GENERATORS
 ========================= */

  // plot line (Y only)
  pythonGenerator.forBlock['plot_line'] = function (block, gen) {
    const y = gen.valueToCode(block, "Y", PythonOrder.NONE) || "[]";
    return `plt.plot(${y}, ${y})\n`;
  };

  // plot X vs Y
  pythonGenerator.forBlock['plot_xs_ys'] = function (block, gen) {
    const x = gen.valueToCode(block, "X", PythonOrder.NONE) || "[]";
    const y = gen.valueToCode(block, "Y", PythonOrder.NONE) || "[]";
    return `plt.plot(${x}, ${y})\n`;
  };

  // scatter
  pythonGenerator.forBlock['plot_scatter'] = function (block, gen) {
    const x = gen.valueToCode(block, "X", PythonOrder.NONE) || "[]";
    const y = gen.valueToCode(block, "Y", PythonOrder.NONE) || "[]";
    return `plt.scatter(${x}, ${y})\n`;
  };

  // histogram
  pythonGenerator.forBlock['plot_histogram'] = function (block, gen) {
    const d = gen.valueToCode(block, "DATA", PythonOrder.NONE) || "[]";
    return `plt.hist(${d})\n`;
  };

  // show
  pythonGenerator.forBlock['plot_show'] = function () {
    return `plt.show()\n`;
  };

  // title
  pythonGenerator.forBlock['plot_title'] = function (block, gen) {
    const t = gen.valueToCode(block, "TITLE", PythonOrder.NONE) || "''";
    return `plt.title(${t})\n`;
  };

  // labels
  pythonGenerator.forBlock['plot_xlabel'] = function (block, gen) {
    const l = gen.valueToCode(block, "LABEL", PythonOrder.NONE) || "''";
    return `plt.xlabel(${l})\n`;
  };

  pythonGenerator.forBlock['plot_ylabel'] = function (block, gen) {
    const l = gen.valueToCode(block, "LABEL", PythonOrder.NONE) || "''";
    return `plt.ylabel(${l})\n`;
  };

};

function BasicCodingPage() {
  const fileInputRef = useRef(null);
  const blocklyDiv = useRef(null);
  const canvasContainerRef = useRef(null);
  const [code, setCode] = useState('');
  const [view, setView] = useState('blocks');
  const [output, setOutput] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const searchParams = useSearchParams()

  const projectId = searchParams?.get("projectId")
  const activityId = searchParams?.get("activityId")
  const [workspaceReady, setWorkspaceReady] = useState(false);

  // ── Variable-name modal (Electron-safe — no window.prompt needed) ──────────
  const [varModal, setVarModal] = useState({ open: false, inputVal: '' });
  // We store the resolve function in a ref so it survives re-renders
  const varModalResolveRef = useRef<((name: string | null) => void) | null>(null);
  const varModalInputRef = useRef<HTMLInputElement>(null);

  /** Show the modal and return a Promise that resolves with the typed name (or null on cancel) */
  const askVariableName = (defaultVal = 'myVar'): Promise<string | null> =>
    new Promise((resolve) => {
      varModalResolveRef.current = resolve;
      setVarModal({ open: true, inputVal: defaultVal });
      setTimeout(() => {
        varModalInputRef.current?.focus();
        varModalInputRef.current?.select();
      }, 40);
    });

  const confirmVarModal = () => {
    const name = varModalInputRef.current?.value.trim() || varModal.inputVal.trim();
    setVarModal({ open: false, inputVal: '' });
    varModalResolveRef.current?.(name || null);
    varModalResolveRef.current = null;
  };

  const cancelVarModal = () => {
    setVarModal({ open: false, inputVal: '' });
    varModalResolveRef.current?.(null);
    varModalResolveRef.current = null;
  };
  // ───────────────────────────────────────────────────────────────────────────

  const mode = projectId
    ? "PROJECT"
    : activityId
      ? "ACTIVITY"
      : "INVALID"


  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)

  // hidden input
  function debugLog(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage, data || '');
    setDebugLogs(prev => [...prev.slice(-20), logMessage + (data ? ` ${JSON.stringify(data)}` : '')]);
  }

  function appendOutput(text: string) {
    setOutput(prev => prev + text + "\n")
  }

useEffect(() => {
  if (!workspaceReady) {
    debugLog("⏳ Waiting for workspaceReady");
    return;
  }

  const workspace = workspaceRef.current;
  if (!workspace) {
    debugLog("❌ workspaceReady but workspace missing");
    return;
  }

  const loadBlocks = async () => {
    try {
      let data = [];

      if (mode === "ACTIVITY" && activityId) {
        debugLog(`📦 Loading blocks for activity ${activityId}`);
        data = await window.electronAPI.getBlocksByTutorial(
          Number(activityId)
        );
      }

      if (mode === "PROJECT" && projectId) {
        debugLog(`📦 Loading blocks for project ${projectId}`);
        data = await window.electronAPI.getProjectBlocks(
          Number(projectId)
        );
      }

      loadBlocksIntoWorkspace(data);

    } catch (error) {
      console.error("Failed to load blocks:", error);
    }
  };

  loadBlocks();

}, [workspaceReady, mode, activityId, projectId]);

//   async function executeBlock(block: Blockly.Block) {
//     const variables = variablesRef.current

//     /* ==========================
//        SET VARIABLE
//     ========================== */
//     if (block.type === "variables_set") {
//       const varId = block.getFieldValue("VAR")
//       const variable = block.workspace.getVariableById(varId)
//       const varName = variable?.name ?? varId

//       const valueBlock = block.getInputTargetBlock("VALUE")
//       let value: any = null

//       if (valueBlock?.type === "text") {
//         value = valueBlock.getFieldValue("TEXT")
//       }

//       if (valueBlock?.type === "input_prompt") {
//         value = await showInputPrompt(
//           valueBlock.getFieldValue("TEXT")
//         )
//       }

//       variables[varName] = value
//       appendConsole(`[DEBUG] ${varName} = ${value}`)
//     }

//     /* ==========================
//        PRINT
//     ========================== */
//     if (block.type === "text_print") {
//       const valueBlock = block.getInputTargetBlock("TEXT")

//       if (valueBlock?.type === "variables_get") {
//         const varId = valueBlock.getFieldValue("VAR")
//         const variable = block.workspace.getVariableById(varId)
//         const varName = variable?.name ?? varId

//         appendOutput(String(variables[varName] ?? ""))
//       }
//     }
//     /* ==========================
//    CREATE TURTLE
// ========================== */
//     if (block.type === "turtle_create") {
//       const varId = block.getFieldValue("VAR");
//       const variable = block.workspace.getVariableById(varId);
//       const varName = variable?.name ?? varId;

//       // create canvas turtle
//       if (!turtleEngineRef.current) {
//         turtleEngineRef.current = createTurtle("turtleCanvas");
//         turtleEngineRef.current.reset();
//       }

//       // store reference in variables
//       variables[varName] = turtleEngineRef.current;

//       appendConsole(`[DEBUG] created turtle '${varName}'`);
//     }

//     /* ==========================
//        TURTLE BACKGROUND COLOR
//     ========================== */
//     if (block.type === "turtle_bgcolor") {
//       const color = block.getFieldValue("COLOR");

//       turtleEngineRef.current?.bgcolor(color);

//       appendConsole(`[DEBUG] set background color ${color}`);
//     }
//     /* ==========================
//        TURTLE FILL COLOR
//     ========================== */
//     if (block.type === "turtle_color") {
//       const varId = block.getFieldValue("VAR");
//       const variable = block.workspace.getVariableById(varId);
//       const varName = variable?.name ?? varId;

//       const color = block.getFieldValue("COLOR");

//       variables[varName]?.fillcolor(color);

//       appendConsole(`[DEBUG] ${varName}.fillcolor(${color})`);
//     }
//     /* ==========================
//        TURTLE DOT
//     ========================== */
//     if (block.type === "turtle_dot") {
//       const varId = block.getFieldValue("VAR");
//       const variable = block.workspace.getVariableById(varId);
//       const varName = variable?.name ?? varId;

//       const radiusBlock = block.getInputTargetBlock("RADIUS");
//       let radius = 10;

//       if (radiusBlock?.type === "math_number") {
//         radius = Number(radiusBlock.getFieldValue("NUM"));
//       }

//       variables[varName]?.dot(radius);

//       appendConsole(`[DEBUG] ${varName}.dot(${radius})`);
//     }


//     /* ==========================
//        NEXT BLOCK
//     ========================== */
//     const next = block.getNextBlock()
//     if (next) {
//       await executeBlock(next)
//     }
//   }

  // async function runWorkspace(workspace: Blockly.Workspace) {
  //   variablesRef.current = {};
  //   turtleEngineRef.current = null; // 🔴 IMPORTANT

  //   const topBlocks = workspace.getTopBlocks(true);

  //   for (const block of topBlocks) {
  //     await executeBlock(block);
  //   }
  // }

  function getCanvasTextOutput() {
    let pre = canvasContainerRef.current.querySelector(".canvas-text-output");

    if (!pre) {
      pre = document.createElement("pre");
      pre.className = "canvas-text-output";
      pre.style.fontFamily = "monospace";
      pre.style.fontSize = "16px";
      pre.style.color = "#000";
      pre.style.margin = "0";
      pre.style.padding = "10px";
      pre.style.whiteSpace = "pre-wrap";
      pre.style.wordWrap = "break-word";
      canvasContainerRef.current.appendChild(pre);
    }

    return pre;
  }

  const toolboxXml = useMemo(() => `
<xml xmlns="https://developers.google.com/blockly/xml">
  <!-- VARIABLES -->
  <category name="Variables" colour="330" custom="VARIABLE" />
<category name="Input" colour="30">
  <block type="input_prompt" />
  <block type="string_literal" />
  <block type="math_number" />
  <block type="boolean_literal" />
</category>

<category name="Output" colour="210">
  <block type="print_simple" />
  <block type="print_sep" />
  <block type="print_end" />
  <block type="comment" />
</category>
  <!-- DRAW TAB -->
  <category name="Draw" colour="180">
    <!-- Turtle -->
    <category name="Turtle" colour="330">
      <block type="turtle_create" />
      <block type="turtle_shape" />
      <block type="turtle_speed" />
      <block type="turtle_width" />
      <block type="turtle_fill_color" />
      <block type="turtle_color" />
      <block type="turtle_pencolor" />
      <block type="turtle_bgcolor" />
      <block type="turtle_hide" />
      <block type="turtle_show" />
    </category>

    <!-- Motion -->
    <category name="Motion" colour="90">
      <block type="turtle_forward" />
      <block type="turtle_move" />
      <block type="turtle_backward" />
      <block type="turtle_right" />
      <block type="turtle_left" />
      <block type="turtle_dot" />
      <block type="turtle_heading" />
      <block type="turtle_position" />
      <block type="turtle_penup" />
      <block type="turtle_pendown" />
      <block type="turtle_begin_fill" />
      <block type="turtle_end_fill" />
    </category>

    <!-- Control -->
    <category name="Control" colour="0">
      <block type="controls_onkey" />
      <block type="controls_onclick" />
      <block type="controls_listen" />
      <block type="controls_clear_screen" />
      <block type="controls_button" />
    </category>

    <!-- Colors -->
    <category name="Colors" colour="45">
      <block type="colour_red" />
      <block type="colour_green" />
      <block type="colour_blue" />
      <block type="colour_yellow" />
      <block type="colour_purple" />
      <block type="colour_pink" />
      <block type="colour_picker" />
    </category>
  </category>

  <!-- DATA TYPES TAB -->
  <category name="Data Types" colour="200">
    <!-- String -->
    <category name="String" colour="160">
    <block type="string_literal" />
  </category>

  <!-- Number -->
  <category name="Integer" colour="230">
    <block type="math_number" />
  </category>

    <!-- Boolean -->
    <category name="Boolean" colour="270">
      <block type="logic_true" />
      <block type="logic_false" />
      <block type="logic_null" />
    </category>
  </category>
<!-- MATH -->
<category name="Math" colour="230">
  <block type="math_number" />

  <block type="math_arithmetic" />

  <block type="math_sqrt" />
  <block type="math_round" />
  <block type="math_sin" />
  <block type="math_pi" />

  <block type="math_sum" />
  <block type="math_remainder" />

  <block type="math_random_int" />
  <block type="math_random_fraction" />
</category>

  <!-- LOOPS -->
  <category name="Loops" colour="120">
    <block type="controls_repeat" />
    <block type="controls_repeat_while" />
    <block type="controls_for" />
    <block type="controls_forEach" />
    <block type="controls_flow_statements" />
    <block type="math_range" />
    <block type="math_range_to" />
  </category>

  <!-- LISTS -->
  <category name="Lists" colour="245">
    <block type="lists_create_with" />
    <block type="lists_getIndex" />
    <block type="lists_append" />
    <block type="lists_remove_item" />
    <block type="lists_remove_at" />
    <block type="lists_sort" />
    <block type="lists_reverse" />
    <block type="lists_insert_at" />
    <block type="lists_first_occurrence" />
    <block type="lists_count_element" />
    <block type="lists_extend" />
    <block type="lists_sub_list" />
  </category>

  <!-- SETS -->
  <category name="Sets" colour="260">
    <block type="sets_create_with" />
    <block type="sets_add_item" />
    <block type="sets_union" />
    <block type="sets_intersection" />
    <block type="sets_difference" />
    <block type="sets_remove_random" />
    <block type="sets_is_superset" />
    <block type="sets_is_subset" />
    <block type="sets_is_disjoint" />
    <block type="sets_symmetric_difference" />
    <block type="sets_update_difference" />
    <block type="sets_update_symmetric_difference" />
  </category>

  <!-- DICTIONARIES -->
  <category name="Dictionaries" colour="10">
    <block type="dicts_create_with" />
    <block type="dicts_get_value" />
    <block type="dicts_get_keys" />
    <block type="dicts_get_values" />
    <block type="dicts_get_items" />
    <block type="dicts_clear" />
    <block type="dicts_remove_key" />
    <block type="dicts_update" />
  </category>

  <!-- LOGIC -->
  <category name="Logic" colour="210">
    <block type="logic_if" />
    <block type="logic_compare" />
    <block type="logic_operation" />
    <block type="logic_not" />
    <block type="logic_ternary" />
  </category>

  <!-- FUNCTIONS -->
  <category name="Functions" colour="290">
    <block type="procedures_defnoreturn" />
    <block type="procedures_defreturn" />
    <block type="procedures_return" />
    <block type="procedures_ifreturn" />
  </category>
<!-- CONVERSION -->
<category name="Conversion" colour="100">
  <block type="convert_to_int" />
  <block type="convert_to_float" />
  <block type="convert_to_string" />
  <block type="convert_to_bool" />
  <block type="convert_upper_case" />
  <block type="convert_lower_case" />
</category>

  <!-- GRAPH PLOT -->
  <category name="Graph Plot" colour="290">
  <category name="Matplot" colour="290">
    <block type="plot_line" />
  <block type="plot_xs_ys" />
  <block type="plot_scatter" />
  <block type="plot_histogram" />
  <block type="plot_show" />
  <block type="plot_title" />
  <block type="plot_xlabel" />
  <block type="plot_ylabel" />
  </category>

  <category name="Pygal" colour="280">
    <block type="pygal_bar" />
    <block type="pygal_hbar" />
    <block type="pygal_line" />
    <block type="pygal_pie" />
    <block type="pygal_radar" />
    <block type="pygal_stacked_bar" />
    <block type="pygal_stacked_line" />
    <block type="pygal_xy" />
    <block type="pygal_add" />
    <block type="pygal_title" />
    <block type="pygal_xlabels" />
    <block type="pygal_render" />
  </category>
</category>
<category name="Speak" colour="20">
  <block type="speak_text" />
</category>
<category name="Sprite" colour="200">
  <block type="sprite_show" />
</category>
<category name="File Handling" colour="120">
  <block type="file_upload" />
  <block type="file_open" />
  <block type="file_read" />
  <block type="file_write" />
  <block type="file_close" />
</category>

<category name="Serial" colour="240">
  <block type="serial_send" />
</category>

</xml>
`, []);

  // Helper function to map color names to hex codes
  function mapColorToHex(color: string): string {
    const colorMap: Record<string, string> = {
      'white': '#ffffff',
      'WHITE': '#ffffff',
      'black': '#000000',
      'BLACK': '#000000',
      'blue': '#0000ff',
      'BLUE': '#0000ff',
      'red': '#ff0000',
      'RED': '#ff0000',
      'green': '#00ff00',
      'GREEN': '#00ff00',
      'yellow': '#ffff00',
      'YELLOW': '#ffff00',
    };
    return colorMap[color] || color; // Return hex if found, otherwise return as-is
  }

  // Helper function to ensure variable exists in workspace and return its ID
  function ensureVariable(workspace: Blockly.Workspace, varName: string): string {
    let variable = workspace.getVariable(varName);
    if (!variable) {
      variable = workspace.createVariable(varName);
    }
    return variable.getId();
  }

  function createValueBlock(workspace, valueCfg) {
    if (!valueCfg) return null;

    switch (valueCfg.type) {

      case "INT": {
        const num = workspace.newBlock("math_number");
        num.setFieldValue(String(valueCfg.value), "NUM");
        num.initSvg();
        num.render();
        return num;
      }

      case "STRING": {
        const text = workspace.newBlock("text");
        text.setFieldValue(valueCfg.value, "TEXT");
        text.initSvg();
        text.render();
        return text;
      }

      case "VARIABLE": {
        const varId = ensureVariable(workspace, valueCfg.name);
        const v = workspace.newBlock("variables_get");
        v.setFieldValue(varId, "VAR");
        v.initSvg();
        v.render();
        return v;
      }

      case "EXPRESSION": {
        if (valueCfg.operator === "MULTIPLY") {
          const expr = workspace.newBlock("math_arithmetic");
          expr.setFieldValue("MULTIPLY", "OP");

          const left = createValueBlock(workspace, valueCfg.left);
          const right = createValueBlock(workspace, valueCfg.right);

          expr.initSvg();
          expr.render();

          expr.getInput("A")?.connection?.connect(left?.outputConnection);
          expr.getInput("B")?.connection?.connect(right?.outputConnection);

          return expr;
        }
        return null;
      }

      default:
        return null;
    }
  }
function mapColorToBlockType(color: string) {
  switch (color?.toUpperCase()) {
    case "RED":
      return "colour_red";
    case "GREEN":
      return "colour_green";
    case "BLUE":
      return "colour_blue";
    case "YELLOW":
      return "colour_yellow";
    case "PURPLE":
      return "colour_purple";
    case "PINK":
      return "colour_pink";
    default:
      return "colour_picker";
  }
}

function createBlocklyBlock(workspace, row) {
  const cfg = typeof row.block_config === "string"
    ? JSON.parse(row.block_config)
    : row.block_config;

  if (!cfg) {
    console.error("block_config is null or undefined for block:", row);
    return null;
  }

  switch (row.block_type) {

    /* =====================
       SET VARIABLE
    ===================== */
    case "SET_VARIABLE": {

      // CREATE TURTLE
      if (cfg.type === "CREATE_TURTLE") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("turtle_create");
        block.setFieldValue(varId, "VAR");
        return block;
      }

      // INPUT → variable
      if (cfg.value?.type === "INPUT") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("variables_set");
        block.setFieldValue(varId, "VAR");

        const inputBlock = workspace.newBlock("text_prompt");
        inputBlock.setFieldValue(cfg.value.prompt, "TEXT");

        inputBlock.initSvg();
        inputBlock.render();

        block.getInput("VALUE")
          ?.connection
          ?.connect(inputBlock.outputConnection);

        return block;
      }

      // STRING → variable
      if (cfg.type === "STRING") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("variables_set");
        block.setFieldValue(varId, "VAR");

        const textBlock = workspace.newBlock("text");
        textBlock.setFieldValue(cfg.value, "TEXT");

        textBlock.initSvg();
        textBlock.render();

        block.getInput("VALUE")
          ?.connection
          ?.connect(textBlock.outputConnection);

        return block;
      }

      // INT / VARIABLE / EXPRESSION → variable
      if (
        cfg.value?.type === "INT" ||
        cfg.value?.type === "VARIABLE" ||
        cfg.value?.type === "EXPRESSION"
      ) {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("variables_set");
        block.setFieldValue(varId, "VAR");

        const valueBlock = createValueBlock(workspace, cfg.value);

        block.initSvg();
        block.render();

        if (valueBlock) {
          block.getInput("VALUE")
            ?.connection
            ?.connect(valueBlock.outputConnection);
        }

        return block;
      }

      return null;
    }

    /* =====================
       PRINT
    ===================== */
    case "PRINT": {
      const varId = ensureVariable(workspace, cfg.variable);
      const block = workspace.newBlock("text_print");

      const varBlock = workspace.newBlock("variables_get");
      varBlock.setFieldValue(varId, "VAR");

      varBlock.initSvg();
      varBlock.render();

      block.getInput("TEXT")
        ?.connection
        ?.connect(varBlock.outputConnection);

      return block;
    }

    /* =====================
       TURTLE MOVE (legacy)
    ===================== */
    case "TURTLE_MOVE": {
      const varId = ensureVariable(workspace, cfg.variable);
      const block = workspace.newBlock("turtle_move");

      block.setFieldValue(varId, "VAR");
      block.setFieldValue(cfg.direction, "DIRECTION");

      const num = workspace.newBlock("math_number");
      num.setFieldValue(String(cfg.value), "NUM");

      num.initSvg();
      num.render();

      block.getInput("DISTANCE")
        ?.connection
        ?.connect(num.outputConnection);

      return block;
    }

    /* =====================
       TURTLE MOTION (DB version)
    ===================== */
    case "TURTLE_MOTION": {
      if (cfg.action === "FORWARD") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("turtle_forward");

        block.setFieldValue(varId, "VAR");

        const num = workspace.newBlock("math_number");
        num.setFieldValue(String(cfg.distance), "NUM");

        num.initSvg();
        num.render();

        block.getInput("DISTANCE")
          ?.connection
          ?.connect(num.outputConnection);

        return block;
      }

      return null;
    }

    /* =====================
       BACKGROUND COLOR
    ===================== */
   case "TURTLE_SCREEN": {
  if (cfg.action === "SET_BACKGROUND_COLOR") {

    const block = workspace.newBlock("turtle_bgcolor");

    // Map DB color to Blockly block type
    const colorBlockType = mapColorToBlockType(cfg.color);

    const colorBlock = workspace.newBlock(colorBlockType);
    colorBlock.initSvg();
    colorBlock.render();

    block.getInput("COLOR")
      ?.connection
      ?.connect(colorBlock.outputConnection);

    return block;
  }
  return null;
}

    /* =====================
       TURTLE STYLE
    ===================== */
    case "TURTLE_STYLE": {

      // SET FILL COLOR
      if (cfg.action === "SET_FILL_COLOR") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("turtle_fill_color");
        block.setFieldValue(varId, "VAR");

        const colorBlock = workspace.newBlock("colour_picker");
        const hexColor = mapColorToHex(cfg.color);
        colorBlock.setFieldValue(hexColor, "COLOUR");

        colorBlock.initSvg();
        colorBlock.render();

        block.getInput("COLOR")
          ?.connection
          ?.connect(colorBlock.outputConnection);

        return block;
      }

      // SET SHAPE
      if (cfg.action === "SET_SHAPE") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("turtle_shape");

        block.setFieldValue(varId, "VAR");
        block.setFieldValue(cfg.shape, "SHAPE");

        return block;
      }

      // SET WIDTH
      if (cfg.action === "SET_WIDTH") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("turtle_width");
        block.setFieldValue(varId, "VAR");

        const num = workspace.newBlock("math_number");
        num.setFieldValue(String(cfg.width), "NUM");

        num.initSvg();
        num.render();

        block.getInput("WIDTH")
          ?.connection
          ?.connect(num.outputConnection);

        return block;
      }

      return null;
    }

    /* =====================
       DOT
    ===================== */
    case "TURTLE_DRAW": {
      if (cfg.action === "DOT") {
        const varId = ensureVariable(workspace, cfg.variable);
        const block = workspace.newBlock("turtle_dot");
        block.setFieldValue(varId, "VAR");

        const num = workspace.newBlock("math_number");
        num.setFieldValue(String(cfg.radius), "NUM");

        num.initSvg();
        num.render();

        block.getInput("SIZE")
          ?.connection
          ?.connect(num.outputConnection);

        return block;
      }
      return null;
    }

    default:
      console.warn("Unknown block_type:", row.block_type, row);
      return null;
  }
}

  function loadBlocksIntoWorkspace(blocks: any[]) {
    debugLog('Loading blocks into workspace', { count: blocks.length, blocks });
    const workspace = workspaceRef.current;
    if (!workspace) {
      debugLog('ERROR: Workspace not available');
      return;
    }

    workspace.clear();

    // First pass: Create all variables that will be needed
    debugLog('First pass: Creating variables');
    blocks.forEach((row) => {
      const cfg = typeof row.block_config === 'string'
        ? JSON.parse(row.block_config)
        : row.block_config;

      if (cfg?.variable) {
        ensureVariable(workspace, cfg.variable);
        debugLog(`Created variable: ${cfg.variable}`);
      }
    });

    let previousBlock: Blockly.Block | null = null;
    let y = 40;

    blocks.forEach((row) => {
      const newBlock = createBlocklyBlock(workspace, row);
      if (!newBlock) return;

      // Init SVG first (required)
      newBlock.initSvg();

      if (!previousBlock) {
        // ⭐ Root block
        newBlock.render();
        newBlock.moveBy(40, y);
        y += newBlock.getHeightWidth().height + 30;
      } else {
        // ⭐ Connect BEFORE render
        if (
          previousBlock.nextConnection &&
          newBlock.previousConnection
        ) {
          previousBlock.nextConnection.connect(
            newBlock.previousConnection
          );
        }
        newBlock.render();
      }

      previousBlock = newBlock;
    });

    workspace.render();
    Blockly.svgResize(workspace);
    workspace.scrollCenter();


    debugLog('✅ Finished loading blocks successfully');
  }

  useEffect(() => {
    defineBlocks();
    definePythonGenerators();
    defineJavascriptGenerators();

    const workspace = Blockly.inject(blocklyDiv.current, {
      media: '/media/',
      toolbox: toolboxXml,
      zoom: {
        controls: true,
        wheel: false,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      trashcan: true,
      renderer: 'zelos',
      // Fixed block size configuration
      grid: {
        spacing: 20,
        length: 1,
        colour: '#888',
        snap: false
      }
    });

    // Apply fixed block sizes via CSS
    const style = document.createElement('style');
    style.textContent = `
      .blocklyText {
        font-size: 12pt !important;
        font-family: sans-serif !important;
      }
      .blocklyNonEditableText > text,
      .blocklyEditableText > text {
        font-size: 12pt !important;
      }
      .blocklyFlyoutButton .blocklyText {
        font-size: 12pt !important;
      }
      /* Ensure consistent block rendering */
      .blocklyBlockCanvas {
        transform-origin: 0 0;
      }
      /* Fix toolbox and flyout block cropping */
      .blocklyToolboxDiv {
        min-width: 250px !important;
      }
      .blocklyFlyout {
        min-width: 320px !important;
      }
      .blocklyFlyoutBackground {
        width: 100% !important;
      }
      /* Fix scrollbar persistence when flyout closes */
      .blocklyFlyout.blocklyHidden ~ .blocklyFlyoutScrollbar {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      /* Keep Blockly HTML editors interactive (text/number field input) */
      .blocklyWidgetDiv, .blocklyDropDownDiv {
        pointer-events: auto !important;
      }

      .blocklySvg {
        pointer-events: auto !important;
      }

      .blocklyBlockCanvas, .blocklyFlyout, .blocklyScrollbarHandle,
      .blocklyZoom, .blocklyTrash, .blocklyToolboxDiv {
        pointer-events: auto !important;
      }

      .blocklyFlyoutScrollbar {
        pointer-events: auto !important;
      }

      .blocklyFlyout {
        touch-action: auto !important;
        overscroll-behavior: none !important;
      }
      
      .blocklyFlyout .blocklyText {
        font-size: 12pt !important;
      }
    `;
    document.head.appendChild(style);

    workspaceRef.current = workspace;
    setWorkspaceReady(true);

    // ── Override Blockly's built-in "Create Variable" handler ──────────────
    // Blockly internally calls window.prompt() which is blocked in Electron.
    // We replace the handler with our own that uses a custom React modal.
    (Blockly.Variables as any).createVariableButtonHandler = async (
      ws: Blockly.WorkspaceSvg,
      _opt_callback?: (name: string) => void,
      _opt_type?: string,
    ) => {
      const name = await askVariableName('myVar');
      if (!name) return; // user cancelled

      // Guard: don't create duplicate variable names
      const existing = ws.getVariable(name);
      if (existing) return;

      ws.createVariable(name);
    };

    // Override the native window.prompt for variable renaming
    Blockly.dialog.setPrompt(function(message, defaultValue, callback) {
      if (message.includes('New variable name')) {
         defaultValue = ''; 
      }
      askVariableName(defaultValue || 'myVar').then(name => {
        callback(name);
      });
    });
    // ───────────────────────────────────────────────────────────────────────
    
    const isFieldEditorOpen = () => Boolean((Blockly as any).WidgetDiv?.isVisible?.());

    const lockFlyoutScale = () => {
      if (isFieldEditorOpen()) return;
      const flyout = (workspace as any).getFlyout?.();
      const flyoutWorkspace = flyout?.getWorkspace?.();
      if (!flyoutWorkspace) return;
      const currentScale = typeof flyoutWorkspace.scale === 'number' ? flyoutWorkspace.scale : 1;
      if (Math.abs(currentScale - 1) < 0.001) return;

      // Keep toolbox/flyout blocks visually fixed, independent of main workspace zoom.
      if (typeof flyoutWorkspace.setScale === 'function') {
        flyoutWorkspace.setScale(1);
      } else {
        flyoutWorkspace.scale = 1;
      }

      flyoutWorkspace.resizeContents?.();
    };

    // Listen for zoom changes and keep flyout blocks at fixed size
    workspace.addChangeListener((e: any) => {
      // Handle zoom events
      if (e.type === Blockly.Events.VIEWPORT_CHANGE) {
        // Keep flyout size fixed whenever viewport changes (zoom/pan)
        lockFlyoutScale();
      }
      
      if (e.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
        requestAnimationFrame(() => {
          // 1. Normal resize
          Blockly.svgResize(workspace);

          // 2. Force clear cached content metrics
          (workspace as any).cachedContentBounds_ = null;

          // 3. Recompute content
          workspace.resizeContents();

          // 4. Hard reset scrollbars
          if (workspace.scrollbar) {
            workspace.scrollbar.resize();
            workspace.scrollbar.setVisible(false);
            workspace.scrollbar.setVisible(true);
          }

          // 5. Clean up flyout scrollbars properly
          const flyout = blocklyDiv.current?.querySelector('.blocklyFlyout');
          const scrollbars = blocklyDiv.current?.querySelectorAll('.blocklyFlyoutScrollbar');
          
          scrollbars?.forEach((scrollbar) => {
            const el = scrollbar as HTMLElement;
            if (!flyout || flyout.classList.contains('blocklyHidden')) {
              // Hide scrollbar when flyout is closed
              el.style.display = 'none';
              el.style.visibility = 'hidden';
            } else {
              el.style.display = '';
              el.style.visibility = '';
            }
          });
          
          // 6. Ensure flyout blocks stay at fixed size
          lockFlyoutScale();

          // 7. Snap back to origin
          workspace.scroll(0, 0);
        });
      }
    });

    const updateFlyoutScrollbars = () => {
      const scrollbars = blocklyDiv.current?.querySelectorAll('.blocklyFlyoutScrollbar');

      scrollbars?.forEach((scrollbar) => {
        const el = scrollbar as HTMLElement;
        const flyout = scrollbar.previousElementSibling as HTMLElement | null;

        // Hide scrollbar if flyout is hidden, doesn't exist, or has no content
        if (!flyout || 
            flyout.classList.contains('blocklyHidden') || 
            flyout.style.display === 'none' ||
            !flyout.querySelector('.blocklyBlockCanvas')) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
        } else {
          el.style.display = '';
          el.style.visibility = '';
          el.style.opacity = '';
        }
      });
    };

    let flyoutObserver: MutationObserver | null = null;
    let containerObserver: MutationObserver | null = null;

    const attachFlyoutObserver = () => {
      const flyout = blocklyDiv.current?.querySelector('.blocklyFlyout');
      if (!flyout) return;

      if (flyoutObserver) {
        flyoutObserver.disconnect();
      }

      flyoutObserver = new MutationObserver(() => {
        updateFlyoutScrollbars();
        lockFlyoutScale(); // Keep blocks at fixed size
      });

      flyoutObserver.observe(flyout, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true
      });
    };

    const preventToolboxScroll = () => {
      const toolboxDiv = blocklyDiv.current?.querySelector('.blocklyToolboxDiv') as HTMLElement;

      if (toolboxDiv) {
        toolboxDiv.addEventListener('wheel', (e) => {
          e.stopPropagation();
        }, { passive: false });
      }
    };

    setTimeout(() => {
      preventToolboxScroll();
      attachFlyoutObserver();
      updateFlyoutScrollbars();
      lockFlyoutScale(); // Initial enforcement
    }, 100);

    if (blocklyDiv.current) {
      containerObserver = new MutationObserver(() => {
        attachFlyoutObserver();
        updateFlyoutScrollbars();
        lockFlyoutScale();
      });

      containerObserver.observe(blocklyDiv.current, {
        childList: true,
        subtree: true,
      });
    }

    workspace.addChangeListener((event: any) => {
      if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
        setTimeout(() => {
          preventToolboxScroll();
          updateFlyoutScrollbars();
          lockFlyoutScale(); // Enforce on category change
        }, 50);
      }
    });

    workspace.addChangeListener((event) => {
      if (
        event.type !== Blockly.Events.BLOCK_CREATE &&
        event.type !== Blockly.Events.BLOCK_CHANGE &&
        event.type !== Blockly.Events.BLOCK_DELETE &&
        event.type !== Blockly.Events.BLOCK_MOVE
      ) {
        return;
      }
      setCode(pythonGenerator.workspaceToCode(workspace));
    });

    workspace.addChangeListener((event) => {
      if (event.type === Blockly.Events.UI) {
        setTimeout(updateFlyoutScrollbars, 0);
      }

      if (event.type === Blockly.Events.UI && event.element === "click") {
        const block = workspace.getBlockById(event.blockId);
        if (block && block.type === "file_upload") {
          fileInputRef.current?.click();
        }
      }
    });

    return () => {
      if (flyoutObserver) {
        flyoutObserver.disconnect();
      }
      if (containerObserver) {
        containerObserver.disconnect();
      }
      workspace.dispose();
      setWorkspaceReady(false); // ✅ ADD THIS
    };
  }, [toolboxXml]);


function renderPlot(plot, labels) {
  canvasContainerRef.current.innerHTML = "";

  const canvas = document.createElement("canvas");
  const container = canvasContainerRef.current;

  const rect = container.getBoundingClientRect();

  canvas.width = rect.width;
  canvas.height = Math.min(450, rect.height);
  canvas.style.border = "2px solid #ccc";
  canvasContainerRef.current.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const { type, x, y } = plot;

  const padding = 60;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  /* ======================
     AXIS DRAW
  ====================== */
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  /* ======================
     HISTOGRAM
  ====================== */
  if (type === "hist") {
    const data = x;
    const bins = 5;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / bins;

    const counts = Array(bins).fill(0);
    data.forEach(v => {
      const idx = Math.min(
        bins - 1,
        Math.floor((v - min) / binSize)
      );
      counts[idx]++;
    });

    const barWidth = width / bins;
    const maxCount = Math.max(...counts);

    ctx.fillStyle = "#3498db";

    counts.forEach((count, i) => {
      const barHeight = (count / maxCount) * height;
      const px = padding + i * barWidth;
      const py = canvas.height - padding - barHeight;
      ctx.fillRect(px, py, barWidth - 5, barHeight);
    });

    // ✅ NEW: X-axis values (bin ranges)
    ctx.fillStyle = "#000";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    for (let i = 0; i <= bins; i++) {
      const value = min + i * binSize;
      const px = padding + (i / bins) * width;
      ctx.fillText(value.toFixed(1), px, canvas.height - padding + 20);
      
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(px, canvas.height - padding);
      ctx.lineTo(px, canvas.height - padding + 5);
      ctx.stroke();
    }

    // ✅ NEW: Y-axis values (counts)
    ctx.textAlign = "right";
    const numYTicks = 5;
    for (let i = 0; i <= numYTicks; i++) {
      const value = (maxCount / numYTicks) * i;
      const py = canvas.height - padding - (i / numYTicks) * height;
      ctx.fillText(Math.round(value).toString(), padding - 10, py + 4);
      
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(padding - 5, py);
      ctx.lineTo(padding, py);
      ctx.stroke();
    }
  }

  /* ======================
     LINE / SCATTER
  ====================== */
  if (type === "line" || type === "scatter") {
    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const minY = Math.min(...y);
    const maxY = Math.max(...y);

    const scaleX = width / (maxX - minX || 1);
    const scaleY = height / (maxY - minY || 1);

    if (type === "line") {
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      ctx.beginPath();
    }

    x.forEach((_, i) => {
      const px = padding + (x[i] - minX) * scaleX;
      const py =
        canvas.height -
        padding -
        (y[i] - minY) * scaleY;

      if (type === "line") {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      if (type === "scatter") {
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (type === "line") ctx.stroke();

    // ✅ NEW: X-axis values
    ctx.fillStyle = "#000";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    const numXTicks = 5;
    for (let i = 0; i <= numXTicks; i++) {
      const value = minX + (maxX - minX) * (i / numXTicks);
      const px = padding + (i / numXTicks) * width;
      ctx.fillText(value.toFixed(1), px, canvas.height - padding + 20);
      
      // Tick mark
      ctx.strokeStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(px, canvas.height - padding);
      ctx.lineTo(px, canvas.height - padding + 5);
      ctx.stroke();
    }

    // ✅ NEW: Y-axis values
    ctx.textAlign = "right";
    const numYTicks = 5;
    for (let i = 0; i <= numYTicks; i++) {
      const value = minY + (maxY - minY) * (i / numYTicks);
      const py = canvas.height - padding - (i / numYTicks) * height;
      ctx.fillText(value.toFixed(1), padding - 10, py + 4);
      
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(padding - 5, py);
      ctx.lineTo(padding, py);
      ctx.stroke();
    }
  }

  /* ======================
     LABELS
  ====================== */
  ctx.fillStyle = "#000";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";

  // X label
  ctx.fillText(labels.x || "X", canvas.width / 2, canvas.height - 15);

  // Y label
  ctx.save();
  ctx.translate(15, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(labels.y || "Y", 0, 0);
  ctx.restore();
}

  function renderPygalChart(chart) {
    const container = canvasContainerRef.current;
    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;
    canvas.style.border = "2px solid #5566AA";
    canvas.style.borderRadius = "8px";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    const padding = 70;
    const W = canvas.width;
    const H = canvas.height;
    const plotW = W - padding * 2;
    const plotH = H - padding * 2;

    /* ======================
       TITLE
    ====================== */
    ctx.fillStyle = "#000";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(chart.title || "", W / 2, 35);

    /* ======================
       PIE / RADAR
    ====================== */
    if (chart.type === "pie") {
      const values = chart.series.map(s => s.values[0]);
      const radius = Math.min(W, H) / 2 - 40;
      const total = values.reduce((a, b) => a + b, 0);
      let angle = -Math.PI / 2;

      values.forEach((v, i) => {
        const slice = (v / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, H / 2);
        ctx.arc(W / 2, H / 2, radius, angle, angle + slice);
        ctx.fillStyle = `hsl(${i * 60},70%,60%)`;
        ctx.fill();
        angle += slice;
      });
      return;
    }

    /* ======================
       AXES
    ====================== */
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, H - padding);
    ctx.lineTo(W - padding, H - padding);
    ctx.stroke();

    const maxY = Math.max(
      ...chart.series.flatMap(s => s.values)
    );

    const barWidth =
      plotW /
      (chart.xlabels.length * chart.series.length || 1);

    /* ======================
       BAR / HBAR / STACKED
    ====================== */
    if (
      chart.type.includes("bar") ||
      chart.type === "hbar"
    ) {
      chart.xlabels.forEach((label, i) => {
        let stackBase = 0;

        chart.series.forEach((s, si) => {
          const val = s.values[i] || 0;
          const h = (val / maxY) * plotH;

          let x =
            padding +
            i * barWidth * chart.series.length +
            si * barWidth;

          let y = H - padding - h - stackBase;

          if (chart.type.includes("stacked")) {
            x = padding + i * barWidth;
            stackBase += h;
          }

          ctx.fillStyle = `hsl(${si * 60},70%,60%)`;
          ctx.fillRect(x, y, barWidth - 6, h);
        });
      });
    }

    /* ======================
       LINE / STACKED LINE / XY
    ====================== */
    if (
      chart.type.includes("line") ||
      chart.type === "xy"
    ) {
      chart.series.forEach((s, si) => {
        ctx.beginPath();
        ctx.strokeStyle = `hsl(${si * 60},70%,50%)`;
        ctx.lineWidth = 2;

        s.values.forEach((v, i) => {
          const x =
            padding +
            (i / (s.values.length - 1 || 1)) * plotW;
          const y =
            H - padding - (v / maxY) * plotH;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    }

    /* ======================
       X LABELS
    ====================== */
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    chart.xlabels.forEach((l, i) => {
      const x =
        padding +
        (i + 0.5) *
        (plotW / chart.xlabels.length);
      ctx.fillText(l, x, H - padding + 20);
    });
  }

  function showSpriteOnly(spriteName) {
    if (!canvasContainerRef.current) return;

    canvasContainerRef.current.innerHTML = "";

    const img = document.createElement("img");
    img.src = `/Sprites/${spriteName}.png`;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "contain";
    img.style.display = "block";
    img.style.margin = "auto";

    canvasContainerRef.current.appendChild(img);
  }
  async function showSpriteWithWebcam(spriteName) {
    if (!canvasContainerRef.current) return;

    canvasContainerRef.current.innerHTML = "";

    // Layout container
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "space-between";
    wrapper.style.alignItems = "center";
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.gap = "20px";

    // Webcam video
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = "48%";
    video.style.borderRadius = "12px";
    video.style.background = "#000";

    // Emoji image
    const img = document.createElement("img");
    img.src = `/Sprites/${spriteName}.png`;
    img.style.width = "48%";
    img.style.objectFit = "contain";

    wrapper.appendChild(video);
    wrapper.appendChild(img);
    canvasContainerRef.current.appendChild(wrapper);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      video.srcObject = stream;
    } catch (err) {
      console.error("Webcam error:", err);
      alert("Webcam access denied");
    }
  }
  function stopWebcam() {
    const videos = document.querySelectorAll("video");
    videos.forEach(v => {
      if (v.srcObject) {
        v.srcObject.getTracks().forEach(t => t.stop());
      }
    });
  }

  function injectUploadedFiles(code) {
    if (!window.__uploadedFiles) return code;

    const files = JSON.stringify(window.__uploadedFiles)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");

    return `
from io import StringIO
__uploaded_files = ${files}

def open_uploaded(filename, mode="r"):
    if filename not in __uploaded_files:
        raise FileNotFoundError(filename)
    return StringIO(__uploaded_files[filename])

file_handle = None

` + code;
  }

  const runCode = () => {
    if (!Sk || typeof Sk.configure !== "function") {
      setOutput("Python runtime not available.");
      return;
    }

    setOutput("Running...\n");
const ws = workspaceRef.current;
const usesTurtle = ws
  ? ws.getAllBlocks(false).some(b => b.type.startsWith("turtle_"))
  : false;

    const usesMath = /\bmath\./.test(code);
    const usesMatplotlib = /\bplt\./.test(code);
    const usesPygal = /\bpygal\b/.test(code);
    // Clear previous canvas
    canvasContainerRef.current.innerHTML = "";

  if (usesTurtle) {
  const canvas = document.createElement("canvas");
  canvas.id = "turtleCanvas";

  // ✅ Let CSS control size
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.border = "2px solid #5566AA";
  canvas.style.borderRadius = "8px";
  canvas.style.backgroundColor = "#ffffff";

  canvasContainerRef.current.appendChild(canvas);

  // Sync drawing resolution AFTER append.
  // Keep the internal size aligned with visible size so turtle starts centered.
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
}


    let pendingPlot = null;
    let plotLabels = { x: "", y: "" };

    Sk.configure({
      output: (text) => {
        const cleanText = text.trim();
        /* =========================
           🖼️ SPRITE HANDLER
        ========================= */
        if (cleanText.startsWith("__SPRITE__:")) {
          const raw = cleanText.replace("__SPRITE__:", "").trim();
          const [spriteName, cam] = raw.split("|");

          if (cam === "on") {
            showSpriteWithWebcam(spriteName);
          } else {
            showSpriteOnly(spriteName);
          }
          return;
        }

        if (cleanText.startsWith("__SPEAK__:")) {
          const spokenText = cleanText.replace("__SPEAK__:", "").trim();

          if (spokenText) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(
              new SpeechSynthesisUtterance(spokenText)
            );
          }
          return; // ⛔ stop further processing
        }
        if (text.startsWith("__PYGAL_RENDER__")) {
          try {
            const raw = text.replace("__PYGAL_RENDER__", "").trim();
            const [type, seriesStr, xlabelsStr, titleStr] = raw.split("|");

            const chart = {
              type,
              series: eval(seriesStr),
              xlabels: eval(xlabelsStr),
              title: titleStr || ""
            };

            renderPygalChart(chart);
          } catch (e) {
            console.error("Pygal parse error:", e, text);
          }
          return;
        }
        /* =========================
           PLOT DATA
        ========================= */
        if (text.includes("__PLOT_DATA__")) {
          try {
            const raw = text.replace("__PLOT_DATA__", "").trim();

            // Format: type|[x]|[y]
            const [type, xStr, yStr] = raw.split("|");

            const x = eval(xStr); // safe (internal only)
            const y = eval(yStr);

            pendingPlot = {
              type,
              x,
              y
            };
          } catch (e) {
            console.error("Plot parse error:", e, text);
          }
          return;
        }

        /* =========================
           LABELS
        ========================= */
        if (text.includes("__PLOT_LABELS__")) {
          const raw = text.replace("__PLOT_LABELS__", "").trim();
          const [xLabel, yLabel] = raw.split("|");

          plotLabels = {
            x: xLabel.replace(/'/g, ""),
            y: yLabel.replace(/'/g, "")
          };

          if (pendingPlot) {
            renderPlot(pendingPlot, plotLabels);
            pendingPlot = null;
          }
          return;
        }


        /* =========================
       NORMAL OUTPUT → WHITE CANVAS
    ========================= */
        const pre = getCanvasTextOutput();
        pre.textContent += text;
      },

      read: (filename) => {
        if (
          Sk.builtinFiles === undefined ||
          Sk.builtinFiles["files"][filename] === undefined
        ) {
          throw new Error("File not found: '" + filename + "'");
        }
        return Sk.builtinFiles["files"][filename];
      }
    });

    // Optional helper for turtle background
    window.setCanvasBackgroundColor = function (color) {
      const canvas = document.querySelector("#turtleCanvas canvas");
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    const needsUpload = code.includes("__UPLOAD_FILE__");
    const cleanedCode = code.replace(/__UPLOAD_FILE__/g, "");

    if (needsUpload && !window.__fileUploaded) {
      fileInputRef.current.click();
      return;
    }

    // 👇 Only inject turtle init if required
    let initCode = "";
    if (code.includes("playsound.say")) {
      initCode += `
class playsound:
    @staticmethod
    def say(text):
        print("__SPEAK__:", text)
`;
    }

    if (code.includes("sprites.show")) {
      initCode += `
class sprites:
    @staticmethod
    def show(name, cam):
        print("__SPRITE__:" + str(name) + "|" + str(cam))
`;
    }

    if (code.includes("serial")) {
      initCode += `
class serial:
    @staticmethod
    def send(data):
        print("[SERIAL SEND]", data)
`;
    }
    if (usesMath) {
      initCode += `import math\n`;
    }

    //     if (usesTurtle) {
    //       initCode += `
    // import turtle
    // _s = turtle.Screen()
    // `;
    //     }
    if (usesPygal) {
      initCode += `
class _PygalBase:
    def __init__(self):
        self.series = []
        self.x_labels = []
        self.title = ""
        self._type = "base"

    def add(self, label, values):
        self.series.append({"label": label, "values": values})

    def render(self):
      print(
          "__PYGAL_RENDER__"
          + self._type
          + "|"
          + str(self.series)
          + "|"
          + str(self.x_labels)
          + "|"
          + str(self.title)
      )


class Bar(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "bar"

class HorizontalBar(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "hbar"

class Line(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "line"

class Pie(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "pie"

class Radar(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "radar"

class StackedBar(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "stacked_bar"

class StackedLine(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "stacked_line"

class XY(_PygalBase):
    def __init__(self):
        super().__init__()
        self._type = "xy"

class pygal:
    Bar = Bar
    HorizontalBar = HorizontalBar
    Line = Line
    Pie = Pie
    Radar = Radar
    StackedBar = StackedBar
    StackedLine = StackedLine
    XY = XY
`;
    }
    if (usesMatplotlib) {
      initCode += `
class _FakePlt:
    def __init__(self):
        self.plots = []
        self.kind = "line"
        self.xlabel_text = ""
        self.ylabel_text = ""
        self.title_text = ""

    def plot(self, x, y):
        self.kind = "line"
        self.plots.append((list(x), list(y)))

    def scatter(self, x, y):
        self.kind = "scatter"
        self.plots.append((list(x), list(y)))

    def hist(self, d):
        self.kind = "hist"
        self.plots.append((list(d), []))

    def xlabel(self, t): self.xlabel_text = t
    def ylabel(self, t): self.ylabel_text = t
    def title(self, t): self.title_text = t

    def show(self):
        for p in self.plots:
            print("__PLOT_DATA__" + self.kind + "|" + str(p[0]) + "|" + str(p[1]))
        print("__PLOT_LABELS__" + str(self.xlabel_text) + "|" + str(self.ylabel_text))

plt = _FakePlt()
`;
    }

    const pythonDisplayCode = initCode + code; // 👀 shown only

    // 🐢 TURTLE → JAVASCRIPT CANVAS
    if (usesTurtle) {
      import("@/lib/turtleEngine").then(({ createTurtle }) => {
        const turtle = createTurtle("turtleCanvas");
        turtle.reset();

        // Generate JS from Blockly (NOT Python)
        const ws = workspaceRef.current;

        if (!ws) {
          setOutput("Blockly workspace not ready");
          return;
        }

        const jsCode = javascriptGenerator.workspaceToCode(ws);



        try {
          new Function("__turtle", jsCode)(turtle);
          setOutput((prev) => prev + "\nTurtle executed successfully!");
        } catch (e) {
          console.error("Canvas turtle error", e);
          setOutput((prev) => prev + "\nTurtle execution error");
        }
      });

      return; // ⛔ DO NOT FALL THROUGH TO SKULPT
    }
    if (!usesTurtle) {
      const fullCode = injectUploadedFiles(initCode + cleanedCode);
      const myPromise = Sk.misceval.asyncToPromise(() => {
        return Sk.importMainWithBody("<stdin>", false, fullCode, true);
      });

      myPromise.then(
        () => {
          setOutput((prev) => prev + "\nCode executed successfully!");
        },
        (err: any) => {
          let errorMessage = "Unknown execution error";

          if (err?.tp$str) errorMessage = err.tp$str();
          if (err?.args?.v?.length) {
            errorMessage += ": " + err.args.v.map((x: any) => x.v).join(", ");
          }

          setOutput((prev) => prev + "\nError: " + errorMessage);
        }
      );
    }

  };

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (!Sk.builtinFiles) {
        Sk.builtinFiles = { files: {} };
      }

      Sk.builtinFiles["files"][file.name] = reader.result;

      alert(`File "${file.name}" uploaded successfully`);
    };

    reader.readAsText(file);
  }

  const resetWorkspace = () => {
    if (workspaceRef.current) {
      workspaceRef.current.clear();
    }
    setCode('');
    setOutput('');
    stopWebcam();
    if (canvasContainerRef.current) {
      canvasContainerRef.current.innerHTML = '';
    }
  };

  return (
    <>
      {/* ── Variable Name Modal (Electron-safe, no window.prompt) ─────────── */}
      {varModal.open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) cancelVarModal(); }}
        >
          <div
            onKeyDown={(e) => { if (e.key === 'Enter') confirmVarModal(); if (e.key === 'Escape') cancelVarModal(); }}
            style={{
              background: '#fff', borderRadius: '12px',
              padding: '30px 32px 24px', minWidth: '340px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
              display: 'flex', flexDirection: 'column', gap: '18px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#7C88CC', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px',
              }}>🔤</div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#222' }}>
                New Variable
              </span>
            </div>

            {/* Label + Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#555', fontWeight: 600 }}>
                Variable name:
              </label>
              <input
                ref={varModalInputRef}
                defaultValue={varModal.inputVal}
                onChange={(e) => setVarModal(v => ({ ...v, inputVal: e.target.value }))}
                style={{
                  border: '2px solid #7C88CC', borderRadius: '8px',
                  padding: '9px 13px', fontSize: '15px', outline: 'none',
                  boxShadow: '0 0 0 3px #7C88CC22', color: '#222',
                  transition: 'border-color 0.2s',
                }}
                placeholder="e.g. myVar"
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelVarModal}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  border: '1.5px solid #ccc', background: '#f5f5f5',
                  cursor: 'pointer', fontSize: '14px', color: '#444',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmVarModal}
                style={{
                  padding: '8px 24px', borderRadius: '8px',
                  border: 'none', background: '#7C88CC',
                  color: '#fff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 700,
                  boxShadow: '0 2px 8px #7C88CC66',
                }}
              >
                Create ✓
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const text = await file.text();

          window.__uploadedFiles = window.__uploadedFiles || {};
          window.__uploadedFiles[file.name] = text;
          window.__fileUploaded = true;

          // 🔥 AUTO-FILL filename into Blockly block
          const ws = workspaceRef.current;
          if (ws) {
            const blocks = ws.getAllBlocks(false);
            const openBlock = blocks.find(b => b.type === "file_open");
            if (openBlock) {
              openBlock.setFieldValue(file.name, "FILENAME");
            }
          }

          runCode();
        }}
      />

      {/* Debug Panel */}
      {/* {showDebug && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          width: '400px',
          maxHeight: '80vh',
          background: '#1e1e1e',
          border: '2px solid #4CAF50',
          borderRadius: '8px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            padding: '10px',
            background: '#4CAF50',
            color: 'white',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '6px 6px 0 0'
          }}>
            <span>🔍 Debug Console</span>
            <div>
              <button
                onClick={() => setDebugLogs([])}
                style={{
                  background: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  marginRight: '8px',
                  fontSize: '12px'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowDebug(false)}
                style={{
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{
            padding: '10px',
            overflowY: 'auto',
            flex: 1,
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#00ff00',
            background: '#1e1e1e'
          }}>
            {debugLogs.length === 0 ? (
              <div style={{ color: '#888' }}>No logs yet...</div>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} style={{
                  marginBottom: '4px',
                  borderBottom: '1px solid #333',
                  paddingBottom: '4px',
                  wordWrap: 'break-word'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )} */}

      {/* Toggle Debug Button (when hidden) */}
      {/* {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 9999,
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          🔍
        </button>
      )} */}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const text = await file.text();

          // Populate Skulpt builtin files directly
          if (!window.Sk.builtinFiles) {
            window.Sk.builtinFiles = { files: {} };
          }
          window.Sk.builtinFiles["files"][file.name] = text;
          
          window.__fileUploaded = true;

          // 🔥 AUTO-FILL filename into Blockly block
          const ws = workspaceRef.current;
          if (ws) {
            const blocks = ws.getAllBlocks(false);
            const openBlock = blocks.find(b => b.type === "file_open");
            if (openBlock) {
              openBlock.setFieldValue(file.name, "FILENAME");
            }
          }

          alert(`File "${file.name}" uploaded successfully`);
          runCode();
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          overflow: "hidden"
        }}
      >
        {/* Top Menu Bar */}
        <div
          style={{
            height: "28px",
            background: "#2e2e2e",
            color: "#ccc",
            display: "flex",
            alignItems: "center",
            padding: "0 15px",
            fontSize: "12px",
            gap: "18px",
            borderBottom: "1px solid #1a1a1a"
          }}
        >
          {["File", "Edit", "View", "Window", "Help"].map((menu) => (
            <span key={menu} style={{ cursor: "default" }}>
              {menu}
            </span>
          ))}
        </div>

        {/* Header */}
        <div
          style={{
            height: "60px",
            background: "#7C88CC",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: "10px"
          }}
        >


          <button onClick={resetWorkspace} style={{ padding: "8px 16px", background: "#fff", border: "none", borderRadius: "4px" }}>
            🔄 Reset
          </button>

          <button
            onClick={runCode}
            style={{
              padding: "8px 24px",
              background: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold"
            }}
          >
            ▶ Run
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            {["blocks", "code", "canvas"].map(v => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                style={{
                  padding: "8px 16px",
                  background: view === v ? "#fff" : "#9BA5D8",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT – Blockly */}
          <div
            style={{
              flex: view === "blocks" ? 1 : 0.6,
              display: view === "canvas" ? "none" : "block",
              minWidth: "400px",
              height: "100%",
              background: "#fff",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div
              ref={blocklyDiv}
              style={{
                width: "100%",
                height: "100%",
                display: view === "blocks" ? "block" : "none",
                fontSize: "14px", // Force consistent font size
                transform: "scale(1)", // Prevent browser scaling
                transformOrigin: "top left"
              }}
            />

            {view === "code" && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px", background: "#ddd", fontWeight: "bold" }}>
                  Generated Python Code
                </div>

                <pre
                  style={{
                    flex: 1,
                    margin: 0,
                    padding: "20px",
                    overflowY: "auto",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {code || "# Drag blocks to generate code..."}
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT – Canvas + Output */}
          <div
            style={{
              flex: 1,
              background: "#7C88CC",
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              overflow: "hidden",
              borderLeft: view !== "canvas" ? "2px solid #555" : "none"
            }}
          >
            {/* Canvas */}
            <div
              ref={canvasContainerRef}
              style={{
                flex: view === "canvas" ? 0.8 : 0.6,
                background: "#fff",
                borderRadius: "8px",
                border: "2px solid #5566AA",
                padding: "10px",
                overflow: "hidden",
                marginBottom: "20px"
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  overflowY: "auto",
                  maxHeight: "100%"
                }}
              />
            </div>

            {/* Output */}
            <div
              style={{
                flex: view === "canvas" ? 0.2 : 0.4,
                background: "#5566AA",
                borderRadius: "8px",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                color: "#fff"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "10px" }}>Output:</div>

              <pre
                style={{
                  flex: 1,
                  margin: 0,
                  fontSize: "12px",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  overflowY: "auto"
                }}
              >
                {output || "Ready to run..."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );

}

export default BasicCodingPage;