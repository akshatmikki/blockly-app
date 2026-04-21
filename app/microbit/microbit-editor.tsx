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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/10 cursor-pointer transition-colors">
              <span className="text-sm font-bold tracking-tight">Microsoft</span>
              <div className="h-4 w-[1.5px] bg-white/40 mx-1" />
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center p-0.5">
                   <div className="h-3 w-3 rounded-full bg-[#3c59cf] flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-white" />
                   </div>
                </div>
                <span className="text-sm font-black tracking-tight uppercase">micro:bit</span>
              </div>
            </div>
          </div>

          <div className="ml-4 flex h-9 items-center rounded-full bg-black/20 p-[3px] border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveMode("blocks")}
              className={`flex items-center gap-2 px-6 py-1.5 text-sm font-bold transition-all rounded-full ${
                activeMode === "blocks" ? "bg-white text-[#3c59cf] shadow-md" : "hover:bg-white/10 text-white/90"
              }`}
            >
               <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-4 flex flex-col gap-[2px]">
                     <div className="h-[2.5px] w-full bg-current rounded-full" />
                     <div className="h-[2.5px] w-[70%] bg-current rounded-full" />
                     <div className="h-[2.5px] w-full bg-current rounded-full" />
                  </div>
                  Blocks
               </span>
            </button>
            <button
              onClick={() => setActiveMode("python")}
              className={`flex items-center gap-2 px-6 py-1.5 text-sm font-bold transition-all rounded-full ${
                activeMode === "python" ? "bg-white text-[#3c59cf] shadow-md" : "hover:bg-white/10 text-white/90"
              }`}
            >
              Python
            </button>
            <div className="px-2 transition-all hover:bg-white/10 rounded-full cursor-pointer ml-1 text-white/70">
               <ChevronDown size={14} strokeWidth={3} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { icon: Home, label: "Home" },
            { icon: Share2, label: "Share" },
            { icon: CircleHelp, label: "Help" },
            { icon: Settings, label: "Settings" },
          ].map(({ icon: Icon, label }) => (
            <button key={label} title={label} className="p-2.5 transition-all outline-none hover:bg-white/15 rounded-full hover:scale-105 active:scale-95">
              <Icon size={21} strokeWidth={2} />
            </button>
          ))}
          <div className="w-[1px] h-6 bg-white/20 mx-1" />
          <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold transition-all hover:bg-white/15 rounded-full border border-white/20 shadow-sm">
             <span className="hidden sm:inline">Sign In</span>
             <UserCircle2 size={24} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Simulator Panel */}
        <div className="flex w-[380px] flex-col border-r border-[#d0d0d0] bg-[#fdfdfd] shadow-sm z-30">
           <div className="flex-1 p-4 flex flex-col items-center justify-center overflow-y-auto">
              <MicrobitSimulator />
           </div>
           
           {/* Simulator Controls */}
           <div className="flex items-center justify-center gap-1 p-3 bg-white border-t border-[#eee]">
              <button className="p-2.5 transition-all text-[#444] hover:bg-[#f0f0f0] rounded-lg active:scale-95"><Play size={20} fill="#444" /></button>
              <button className="p-2.5 transition-all text-[#444] hover:bg-[#f0f0f0] rounded-lg active:scale-95"><RotateCcw size={20} /></button>
              <button className="p-2.5 transition-all text-[#444] hover:bg-[#f0f0f0] rounded-lg active:scale-95"><Bug size={20} /></button>
              <div className="w-[1px] h-6 bg-[#ddd] mx-2" />
              <button className="p-2.5 transition-all text-[#444] hover:bg-[#f0f0f0] rounded-lg active:scale-95"><Volume2 size={20} /></button>
              <button className="p-2.5 transition-all text-[#444] hover:bg-[#f0f0f0] rounded-lg active:scale-95"><Camera size={20} /></button>
              <button className="p-2.5 transition-all text-[#444] hover:bg-[#f0f0f0] rounded-lg active:scale-95"><Maximize2 size={20} /></button>
           </div>
        </div>

        {/* Middle/Right: Blockly Workspace Area */}
        <div className="relative flex flex-1 overflow-hidden z-20 shadow-inner">
           {/* Blockly Workspace Container */}
           <div className="flex-1 bg-white relative">
              <MicrobitBlockly />
              
              {/* Collapse button between sim and workspace (Absolute positioned over Blockly) */}
              <div className="absolute top-1/2 -left-[14px] -translate-y-1/2 z-[100] bg-white border border-[#d0d0d0] rounded-full p-0.5 shadow-lg cursor-pointer hover:bg-[#f0f0f0] hover:scale-110 transition-all focus:outline-none">
                 <div className="w-5 h-8 flex items-center justify-center text-[#999]">
                    <div className="w-1.5 h-1.5 border-l-2 border-t-2 border-current rotate-[-45deg] translate-x-[1px]" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-[72px] border-t border-[#d0d0d0] bg-white flex items-center justify-between px-6 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-1 group shadow-md hover:shadow-lg transition-shadow rounded-xl overflow-hidden active:scale-95 transform duration-150">
           <button className="px-14 py-4 text-xl font-black text-white bg-[#5c2d91] hover:bg-[#6c3da1] transition-all uppercase tracking-wider flex items-center gap-3">
              Download
           </button>
           <button className="px-4 py-4 text-white bg-[#4c1d81] hover:bg-[#5c2d91] transition-all border-l border-white/10">
              <MoreHorizontal size={28} strokeWidth={3} />
           </button>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-center max-w-xl px-8">
           <div className="relative flex-1 group">
              <input 
                type="text" 
                defaultValue="Untitled" 
                className="w-full px-6 py-3 bg-[#f5f5f5] border-2 border-transparent rounded-xl text-lg font-bold shadow-inner focus:bg-white focus:border-[#3c59cf]/30 outline-none transition-all placeholder:text-gray-400 group-hover:bg-[#eee]" 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                 ✎
              </div>
           </div>
           <div className="flex gap-2">
              <button className="p-3 px-5 transition-all bg-[#3c59cf] hover:bg-[#2c49bf] text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 font-bold uppercase text-xs">
                 <Save size={20} strokeWidth={3} />
                 <span>Save</span>
              </button>
              <button className="p-3 transition-all bg-white border-2 border-[#ddd] hover:border-[#3c59cf]/40 hover:bg-[#f9f9f9] text-[#555] rounded-xl shadow-sm hover:shadow-md active:scale-95">
                 <Github size={22} />
              </button>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex gap-1.5 p-1.5 bg-[#f0f0f0] rounded-xl shadow-inner">
              <button className="p-2.5 transition-all text-[#3c59cf] hover:bg-white hover:shadow-sm rounded-lg active:scale-90"><Undo2 size={22} strokeWidth={2.5} /></button>
              <button className="p-2.5 transition-all text-[#3c59cf] hover:bg-white hover:shadow-sm rounded-lg active:scale-90"><Redo2 size={22} strokeWidth={2.5} /></button>
           </div>
           <div className="w-[1px] h-8 bg-black/10 mx-1" />
           <div className="flex items-center bg-[#3c59cf] text-white rounded-xl p-1 shadow-md">
              <button className="p-2.5 hover:bg-white/10 rounded-lg active:scale-90"><Minus size={20} strokeWidth={3} /></button>
              <div className="w-12 text-center text-sm font-black opacity-80">100%</div>
              <button className="p-2.5 hover:bg-white/10 rounded-lg active:scale-90"><Plus size={20} strokeWidth={3} /></button>
           </div>
        </div>
      </footer>
    </div>
  );

}
