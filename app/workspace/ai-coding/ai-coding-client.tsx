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
import { javascriptGenerator, Order } from "blockly/javascript";
import Script from "next/script";
// Removed static import for Hands to avoid conflict with localized global window.Hands

import * as faceapi from "face-api.js";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

// TensorFlow and COCO-SSD are loaded via CDN Script tags (see bottom of file)
// Access them via window.tf and window.cocoSsd
declare global {
  interface Window {
    tf: any;
    cocoSsd: any;
    tmImage: any;
    cv: any;
  }
}

const turtleEngineRef = { current: null as any };


const variablesRef = { current: {} as Record<string, any> }
class CleanNumberInput extends Blockly.FieldNumber {
  showEditor_() {
    if (this.textElement_) {
      this.textElement_.style.display = 'none';
    }

    super.showEditor_();

    if (!this.htmlInput_) return;

    const input = this.htmlInput_;   // ✅ store locally
    const oldDispose = input.onblur;

    input.onblur = (e) => {
      if (this.textElement_) {
        this.textElement_.style.display = '';
      }

      oldDispose?.call(input, e);    // ✅ now input is NOT null
    };
  }
}
class CleanTextInput extends Blockly.FieldTextInput {
  showEditor_() {
    if (this.textElement_) {
      this.textElement_.style.display = 'none';
    }

    super.showEditor_();

    if (!this.htmlInput_) return;

    const input = this.htmlInput_;
    const oldDispose = input.onblur;

    input.onblur = (e) => {
      if (this.textElement_) {
        this.textElement_.style.display = '';
      }

      oldDispose?.call(input, e);
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

  /* =========================
  TEACHABLE MACHINE BLOCKS
========================= */

  Blockly.Blocks['teachable_load_model'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Load The Model")
        .appendField(
          new Blockly.FieldTextInput("https://teachablemachine.withgoogle.com/models/xxxx/"),
          "URL"
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(300);
    }
  };

  Blockly.Blocks['teachable_load_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Load Image");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(300);
    }
  };

  Blockly.Blocks['teachable_show_webcam'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("show the")
        .appendField(
          new Blockly.FieldDropdown([
            ["webcam", "webcam"],
            ["image", "image"]
          ]),
          "SRC"
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(300);
    }
  };

  Blockly.Blocks['teachable_predict_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("predict")
        .appendField(
          new Blockly.FieldDropdown([
            ["image", "image"],
            ["pose", "pose"]
          ]),
          "TYPE"
        )
        .appendField("from")
        .appendField(
          new Blockly.FieldDropdown([
            ["webcam", "webcam"],
            ["image", "image"]
          ]),
          "SRC"
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(300);
    }
  };

  Blockly.Blocks['teachable_predict_audio'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("predict audio");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(300);
    }
  };

  /* =========================
     FACIAL FEATURE BLOCKS
  ========================= */

  Blockly.Blocks['facial_load_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Load Image");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['facial_get_count'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Get")
        .appendField(new Blockly.FieldDropdown([
          ["face", "face"],
          ["eye", "eye"],
          ["nose", "nose"],
          ["smile", "smile"]
        ]), "FEATURE")
        .appendField("count");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['facial_get_gender'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Get")
        .appendField(new Blockly.FieldDropdown([
          ["male", "male"],
          ["female", "female"]
        ]), "GENDER")
        .appendField("count");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['facial_get_expression'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Get")
        .appendField(new Blockly.FieldDropdown([
          ["happy", "happy"],
          ["sad", "sad"],
          ["angry", "angry"],
          ["fearful", "fearful"],
          ["surprised", "surprised"],
          ["disgusted", "disgusted"],
          ["neutral", "neutral"]
        ]), "EXPRESSION")
        .appendField("expression count");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['facial_get_age_list'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Get age list");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  Blockly.Blocks['facial_show_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Show image")
        .appendField(new Blockly.FieldDropdown([
          ["with border", "with"],
          ["without border", "without"]
        ]), "BORDER");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    }
  };

  /* =========================
     OBJECT DETECTION BLOCKS
  ========================= */

  Blockly.Blocks['object_load_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Load Image");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(180);
    }
  };

