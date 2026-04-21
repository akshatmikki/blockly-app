import React, { useEffect, useRef } from "react";
import * as Blockly from "blockly/core";
import "blockly/blocks";
import "blockly/msg/en";
import { registerMicrobitBlocks, microbitToolbox } from "@/lib/microbit/MicrobitBlocks";

export default function MicrobitBlockly() {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    if (!blocklyRef.current) return;

    // Register all advanced microbit blocks
    registerMicrobitBlocks();

    // Inject Workspace
    workspaceRef.current = Blockly.inject(blocklyRef.current, {
      toolbox: microbitToolbox,
      grid: { spacing: 20, length: 3, colour: "#eee", snap: true },
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
      <block type="device_on_start" x="50" y="50"></block>
      <block type="device_forever" x="50" y="200"></block>
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
