"use client";

import React, { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";

export default function MicrobitBlockly() {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    if (!blocklyRef.current) return;

    // Define custom microbit blocks
    Blockly.Blocks['on_start'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("on start");
        this.appendStatementInput("STACK")
            .setCheck(null);
        this.setColour("#0078d7");
        this.setTooltip("Runs once when the micro:bit starts.");
        this.setHelpUrl("");
      }
    };

    Blockly.Blocks['forever'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("forever");
        this.appendStatementInput("STACK")
            .setCheck(null);
        this.setColour("#0078d7");
        this.setTooltip("Runs in a loop forever.");
        this.setHelpUrl("");
      }
    };

    // Define Toolbox
    const toolbox = {
      kind: "categoryToolbox",
      contents: [
        {
          kind: "category",
          name: "Basic",
          colour: "#0078d7",
          contents: [
            { kind: "block", type: "on_start" },
            { kind: "block", type: "forever" },
            { kind: "block", type: "controls_repeat_ext" },
          ],
        },
        {
          kind: "category",
          name: "Input",
          colour: "#d400d4",
          contents: [{ kind: "block", type: "logic_boolean" }],
        },
        {
          kind: "category",
          name: "Music",
          colour: "#e3008c",
          contents: [{ kind: "block", type: "math_number" }],
        },
        {
          kind: "category",
          name: "Led",
          colour: "#5c2d91",
          contents: [{ kind: "block", type: "math_number" }],
        },
        {
          kind: "category",
          name: "Radio",
          colour: "#e3008c",
          contents: [{ kind: "block", type: "math_number" }],
        },
        {
          kind: "category",
          name: "Loops",
          colour: "#00b294",
          contents: [{ kind: "block", type: "controls_repeat_ext" }],
        },
        {
          kind: "category",
          name: "Logic",
          colour: "#00b294",
          contents: [{ kind: "block", type: "logic_compare" }],
        },
        {
          kind: "category",
          name: "Variables",
          colour: "#f7630c",
          custom: "VARIABLE"
        },
        {
          kind: "category",
          name: "Math",
          colour: "#744da9",
          contents: [{ kind: "block", type: "math_number" }],
        },
      ],
    };

    // Inject Workspace
    workspaceRef.current = Blockly.inject(blocklyRef.current, {
      toolbox: toolbox,
      grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      renderer: "zelos", 
      theme: Blockly.Themes.Classic,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true
      }
    });

    // Add initial blocks to workspace
    const initialXml = `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="on_start" x="50" y="50"></block>
      <block type="forever" x="50" y="200"></block>
    </xml>`;
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(initialXml), workspaceRef.current);

    // Resize handler
    const handleResize = () => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (workspaceRef.current) {
        workspaceRef.current.dispose();
      }
    };
  }, []);

  return <div ref={blocklyRef} className="absolute inset-0 h-full w-full" />;
}