  Blockly.Blocks['object_get_count'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Get")
        .appendField(new Blockly.FieldDropdown([
          ["aeroplane", "aeroplane"],
          ["bicycle", "bicycle"],
          ["bird", "bird"],
          ["boat", "boat"],
          ["bottle", "bottle"],
          ["bus", "bus"],
          ["car", "car"],
          ["cat", "cat"],
          ["chair", "chair"],
          ["cow", "cow"],
          ["diningtable", "diningtable"],
          ["dog", "dog"],
          ["horse", "horse"],
          ["motorbike", "motorbike"],
          ["person", "person"],
          ["pottedplant", "pottedplant"],
          ["sheep", "sheep"],
          ["sofa", "sofa"],
          ["train", "train"],
          ["tvmonitor", "tvmonitor"]
        ]), "OBJECT")
        .appendField("count");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(180);
    }
  };

  Blockly.Blocks['object_show_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Show image")
        .appendField(new Blockly.FieldDropdown([
          ["with border", "with"],
          ["without border", "without"]
        ]), "BORDER");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(180);
    }
  };

  /* =========================
     FACE RECOGNITION BLOCKS
  ========================= */

  Blockly.Blocks['facerecog_load_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Load Image");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(200);
    }
  };

  Blockly.Blocks['facerecog_predict'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Predict the result");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(200);
    }
  };

  Blockly.Blocks['facerecog_show_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Show image")
        .appendField(new Blockly.FieldDropdown([
          ["with border", "with"],
          ["without border", "without"]
        ]), "BORDER");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(200);
    }
  };

  /* =========================
     FINGER DETECTION BLOCKS
  ========================= */

  Blockly.Blocks['finger_start_detection'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Start Detection");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(220);
    }
  };

  Blockly.Blocks['finger_get_coordinate'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Get")
        .appendField(new Blockly.FieldDropdown([
          ["x", "x"],
          ["y", "y"],
          ["z", "z"]
        ]), "AXIS")
        .appendField("coordinate of point")
        .appendField(new Blockly.FieldDropdown([
          ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"],
          ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"],
          ["15", "15"], ["16", "16"], ["17", "17"], ["18", "18"], ["19", "19"],
          ["20", "20"]
        ]), "POINT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(220);
    }
  };

  Blockly.Blocks['finger_get_count'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Finger Count");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(220);
    }
  };

  Blockly.Blocks['finger_stop_detection'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Stop Detection");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(220);
    }
  };

  Blockly.Blocks['finger_set_delay'] = {
    init: function () {
      this.appendValueInput("DELAY")
        .setCheck("Number")
        .appendField("Set Delay of");
      this.appendDummyInput()
        .appendField("Seconds");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(220);
    }
  };

  /* =========================
     COMPUTER VISION (OPENCV) BLOCKS
  ========================= */

  Blockly.Blocks['cv_load_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Load Image");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_put_text'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Put Text:")
        .appendField(new Blockly.FieldTextInput("Hello"), "TEXT");
      this.appendDummyInput()
        .appendField("Position:")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y");
      this.appendDummyInput()
        .appendField("Font Style:")
        .appendField(new Blockly.FieldDropdown([
          ["SIMPLEX", "SIMPLEX"],
          ["PLAIN", "PLAIN"],
          ["DUPLEX", "DUPLEX"],
          ["COMPLEX", "COMPLEX"],
          ["TRIPLEX", "TRIPLEX"],
          ["COMPLEX_SMALL", "COMPLEX_SMALL"],
          ["SCRIPT_SIMPLEX", "SCRIPT_SIMPLEX"],
          ["SCRIPT_COMPLEX", "SCRIPT_COMPLEX"]
        ]), "FONT");
      this.appendDummyInput()
        .appendField("Font Size:")
        .appendField(new Blockly.FieldNumber(2, 0.1, 10, 0.1), "SIZE");
      this.appendDummyInput()
        .appendField("Color in")
        .appendField("R:")
        .appendField(new Blockly.FieldNumber(255, 0, 255), "R")
        .appendField("G:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "G")
        .appendField("B:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "B");
      this.appendDummyInput()
        .appendField("Line Thickness:")
        .appendField(new Blockly.FieldNumber(2, 1, 10), "THICKNESS");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_draw_line'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Draw Line");
      this.appendDummyInput()
        .appendField("Start Point:")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X1")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y1");
      this.appendDummyInput()
        .appendField("End Point:")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X2")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y2");
      this.appendDummyInput()
        .appendField("Color in")
        .appendField("R:")
        .appendField(new Blockly.FieldNumber(255, 0, 255), "R")
        .appendField("G:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "G")
        .appendField("B:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "B");
      this.appendDummyInput()
        .appendField("Line Thickness:")
        .appendField(new Blockly.FieldNumber(2, 1, 10), "THICKNESS");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_draw_rectangle'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Draw Rectangle");
      this.appendDummyInput()
        .appendField("Start Position:")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X1")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y1");
      this.appendDummyInput()
        .appendField("End Position:")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X2")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y2");
      this.appendDummyInput()
        .appendField("Color in")
        .appendField("R:")
        .appendField(new Blockly.FieldNumber(255, 0, 255), "R")
        .appendField("G:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "G")
        .appendField("B:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "B");
      this.appendDummyInput()
        .appendField("Thickness:")
        .appendField(new Blockly.FieldNumber(2, 1, 10), "THICKNESS");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_draw_circle'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Draw Circle");
      this.appendDummyInput()
        .appendField("Position:")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y");
      this.appendDummyInput()
        .appendField("Radius:")
        .appendField(new Blockly.FieldNumber(50, 1, 500), "RADIUS");
      this.appendDummyInput()
        .appendField("Color in")
        .appendField("R:")
        .appendField(new Blockly.FieldNumber(255, 0, 255), "R")
        .appendField("G:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "G")
        .appendField("B:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "B");
      this.appendDummyInput()
        .appendField("Thickness:")
        .appendField(new Blockly.FieldNumber(2, 1, 10), "THICKNESS");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_resize'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Resize")
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(100), "X")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(100), "Y");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_xy'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("x:")
        .appendField(new Blockly.FieldNumber(50), "X")
        .appendField("y:")
        .appendField(new Blockly.FieldNumber(50), "Y");
      this.setOutput(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_rgb'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("R:")
        .appendField(new Blockly.FieldNumber(255, 0, 255), "R")
        .appendField("G:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "G")
        .appendField("B:")
        .appendField(new Blockly.FieldNumber(0, 0, 255), "B");
      this.setOutput(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_show_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Show Image as")
        .appendField(new Blockly.FieldTextInput("output"), "NAME");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

  Blockly.Blocks['cv_save_image'] = {
    init: function () {
      this.appendDummyInput()
        .appendField("Save Image as")
        .appendField(new Blockly.FieldTextInput("image.png"), "NAME");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(280);
    }
  };

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


  function pygalChartBlock(type: string, label: string) {
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
        .appendField(new CleanTextInput("do_something"), "NAME");

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
        .appendField(new CleanTextInput("do_something"), "NAME");

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
        .appendField(new Blockly.FieldNumber(0, -Infinity, Infinity, 1), 'VALUE');

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
    return ['"red"', Order.ATOMIC];
  };

  javascriptGenerator.forBlock['colour_green'] = function () {
    return ['"green"', Order.ATOMIC];
  };

  javascriptGenerator.forBlock['colour_blue'] = function () {
    return ['"blue"', Order.ATOMIC];
  };

  javascriptGenerator.forBlock['colour_yellow'] = function () {
    return ['"yellow"', Order.ATOMIC];
  };

  javascriptGenerator.forBlock['colour_purple'] = function () {
    return ['"purple"', Order.ATOMIC];
  };

  javascriptGenerator.forBlock['colour_pink'] = function () {
    return ['"pink"', Order.ATOMIC];
  };
  javascriptGenerator.forBlock['colour_picker'] = function (block) {
    const color = block.getFieldValue('COLOUR');
    return [`"${color}"`, Order.ATOMIC];
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
    if (!javascriptGenerator.nameDB_) return "";

    const t = javascriptGenerator.nameDB_.getName(
      block.getFieldValue("VAR"),
      Blockly.Names.NameType.VARIABLE
    );

    const w =
      javascriptGenerator.valueToCode(
        block,
        "WIDTH",
        Order.NONE
      ) || "1";

    return `__turtle.width(${w});\n`;
  };


  /* ==========================
     COLORS
     ========================== */
  javascriptGenerator.forBlock["turtle_color"] =
    javascriptGenerator.forBlock["turtle_pencolor"] = function (block) {
      const nameDB = javascriptGenerator.nameDB_;
      if (!nameDB) return "";

      const t = nameDB.getName(
        block.getFieldValue("VAR"),
        Blockly.Names.NameType.VARIABLE
      );

      const c =
        javascriptGenerator.valueToCode(
          block,
          "COLOR",
          Order.NONE
        ) || '"#000000"';

      return `__turtle.pencolor(${c});\n`;
    };

  javascriptGenerator.forBlock["turtle_fill_color"] = function (block) {
    const nameDB = javascriptGenerator.nameDB_;
    if (!nameDB) return "";

    const t = nameDB.getName(
      block.getFieldValue("VAR"),
      Blockly.Names.NameType.VARIABLE
    );

    const c =
      javascriptGenerator.valueToCode(
        block,
        "COLOR",
        Order.NONE
      ) || '"#000000"';

    return `__turtle.fillcolor(${c});\n`;
  };

  javascriptGenerator.forBlock["turtle_bgcolor"] = function (block) {
    const c = javascriptGenerator.valueToCode(block, "COLOR", Order.NONE) || '"#ffffff"';
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
    const nameDB = javascriptGenerator.nameDB_;
    if (!nameDB) return "";

    const t = nameDB.getName(
      block.getFieldValue("VAR"),
      Blockly.Names.NameType.VARIABLE
    );

    const s =
      javascriptGenerator.valueToCode(
        block,
        "SPEED",
        Order.NONE
      ) || "5";

    return `__turtle.speed(${s});\n`;
  };

  /* ==========================
     VISIBILITY
     ========================== */

  javascriptGenerator.forBlock["turtle_hide"] = function (block) {
    const nameDB = javascriptGenerator.nameDB_;
    if (!nameDB) return "";

    const t = nameDB.getName(
      block.getFieldValue("VAR"),
      Blockly.Names.NameType.VARIABLE
    );

    return `__turtle.hideturtle();\n`;
  };

  javascriptGenerator.forBlock["turtle_show"] = function (block) {
    const nameDB = javascriptGenerator.nameDB_;
    if (!nameDB) return "";

    const t = nameDB.getName(
      block.getFieldValue("VAR"),
      Blockly.Names.NameType.VARIABLE
    );

    return `__turtle.showturtle();\n`;
  };
};

const definePythonGenerators = () => {
  /* =========================
    TEACHABLE GENERATORS
 ========================= */

  pythonGenerator.forBlock['teachable_load_model'] = function (block) {
    const url = block.getFieldValue("URL");
    return `print("__TEACHABLE_LOAD__:${url}")\n`;
  };

  pythonGenerator.forBlock['teachable_load_image'] = function () {
    return `print("__TEACHABLE_LOAD_IMAGE__")\n`;
  };

  pythonGenerator.forBlock['teachable_show_webcam'] = function (block) {
    const src = block.getFieldValue("SRC");
    return `print("__TEACHABLE_SHOW__:${src}")\n`;
  };

  pythonGenerator.forBlock['teachable_predict_image'] = function (block) {
    const type = block.getFieldValue("TYPE");
    const src = block.getFieldValue("SRC");
    return `print("__TEACHABLE_PREDICT__:${type}:${src}")\n`;
  };

  pythonGenerator.forBlock['teachable_predict_audio'] = function () {
    return `print("__TEACHABLE_PREDICT_AUDIO__")\n`;
  };

  /* =========================
     FACIAL FEATURE GENERATORS
  ========================= */

  pythonGenerator.forBlock['facial_load_image'] = function () {
    return `print("__FACIAL_LOAD_IMAGE__")\n`;
  };

  pythonGenerator.forBlock['facial_get_count'] = function (block) {
    const feature = block.getFieldValue("FEATURE");
    return `print("__FACIAL_GET_COUNT__:${feature}")\n`;
  };

  pythonGenerator.forBlock['facial_get_gender'] = function (block) {
    const gender = block.getFieldValue("GENDER");
    return `print("__FACIAL_GET_GENDER__:${gender}")\n`;
  };

  pythonGenerator.forBlock['facial_get_expression'] = function (block) {
    const expression = block.getFieldValue("EXPRESSION");
    return `print("__FACIAL_GET_EXPRESSION__:${expression}")\n`;
  };

  pythonGenerator.forBlock['facial_get_age_list'] = function () {
    return `print("__FACIAL_GET_AGE_LIST__")\n`;
  };

  pythonGenerator.forBlock['facial_show_image'] = function (block) {
    const border = block.getFieldValue("BORDER");
    return `print("__FACIAL_SHOW__:${border}")\n`;
  };

  /* =========================
     OBJECT DETECTION GENERATORS
  ========================= */

  pythonGenerator.forBlock['object_load_image'] = function () {
    return `print("__OBJECT_LOAD_IMAGE__")\n`;
  };

  pythonGenerator.forBlock['object_get_count'] = function (block) {
    const object = block.getFieldValue("OBJECT");
    return `print("__OBJECT_GET_COUNT__:${object}")\n`;
  };

  pythonGenerator.forBlock['object_show_image'] = function (block) {
    const border = block.getFieldValue("BORDER");
    return `print("__OBJECT_SHOW__:${border}")\n`;
  };

  /* =========================
     FACE RECOGNITION GENERATORS
  ========================= */

  pythonGenerator.forBlock['facerecog_load_image'] = function () {
    return `print("__FACERECOG_LOAD_IMAGE__")\n`;
  };

  pythonGenerator.forBlock['facerecog_predict'] = function () {
    return `print("__FACERECOG_PREDICT__")\n`;
  };

  pythonGenerator.forBlock['facerecog_show_image'] = function (block) {
    const border = block.getFieldValue("BORDER");
    return `print("__FACERECOG_SHOW__:${border}")\n`;
  };

  /* =========================
     FINGER DETECTION GENERATORS
  ========================= */

  pythonGenerator.forBlock['finger_start_detection'] = function () {
    return `print("__FINGER_START__")\n`;
  };

  pythonGenerator.forBlock['finger_get_coordinate'] = function (block) {
    const axis = block.getFieldValue("AXIS");
    const point = block.getFieldValue("POINT");
    return `print("__FINGER_GET_COORD__:${axis}:${point}")\n`;
  };

  pythonGenerator.forBlock['finger_get_count'] = function () {
    return `print("__FINGER_GET_COUNT__")\n`;
  };

  pythonGenerator.forBlock['finger_stop_detection'] = function () {
    return `print("__FINGER_STOP__")\n`;
  };

  pythonGenerator.forBlock['finger_set_delay'] = function (block, generator) {
    const delay = generator.valueToCode(block, 'DELAY', PythonOrder.ATOMIC) || '0';
    return `print("__FINGER_DELAY__:${delay}")\n`;
  };

  /* =========================
     COMPUTER VISION (OPENCV) GENERATORS
  ========================= */

  pythonGenerator.forBlock['cv_load_image'] = function () {
    return `print("__CV_LOAD_IMAGE__")\n`;
  };

  pythonGenerator.forBlock['cv_put_text'] = function (block) {
    const text = block.getFieldValue("TEXT") || "Hello";
    const x = block.getFieldValue("X");
    const y = block.getFieldValue("Y");
    const font = block.getFieldValue("FONT");
    const size = block.getFieldValue("SIZE");
    const r = block.getFieldValue("R");
    const g = block.getFieldValue("G");
    const b = block.getFieldValue("B");
    const thickness = block.getFieldValue("THICKNESS");
    return `print("__CV_PUT_TEXT__:${text}:${x}:${y}:${font}:${size}:${r}:${g}:${b}:${thickness}")\n`;
  };

  pythonGenerator.forBlock['cv_draw_line'] = function (block) {
    const x1 = block.getFieldValue("X1");
    const y1 = block.getFieldValue("Y1");
    const x2 = block.getFieldValue("X2");
    const y2 = block.getFieldValue("Y2");
    const r = block.getFieldValue("R");
    const g = block.getFieldValue("G");
    const b = block.getFieldValue("B");
    const thickness = block.getFieldValue("THICKNESS");
    return `print("__CV_DRAW_LINE__:${x1}:${y1}:${x2}:${y2}:${r}:${g}:${b}:${thickness}")\n`;
  };

  pythonGenerator.forBlock['cv_draw_rectangle'] = function (block) {
    const x1 = block.getFieldValue("X1");
    const y1 = block.getFieldValue("Y1");
    const x2 = block.getFieldValue("X2");
    const y2 = block.getFieldValue("Y2");
    const r = block.getFieldValue("R");
    const g = block.getFieldValue("G");
    const b = block.getFieldValue("B");
    const thickness = block.getFieldValue("THICKNESS");
    return `print("__CV_DRAW_RECT__:${x1}:${y1}:${x2}:${y2}:${r}:${g}:${b}:${thickness}")\n`;
  };

  pythonGenerator.forBlock['cv_draw_circle'] = function (block) {
    const x = block.getFieldValue("X");
    const y = block.getFieldValue("Y");
    const radius = block.getFieldValue("RADIUS");
    const r = block.getFieldValue("R");
    const g = block.getFieldValue("G");
    const b = block.getFieldValue("B");
    const thickness = block.getFieldValue("THICKNESS");
    return `print("__CV_DRAW_CIRCLE__:${x}:${y}:${radius}:${r}:${g}:${b}:${thickness}")\n`;
  };

  pythonGenerator.forBlock['cv_resize'] = function (block) {
    const x = block.getFieldValue("X");
    const y = block.getFieldValue("Y");
    return `print("__CV_RESIZE__:${x}:${y}")\n`;
  };

  pythonGenerator.forBlock['cv_xy'] = function (block) {
    const x = block.getFieldValue("X");
    const y = block.getFieldValue("Y");
    return [`(${x}, ${y})`, Order.ATOMIC];
  };

  pythonGenerator.forBlock['cv_rgb'] = function (block) {
    const r = block.getFieldValue("R");
    const g = block.getFieldValue("G");
    const b = block.getFieldValue("B");
    return [`(${r}, ${g}, ${b})`, Order.ATOMIC];
  };

  pythonGenerator.forBlock['cv_show_image'] = function (block) {
    const name = block.getFieldValue('NAME') || 'output';
    return `print("__CV_SHOW__:${name}")\n`;
  };

  pythonGenerator.forBlock['cv_save_image'] = function (block) {
    const name = block.getFieldValue('NAME') || 'image.png';
    return `print("__CV_SAVE__:${name}")\n`;
  };

  pythonGenerator.forBlock['turtle_left'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    if (!nameDB) return "";

    const varName = nameDB.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const angle =
      generator.valueToCode(
        block,
        'ANGLE',
        PythonOrder.ATOMIC
      ) || '0';

    return `${varName}.left(${angle})\n`;
  };

  pythonGenerator.forBlock['turtle_pencolor'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    if (!nameDB) return "";

    const varName = nameDB.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const color = block.getFieldValue('COLOR');

    return `${varName}.pencolor('${color}')\n`;
  };

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
    const gen = generator as any;

    if (!gen.definitions_) {
      gen.definitions_ = {};
    }

    gen.definitions_['file_runtime'] = `
from io import StringIO
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

  pythonGenerator.forBlock["turtle_create"] = function (block, generator) {
    const gen = generator as any;

    if (!gen.definitions_) {
      gen.definitions_ = {};
    }

    gen.definitions_["import_turtle"] = `
import turtle
_screen = turtle.Screen()
`;

    return "";
  };

  /* =========================
   TURTLE MOVEMENT
========================= */

  pythonGenerator.forBlock['turtle_forward'] = function (block, generator) {
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const distance =
      generator.valueToCode(block, 'DISTANCE', PythonOrder.ATOMIC) || '0';

    return `${varName}.forward(${distance})\n`;
  };

  pythonGenerator.forBlock['turtle_right'] = function (block, generator) {
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const angle =
      generator.valueToCode(block, 'ANGLE', PythonOrder.ATOMIC) || '0';

    return `${varName}.right(${angle})\n`;
  };

  pythonGenerator.forBlock['turtle_left'] = function (block, generator) {
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const angle =
      generator.valueToCode(block, 'ANGLE', PythonOrder.ATOMIC) || '0';

    return `${varName}.left(${angle})\n`;
  };

  /* =========================
     CONVERSION GENERATORS
  ========================= */

  pythonGenerator.forBlock['convert_to_int'] = function (block, generator) {
    const value =
      generator.valueToCode(block, 'VALUE', PythonOrder.FUNCTION_CALL) || '0';

    return [`int(${value})`, PythonOrder.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['convert_to_float'] = function (block, generator) {
    const value =
      generator.valueToCode(block, 'VALUE', PythonOrder.FUNCTION_CALL) || '0';

    return [`float(${value})`, PythonOrder.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['convert_to_string'] = function (block, generator) {
    const value =
      generator.valueToCode(block, 'VALUE', PythonOrder.FUNCTION_CALL) || '""';

    return [`str(${value})`, PythonOrder.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['convert_to_bool'] = function (block, generator) {
    const value =
      generator.valueToCode(block, 'VALUE', PythonOrder.FUNCTION_CALL) || 'False';

    return [`bool(${value})`, PythonOrder.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['convert_upper_case'] = function (block, generator) {
    const value =
      generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '""';

    return [`${value}.upper()`, PythonOrder.MEMBER];
  };

  pythonGenerator.forBlock['convert_lower_case'] = function (block, generator) {
    const value =
      generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '""';

    return [`${value}.lower()`, PythonOrder.MEMBER];
  };

  pythonGenerator.forBlock["turtle_bgcolor"] = function (block, gen) {
    const c = gen.valueToCode(block, "COLOR", PythonOrder.NONE) || '"#ffffff"';
    return `_screen.bgcolor(${c})\n`;
  };


  pythonGenerator.forBlock['controls_repeat'] = function (block, generator) {
    const times = generator.valueToCode(block, 'TIMES', PythonOrder.ATOMIC) || '0';
    let branch = generator.statementToCode(block, 'DO');
    branch = generator.addLoopTrap(branch, block) || "    pass\n";
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
    const operator = block.getFieldValue('OP') as
      | 'ADD'
      | 'MINUS'
      | 'MULTIPLY'
      | 'DIVIDE'
      | 'POWER';

    const arg0 =
      generator.valueToCode(block, 'A', PythonOrder.ADDITIVE) || '0';

    const arg1 =
      generator.valueToCode(block, 'B', PythonOrder.ADDITIVE) || '0';

    const operations: Record<
      'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'POWER',
      [string, number]
    > = {
      ADD: [`${arg0} + ${arg1}`, PythonOrder.ADDITIVE],
      MINUS: [`${arg0} - ${arg1}`, PythonOrder.ADDITIVE],
      MULTIPLY: [`${arg0} * ${arg1}`, PythonOrder.MULTIPLICATIVE],
      DIVIDE: [`${arg0} / ${arg1}`, PythonOrder.MULTIPLICATIVE],
      POWER: [`${arg0} ** ${arg1}`, PythonOrder.EXPONENTIATION],
    };

    return operations[operator] ?? [arg0, PythonOrder.ATOMIC];
  };

  // Variable blocks (these are built-in Blockly blocks)
  pythonGenerator.forBlock['variables_get'] = function (block, generator) {
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    return [varName, PythonOrder.ATOMIC];
  };

  pythonGenerator.forBlock['variables_set'] = function (block, generator) {
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
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
    const operator = block.getFieldValue('OP') as
      | 'EQ'
      | 'NEQ'
      | 'LT'
      | 'LTE'
      | 'GT'
      | 'GTE';

    const arg0 =
      generator.valueToCode(block, 'A', PythonOrder.RELATIONAL) || '0';

    const arg1 =
      generator.valueToCode(block, 'B', PythonOrder.RELATIONAL) || '0';

    const operators: Record<
      'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE',
      string
    > = {
      EQ: '==',
      NEQ: '!=',
      LT: '<',
      LTE: '<=',
      GT: '>',
      GTE: '>='
    };

    const op = operators[operator];

    return [`${arg0} ${op} ${arg1}`, PythonOrder.RELATIONAL];
  };

  pythonGenerator.forBlock['logic_operation'] = function (block, generator) {
    const operator = block.getFieldValue('OP');
    const arg0 = generator.valueToCode(block, 'A', PythonOrder.LOGICAL_AND) || 'True';
    const arg1 = generator.valueToCode(block, 'B', PythonOrder.LOGICAL_AND) || 'True';

    const op = operator === 'AND' ? ' and ' : ' or ';
    const code = `${arg0}${op}${arg1}`;
    return [code, PythonOrder.LOGICAL_AND];
  };

  pythonGenerator.forBlock['logic_not'] = function (block, generator) {
    const arg0 = generator.valueToCode(block, 'VALUE', PythonOrder.LOGICAL_NOT) || 'True';
    const code = `not ${arg0}`;
    return [code, PythonOrder.LOGICAL_NOT];
  };

  pythonGenerator.forBlock['logic_ternary'] = function (block, generator) {
    const test = generator.valueToCode(block, 'TEST', PythonOrder.CONDITIONAL) || 'True';
    const ifTrue = generator.valueToCode(block, 'IF_TRUE', PythonOrder.CONDITIONAL) || 'None';
    const ifFalse = generator.valueToCode(block, 'IF_FALSE', PythonOrder.CONDITIONAL) || 'None';
    const code = `${ifTrue} if ${test} else ${ifFalse}`;
    return [code, PythonOrder.CONDITIONAL];
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
    return [code, PythonOrder.MEMBER];
  };

  pythonGenerator.forBlock['tuples_count'] = function (block, generator) {
    const element = generator.valueToCode(block, 'ELEMENT', PythonOrder.ATOMIC) || 'None';
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `${tuple}.count(${element})`;
    return [code, PythonOrder.MEMBER];
  };

  pythonGenerator.forBlock['tuples_position'] = function (block, generator) {
    const element = generator.valueToCode(block, 'ELEMENT', PythonOrder.ATOMIC) || 'None';
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `${tuple}.index(${element})`;
    return [code, PythonOrder.MEMBER];
  };

  pythonGenerator.forBlock['tuples_length'] = function (block, generator) {
    const tuple = generator.valueToCode(block, 'TUPLE', PythonOrder.ATOMIC) || '()';
    const code = `len(${tuple})`;
    return [code, PythonOrder.MEMBER];
  };

  // Conversion generators

  pythonGenerator.forBlock['convert_upper_case'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '""';
    const code = `${value}.upper()`;
    return [code, PythonOrder.MEMBER];
  };

  pythonGenerator.forBlock['convert_lower_case'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '""';
    const code = `${value}.lower()`;
    return [code, PythonOrder.MEMBER];
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
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const start =
      generator.valueToCode(block, 'FROM', PythonOrder.NONE) || '0';

    const end =
      generator.valueToCode(block, 'TO', PythonOrder.NONE) || '10';

    const by =
      generator.valueToCode(block, 'BY', PythonOrder.NONE) || '1';

    const body = generator.statementToCode(block, 'DO');

    return `for ${varName} in range(${start}, ${end}, ${by}):\n${body}`;
  };

  pythonGenerator.forBlock['controls_forEach'] = function (block, generator) {
    const genAny = generator as any;

    const varName = genAny.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE
    );

    const list =
      generator.valueToCode(block, 'LIST', PythonOrder.NONE) || '[]';

    const body = generator.statementToCode(block, 'DO');

    return `for ${varName} in ${list}:\n${body}`;
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
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '0';
    const code = `math.sqrt(${value})`;
    return [code, PythonOrder.MEMBER];
  };

  // Math: Round
  pythonGenerator.forBlock['math_round'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '0';
    const code = `round(${value})`;
    return [code, PythonOrder.MEMBER];
  };

  // Math: Sin
  pythonGenerator.forBlock['math_sin'] = function (block, generator) {
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.MEMBER) || '0';
    const code = `math.sin(${value})`;
    return [code, PythonOrder.MEMBER];
  };

  // Math: Pi
  pythonGenerator.forBlock['math_pi'] = function (block, generator) {
    return ['math.pi', PythonOrder.MEMBER];
  };

  // Math: Sum of list
  pythonGenerator.forBlock['math_sum'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const code = `sum(${list})`;
    return [code, PythonOrder.MEMBER];
  };

  // Math: Remainder (modulo)
  pythonGenerator.forBlock['math_remainder'] = function (block, generator) {
    const dividend =
      generator.valueToCode(block, 'DIVIDEND', PythonOrder.MULTIPLICATIVE) || '0';

    const divisor =
      generator.valueToCode(block, 'DIVISOR', PythonOrder.MULTIPLICATIVE) || '1';

    return [`${dividend} % ${divisor}`, PythonOrder.MULTIPLICATIVE];
  };

  // Math: Random integer
  pythonGenerator.forBlock['math_random_int'] = function (block, generator) {
    const genAny = generator as any;

    if (!genAny.definitions_) {
      genAny.definitions_ = {};
    }

    genAny.definitions_['import_random'] = 'import random';

    const from =
      generator.valueToCode(block, 'FROM', PythonOrder.NONE) || '1';

    const to =
      generator.valueToCode(block, 'TO', PythonOrder.NONE) || '100';

    return [`random.randint(${from}, ${to})`, PythonOrder.FUNCTION_CALL];
  };


  // Math: Random fraction
  pythonGenerator.forBlock['math_random_fraction'] = function (block, generator) {
    const genAny = generator as any;

    if (!genAny.definitions_) {
      genAny.definitions_ = {};
    }

    genAny.definitions_['import_random'] = 'import random';

    return ['random.random()', PythonOrder.FUNCTION_CALL];
  };

  // Lists: Create list
  pythonGenerator.forBlock['lists_create_with'] = function (block, generator) {
    const code = `[]`;
    return [code, PythonOrder.ATOMIC];
  };

  // Lists: Get item
  pythonGenerator.forBlock['lists_getIndex'] = function (block, generator) {
    const index = generator.valueToCode(block, 'INDEX', PythonOrder.NONE) || '0';
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const code = `${list}[${index}]`;
    return [code, PythonOrder.MEMBER];
  };

  // Lists: Append item
  pythonGenerator.forBlock['lists_append'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.append(${item})\n`;
    return code;
  };

  // Lists: Remove item
  pythonGenerator.forBlock['lists_remove_item'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.remove(${item})\n`;
    return code;
  };

  // Lists: Remove at position
  pythonGenerator.forBlock['lists_remove_at'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const index = generator.valueToCode(block, 'INDEX', PythonOrder.NONE) || '0';
    const code = `${list}.pop(${index})\n`;
    return code;
  };

  // Lists: Sort
  pythonGenerator.forBlock['lists_sort'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const code = `${list}.sort()\n`;
    return code;
  };

  // Lists: Reverse
  pythonGenerator.forBlock['lists_reverse'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const code = `${list}.reverse()\n`;
    return code;
  };

  // Lists: Insert at position
  pythonGenerator.forBlock['lists_insert_at'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
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
    const set = generator.valueToCode(block, 'SET', PythonOrder.MEMBER) || 'set()';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${set}.add(${item})\n`;
    return code;
  };

  // Sets: Union
  pythonGenerator.forBlock['sets_union'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', PythonOrder.MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', PythonOrder.MEMBER) || 'set()';
    const code = `${set1} | ${set2}`;
    return [code, PythonOrder.BITWISE_OR];
  };

  // Sets: Intersection
  pythonGenerator.forBlock['sets_intersection'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', PythonOrder.MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', PythonOrder.MEMBER) || 'set()';
    const code = `${set1} & ${set2}`;
    return [code, PythonOrder.BITWISE_AND];
  };

  // Sets: Difference
  pythonGenerator.forBlock['sets_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', PythonOrder.MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', PythonOrder.MEMBER) || 'set()';
    const code = `${set1} - ${set2}`;
    return [code, PythonOrder.ADDITIVE];
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
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', PythonOrder.NONE) || '"key"';
    const code = `${dict}[${key}]`;
    return [code, PythonOrder.MEMBER];
  };

  // Dictionaries: Get keys
  pythonGenerator.forBlock['dicts_get_keys'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const code = `list(${dict}.keys())`;
    return [code, PythonOrder.MEMBER];
  };

  // Dictionaries: Get values
  pythonGenerator.forBlock['dicts_get_values'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const code = `list(${dict}.values())`;
    return [code, PythonOrder.MEMBER];
  };

  // Dictionaries: Clear
  pythonGenerator.forBlock['dicts_clear'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const code = `${dict}.clear()\n`;
    return code;
  };

  // Motion: Backward
  pythonGenerator.forBlock['turtle_backward'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    const distance =
      generator.valueToCode(block, 'DISTANCE', PythonOrder.NONE) || '50';

    return `${varName}.backward(${distance})\n`;
  };

  pythonGenerator.forBlock['turtle_dot'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    const size =
      generator.valueToCode(block, 'SIZE', PythonOrder.NONE) || '10';

    return `${varName}.dot(${size})\n`;
  };

  pythonGenerator.forBlock['turtle_heading'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    const angle =
      generator.valueToCode(block, 'ANGLE', PythonOrder.NONE) || '0';

    return `${varName}.setheading(${angle})\n`;
  };

  pythonGenerator.forBlock['turtle_position'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    const x =
      generator.valueToCode(block, 'X', PythonOrder.NONE) || '0';
    const y =
      generator.valueToCode(block, 'Y', PythonOrder.NONE) || '0';

    return `${varName}.goto(${x}, ${y})\n`;
  };

  pythonGenerator.forBlock['turtle_penup'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    return `${varName}.penup()\n`;
  };

  pythonGenerator.forBlock['turtle_pendown'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    return `${varName}.pendown()\n`;
  };

  pythonGenerator.forBlock['turtle_begin_fill'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    return `${varName}.begin_fill()\n`;
  };

  pythonGenerator.forBlock['turtle_end_fill'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    return `${varName}.end_fill()\n`;
  };

  pythonGenerator.forBlock['turtle_shape'] = function (block, generator) {
    const nameDB = generator.nameDB_;
    const varName = nameDB
      ? nameDB.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE)
      : block.getFieldValue('VAR');

    const shape = block.getFieldValue('SHAPE');

    return `${varName}.shape('${shape}')\n`;
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
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.index(${item})`;
    return [code, PythonOrder.MEMBER];
  };

  // Lists: Count element
  pythonGenerator.forBlock['lists_count_element'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const item = generator.valueToCode(block, 'ITEM', PythonOrder.NONE) || 'None';
    const code = `${list}.count(${item})`;
    return [code, PythonOrder.MEMBER];
  };

  // Lists: Extend list
  pythonGenerator.forBlock['lists_extend'] = function (block, generator) {
    const list1 = generator.valueToCode(block, 'LIST1', PythonOrder.MEMBER) || '[]';
    const list2 = generator.valueToCode(block, 'LIST2', PythonOrder.MEMBER) || '[]';
    const code = `${list1}.extend(${list2})\n`;
    return code;
  };

  // Lists: Get sub-list
  pythonGenerator.forBlock['lists_sub_list'] = function (block, generator) {
    const list = generator.valueToCode(block, 'LIST', PythonOrder.MEMBER) || '[]';
    const start = generator.valueToCode(block, 'START', PythonOrder.NONE) || '0';
    const end = generator.valueToCode(block, 'END', PythonOrder.NONE) || 'len(list)';
    const code = `${list}[${start}:${end}]`;
    return [code, PythonOrder.MEMBER];
  };

  // Sets: Remove random element
  pythonGenerator.forBlock['sets_remove_random'] = function (block, generator) {
    const set = generator.valueToCode(block, 'SET', PythonOrder.MEMBER) || 'set()';
    const code = `${set}.pop()`;
    return [code, PythonOrder.MEMBER];
  };

  // Sets: Is superset
  pythonGenerator.forBlock['sets_is_superset'] = function (block, generator) {
    const set1 =
      generator.valueToCode(block, 'SET1', PythonOrder.RELATIONAL) || 'set()';

    const set2 =
      generator.valueToCode(block, 'SET2', PythonOrder.RELATIONAL) || 'set()';

    return [`${set1} >= ${set2}`, PythonOrder.RELATIONAL];
  };

  pythonGenerator.forBlock['sets_is_subset'] = function (block, generator) {
    const set1 =
      generator.valueToCode(block, 'SET1', PythonOrder.RELATIONAL) || 'set()';

    const set2 =
      generator.valueToCode(block, 'SET2', PythonOrder.RELATIONAL) || 'set()';

    return [`${set1} <= ${set2}`, PythonOrder.RELATIONAL];
  };

  // Sets: Is disjoint
  pythonGenerator.forBlock['sets_is_disjoint'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', PythonOrder.MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', PythonOrder.MEMBER) || 'set()';
    const code = `${set1}.isdisjoint(${set2})`;
    return [code, PythonOrder.MEMBER];
  };

  // Sets: Update with difference
  pythonGenerator.forBlock['sets_update_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', PythonOrder.MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', PythonOrder.MEMBER) || 'set()';
    const code = `${set1}.difference_update(${set2})\n`;
    return code;
  };

  // Sets: Symmetric difference
  pythonGenerator.forBlock['sets_symmetric_difference'] = function (block, generator) {
    const set1 =
      generator.valueToCode(block, 'SET1', PythonOrder.BITWISE_XOR) || 'set()';

    const set2 =
      generator.valueToCode(block, 'SET2', PythonOrder.BITWISE_XOR) || 'set()';

    return [`${set1} ^ ${set2}`, PythonOrder.BITWISE_XOR];
  };

  // Sets: Update with symmetric difference
  pythonGenerator.forBlock['sets_update_symmetric_difference'] = function (block, generator) {
    const set1 = generator.valueToCode(block, 'SET1', PythonOrder.MEMBER) || 'set()';
    const set2 = generator.valueToCode(block, 'SET2', PythonOrder.MEMBER) || 'set()';
    const code = `${set1}.symmetric_difference_update(${set2})\n`;
    return code;
  };

  // Dictionaries: Get items
  pythonGenerator.forBlock['dicts_get_items'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const code = `list(${dict}.items())`;
    return [code, PythonOrder.MEMBER];
  };

  // Dictionaries: Remove key
  pythonGenerator.forBlock['dicts_remove_key'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', PythonOrder.NONE) || '"key"';
    const code = `del ${dict}[${key}]\n`;
    return code;
  };

  // Dictionaries: Update dictionary
  pythonGenerator.forBlock['dicts_update'] = function (block, generator) {
    const dict = generator.valueToCode(block, 'DICT', PythonOrder.MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', PythonOrder.NONE) || '"key"';
    const value = generator.valueToCode(block, 'VALUE', PythonOrder.NONE) || 'None';
    const code = `${dict}[${key}] = ${value}\n`;
    return code;
  };

  // Turtle: Hide
  pythonGenerator.forBlock["turtle_hide"] = function (block, gen) {
    const nameDB = gen.nameDB_;
    const t = nameDB
      ? nameDB.getName(
        block.getFieldValue("VAR"),
        Blockly.Names.NameType.VARIABLE
      )
      : block.getFieldValue("VAR");

    return `${t}.hideturtle()\n`;
  };

  pythonGenerator.forBlock["turtle_show"] = function (block, gen) {
    const nameDB = gen.nameDB_;
    const t = nameDB
      ? nameDB.getName(
        block.getFieldValue("VAR"),
        Blockly.Names.NameType.VARIABLE
      )
      : block.getFieldValue("VAR");

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

/* =========================
   AI LEARNING - MODULE-LEVEL STATE
   (must be outside the component to survive re-renders)
========================= */
// Facial Features
// Facial Features
let facialImage: HTMLImageElement | null = null;
let facialDetections: any[] = [];
let facialCountsArray: number[] = [];

// Object Detection
let objectImage: HTMLImageElement | null = null;
let objectDetections: any[] = [];
let cocoModel: any = null;

// Face Recognition
let faceRecogImage: HTMLImageElement | null = null;
let faceRecogResult: any = null;

// Finger Detection
let fingerHands: any = null;
let fingerCamera: any = null;
let fingerResults: any = null;
let fingerDelay: number = 0;
let fingerDetecting: boolean = false;
let fingerAnimationId: number | null = null;

// Computer Vision (OpenCV)
let cvImage: HTMLImageElement | null = null;
let cvMat: any = null;

// Promise that resolves when OpenCV.js is fully initialized
function isCvReady() {
  try {
    return !!(
      typeof window !== 'undefined' &&
      window.cv &&
      typeof window.cv.imread === 'function' &&
      typeof window.cv.Mat === 'function'
    );
  } catch {
    return false;
  }
}

const cvReady: Promise<void> = new Promise((resolve) => {
  if (isCvReady()) {
    resolve();
    return;
  }
  // Poll every 100ms — works whether or not onRuntimeInitialized fires
  const poll = setInterval(() => {
    if (isCvReady()) {
      clearInterval(poll);
      resolve();
    }
  }, 100);
  // Also hook onRuntimeInitialized as a secondary signal
  if (typeof window !== 'undefined') {
    const origCallback = (window as any).onOpenCvReady;
    (window as any).onOpenCvReady = () => {
      if (origCallback) origCallback();
      if (isCvReady()) { clearInterval(poll); resolve(); }
    };
    if (window.cv) {
      const orig = window.cv['onRuntimeInitialized'];
      window.cv['onRuntimeInitialized'] = () => {
        if (orig) orig();
        clearInterval(poll);
        resolve();
      };
    }
  }
});

// Command Queue for async operations
type Command = {
  type: string;
  payload?: any;
};

let commandQueue: Command[] = [];
let isProcessingQueue = false;

function AICodingPage() {
  const fileInputRef = useRef(null);
  const blocklyDiv = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef(null);
  const [code, setCode] = useState('');
  const [view, setView] = useState('blocks');
  const [output, setOutput] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const searchParams = useSearchParams()
  let cocoModel: cocoSsd.ObjectDetection | null = null;
  let objectImage: HTMLImageElement | null = null;
  let objectDetections: cocoSsd.DetectedObject[] = [];

  const projectId = searchParams?.get("projectId")
  const activityId = searchParams?.get("activityId")
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const mode = projectId
    ? "PROJECT"
    : activityId
      ? "ACTIVITY"
      : "INVALID"


  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const isDetectionRunningRef = useRef(false);
  const fingerIntervalRef = useRef<any>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const fingerResultsRef = useRef<any>(null);
  const fingerDelayRef = useRef<number>(1);
  const cameraWrapperRef = useRef<any>(null);
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

  // Initialize TensorFlow.js backend on component mount
  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        // Expose bundled TensorFlow on window for code paths that expect window.tf.
        const loadTF = async () => {
          const tfModule = await import('@tensorflow/tfjs');

          if (!(window as any).tf) {
            (window as any).tf = tfModule;
          }
        };

        // Load the local bundled package
        await loadTF();

        if (!(window as any).tf) {
          debugLog("❌ TensorFlow.js failed to load");
          return;
        }

        debugLog("🔧 Initializing TensorFlow.js...");

        const tf = window.tf;
        await tf.ready();

        // Try WebGL first
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          debugLog(`✅ TensorFlow.js ready (WebGL) - ${tf.getBackend()}`);
        } catch (webglErr) {
          // Fallback to CPU
          debugLog("⚠️ WebGL failed, trying CPU...");
          await tf.setBackend('cpu');
          await tf.ready();
          debugLog(`✅ TensorFlow.js ready (CPU) - ${tf.getBackend()}`);
        }

        // Verify with a test operation
        const testTensor = tf.tensor([1, 2, 3]);
        const result = testTensor.square();
        result.dispose();
        testTensor.dispose();
        debugLog("✅ TensorFlow.js backend verified");

      } catch (err: any) {
        console.error("TensorFlow.js init failed:", err);
        debugLog(`❌ TensorFlow.js init failed: ${err.message}`);
      }
    };

    initTensorFlow();
  }, []);

  function getCanvasTextOutput(): HTMLPreElement | null {
    const container = canvasContainerRef.current as HTMLDivElement | null;
    if (!container) return null;

    let pre = container.querySelector(".canvas-text-output") as HTMLPreElement | null;

    if (!pre) {
      pre = document.createElement("pre");
      pre.className = "canvas-text-output";
      container.appendChild(pre);
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
<category name="Teachable" colour="300">
  <block type="teachable_load_model" />
  <block type="teachable_load_image" />
  <block type="teachable_show_webcam" />
  <block type="teachable_predict_image" />
  <block type="teachable_predict_audio" />
</category>

<category name="AI Learning" colour="340">
  <category name="Facial Feature" colour="160">
    <block type="facial_load_image" />
    <block type="facial_get_count" />
    <block type="facial_get_gender" />
    <block type="facial_get_expression" />
    <block type="facial_get_age_list" />
    <block type="facial_show_image" />
  </category>

  <category name="Object Detection" colour="180">
    <block type="object_load_image" />
    <block type="object_get_count" />
    <block type="object_show_image" />
  </category>

  <category name="Face Recognition" colour="200">
    <block type="facerecog_load_image" />
    <block type="facerecog_predict" />
    <block type="facerecog_show_image" />
  </category>

  <category name="Finger Detection" colour="220">
    <block type="finger_start_detection" />
    <block type="finger_get_coordinate" />
    <block type="finger_get_count" />
    <block type="finger_stop_detection" />
    <block type="finger_set_delay" />
  </category>

  <category name="Computer Vision" colour="280">
    <block type="cv_load_image" />
    <block type="cv_put_text" />
    <block type="cv_draw_line" />
    <block type="cv_draw_rectangle" />
    <block type="cv_draw_circle" />
    <block type="cv_resize" />
    <block type="cv_xy" />
    <block type="cv_rgb" />
    <block type="cv_show_image" />
    <block type="cv_save_image" />
  </category>
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

  function createValueBlock(workspace: any, valueCfg: any) {
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
      case "RED": ;
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

  function createBlocklyBlock(workspace: any, row: any) {
    const cfg = typeof row.block_config === "string"
      ? JSON.parse(row.block_config)
      : row.block_config;

    if (!cfg) {
      console.error("block_config is null or undefined for block:", row);
      return null;
    }

    switch (row.block_type) {

      case "FINGER_START_DETECTION": {
        const block = workspace.newBlock("finger_start_detection");
        block.initSvg();
        block.render();
        return block;
      }
      case "CONTROLS_REPEAT": {
        const block = workspace.newBlock("controls_repeat");

        const num = workspace.newBlock("math_number");
        num.setFieldValue(String(cfg.times || 1), "NUM");

        num.initSvg();
        num.render();

        block.getInput("TIMES")
          ?.connection
          ?.connect(num.outputConnection);

        block.initSvg();
        block.render();

        return block;
      }
      case "FINGER_GET_COUNT": {
        const block = workspace.newBlock("finger_get_count");
        block.initSvg();
        block.render();
        return block;
      }
      case "FINGER_SET_DELAY": {
        const block = workspace.newBlock("finger_set_delay");

        const num = workspace.newBlock("math_number");
        num.setFieldValue(String(cfg.seconds || 1), "NUM");

        num.initSvg();
        num.render();

        block.getInput("DELAY")
          ?.connection
          ?.connect(num.outputConnection);

        block.initSvg();
        block.render();

        return block;
      }
      case "FINGER_STOP_DETECTION": {
        const block = workspace.newBlock("finger_stop_detection");
        block.initSvg();
        block.render();
        return block;
      }

      /* =====================
         CV BLOCKS
      ===================== */

      case "CV_LOAD_IMAGE": {
        const block = workspace.newBlock("cv_load_image");
        block.initSvg();
        block.render();
        return block;
      }

      case "CV_PUT_TEXT": {
        const block = workspace.newBlock("cv_put_text");

        block.setFieldValue(cfg.text || "Hello", "TEXT");
        block.setFieldValue(String(cfg.x ?? 100), "X");
        block.setFieldValue(String(cfg.y ?? 100), "Y");
        block.setFieldValue(cfg.font || "SIMPLEX", "FONT");
        block.setFieldValue(String(cfg.size ?? 2), "SIZE");

        block.setFieldValue(String(cfg.color?.r ?? 255), "R");
        block.setFieldValue(String(cfg.color?.g ?? 0), "G");
        block.setFieldValue(String(cfg.color?.b ?? 0), "B");

        block.setFieldValue(String(cfg.thickness ?? 2), "THICKNESS");

        block.initSvg();
        block.render();

        return block;
      }

      case "CV_SHOW_IMAGE": {
        const block = workspace.newBlock("cv_show_image");
        block.initSvg();
        block.render();
        return block;
      }

      /* =====================
         SET VARIABLE
      ===================== */
      case "FACIAL_LOAD_IMAGE": {
        const block = workspace.newBlock("facial_load_image");
        block.initSvg();
        block.render();
        return block;
      }

      case "FACIAL_GET_COUNT": {
        const block = workspace.newBlock("facial_get_count");

        // dropdown value from DB
        if (cfg.feature) {
          block.setFieldValue(cfg.feature, "FEATURE");
        }

        block.initSvg();
        block.render();
        return block;
      }
      case "FACIAL_GET_GENDER": {
        const block = workspace.newBlock("facial_get_gender");

        block.setFieldValue(cfg.gender || "male", "GENDER");

        block.initSvg();
        block.render();

        return block;
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

    /* ======================================
       1️⃣ Create Variables First
    ====================================== */
    blocks.forEach((row) => {
      const cfg = typeof row.block_config === 'string'
        ? JSON.parse(row.block_config)
        : row.block_config;

      if (cfg?.variable) {
        ensureVariable(workspace, cfg.variable);
      }
    });

    /* ======================================
       2️⃣ Create All Blocks (No Connections Yet)
    ====================================== */
    const blockMap: Record<number, Blockly.Block> = {};

    blocks.forEach((row) => {
      const block = createBlocklyBlock(workspace, row);
      if (!block) return;

      block.initSvg();
      block.render();

      blockMap[row.id] = block;
    });

    /* ======================================
       3️⃣ Handle Parent → Children Nesting
       (Proper stacking inside DO)
    ====================================== */

    // Get unique parents
    const parentIds = [...new Set(
      blocks.filter(b => b.parent_id).map(b => b.parent_id)
    )];

    parentIds.forEach((parentId) => {
      const parentBlock = blockMap[parentId];
      if (!parentBlock) return;

      const children = blocks
        .filter(b => b.parent_id === parentId)
        .sort((a, b) => a.block_order - b.block_order);

      if (children.length === 0) return;

      let previousChild: Blockly.Block | null = null;

      children.forEach((childRow, index) => {
        const childBlock = blockMap[childRow.id];
        if (!childBlock) return;

        if (index === 0) {
          const doInput = parentBlock.getInput("DO");

          if (
            doInput?.connection &&
            childBlock.previousConnection
          ) {
            doInput.connection.connect(childBlock.previousConnection);
          }
        } else {
          if (
            previousChild?.nextConnection &&
            childBlock.previousConnection
          ) {
            previousChild.nextConnection.connect(childBlock.previousConnection);
          }
        }

        previousChild = childBlock;
      });
    });

    /* ======================================
       4️⃣ Connect Top-Level Blocks Sequentially
    ====================================== */

    const topLevelBlocks = blocks
      .filter(b => !b.parent_id)
      .sort((a, b) => a.block_order - b.block_order);

    let previousTop: Blockly.Block | null = null;
    let y = 40;

    topLevelBlocks.forEach((row) => {
      const block = blockMap[row.id];
      if (!block) return;

      if (!previousTop) {
        block.moveBy(40, y);

        const svgBlock = block as Blockly.BlockSvg;
        const rect = svgBlock.getBoundingRectangle();
        const height = rect.bottom - rect.top;

        y += height + 30;
      } else {
        if (
          previousTop?.nextConnection &&
          block.previousConnection
        ) {
          previousTop.nextConnection.connect(block.previousConnection);
        }
      }

      previousTop = block;
    });

    /* ======================================
       5️⃣ Final Render Adjustments
    ====================================== */

    workspace.render();
    Blockly.svgResize(workspace);
    workspace.scrollCenter();

    debugLog('✅ Nested blocks loaded successfully');
  }


  useEffect(() => {
    defineBlocks();
    definePythonGenerators();
    defineJavascriptGenerators();

    if (!blocklyDiv.current) return;

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
      
      /* Prevent Blockly from blocking page scroll */
      .blocklyWidgetDiv, .blocklyDropDownDiv {
        pointer-events: auto !important;
      }
      
      /* Allow both Blockly interactions AND page scrolling */
      .blocklySvg {
        pointer-events: auto !important;
      }
      
      .blocklyBlockCanvas, .blocklyFlyout, .blocklyScrollbarHandle, 
      .blocklyZoom, .blocklyTrash, .blocklyToolboxDiv {
        pointer-events: auto !important;
      }
      
      /* Ensure flyout scrollbar works properly */
      .blocklyFlyoutScrollbar {
        pointer-events: auto !important;
      }
      
      /* Allow touch scrolling on mobile */
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

    // Override the native window.prompt for variable creation and renaming via DOM overlay
    Blockly.dialog.setPrompt(function(message, defaultValue, callback) {
      if (message.includes('New variable name')) {
         defaultValue = ''; 
      }
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)', zIndex: '99999', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      });
      
      const dialog = document.createElement('div');
      Object.assign(dialog.style, {
        background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
        padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        minWidth: '320px', fontFamily: 'sans-serif', border: '1px solid hsl(var(--border))'
      });
      
      const label = document.createElement('h3');
      label.textContent = message || 'Enter variable name:';
      Object.assign(label.style, { margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 'bold' });
      
      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue || 'myVar';
      Object.assign(input.style, {
        width: '100%', padding: '10px', marginBottom: '20px', 
        border: '1px solid hsl(var(--input))', borderRadius: '6px',
        background: 'hsl(var(--background))', color: 'hsl(var(--foreground))'
      });
      
      const btnRow = document.createElement('div');
      Object.assign(btnRow.style, { display: 'flex', justifyContent: 'flex-end', gap: '12px' });
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      Object.assign(cancelBtn.style, {
        padding: '8px 16px', border: '1px solid hsl(var(--border))', 
        background: 'transparent', borderRadius: '6px', cursor: 'pointer', color: 'hsl(var(--foreground))'
      });
      cancelBtn.onclick = () => { document.body.removeChild(overlay); callback(null); };
      
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      Object.assign(okBtn.style, {
        padding: '8px 16px', border: 'none', background: 'hsl(var(--primary))', 
        color: 'hsl(var(--primary-foreground))', borderRadius: '6px', cursor: 'pointer'
      });
      okBtn.onclick = () => { document.body.removeChild(overlay); callback(input.value); };
      
      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);
      dialog.appendChild(label);
      dialog.appendChild(input);
      dialog.appendChild(btnRow);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      input.focus();
      input.select();
    });

    // Listen for zoom changes
    const ws = workspace as Blockly.WorkspaceSvg;

    ws.addChangeListener((e: Blockly.Events.Abstract) => {
      if (e.type === Blockly.Events.VIEWPORT_CHANGE) {
        updateFlyoutScrollbars();
      }

      if (e.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
        requestAnimationFrame(() => {
          const wsSvg = ws as Blockly.WorkspaceSvg;

          Blockly.svgResize(wsSvg);

          (wsSvg as any).cachedContentBounds_ = null;

          (wsSvg as any).resizeContents?.();

          const scrollbar = (wsSvg as any).scrollbar;
          if (scrollbar) {
            scrollbar.resize();
            scrollbar.setVisible(false);
            scrollbar.setVisible(true);
          }

          const flyout = blocklyDiv.current
            ?.querySelector<HTMLElement>('.blocklyFlyout');

          const scrollbars = blocklyDiv.current
            ?.querySelectorAll<HTMLElement>('.blocklyFlyoutScrollbar');

          scrollbars?.forEach((scrollbar) => {
            const el = scrollbar as HTMLElement;

            if (!flyout || flyout.classList.contains('blocklyHidden')) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
            } else {
              el.style.display = '';
              el.style.visibility = '';
            }
          });

          (wsSvg as any).scroll?.(0, 0);
        });
      }
    });

    const updateFlyoutScrollbars = () => {
      const scrollbars = blocklyDiv.current
        ?.querySelectorAll<HTMLElement>('.blocklyFlyoutScrollbar');

      scrollbars?.forEach((el) => {
        const flyout = el.previousElementSibling as HTMLElement | null;

        if (
          !flyout ||
          flyout.classList.contains('blocklyHidden') ||
          flyout.style.display === 'none' ||
          !flyout.querySelector('.blocklyBlockCanvas')
        ) {
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
      if (!flyout || typeof MutationObserver === 'undefined') return;

      flyoutObserver?.disconnect();

      flyoutObserver = new MutationObserver(() => {
        updateFlyoutScrollbars();
      });

      flyoutObserver.observe(flyout, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true
      });
    };

    const preventToolboxScroll = () => {
      const toolboxDiv = blocklyDiv.current
        ?.querySelector<HTMLElement>('.blocklyToolboxDiv');

      if (toolboxDiv) {
        toolboxDiv.addEventListener(
          'wheel',
          (e: WheelEvent) => {
            e.stopPropagation();
          },
          { passive: false }
        );
      }
    };

    setTimeout(() => {
      preventToolboxScroll();
      attachFlyoutObserver();
      updateFlyoutScrollbars();
    }, 100);

    if (blocklyDiv.current) {
      containerObserver = new MutationObserver(() => {
        attachFlyoutObserver();
        updateFlyoutScrollbars();
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

      if (
  event.type === Blockly.Events.UI &&
  event instanceof Blockly.Events.Ui &&
  event.element === "click"
) {
  const block = workspace.getBlockById(event.blockId ?? "");
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

  // Scripts are already loaded via Next.js <Script> tags
  // Keeping this block as an empty useEffect if needed for other initialization
  useEffect(() => {
    // MediaPipe scripts moved to localized /js/ directory and loaded via <Script> components
  }, []);
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
  let tmModel = null;
  let tmWebcam = null;
  let tmLoadedImage = null;
  let tmClassNames: string[] = [];
  let tmModelMode: "tmImage" | "tfjs" | null = null;
  let currentPrediction = null;
  let currentConfidence = 0;
  let predictionInterval = null;
  let predictionAnimationId = null;

  // State tracking for auto-start
  let pendingPredictionConfig = null; // {type, src, outputCallback, containerRef}
  let isModelReady = false;
  let isWebcamReady = false;

  function checkAndStartPrediction() {
    if (!pendingPredictionConfig) return;

    const { type, src, outputCallback, containerRef } = pendingPredictionConfig;

    // Check if prerequisites are met
    if (src === "webcam") {
      if (isModelReady && isWebcamReady && tmModel && tmWebcam) {
        // Start prediction automatically
        outputCallback("ðŸŽ¯ Auto-starting prediction...");
        predictFromWebcam(type, outputCallback, containerRef);
        pendingPredictionConfig = null; // Clear pending
      } else if (isModelReady && tmModel && tmLoadedImage) {
        outputCallback("Webcam not ready. Running prediction from loaded image.");
        predictFromImage(type, outputCallback, containerRef);
        pendingPredictionConfig = null;
      }
    } else if (src === "image") {
      if (isModelReady && tmModel && tmLoadedImage) {
        outputCallback("ðŸŽ¯ Auto-starting prediction...");
        predictFromImage(type, outputCallback, containerRef);
        pendingPredictionConfig = null; // Clear pending
      }
    }
  }

  async function loadTeachableModel(url, outputCallback) {
    const normalizeModelUrls = (rawUrl: string) => {
      let input = (rawUrl || "").trim().replace(/^["']|["']$/g, "");
      if (!input) {
        return { modelURL: "", metadataURL: "" };
      }

      if (!/^https?:\/\//i.test(input)) {
        input = "https://" + input;
      }

      const lower = input.toLowerCase();
      if (lower.endsWith("model.json")) {
        return {
          modelURL: input,
          metadataURL: input.slice(0, -("model.json".length)) + "metadata.json",
        };
      }
      if (lower.endsWith("metadata.json")) {
        return {
          modelURL: input.slice(0, -("metadata.json".length)) + "model.json",
          metadataURL: input,
        };
      }

      const base = input.endsWith("/") ? input : input + "/";
      return {
        modelURL: base + "model.json",
        metadataURL: base + "metadata.json",
      };
    };

    const loadScript = (src: string, forceReload = false): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (existing && !forceReload) {
          if ((existing as any).dataset?.loaded === "true") {
            resolve();
            return;
          }
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = forceReload ? `${src}${src.includes("?") ? "&" : "?"}t=${Date.now()}` : src;
        script.async = true;
        script.onload = () => {
          (script as any).dataset.loaded = "true";
          resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const ensureTeachableReady = async () => {
      if (typeof window === "undefined") return false;

      const ensureCompatibleTfForTM = async () => {
        const version = String(window.tf?.version_core || "");
        // TM 0.8 models are commonly exported with very old tfjs-layers versions.
        // Load a TFJS 1.x runtime for the TM browser runtime if needed.
        if (version.startsWith("1.")) {
          await window.tf?.ready?.();
          return;
        }
        const tfCandidates = [
          "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js",
          "https://unpkg.com/@tensorflow/tfjs@1.7.4/dist/tf.min.js",
        ];
        for (const tfSrc of tfCandidates) {
          try {
            await loadScript(tfSrc, true);
            if (String(window.tf?.version_core || "").startsWith("1.")) {
              await window.tf?.ready?.();
              return;
            }
          } catch {
            // try next source
          }
        }
      };
      await ensureCompatibleTfForTM();

      if (window.tmImage?.load) return true;

      outputCallback("⏳ Loading Teachable Machine library...");
      const tmScriptCandidates = [
        "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js",
        "https://unpkg.com/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js",
        // Legacy filename fallback kept for compatibility with older mirrors.
        "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/tf-teachablemachine-image.min.js",
        "https://unpkg.com/@teachablemachine/image@0.8/dist/tf-teachablemachine-image.min.js",
      ];

      let loaded = false;
      for (const src of tmScriptCandidates) {
        try {
          await loadScript(src, true);
          loaded = true;
          break;
        } catch {
          // try next candidate
        }
      }
      if (!loaded) return false;

      let attempts = 0;
      while (!window.tmImage?.load && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 150));
        attempts++;
      }
      return !!window.tmImage?.load;
    };

    const ready = await ensureTeachableReady();
    if (!ready) {
      outputCallback("⚠️ Teachable Machine library failed to load. Continuing with TensorFlow.js fallback.");
    }

    try {
      isModelReady = false;
      tmModelMode = null;
      tmClassNames = [];
      const { modelURL, metadataURL } = normalizeModelUrls(url);
      if (!modelURL || !metadataURL) {
        outputCallback("❌ Invalid model URL.");
        return;
      }

      outputCallback("🔄 Loading model from: " + modelURL);

      if (ready && window.tmImage?.load) {
        try {
          tmModel = await window.tmImage.load(modelURL, metadataURL);
          tmModelMode = "tmImage";
        } catch (tmErr) {
          outputCallback("TM runtime load failed, trying TensorFlow fallback...");
          const metadataRes = await fetch(metadataURL);
          if (!metadataRes.ok) {
            throw new Error(`Failed to load metadata.json (${metadataRes.status})`);
          }
          const metadata = await metadataRes.json();
          tmClassNames = Array.isArray(metadata?.labels) ? metadata.labels : [];
          tmModel = await tf.loadLayersModel(modelURL);
          tmModelMode = "tfjs";
        }
      } else {
        const metadataRes = await fetch(metadataURL);
        if (!metadataRes.ok) {
          throw new Error(`Failed to load metadata.json (${metadataRes.status})`);
        }
        const metadata = await metadataRes.json();
        tmClassNames = Array.isArray(metadata?.labels) ? metadata.labels : [];
        tmModel = await tf.loadLayersModel(modelURL);
        tmModelMode = "tfjs";
      }
      if (typeof window !== 'undefined') window.tmModel = tmModel;
      isModelReady = true;
      const successMsg = "✅ Model loaded successfully!";
      outputCallback(successMsg);

      // Check if we can auto-start prediction
      checkAndStartPrediction();
    } catch (error) {
      const errorMsg = "❌ Failed to load model: " + error.message;
      alert(errorMsg);
      outputCallback(errorMsg);
      isModelReady = false;
    }
  }

  async function openTeachableImagePopup(outputCallback) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.src = reader.result;
          img.onload = () => {
            tmLoadedImage = img;
            if (typeof window !== 'undefined') window.tmLoadedImage = img;
            outputCallback("✅ Image loaded successfully!");
            checkAndStartPrediction(); // Auto-start pending prediction
            resolve(true);
          };
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  async function startTeachableWebcam(containerRef, outputCallback) {
    if (!window.tmImage || !window.tmImage.Webcam) {
      const msg = "Teachable Machine not loaded yet. Please wait 1â€“2 seconds and run again.";
      alert(msg);
      outputCallback(msg);
      return;
    }

    try {
      isWebcamReady = false;

      // Stop old webcam if exists
      if (tmWebcam) {
        try {
          tmWebcam.stop();
          if (tmWebcam._animationId) {
            cancelAnimationFrame(tmWebcam._animationId);
          }
        } catch { }
        tmWebcam = null;
      }

      outputCallback("ðŸ“¹ Starting webcam...");

      tmWebcam = new window.tmImage.Webcam(400, 400, true);
      await tmWebcam.setup();
      await tmWebcam.play();

      // Wait a brief moment for webcam to fully initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      containerRef.current.innerHTML = "";

      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "10px";

      tmWebcam.canvas.style.width = "100%";
      tmWebcam.canvas.style.maxWidth = "420px";
      tmWebcam.canvas.style.borderRadius = "12px";
      tmWebcam.canvas.style.display = "block";

      wrapper.appendChild(tmWebcam.canvas);
      containerRef.current.appendChild(wrapper);

      isWebcamReady = true;
      outputCallback("âœ… Webcam started successfully!");

      // Keep webcam updating continuously
      let animationId;
      function loop() {
        if (tmWebcam) {
          tmWebcam.update();
          animationId = requestAnimationFrame(loop);
        }
      }
      loop();

      // Store animation ID for cleanup
      tmWebcam._animationId = animationId;

      // Check if we can auto-start prediction
      checkAndStartPrediction();
    } catch (error) {
      const errorMsg = "âŒ Webcam error: " + error.message;
      alert(errorMsg);
      outputCallback(errorMsg);
      isWebcamReady = false;
    }
  }

  async function loadAndShowImage(containerRef, outputCallback) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            tmLoadedImage = img;
            if (typeof window !== 'undefined') window.tmLoadedImage = img;

            containerRef.current.innerHTML = "";

            const displayImg = document.createElement("img");
            displayImg.src = event.target.result;
            displayImg.style.width = "100%";
            displayImg.style.maxWidth = "420px";
            displayImg.style.borderRadius = "12px";
            displayImg.style.display = "block";
            displayImg.style.margin = "auto";

            containerRef.current.appendChild(displayImg);

            outputCallback("âœ… Image loaded successfully!");
            checkAndStartPrediction();
            resolve();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }
  function showTeachableImageSourcePicker(containerRef, outputCallback) {
    if (typeof window === "undefined") return;

    const existing = document.getElementById("tm-image-picker-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "tm-image-picker-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.56);
      padding: 16px;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width: min(90vw, 560px);
      max-height: 90vh;
      overflow: auto;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
      padding: 18px;
    `;

    const title = document.createElement("div");
    title.textContent = "Select image source";
    title.style.cssText = "font-size:18px;font-weight:700;color:#111827;margin-bottom:8px;";
    modal.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.textContent = "Choose from device or capture photo, then click Use This Image.";
    subtitle.style.cssText = "font-size:13px;color:#4b5563;margin-bottom:14px;";
    modal.appendChild(subtitle);

    const previewWrap = document.createElement("div");
    previewWrap.style.cssText = "min-height:120px;display:flex;align-items:center;justify-content:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:10px;";
    previewWrap.textContent = "No image selected yet.";
    modal.appendChild(previewWrap);

    let selectedDataUrl = "";
    let stream: MediaStream | null = null;
    let captureRow: HTMLDivElement | null = null;

    const stopStream = () => {
      if (!stream) return;
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const closeModal = () => {
      stopStream();
      overlay.remove();
    };

    const showPreview = (dataUrl: string) => {
      selectedDataUrl = dataUrl;
      previewWrap.innerHTML = "";
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.cssText = "max-width:100%;max-height:340px;border-radius:10px;display:block;";
      previewWrap.appendChild(img);
    };

    const baseBtn = "padding:10px 14px;border-radius:8px;border:none;font-weight:600;cursor:pointer;";
    const actionRow = document.createElement("div");
    actionRow.style.cssText = "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;";

    const deviceBtn = document.createElement("button");
    deviceBtn.textContent = "Choose from Device";
    deviceBtn.style.cssText = `${baseBtn}background:#16a34a;color:#fff;`;

    const cameraBtn = document.createElement("button");
    cameraBtn.textContent = "Use Camera";
    cameraBtn.style.cssText = `${baseBtn}background:#0284c7;color:#fff;`;

    const useBtn = document.createElement("button");
    useBtn.textContent = "Use This Image";
    useBtn.style.cssText = `${baseBtn}background:#7c3aed;color:#fff;`;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `${baseBtn}background:#f3f4f6;color:#111827;border:1px solid #d1d5db;`;

    const openDevicePicker = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = String(event.target?.result || "");
          if (!data) return;
          stopStream();
          if (captureRow) {
            captureRow.remove();
            captureRow = null;
          }
          showPreview(data);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };

    const openCameraPreview = async () => {
      stopStream();
      if (captureRow) {
        captureRow.remove();
        captureRow = null;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch (error: any) {
        outputCallback("Camera access failed: " + (error?.message || "permission denied"));
        return;
      }

      previewWrap.innerHTML = "";
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.style.cssText = "max-width:100%;max-height:340px;border-radius:10px;display:block;background:#000;";
      previewWrap.appendChild(video);

      captureRow = document.createElement("div");
      captureRow.style.cssText = "display:flex;justify-content:center;margin-top:10px;";
      const captureBtn = document.createElement("button");
      captureBtn.textContent = "Capture Photo";
      captureBtn.style.cssText = `${baseBtn}background:#2563eb;color:#fff;`;
      captureBtn.onclick = () => {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 400;
        const h = video.videoHeight || 400;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");
        stopStream();
        if (captureRow) {
          captureRow.remove();
          captureRow = null;
        }
        showPreview(dataUrl);
      };
      captureRow.appendChild(captureBtn);
      modal.appendChild(captureRow);
    };

    deviceBtn.onclick = openDevicePicker;
    cameraBtn.onclick = openCameraPreview;
    cancelBtn.onclick = closeModal;
    useBtn.onclick = () => {
      if (!selectedDataUrl) {
        outputCallback("Please choose or capture an image first.");
        return;
      }

      const img = new Image();
      img.onload = () => {
        tmLoadedImage = img;
        if (typeof window !== "undefined") window.tmLoadedImage = img;

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          const displayImg = document.createElement("img");
          displayImg.src = selectedDataUrl;
          displayImg.style.width = "100%";
          displayImg.style.maxWidth = "420px";
          displayImg.style.borderRadius = "12px";
          displayImg.style.display = "block";
          displayImg.style.margin = "auto";
          containerRef.current.appendChild(displayImg);
        }

        outputCallback("Image loaded successfully!");
        closeModal();
        checkAndStartPrediction();
      };
      img.src = selectedDataUrl;
    };

    actionRow.appendChild(deviceBtn);
    actionRow.appendChild(cameraBtn);
    actionRow.appendChild(useBtn);
    actionRow.appendChild(cancelBtn);
    modal.appendChild(actionRow);

    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    outputCallback("Select image source popup opened.");
  }

  let isPredicting = false;

  async function predictFromWebcam(type, outputCallback, containerRef) {
    // If not ready yet, save config for auto-start
    if (!tmModel || !tmWebcam || !isModelReady || !isWebcamReady) {
      if (tmModel && isModelReady && tmLoadedImage) {
        outputCallback("Webcam not ready. Using loaded image for prediction.");
        await predictFromImage(type, outputCallback, containerRef);
        return;
      }
      outputCallback("â³ Waiting for model and webcam to be ready...");
      pendingPredictionConfig = { type, src: "webcam", outputCallback, containerRef };
      checkAndStartPrediction(); // Try immediately in case it just became ready
      return;
    }

    // Stop any existing prediction loop
    if (predictionInterval) {
      clearInterval(predictionInterval);
    }
    if (predictionAnimationId) {
      cancelAnimationFrame(predictionAnimationId);
    }
    isPredicting = false;

    outputCallback(`ðŸ”„ Starting ${type} prediction from webcam...`);
    isPredicting = true;

    async function loop() {
      if (!isPredicting || !tmWebcam || !tmModel) {
        predictionAnimationId = null;
        return;
      }

      try {
        tmWebcam.update();
        const predictions = await predictTeachableFromSource(tmWebcam.canvas);
        showPredictionResult(predictions, type, outputCallback, containerRef);
        predictionAnimationId = requestAnimationFrame(loop);
      } catch (error) {
        outputCallback("âŒ Prediction error: " + error.message);
        isPredicting = false;
        predictionAnimationId = null;
      }
    }

    loop();
  }

  async function predictFromImage(type, outputCallback, containerRef) {

    if (!tmModel || !tmLoadedImage || !isModelReady) {
      outputCallback("⏳ Waiting for model and image...");
      pendingPredictionConfig = { type, src: "image", outputCallback, containerRef };
      return;
    }

    try {
      outputCallback(`🔄 Predicting ${type}...`);

      const predictions = await predictTeachableFromSource(tmLoadedImage);

      showPredictionResult(predictions, type, outputCallback, containerRef);

    } catch (error) {
      outputCallback("❌ Prediction error: " + error.message);
    }
  }


  let lastConsoleOutputTime = 0;
  const CONSOLE_OUTPUT_INTERVAL = 2000; // Output to console every 2 seconds

  function showPredictionResult(predictions, type, outputCallback, containerRef) {

    if (!predictions || predictions.length === 0) {
      outputCallback("❌ No predictions received.");
      return;
    }

    // Sort highest probability first
    predictions.sort((a, b) => b.probability - a.probability);

    const top = predictions[0];
    currentPrediction = top.className;
    currentConfidence = top.probability;

    // Update/append prediction card without wiping current media preview.
    const existingResult = containerRef.current.querySelector("#tm-result");

    // Create result container
    const resultDiv = document.createElement("div");
    resultDiv.id = "tm-result";
    resultDiv.style.marginTop = "16px";
    resultDiv.style.padding = "20px";
    resultDiv.style.fontSize = "16px";
    resultDiv.style.fontWeight = "bold";
    resultDiv.style.textAlign = "center";
    resultDiv.style.backgroundColor = "#ffffff";
    resultDiv.style.borderRadius = "12px";
    resultDiv.style.border = "1px solid #e0e0e0";
    resultDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
    resultDiv.style.maxWidth = "500px";
    resultDiv.style.marginLeft = "auto";
    resultDiv.style.marginRight = "auto";

    // Generate dynamic bars (NO hardcoded logic)
    const predictionBars = predictions.map((p, index) => {
      const percentage = (p.probability * 100).toFixed(1);

      // Dynamic color using HSL
      const hue = (index * 60) % 360;
      const barColor = `hsl(${hue}, 70%, 50%)`;

      return `
      <div style="margin: 10px 0; text-align: left;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
          <span>${p.className}</span>
          <span><b>${percentage}%</b></span>
        </div>
        <div style="width: 100%; background: #E0E0E0; border-radius: 8px; height: 18px; overflow: hidden;">
          <div style="
            width: ${percentage}%;
            background: ${barColor};
            height: 100%;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
    `;
    }).join("");

    resultDiv.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 10px;">
      🎯 ${type.toUpperCase()} PREDICTION
    </div>

    <div style="font-size: 22px; margin-bottom: 6px; color: #333;">
      <b>${currentPrediction}</b>
    </div>

    <div style="font-size: 14px; margin-bottom: 15px; color: #666;">
      Confidence: ${(currentConfidence * 100).toFixed(1)}%
    </div>

    ${predictionBars}
  `;

    // Replace existing or append new
    if (existingResult) {
      containerRef.current.replaceChild(resultDiv, existingResult);
    } else {
      containerRef.current.appendChild(resultDiv);
    }

    // Console output (clean, dynamic)
    const now = Date.now();
    if (now - lastConsoleOutputTime > CONSOLE_OUTPUT_INTERVAL) {
      lastConsoleOutputTime = now;

      const consoleOutput = `
🎯 ${type.toUpperCase()} PREDICTION:
${currentPrediction} (${(currentConfidence * 100).toFixed(1)}%)
    `.trim();

      outputCallback(consoleOutput);
    }
  }


  function predictTeachableAudio() {
    alert("Audio model support can be added similarly using tmAudio");
  }

  /* =========================
     AI LEARNING - GLOBAL VARIABLES (declared at module level above component)
  ========================= */

  async function processCommandQueue() {
    if (isProcessingQueue || commandQueue.length === 0) return;

    isProcessingQueue = true;

    while (commandQueue.length > 0) {
      const command = commandQueue.shift();
      await command();
    }

    isProcessingQueue = false;
  }

  /* =========================
     FACIAL FEATURE FUNCTIONS
  ========================= */

  async function loadFacialImage(containerRef, outputCallback) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = async () => {
            facialImage = img;

            // Wait for face-api.js to load
            if (typeof faceapi === 'undefined') {
              outputCallback("â³ Waiting for face-api.js to load...");
              let attempts = 0;
              while (typeof faceapi === 'undefined' && attempts < 50) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
              }

              if (typeof faceapi === 'undefined') {
                outputCallback("âŒ Error: face-api.js failed to load. Please refresh the page.");
                resolve();
                return;
              }
            }

            // Load face-api models if not loaded
            try {
              if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                outputCallback("Loading face detection models... (this may take 10-20 seconds)");

                // Load models from local path
                const MODEL_URL = '/models';

                let modelsLoaded = false;
                try {
                  await Promise.race([
                    Promise.all([
                      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
                    ]),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Model loading timeout')), 30000))
                  ]);
                  modelsLoaded = true;
                } catch (err) {
                  console.warn(`Failed to load models from ${MODEL_URL}:`, err);
                }

                if (!modelsLoaded) {
                  outputCallback("âŒ Failed to load face detection models from all CDN sources. Please check your internet connection and try again.");
                  facialDetections = [];
                  resolve();
                  return;
                }
              }

              // Detect faces
              outputCallback("Detecting faces...");
              console.log("Starting face detection...");
              console.log("Image size:", img.width, "x", img.height);
              console.log("TinyFaceDetector loaded:", faceapi.nets.tinyFaceDetector.isLoaded);

              const detections = await Promise.race([
                faceapi
                  .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                  .withFaceLandmarks()
                  .withFaceExpressions()
                  .withAgeAndGender(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Face detection timeout')), 10000))
              ]);

              console.log("Detection complete, found:", detections.length, "faces");
              facialDetections = detections;
              outputCallback(`âœ… Image loaded! Found ${detections.length} face(s)`);
            } catch (err) {
              console.error("Face detection error:", err);
              outputCallback(`âŒ Error: ${err.message}. Please try with a smaller image or refresh the page.`);
              facialDetections = [];
            }

            resolve();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  function showFacialImage(containerRef, withBorder, outputCallback, countsToDisplay = null) {
    if (!facialImage) {
      outputCallback("âŒ No image loaded");
      return;
    }

    containerRef.current.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = facialImage.width;
    canvas.height = facialImage.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(facialImage, 0, 0);

    if (withBorder && facialDetections.length > 0) {
      // Draw rectangles around faces
      facialDetections.forEach(detection => {
        const box = detection.detection.box;
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw age and gender
        ctx.fillStyle = "#00FF00";
        ctx.font = "16px Arial";
        const gender = detection.gender;
        const age = Math.round(detection.age);
        ctx.fillText(`${gender}, ${age}y`, box.x, box.y - 10);
      });
    }


    // Display counts on canvas if provided
    if (countsToDisplay && countsToDisplay.length > 0) {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.font = "bold 24px Arial";

      let yOffset = 40;
      countsToDisplay.forEach(countInfo => {
        const text = `${countInfo.label}: ${countInfo.count}`;
        // Draw text outline (stroke) for better visibility
        ctx.strokeText(text, 20, yOffset);
        // Draw text fill
        ctx.fillText(text, 20, yOffset);
        yOffset += 35;
      });
    }

    canvas.style.maxWidth = "100%";
    canvas.style.borderRadius = "12px";
    canvas.style.display = "block";
    canvas.style.margin = "auto";

    containerRef.current.appendChild(canvas);
    outputCallback("âœ… Image displayed");
  }

  /* =========================
     OBJECT DETECTION FUNCTIONS
  ========================= */

  async function loadObjectImage(containerRef, outputCallback) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();

        reader.onload = async (event: any) => {
          const img = new Image();

          img.onload = async () => {
            objectImage = img;
            containerRef.current.innerHTML = "";
            outputCallback("✅ Image loaded!");

            try {
              outputCallback("🔄 Initializing TensorFlow...");

              // Force backend (IMPORTANT for Next.js)
              await tf.setBackend("webgl");
              await tf.ready();

              outputCallback(`🔄 Backend ready: ${tf.getBackend()}`);

              // Load model once
              if (!cocoModel) {
                outputCallback("🔄 Loading COCO-SSD model...");
                cocoModel = await cocoSsd.load({
                  base: "lite_mobilenet_v2",
                });
                outputCallback("✅ Model loaded!");
              }

              // Run detection
              outputCallback("🔄 Detecting objects...");
              const predictions = await cocoModel.detect(img);

              objectDetections = predictions;

              outputCallback(
                `✅ Detection completed! Found ${predictions.length} objects.`
              );
            } catch (err: any) {
              console.error("Detection error:", err);
              outputCallback(`❌ Detection failed: ${err.message}`);
            }

            resolve(null);
          };

          img.onerror = () => {
            outputCallback("❌ Failed to load image.");
            resolve(null);
          };

          img.src = event.target.result;
        };

        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  function showObjectImage(containerRef, withBorder, outputCallback) {
    if (!objectImage) {
      outputCallback("❌ No image loaded.");
      return;
    }

    containerRef.current.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = objectImage.width;
    canvas.height = objectImage.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(objectImage, 0, 0);

    if (withBorder && objectDetections.length > 0) {
      objectDetections.forEach((detection) => {
        const [x, y, width, height] = detection.bbox;

        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = "#FF0000";
        ctx.font = "16px Arial";
        ctx.fillText(
          `${detection.class} (${Math.round(detection.score * 100)}%)`,
          x,
          y > 10 ? y - 5 : 10
        );
      });
    }

    canvas.style.maxWidth = "100%";
    canvas.style.borderRadius = "12px";
    canvas.style.display = "block";
    canvas.style.margin = "auto";

    containerRef.current.appendChild(canvas);

    outputCallback("✅ Image displayed.");
  }

  /* =========================
     FACE RECOGNITION FUNCTIONS
  ========================= */

  async function loadFaceRecogImage(containerRef, outputCallback) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = () => {
            faceRecogImage = img;
            outputCallback("âœ… Image loaded!");
            resolve();
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  async function predictFaceRecog(outputCallback) {
    if (!faceRecogImage) {
      outputCallback("âŒ No image loaded");
      return;
    }

    // Wait for face-api.js to load
    if (typeof faceapi === 'undefined') {
      outputCallback("â³ Waiting for face-api.js to load...");
      let attempts = 0;
      while (typeof faceapi === 'undefined' && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (typeof faceapi === 'undefined') {
        outputCallback("âŒ Error: face-api.js failed to load. Please refresh the page.");
        return;
      }
    }

    try {
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        outputCallback("Loading face detection models... (this may take 10-20 seconds)");

        // Load models from local path
        const MODEL_URL = '/models';

        let modelsLoaded = false;
        try {
          await Promise.race([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Model loading timeout')), 30000))
          ]);
          modelsLoaded = true;
        } catch (err) {
          console.warn(`Failed to load models from ${MODEL_URL}:`, err);
        }

        if (!modelsLoaded) {
          outputCallback("âŒ Failed to load face detection models. Please check your internet connection and try again.");
          return;
        }
      }

      outputCallback("Detecting faces...");
      const detections = await Promise.race([
        faceapi.detectAllFaces(faceRecogImage, new faceapi.TinyFaceDetectorOptions()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Face detection timeout')), 10000))
      ]);

      const faceCount = detections.length;
      if (faceCount > 0) {
        faceRecogResult = `Face Detected - ${faceCount} face(s) found`;
        outputCallback(`âœ… ${faceRecogResult}`);

      } else {
        faceRecogResult = "No Face Detected";
        outputCallback(`âŒ ${faceRecogResult}`);
      }
    } catch (err) {
      outputCallback(`âŒ Error: ${err.message}. Please try with a smaller image or refresh the page.`);
      console.error("Face detection error:", err);
    }
  }

  function showFaceRecogImage(containerRef, withBorder, outputCallback) {
    if (!faceRecogImage) {
      outputCallback("âŒ No image loaded");
      return;
    }

    containerRef.current.innerHTML = "";

    const img = document.createElement("img");
    img.src = faceRecogImage.src;
    img.style.maxWidth = "100%";
    img.style.borderRadius = "12px";
    img.style.display = "block";
    img.style.margin = "auto";

    containerRef.current.appendChild(img);
    outputCallback("âœ… Image displayed");
  }

  /* =========================
     FINGER DETECTION FUNCTIONS
  ========================= */

  async function startFingerDetection(
    blocklyDivRef,
    canvasContainerRef,
    outputCallback
  ) {
    console.log("[MediaPipe] startFingerDetection called");
    if (isDetectionRunningRef.current) {
      console.log("[MediaPipe] Detection already running");
      return;
    }

    let attempts = 0;
    if (!window.Hands || (!window.Camera && !window.CameraUtils && !window.mediaPipe?.Camera)) {
      console.log("[MediaPipe] Objects missing, waiting...", { 
        Hands: !!window.Hands, 
        Camera: !!window.Camera, 
        CameraUtils: !!window.CameraUtils,
        mediaPipeCamera: !!window.mediaPipe?.Camera
      });
      outputCallback("⏳ Waiting for MediaPipe...");
      while ((!window.Hands || (!window.Camera && !window.CameraUtils && !window.mediaPipe?.Camera)) && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }

    const cameraClass = window.Camera || window.CameraUtils || window.mediaPipe?.Camera;

    console.log("[MediaPipe] Readiness check results:", { 
      Hands: !!window.Hands, 
      CameraClass: !!cameraClass,
      attempts 
    });

    if (!window.Hands || !cameraClass) {
      console.error("[MediaPipe] Failed to load global objects");
      outputCallback("❌ MediaPipe failed to load. Please refresh.");
      return;
    }

    try {
      outputCallback("📹 Opening camera...");
      isDetectionRunningRef.current = true;

      // Ensure Blockly container allows overlay
      blocklyDivRef.current.style.position = "relative";

      // Create popup wrapper
      const wrapper = document.createElement("div");
      wrapper.style.position = "absolute";
      wrapper.style.top = "20px";
      wrapper.style.right = "20px";
      wrapper.style.width = "300px";
      wrapper.style.zIndex = "9999";
      wrapper.style.borderRadius = "12px";
      wrapper.style.overflow = "hidden";
      wrapper.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      wrapper.style.background = "#000";

      cameraWrapperRef.current = wrapper;

      // Video
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = "100%";

      // Canvas overlay
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      wrapper.appendChild(video);
      wrapper.appendChild(canvas);
      blocklyDivRef.current.appendChild(wrapper);

      const ctx = canvas.getContext("2d");

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      // Create Hands instance once
      if (!handsRef.current) {
        console.log("[MediaPipe] Creating new Hands instance");
        handsRef.current = new window.Hands({
          locateFile: (file) => {
            const path = `${window.location.origin}/js/${file}`;
            console.log(`[MediaPipe] Internal fetch: ${file} -> ${path}`);
            return path;
          }
        });

        handsRef.current.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6
        });
      }

      handsRef.current.onResults((results) => {
        fingerResultsRef.current = results;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS);
            window.drawLandmarks(ctx, landmarks);
          }
        }
      });

      // Start Camera
      cameraRef.current = new cameraClass(video, {
        onFrame: async () => {
          if (handsRef.current) {
            await handsRef.current.send({ image: video });
          }
        },
        width: 640,
        height: 480
      });

      cameraRef.current.start();

      outputCallback("✅ Camera started & hand detection running!");
    } catch (err) {
      outputCallback("❌ Camera error: " + err.message);
    }
  }

  function stopFingerDetection(canvasContainerRef, outputCallback) {
    if (!isDetectionRunningRef.current) return;

    // Stop interval
    if (fingerIntervalRef.current) {
      clearInterval(fingerIntervalRef.current);
      fingerIntervalRef.current = null;
    }

    // Stop camera
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    // Close hands
    if (handsRef.current) {
      handsRef.current.close?.();
      handsRef.current = null;
    }

    // Stop video tracks
    const video = document.querySelector("video");
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }

    // Remove popup
    if (cameraWrapperRef.current) {
      cameraWrapperRef.current.remove();
      cameraWrapperRef.current = null;
    }

    // Clear output container
    if (canvasContainerRef?.current) {
      canvasContainerRef.current.innerHTML = "";
    }

    isDetectionRunningRef.current = false;

    outputCallback("🛑 Hand detection stopped");
  }

  /* =========================
     COMPUTER VISION (OPENCV) FUNCTIONS
  ========================= */

  async function loadCVImage(containerRef, outputCallback) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      // Resolve if user cancels the file picker
      const onFocus = () => {
        window.removeEventListener("focus", onFocus);
        setTimeout(() => {
          if (!input.files || input.files.length === 0) {
            outputCallback("⚠️ No file selected.");
            resolve();
          }
        }, 500);
      };
      window.addEventListener("focus", onFocus);

      input.onchange = async (e) => {
        window.removeEventListener("focus", onFocus);
        const file = e.target.files[0];
        if (!file) {
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = async () => {
            cvImage = img;

            // Wait for OpenCV to be fully initialized
            if (!isCvReady()) {
              outputCallback("⏳ Waiting for OpenCV to load...");
            }
            const timeout = new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 60000)
            );
            try {
              await Promise.race([cvReady, timeout]);
            } catch {
              outputCallback("❌ OpenCV failed to load. Please refresh the page and wait a few seconds before running.");
              resolve();
              return;
            }

            // Convert to OpenCV Mat
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            if (cvMat) {
              try { cvMat.delete(); } catch (_) { }
            }
            cvMat = window.cv.imread(canvas);

            outputCallback("✅ Image loaded! (" + img.width + "x" + img.height + ")");
            resolve();
          };
          img.onerror = () => {
            outputCallback("❌ Failed to load image file.");
            resolve();
          };
          img.src = event.target.result;
        };
        reader.onerror = () => {
          outputCallback("❌ Failed to read file.");
          resolve();
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  function applyCVOperations(operations, containerRef, outputCallback) {
    if (!cvMat || !window.cv) {
      outputCallback("âŒ No image loaded or OpenCV not ready");
      return;
    }

    // Apply operations to mat
    // Operations are stored and applied when show/save is called
  }

  function showCVImage(containerRef, name, outputCallback) {
    if (!cvMat || !window.cv) {
      outputCallback("❌ Show Image: no image loaded. Use Load Image first.");
      return;
    }
    try {
      containerRef.current.innerHTML = "";
      const canvas = document.createElement("canvas");
      window.cv.imshow(canvas, cvMat);
      canvas.style.maxWidth = "100%";
      canvas.style.borderRadius = "12px";
      canvas.style.display = "block";
      canvas.style.margin = "auto";
      containerRef.current.appendChild(canvas);
      outputCallback(`✅ Image displayed as: ${name}`);
    } catch (err) {
      outputCallback(`❌ Show Image error: ${err.message}`);
    }
  }

  function saveCVImage(name, outputCallback) {
    if (!cvMat || !window.cv) {
      outputCallback("❌ Save Image: no image loaded. Use Load Image first.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      window.cv.imshow(canvas, cvMat);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name || "image.png";
        a.click();
        outputCallback(`✅ Image saved as: ${name}`);
      });
    } catch (err) {
      outputCallback(`❌ Save Image error: ${err.message}`);
    }
  }

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
    // Stop sprite / HTML video webcams
    const videos = document.querySelectorAll("video");
    videos.forEach(v => {
      if (v?.srcObject) {
        v.srcObject.getTracks().forEach(t => t.stop());
        v.srcObject = null;
      }
    });

    // Stop Teachable Machine webcam
    if (tmWebcam) {
      try {
        tmWebcam.stop();
        if (tmWebcam._animationId) {
          cancelAnimationFrame(tmWebcam._animationId);
        }
      } catch (e) {
        console.warn("TM webcam already stopped");
      }
      tmWebcam = null;
    }

    // Stop predictions
    isPredicting = false;
    if (predictionInterval) {
      clearInterval(predictionInterval);
      predictionInterval = null;
    }
    if (predictionAnimationId) {
      cancelAnimationFrame(predictionAnimationId);
      predictionAnimationId = null;
    }

    // Reset state flags
    isModelReady = false;
    isWebcamReady = false;
    pendingPredictionConfig = null;

    // Clear model and loaded image
    tmModel = null;
    tmLoadedImage = null;

    // Remove prediction results
    const resultDiv = document.getElementById("tm-result");
    if (resultDiv) {
      resultDiv.remove();
    }
    const pickerOverlay = document.getElementById("tm-image-picker-overlay");
    if (pickerOverlay) {
      pickerOverlay.remove();
    }
  }

  async function predictTeachableFromSource(source: HTMLImageElement | HTMLCanvasElement) {
    if (!tmModel || !tmModelMode) {
      throw new Error("Model not ready");
    }

    if (tmModelMode === "tmImage") {
      return tmModel.predict(source);
    }

    const rawScores = tf.tidy(() => {
      const inputShape = tmModel.inputs?.[0]?.shape || [null, 224, 224, 3];
      const targetH = Number(inputShape[1]) || 224;
      const targetW = Number(inputShape[2]) || 224;

      let tensor = tf.browser.fromPixels(source).toFloat();
      tensor = tf.image.resizeBilinear(tensor, [targetH, targetW]);
      tensor = tensor.div(127.5).sub(1);

      const batched = tensor.expandDims(0);
      const output = tmModel.predict(batched) as tf.Tensor | tf.Tensor[];
      const primary = Array.isArray(output) ? output[0] : output;
      return Array.from(primary.dataSync() as Float32Array);
    });

    let probs = rawScores.map((v) => Number(v));
    const sum = probs.reduce((a, b) => a + b, 0);
    const alreadyProbabilities =
      sum > 0.99 &&
      sum < 1.01 &&
      probs.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);

    if (!alreadyProbabilities) {
      const max = Math.max(...probs);
      const exps = probs.map((v) => Math.exp(v - max));
      const expSum = exps.reduce((a, b) => a + b, 0) || 1;
      probs = exps.map((v) => v / expSum);
    }

    return probs.map((probability, i) => ({
      className: tmClassNames[i] ?? `Class ${i + 1}`,
      probability,
    }));
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
    // Reset command queue
    commandQueue = [];
    isProcessingQueue = false;
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
      // ✅ Sync real resolution AFTER append
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const turtleDiv = document.createElement("div");
      turtleDiv.id = "turtleCanvas";
      turtleDiv.style.width = "100%";
      turtleDiv.style.height = "500px";
      turtleDiv.style.border = "2px solid #5566AA";
      turtleDiv.style.borderRadius = "8px";
      turtleDiv.style.backgroundColor = "#ffffff";
      turtleDiv.style.position = "relative";
      canvasContainerRef.current.appendChild(turtleDiv);
      // Turtle graphics config MUST be before import turtle
      Sk.TurtleGraphics = Sk.TurtleGraphics || {};
      Sk.TurtleGraphics.target = "turtleCanvas";
      Sk.TurtleGraphics.width = 800;
      Sk.TurtleGraphics.height = 500;
    }
    let pendingPlot = null;
    let plotLabels = { x: "", y: "" };
    // Add AI Learning helper functions to Skulpt
    // Handler for AI Learning commands
    async function handleAICommand(cleanText, containerRef, setOutput) {
      // Facial Features
      if (cleanText === "__FACIAL_LOAD_IMAGE__") {
        await loadFacialImage(containerRef, (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      if (cleanText.startsWith("__FACIAL_GET_COUNT__:")) {
        const feature = cleanText.split(":")[1];
        let count = 0;
        if (!facialDetections || facialDetections.length === 0) {
          setOutput(prev => prev + `\n${feature} count: 0`);
          canvasContainerRef.current.innerHTML = "<div>No faces detected</div>";
          return;
        }
        if (feature === "face") {
          count = facialDetections.length;
        } else if (feature === "eye") {
          facialDetections.forEach(d => {
            if (d.landmarks) count += 2;
          });
        } else if (feature === "nose") {
          facialDetections.forEach(d => {
            if (d.landmarks) count += 1;
          });
        } else if (feature === "smile") {
          facialDetections.forEach(d => {
            if (d.expressions && d.expressions.happy > 0.5) count++;
          });
        }
        setOutput(prev => prev + `\n${feature} count: ${count}`);
        canvasContainerRef.current.innerHTML = `<div>${feature} count: ${count}</div>`;
        return;
      }
      if (cleanText.startsWith("__FACIAL_GET_GENDER__:")) {
        const gender = cleanText.split(":")[1];
        let count = 0;
        if (!facialDetections || facialDetections.length === 0) {
          setOutput(prev => prev + `\n${gender} count: 0`);
          return;
        }
        facialDetections.forEach(d => {
          if (d.gender && d.gender === gender) count++;
        });
        setOutput(prev => prev + `\n${gender} count: ${count}`);
        canvasContainerRef.current.innerHTML = `<div>${gender} count: ${count}</div>`;
        return;
      }
      if (cleanText.startsWith("__FACIAL_GET_EXPRESSION__:")) {
        const expression = cleanText.split(":")[1];
        let count = 0;
        if (!facialDetections || facialDetections.length === 0) {
          setOutput(prev => prev + `\n${expression} count: 0`);
          return;
        }
        facialDetections.forEach(d => {
          if (d.expressions && d.expressions[expression] > 0.5) count++;
        });
        setOutput(prev => prev + `\n${expression} count: ${count}`);
        canvasContainerRef.current.innerHTML = `<div>${expression} count: ${count}</div>`;
        return;
      }
      if (cleanText === "__FACIAL_GET_AGE_LIST__") {
        if (!facialDetections || facialDetections.length === 0) {
          setOutput(prev => prev + `\nAge list: []`);
          return;
        }
        const ages = facialDetections.map(d => Math.round(d.age || 0));
        setOutput(prev => prev + `\nAge list: [${ages.join(", ")}]`);
        canvasContainerRef.current.innerHTML = `<div>Age list: [${ages.join(", ")}]</div>`;
        return;
      }
      if (cleanText.startsWith("__FACIAL_SHOW__:")) {
        const border = cleanText.split(":")[1];
        showFacialImage(containerRef, border === "with", (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      // Object Detection
      if (cleanText === "__OBJECT_LOAD_IMAGE__") {
        await loadObjectImage(containerRef, (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      if (cleanText.startsWith("__OBJECT_GET_COUNT__:")) {
        const object = cleanText.split(":")[1];
        let count = 0;
        if (!objectDetections || objectDetections.length === 0) {
          setOutput(prev => prev + `\n${object} count: 0`);
          return;
        }
        objectDetections.forEach(d => {
          if (d.class === object) count++;
        });
        setOutput(prev => prev + `\n${object} count: ${count}`);
        return;
      }
      if (cleanText.startsWith("__OBJECT_SHOW__:")) {
        const border = cleanText.split(":")[1];
        showObjectImage(containerRef, border === "with", (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      // Face Recognition
      if (cleanText === "__FACERECOG_LOAD_IMAGE__") {
        await loadFaceRecogImage(containerRef, (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      if (cleanText === "__FACERECOG_PREDICT__") {
        await predictFaceRecog((msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      if (cleanText.startsWith("__FACERECOG_SHOW__:")) {
        const border = cleanText.split(":")[1];
        showFaceRecogImage(containerRef, border === "with", (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      // Computer Vision
      if (cleanText === "__CV_LOAD_IMAGE__") {
        await loadCVImage(containerRef, (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      if (cleanText.startsWith("__CV_PUT_TEXT__:")) {
        if (!cvMat || !window.cv) {
          setOutput(prev => prev + "\n❌ Put Text: no image loaded. Use Load Image first.");
          return;
        }
        // Use indexOf-based split to safely handle colons in the text itself
        const prefix = "__CV_PUT_TEXT__:";
        const payload = cleanText.slice(prefix.length);
        // Format: text:x:y:font:size:r:g:b:thickness  (9 fields, text is first)
        // Split from the END to preserve text with colons
        const tailParts = payload.split(":");
        const thickness = parseInt(tailParts[tailParts.length - 1]);
        const b = parseInt(tailParts[tailParts.length - 2]);
        const g = parseInt(tailParts[tailParts.length - 3]);
        const r = parseInt(tailParts[tailParts.length - 4]);
        const size = parseFloat(tailParts[tailParts.length - 5]);
        const font = tailParts[tailParts.length - 6];
        const y = parseInt(tailParts[tailParts.length - 7]);
        const x = parseInt(tailParts[tailParts.length - 8]);
        const text = tailParts.slice(0, tailParts.length - 8).join(":");
        try {
          const fontMap = {
            'SIMPLEX': window.cv.FONT_HERSHEY_SIMPLEX,
            'PLAIN': window.cv.FONT_HERSHEY_PLAIN,
            'DUPLEX': window.cv.FONT_HERSHEY_DUPLEX,
            'COMPLEX': window.cv.FONT_HERSHEY_COMPLEX,
            'TRIPLEX': window.cv.FONT_HERSHEY_TRIPLEX,
            'COMPLEX_SMALL': window.cv.FONT_HERSHEY_COMPLEX_SMALL,
            'SCRIPT_SIMPLEX': window.cv.FONT_HERSHEY_SCRIPT_SIMPLEX,
            'SCRIPT_COMPLEX': window.cv.FONT_HERSHEY_SCRIPT_COMPLEX
          };
          window.cv.putText(cvMat, text, new window.cv.Point(x, y), fontMap[font] || window.cv.FONT_HERSHEY_SIMPLEX, size, new window.cv.Scalar(b, g, r, 255), thickness);
          setOutput(prev => prev + `\n✅ Text added: "${text}"`);
        } catch (err) {
          setOutput(prev => prev + `\n❌ Put Text error: ${err.message}`);
        }
        return;
      }
      if (cleanText.startsWith("__CV_DRAW_LINE__:")) {
        if (!cvMat || !window.cv) {
          setOutput(prev => prev + "\n❌ Draw Line: no image loaded. Use Load Image first.");
          return;
        }
        const parts = cleanText.split(":");
        const x1 = parseInt(parts[1]);
        const y1 = parseInt(parts[2]);
        const x2 = parseInt(parts[3]);
        const y2 = parseInt(parts[4]);
        const r = parseInt(parts[5]);
        const g = parseInt(parts[6]);
        const b = parseInt(parts[7]);
        const thickness = parseInt(parts[8]);
        try {
          window.cv.line(cvMat, new window.cv.Point(x1, y1), new window.cv.Point(x2, y2), new window.cv.Scalar(b, g, r, 255), thickness);
          setOutput(prev => prev + `\n✅ Line drawn from (${x1},${y1}) to (${x2},${y2})`);
        } catch (err) {
          setOutput(prev => prev + `\n❌ Draw Line error: ${err.message}`);
        }
        return;
      }
      // Finger Detection
      if (cleanText === "__FINGER_START__") {
        startFingerDetection(blocklyDiv, containerRef, (msg) =>
          setOutput(prev => prev + "\n" + msg)
        );
        return;
      }
      if (cleanText === "__FINGER_STOP__") {
        stopFingerDetection((msg) =>
          setOutput(prev => prev + "\n" + msg)
        );
        return;
      }
      if (cleanText.startsWith("__FINGER_DELAY__:")) {
        fingerDelayRef.current =
          parseFloat(cleanText.split(":")[1]) || 1;
        return;
      }
      if (cleanText === "__FINGER_GET_COUNT__") {

        if (fingerIntervalRef.current) {
          clearInterval(fingerIntervalRef.current);
        }

        fingerIntervalRef.current = setInterval(() => {

          const results = fingerResultsRef.current;
          if (!results || !results.multiHandLandmarks) return;

          const landmarks = results.multiHandLandmarks[0];
          let count = 0;

          if (landmarks[4].x < landmarks[3].x) count++;
          if (landmarks[8].y < landmarks[6].y) count++;
          if (landmarks[12].y < landmarks[10].y) count++;
          if (landmarks[16].y < landmarks[14].y) count++;
          if (landmarks[20].y < landmarks[18].y) count++;

          setOutput(prev => prev + `\nFinger count: ${count}`);

          if (canvasContainerRef?.current) {
            canvasContainerRef.current.innerHTML = `
        <div style="
          font-size:28px;
          font-weight:bold;
          text-align:center;
          color:#5566AA;
        ">
          ✋ Finger Count: ${count}
        </div>
      `;
          }

        }, fingerDelayRef.current * 1000);

        return;
      }

      if (cleanText.startsWith("__CV_DRAW_RECT__:")) {
        if (!cvMat || !window.cv) {
          setOutput(prev => prev + "\n❌ Draw Rectangle: no image loaded. Use Load Image first.");
          return;
        }
        const parts = cleanText.split(":");
        const x1 = parseInt(parts[1]);
        const y1 = parseInt(parts[2]);
        const x2 = parseInt(parts[3]);
        const y2 = parseInt(parts[4]);
        const r = parseInt(parts[5]);
        const g = parseInt(parts[6]);
        const b = parseInt(parts[7]);
        const thickness = parseInt(parts[8]);
        try {
          window.cv.rectangle(cvMat, new window.cv.Point(x1, y1), new window.cv.Point(x2, y2), new window.cv.Scalar(b, g, r, 255), thickness);
          setOutput(prev => prev + `\n✅ Rectangle drawn from (${x1},${y1}) to (${x2},${y2})`);
        } catch (err) {
          setOutput(prev => prev + `\n❌ Draw Rectangle error: ${err.message}`);
        }
        return;
      }
      if (cleanText.startsWith("__CV_DRAW_CIRCLE__:")) {
        if (!cvMat || !window.cv) {
          setOutput(prev => prev + "\n❌ Draw Circle: no image loaded. Use Load Image first.");
          return;
        }
        const parts = cleanText.split(":");
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const radius = parseInt(parts[3]);
        const r = parseInt(parts[4]);
        const g = parseInt(parts[5]);
        const b = parseInt(parts[6]);
        const thickness = parseInt(parts[7]);
        try {
          window.cv.circle(cvMat, new window.cv.Point(x, y), radius, new window.cv.Scalar(b, g, r, 255), thickness);
          setOutput(prev => prev + `\n✅ Circle drawn at (${x},${y}) radius ${radius}`);
        } catch (err) {
          setOutput(prev => prev + `\n❌ Draw Circle error: ${err.message}`);
        }
        return;
      }
      if (cleanText.startsWith("__CV_RESIZE__:")) {
        if (!cvMat || !window.cv) {
          setOutput(prev => prev + "\n❌ Resize: no image loaded. Use Load Image first.");
          return;
        }
        const parts = cleanText.split(":");
        const width = parseInt(parts[1]);
        const height = parseInt(parts[2]);
        try {
          const resized = new window.cv.Mat();
          window.cv.resize(cvMat, resized, new window.cv.Size(width, height));
          cvMat.delete();
          cvMat = resized;
          setOutput(prev => prev + `\n✅ Image resized to ${width}x${height}`);
        } catch (err) {
          setOutput(prev => prev + `\n❌ Resize error: ${err.message}`);
        }
        return;
      }
      if (cleanText.startsWith("__CV_SHOW__:")) {
        const name = cleanText.slice("__CV_SHOW__:".length).replace(/"/g, '') || "image";
        showCVImage(containerRef, name, (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
      if (cleanText.startsWith("__CV_SAVE__:")) {
        const name = cleanText.slice("__CV_SAVE__:".length).replace(/"/g, '') || "image.png";
        saveCVImage(name, (msg) => setOutput(prev => prev + "\n" + msg));
        return;
      }
    }
    function getMostFrequent(arr) {
      const map = {};
      let maxCount = 0;
      let mostFrequent = 0;
      arr.forEach(num => {
        map[num] = (map[num] || 0) + 1;
        if (map[num] > maxCount) {
          maxCount = map[num];
          mostFrequent = num;
        }
      });
      return mostFrequent;
    }
    Sk.builtins.__facial_get_count__ = new Sk.builtin.func((feature) => {
      const f = Sk.ffi.remapToJs(feature);
      if (!facialDetections || facialDetections.length === 0) return Sk.ffi.remapToPy(0);
      let count = 0;
      if (f === "face") {
        count = facialDetections.length;
      } else if (f === "eye") {
        facialDetections.forEach(d => {
          if (d.landmarks) count += 2; // each face has 2 eyes
        });
      } else if (f === "nose") {
        count = facialDetections.length; // each face has 1 nose
      } else if (f === "smile") {
        facialDetections.forEach(d => {
          if (d.expressions && d.expressions.happy > 0.5) count++;
        });
      }
      return Sk.ffi.remapToPy(count);
    });
    Sk.builtins.__facial_get_gender__ = new Sk.builtin.func((gender) => {
      const g = Sk.ffi.remapToJs(gender);
      if (!facialDetections || facialDetections.length === 0) return Sk.ffi.remapToPy(0);
      let count = 0;
      facialDetections.forEach(d => {
        if (d.gender && d.gender.toLowerCase() === g) count++;
      });
      return Sk.ffi.remapToPy(count);
    });
    Sk.builtins.__facial_get_expression__ = new Sk.builtin.func((expression) => {
      const exp = Sk.ffi.remapToJs(expression);
      if (!facialDetections || facialDetections.length === 0) return Sk.ffi.remapToPy(0);
      let count = 0;
      facialDetections.forEach(d => {
        if (d.expressions && d.expressions[exp] > 0.5) count++;
      });
      return Sk.ffi.remapToPy(count);
    });
    Sk.builtins.__facial_get_age_list__ = new Sk.builtin.func(() => {
      if (!facialDetections || facialDetections.length === 0) return Sk.ffi.remapToPy([]);
      const ages = facialDetections.map(d => Math.round(d.age || 0));
      return Sk.ffi.remapToPy(ages);
    });
    Sk.builtins.__object_get_count__ = new Sk.builtin.func((object) => {
      const obj = Sk.ffi.remapToJs(object);
      if (!objectDetections || objectDetections.length === 0) return Sk.ffi.remapToPy(0);
      let count = 0;
      objectDetections.forEach(d => {
        if (d.class === obj) count++;
      });
      return Sk.ffi.remapToPy(count);
    });
    Sk.builtins.__finger_get_coord__ = new Sk.builtin.func((axis, point) => {
      const a = Sk.ffi.remapToJs(axis);
      const p = Sk.ffi.remapToJs(point);
      if (!fingerResults || !fingerResults.multiHandLandmarks || fingerResults.multiHandLandmarks.length === 0) {
        return Sk.ffi.remapToPy(0);
      }
      const landmarks = fingerResults.multiHandLandmarks[0];
      if (landmarks && landmarks[p]) {
        const value = landmarks[p][a] || 0;
        return Sk.ffi.remapToPy(value);
      }
      return Sk.ffi.remapToPy(0);
    });
    Sk.builtins.__finger_get_count__ = new Sk.builtin.func(() => {
      if (!fingerResults || !fingerResults.multiHandLandmarks || fingerResults.multiHandLandmarks.length === 0) {
        return Sk.ffi.remapToPy(0);
      }
      // Simple finger counting logic (can be improved)
      const landmarks = fingerResults.multiHandLandmarks[0];
      let count = 0;
      // Thumb
      if (landmarks[4].x < landmarks[3].x) count++;
      // Index
      if (landmarks[8].y < landmarks[6].y) count++;
      // Middle
      if (landmarks[12].y < landmarks[10].y) count++;
      // Ring
      if (landmarks[16].y < landmarks[14].y) count++;
      // Pinky
      if (landmarks[20].y < landmarks[18].y) count++;
      return Sk.ffi.remapToPy(count);
    });
    Sk.configure({
      output: (text) => {
        console.log("[Skulpt Output]", text);
        const cleanText = text.trim();
        // Queue AI Learning commands that need async processing
        if (cleanText === "__FACIAL_LOAD_IMAGE__" ||
          cleanText.startsWith("__FACIAL_GET_") ||
          cleanText.startsWith("__FACIAL_SHOW__") ||
          cleanText === "__OBJECT_LOAD_IMAGE__" ||
          cleanText.startsWith("__OBJECT_GET_") ||
          cleanText.startsWith("__OBJECT_SHOW__") ||
          cleanText === "__FACERECOG_LOAD_IMAGE__" ||
          cleanText === "__FACERECOG_PREDICT__" ||
          cleanText.startsWith("__FACERECOG_SHOW__") ||
          cleanText === "__FINGER_START__" ||
          cleanText.startsWith("__FINGER_GET_") ||
          cleanText === "__FINGER_STOP__" ||
          cleanText.startsWith("__FINGER_DELAY__") ||
          cleanText === "__CV_LOAD_IMAGE__" ||
          cleanText.startsWith("__CV_")) {
          commandQueue.push(async () => {
            await handleAICommand(cleanText, canvasContainerRef, setOutput);
          });
          // Start processing queue if not already processing
          if (!isProcessingQueue) {
            processCommandQueue();
          }
          return;
        }
        /* =========================
           🖼️ SPRITE HANDLER
   TEACHABLE HANDLER
========================= */
        if (cleanText.startsWith("__TEACHABLE_LOAD__")) {
          const url = cleanText.replace("__TEACHABLE_LOAD__:", "").trim();
          loadTeachableModel(url, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText === "__TEACHABLE_LOAD_IMAGE__") {
          showTeachableImageSourcePicker(
            canvasContainerRef,
            (msg) => setOutput(prev => prev + "\n" + msg)
          );
          return;
        }
        if (cleanText.startsWith("__TEACHABLE_SHOW__:")) {
          const src = cleanText.split(":")[1];
          if (src === "webcam") {
            startTeachableWebcam(canvasContainerRef, (msg) => setOutput(prev => prev + "\n" + msg));
          } else if (src === "image") {
            loadAndShowImage(canvasContainerRef, (msg) => setOutput(prev => prev + "\n" + msg));
          }
          return;
        }
        if (cleanText.startsWith("__TEACHABLE_PREDICT__:")) {
          const parts = cleanText.split(":");
          const type = parts[1]; // "image" or "pose"
          const src = parts[2];  // "webcam" or "image"
          if (src === "webcam") {
            predictFromWebcam(type, (msg) => setOutput(prev => prev + "\n" + msg), canvasContainerRef);
          } else if (src === "image") {
            predictFromImage(type, (msg) => setOutput(prev => prev + "\n" + msg), canvasContainerRef);
          }
          return;
        }
        if (cleanText === "__TEACHABLE_PREDICT_AUDIO__") {
          predictTeachableAudio();
          return;
        }
        /* =========================
           AI LEARNING HANDLERS
        ========================= */
        // Facial Features
        if (cleanText === "__FACIAL_LOAD_IMAGE__") {
          loadFacialImage(canvasContainerRef, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText.startsWith("__FACIAL_GET_COUNT__:")) {
          const feature = cleanText.split(":")[1];
          let count = 0;
          if (!facialDetections || facialDetections.length === 0) {
            facialCountsArray.push({ label: feature.charAt(0).toUpperCase() + feature.slice(1), count: 0 });
            return;
          }
          if (feature === "face") {
            count = facialDetections.length;
          } else if (feature === "eye") {
            facialDetections.forEach(d => {
              if (d.landmarks) count += 2;
            });
          } else if (feature === "nose") {
            facialDetections.forEach(d => {
              if (d.landmarks) count += 1;
            });
          } else if (feature === "smile") {
            facialDetections.forEach(d => {
              if (d.expressions && d.expressions.happy > 0.5) count++;
            });
          }
          // Store the count for canvas display
          facialCountsArray.push({ label: feature.charAt(0).toUpperCase() + feature.slice(1), count: count });
          return;
        }
        if (cleanText.startsWith("__FACIAL_GET_GENDER__:")) {
          const gender = cleanText.split(":")[1];
          let count = 0;
          if (!facialDetections || facialDetections.length === 0) {
            facialCountsArray.push({ label: gender.charAt(0).toUpperCase() + gender.slice(1), count: 0 });
            return;
          }
          facialDetections.forEach(d => {
            if (d.gender && d.gender === gender) count++;
          });
          // Store the count for canvas display
          facialCountsArray.push({ label: gender.charAt(0).toUpperCase() + gender.slice(1), count: count });
          return;
        }
        if (cleanText.startsWith("__FACIAL_GET_EXPRESSION__:")) {
          const expression = cleanText.split(":")[1];
          let count = 0;
          if (!facialDetections || facialDetections.length === 0) {
            facialCountsArray.push({ label: expression.charAt(0).toUpperCase() + expression.slice(1), count: 0 });
            return;
          }
          facialDetections.forEach(d => {
            if (d.expressions && d.expressions[expression] > 0.5) count++;
          });
          // Store the count for canvas display
          facialCountsArray.push({ label: expression.charAt(0).toUpperCase() + expression.slice(1), count: count });
          return;
        }
        if (cleanText === "__FACIAL_GET_AGE_LIST__") {
          if (!facialDetections || facialDetections.length === 0) {
            facialCountsArray.push({ label: "Ages", count: "[]" });
            return;
          }
          const ages = facialDetections.map(d => Math.round(d.age || 0));
          // Store the ages for canvas display
          facialCountsArray.push({ label: "Ages", count: `[${ages.join(", ")}]` });
          return;
        }
        if (cleanText.startsWith("__FACIAL_SHOW__:")) {
          const border = cleanText.split(":")[1];
          showFacialImage(canvasContainerRef, border === "with", (msg) => setOutput(prev => prev + "\n" + msg), facialCountsArray);
          facialCountsArray = []; // Clear the array after displaying
          return;
        }
        // Object Detection
        if (cleanText === "__OBJECT_LOAD_IMAGE__") {
          loadObjectImage(canvasContainerRef, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText.startsWith("__OBJECT_GET_COUNT__:")) {
          const object = cleanText.split(":")[1];
          let count = 0;
          if (!objectDetections || objectDetections.length === 0) {
            count = 0;
          } else {
            objectDetections.forEach(d => {
              if (d.class === object) count++;
            });
          }

          // Display count on canvas
          canvasContainerRef.current.innerHTML = "";
          const countDisplay = document.createElement("div");
          countDisplay.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            font-size: 48px;
            font-weight: bold;
            color: #333;
            font-family: Arial, sans-serif;
          `;
          countDisplay.textContent = `${object}: ${count}`;
          canvasContainerRef.current.appendChild(countDisplay);

          setOutput(prev => prev + `\n${object} count: ${count}`);
          return;
        }
        if (cleanText.startsWith("__OBJECT_SHOW__:")) {
          const border = cleanText.split(":")[1];
          showObjectImage(canvasContainerRef, border === "with", (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        // Face Recognition
        if (cleanText === "__FACERECOG_LOAD_IMAGE__") {
          loadFaceRecogImage(canvasContainerRef, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText === "__FACERECOG_PREDICT__") {
          predictFaceRecog((msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText.startsWith("__FACERECOG_SHOW__:")) {
          const border = cleanText.split(":")[1];
          showFaceRecogImage(canvasContainerRef, border === "with", (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        // Finger Detection
        // if (cleanText === "__FINGER_START__") {
        //   fingerCollected = [];
        //   fingerLoopCurrent = 0;
        //   startFingerDetection(containerRef, (msg) =>
        //     setOutput(prev => prev + "\n" + msg)
        //   );
        //   return;
        // }
        // if (cleanText === "__FINGER_STOP__") {
        //   if (fingerIntervalRef) {
        //     clearInterval(fingerIntervalRef);
        //     fingerIntervalRef = null;
        //   }
        //   stopFingerDetection((msg) =>
        //     setOutput(prev => prev + "\n" + msg)
        //   );
        //   return;
        // }
        // if (cleanText.startsWith("__FINGER_GET_COORD__:")) {
        //   const parts = cleanText.split(":");
        //   const axis = parts[1];
        //   const point = parseInt(parts[2]);
        //   if (!fingerResults || !fingerResults.multiHandLandmarks || fingerResults.multiHandLandmarks.length === 0) {
        //     setOutput(prev => prev + `\nCoordinate ${axis} of point ${point}: 0`);
        //     return;
        //   }
        //   const landmarks = fingerResults.multiHandLandmarks[0];
        //   if (landmarks && landmarks[point]) {
        //     const value = landmarks[point][axis] || 0;
        //     setOutput(prev => prev + `\nCoordinate ${axis} of point ${point}: ${value.toFixed(3)}`);
        //   } else {
        //     setOutput(prev => prev + `\nCoordinate ${axis} of point ${point}: 0`);
        //   }
        //   return;
        // }
        // if (cleanText === "__FINGER_GET_COUNT__") {
        //   if (!fingerIntervalRef) {
        //     fingerIntervalRef = setInterval(() => {
        //       if (!fingerResults || !fingerResults.multiHandLandmarks) return;
        //       const landmarks = fingerResults.multiHandLandmarks[0];
        //       let count = 0;
        //       if (landmarks[4].x < landmarks[3].x) count++;
        //       if (landmarks[8].y < landmarks[6].y) count++;
        //       if (landmarks[12].y < landmarks[10].y) count++;
        //       if (landmarks[16].y < landmarks[14].y) count++;
        //       if (landmarks[20].y < landmarks[18].y) count++;
        //       fingerCollected.push(count);
        //       setOutput(prev => prev + `\nFinger count: ${count}`);
        //       fingerLoopCurrent++;
        //       if (fingerLoopCurrent >= 30) { // match repeat count
        //         clearInterval(fingerIntervalRef);
        //         fingerIntervalRef = null;
        //         const mostFrequent = getMostFrequent(fingerCollected);
        //         setOutput(prev =>
        //           prev + `\n\n✅ Final Detected Finger Count: ${mostFrequent}`
        //         );
        //         fingerCollected = [];
        //       }
        //     }, fingerDelaySeconds * 1000);
        //   }
        //   return;
        // }
        // if (cleanText.startsWith("__FINGER_DELAY__:")) {
        //   fingerDelaySeconds = parseFloat(cleanText.split(":")[1]) || 1;
        //   return;
        // }
        // Computer Vision
        if (cleanText === "__CV_LOAD_IMAGE__") {
          loadCVImage(canvasContainerRef, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText.startsWith("__CV_PUT_TEXT__:")) {
          const parts = cleanText.split(":");
          const text = parts[1].replace(/"/g, '');
          const x = parseInt(parts[2]);
          const y = parseInt(parts[3]);
          const font = parts[4];
          const size = parseFloat(parts[5]);
          const r = parseInt(parts[6]);
          const g = parseInt(parts[7]);
          const b = parseInt(parts[8]);
          const thickness = parseInt(parts[9]);
          if (cvMat && window.cv) {
            const fontMap = {
              'SIMPLEX': window.cv.FONT_HERSHEY_SIMPLEX,
              'PLAIN': window.cv.FONT_HERSHEY_PLAIN,
              'DUPLEX': window.cv.FONT_HERSHEY_DUPLEX,
              'COMPLEX': window.cv.FONT_HERSHEY_COMPLEX,
              'TRIPLEX': window.cv.FONT_HERSHEY_TRIPLEX,
              'COMPLEX_SMALL': window.cv.FONT_HERSHEY_COMPLEX_SMALL,
              'SCRIPT_SIMPLEX': window.cv.FONT_HERSHEY_SCRIPT_SIMPLEX,
              'SCRIPT_COMPLEX': window.cv.FONT_HERSHEY_SCRIPT_COMPLEX
            };
            window.cv.putText(cvMat, text, new window.cv.Point(x, y), fontMap[font] || window.cv.FONT_HERSHEY_SIMPLEX, size, new window.cv.Scalar(b, g, r), thickness);
            setOutput(prev => prev + `\nâœ… Text added: "${text}"`);
          }
          return;
        }
        if (cleanText.startsWith("__CV_DRAW_LINE__:")) {
          const parts = cleanText.split(":");
          const x1 = parseInt(parts[1]);
          const y1 = parseInt(parts[2]);
          const x2 = parseInt(parts[3]);
          const y2 = parseInt(parts[4]);
          const r = parseInt(parts[5]);
          const g = parseInt(parts[6]);
          const b = parseInt(parts[7]);
          const thickness = parseInt(parts[8]);
          if (cvMat && window.cv) {
            window.cv.line(cvMat, new window.cv.Point(x1, y1), new window.cv.Point(x2, y2), new window.cv.Scalar(b, g, r), thickness);
            setOutput(prev => prev + `\nâœ… Line drawn from (${x1},${y1}) to (${x2},${y2})`);
          }
          return;
        }
        if (cleanText.startsWith("__CV_DRAW_RECT__:")) {
          const parts = cleanText.split(":");
          const x1 = parseInt(parts[1]);
          const y1 = parseInt(parts[2]);
          const x2 = parseInt(parts[3]);
          const y2 = parseInt(parts[4]);
          const r = parseInt(parts[5]);
          const g = parseInt(parts[6]);
          const b = parseInt(parts[7]);
          const thickness = parseInt(parts[8]);
          if (cvMat && window.cv) {
            window.cv.rectangle(cvMat, new window.cv.Point(x1, y1), new window.cv.Point(x2, y2), new window.cv.Scalar(b, g, r), thickness);
            setOutput(prev => prev + `\nâœ… Rectangle drawn from (${x1},${y1}) to (${x2},${y2})`);
          }
          return;
        }
        if (cleanText.startsWith("__CV_DRAW_CIRCLE__:")) {
          const parts = cleanText.split(":");
          const x = parseInt(parts[1]);
          const y = parseInt(parts[2]);
          const radius = parseInt(parts[3]);
          const r = parseInt(parts[4]);
          const g = parseInt(parts[5]);
          const b = parseInt(parts[6]);
          const thickness = parseInt(parts[7]);
          if (cvMat && window.cv) {
            window.cv.circle(cvMat, new window.cv.Point(x, y), radius, new window.cv.Scalar(b, g, r), thickness);
            setOutput(prev => prev + `\nâœ… Circle drawn at (${x},${y}) with radius ${radius}`);
          }
          return;
        }
        if (cleanText.startsWith("__CV_RESIZE__:")) {
          const parts = cleanText.split(":");
          const width = parseInt(parts[1]);
          const height = parseInt(parts[2]);
          if (cvMat && window.cv) {
            const dsize = new window.cv.Size(width, height);
            window.cv.resize(cvMat, cvMat, dsize, 0, 0, window.cv.INTER_AREA);
            setOutput(prev => prev + `\nâœ… Image resized to ${width}x${height}`);
          }
          return;
        }
        if (cleanText.startsWith("__CV_SHOW__:")) {
          const name = cleanText.split(":")[1].replace(/"/g, '');
          showCVImage(canvasContainerRef, name, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (cleanText.startsWith("__CV_SAVE__:")) {
          const name = cleanText.split(":")[1].replace(/"/g, '');
          saveCVImage(name, (msg) => setOutput(prev => prev + "\n" + msg));
          return;
        }
        if (code.includes("__UPLOAD_FILE__")) {
          fileInputRef.current.click();
          return; // wait for upload
        }
        /* =========================
           ðŸ–¼ï¸ SPRITE HANDLER
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
          return; // â›” stop further processing
        }
        if (text.startsWith("__PYGAL_RENDER__")) {
          const raw = text.replace("__PYGAL_RENDER__", "").trim();
          const [type, seriesStr, xlabelsStr, titleStr] = raw.split("|");
          const chart = {
            type,
            series: eval(seriesStr),
            x_labels: eval(xlabelsStr),
            title: titleStr || ""
          };
          renderPygalChart(chart);
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
       NORMAL OUTPUT â†’ WHITE CANVAS
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
    // ðŸ‘‡ Only inject turtle init if required
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
    if (usesTurtle) {
      initCode += `
import turtle
_s = turtle.Screen()
`;
    }
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

      console.log("[App] Generated code:\n", fullCode);
      setOutput((prev) => prev + "Generated code:\n" + fullCode + "\n\n");
      const myPromise = Sk.misceval.asyncToPromise(() => {
        console.log("[App] Starting execution...");
        return Sk.importMainWithBody("<stdin>", false, fullCode, true);
      });
      myPromise.then(
        () => {
          console.log("[App] Code executed successfully!");
          setOutput((prev) => prev + "\nCode executed successfully!");
        },
        (err: any) => {
          let errorMessage = "Unknown execution error";
          if (err?.tp$str) errorMessage = err.tp$str();
          if (err?.args?.v?.length) {
            errorMessage += ": " + err.args.v.map((x: any) => x.v).join(", ");
          }
          setOutput((prev) => prev + "\nError: " + errorMessage);
          (err) => {
            console.error("[App] Execution error:", err);
            setOutput((prev) => prev + "\nError: " + err.toString());
          }
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

      <Script
        src="/js/teachablemachine-image.min.js"
        strategy="beforeInteractive"
      />

      <Script
        src="/js/hands.js"
        strategy="afterInteractive"
      />

      <Script
        src="/js/drawing_utils.js"
        strategy="afterInteractive"
      />

      <Script
        src="/js/camera_utils.js"
        strategy="afterInteractive"
      />

      <Script
        src="/js/opencv.js"
        strategy="afterInteractive"
      />

      <Script
        src="/js/face-api.min.js"
        strategy="beforeInteractive"
      />

      <input
        ref={fileInputRef}
        type="file"
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
          <button style={{ padding: "8px 16px", background: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold" }}>
            ☰
          </button>

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

      {/* Load TensorFlow.js and COCO-SSD */}

    </>
  );

}

export default AICodingPage;


