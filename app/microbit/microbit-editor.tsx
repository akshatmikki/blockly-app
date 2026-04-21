"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Home, 
  Share2, 
  CircleHelp, 
  Settings, 
  UserCircle2, 
  ChevronDown,
  Undo2,
  Redo2,
  Plus,
  Minus,
  Play,
  RotateCcw,
  Bug,
  Volume2,
  Camera,
  Maximize2,
  Search,
  MoreHorizontal,
  Save,
  Github
} from "lucide-react";
import MicrobitSimulator from "@/components/microbit/MicrobitSimulator";
import MicrobitBlockly from "@/components/microbit/MicrobitBlockly";

export default function MicrobitEditor() {
  const [activeMode, setActiveMode] = useState<"blocks" | "python">("blocks");

  return (
    <div className="flex h-screen flex-col font-sans text-[#333] bg-[#f0f2f5] select-none">
      {/* Header */}
      <header className="flex h-[48px] items-center justify-between bg-[#3c59cf] px-4 text-white shadow-md z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/10 cursor-pointer transition-colors">
            <span className="text-sm font-bold tracking-tight">Microsoft</span>
            <div className="h-4 w-[1.5px] bg-white/40 mx-1" />
            <div className="flex items-center gap-1.5 uppercase font-black text-sm">
               MICRO:BIT
            </div>
          </div>

          <div className="ml-4 flex h-8 items-center rounded-lg bg-black/20 p-[2px] border border-white/10">
            <button
              onClick={() => setActiveMode("blocks")}
              className={`px-4 py-1 text-xs font-bold transition-all rounded-md ${
                activeMode === "blocks" ? "bg-white text-[#3c59cf]" : "text-white/80 hover:bg-white/10"
              }`}
            >
              Blocks
            </button>
            <button
              onClick={() => setActiveMode("python")}
              className={`px-4 py-1 text-xs font-bold transition-all rounded-md ${
                activeMode === "python" ? "bg-white text-[#3c59cf]" : "text-white/80 hover:bg-white/10"
              }`}
            >
              Python
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 transition-all hover:bg-white/15 rounded-full"><Home size={18} /></button>
          <button className="p-2 transition-all hover:bg-white/15 rounded-full"><Share2 size={18} /></button>
          <button className="p-2 transition-all hover:bg-white/15 rounded-full"><Settings size={18} /></button>
          <div className="w-[1px] h-5 bg-white/20 mx-1" />
          <UserCircle2 size={24} strokeWidth={1.5} className="text-white/90" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Simulator Panel */}
        <div className="flex w-[380px] flex-col border-r border-[#d0d0d0] bg-[#f8f9fa] z-30">
           <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
              <MicrobitSimulator />
           </div>
        </div>

        {/* Middle/Right: Blockly Workspace Area */}
        <div className="relative flex flex-1 overflow-hidden z-20">
           <div className="flex-1 bg-white relative">
              <MicrobitBlockly />
           </div>
        </div>
      </div>

      {/* Footer - SIMPLIFIED */}
      <footer className="h-[80px] border-t border-[#d0d0d0] bg-[#f8f9fa] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-1 shadow-lg hover:shadow-xl transition-all rounded-xl overflow-hidden active:scale-95 duration-150">
           <button className="px-16 py-4 text-2xl font-black text-white bg-[#5c2d91] hover:bg-[#6c3da1] transition-all uppercase tracking-wider">
              Download
           </button>
           <button className="px-4 py-4 text-white bg-[#4c1d81] hover:bg-[#5c2d91] transition-all border-l border-white/10">
              <MoreHorizontal size={32} strokeWidth={3} />
           </button>
        </div>

        {/* User requested to remove top full banner and bottom also, only the download button i want */}
        <div className="flex items-center gap-4 text-gray-400 font-medium">
           {/* Empty middle as requested - only download button prioritized */}
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center bg-[#ddd] text-[#333] rounded-lg p-1">
              <button className="p-1 px-2 hover:bg-white/50 rounded"><Minus size={18} strokeWidth={3} /></button>
              <div className="w-10 text-center text-xs font-bold">100%</div>
              <button className="p-1 px-2 hover:bg-white/50 rounded"><Plus size={18} strokeWidth={3} /></button>
           </div>
        </div>
      </footer>
    </div>
  );

}
