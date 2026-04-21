"use client";

import React from "react";
import { 
  RotateCcw, 
  Bug, 
  Volume2, 
  Camera, 
  Maximize2 
} from "lucide-react";

export default function MicrobitSimulator() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none gap-6">
      <div className="relative w-[340px] h-[280px] bg-[#111111] rounded-[32px] shadow-2xl overflow-hidden border-[1px] border-white/5">
        
        {/* Top Teal Graphic Pattern */}
        <div className="absolute top-0 left-0 w-full h-[60px] pointer-events-none">
           <div 
             className="absolute -top-12 -left-12 w-48 h-48 bg-[#22ffad] rotate-[25deg] origin-bottom-right opacity-90" 
             style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 80% 60%, 60% 90%, 40% 70%, 20% 90%, 0% 60%)' }}
           />
        </div>

        {/* Top Logo (Two Dots) */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
           <div className="w-16 h-8 rounded-full bg-[#22ffad] flex items-center justify-center gap-1.5 p-1 border-2 border-[#111]">
              <div className="w-3.5 h-3.5 rounded-full bg-[#111]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#111]" />
           </div>
        </div>

        {/* LED Matrix Area */}
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 grid grid-cols-5 gap-y-4 gap-x-5">
           {[...Array(25)].map((_, i) => (
             <div 
               key={i} 
               className="w-2.5 h-5 bg-[#1d1d1d] rounded-sm transition-colors duration-200" 
               style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
             />
           ))}
        </div>

        {/* Buttons A & B - NEW DESIGN */}
        {/* Button A */}
        <div className="absolute left-6 top-[135px] flex flex-col items-center gap-2">
           <div className="relative group cursor-pointer active:scale-95 transition-transform">
              <div className="w-12 h-12 bg-[#333] rounded-lg border border-white/10 flex items-center justify-center shadow-lg relative">
                 {/* Internal dots */}
                 <div className="w-6 h-6 grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#a11]" />
                    ))}
                 </div>
              </div>
              {/* Teal Triangle A */}
              <div className="absolute -bottom-6 -left-2 w-0 h-0 border-r-[12px] border-r-[#22ffad] border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent" />
              <div className="absolute -bottom-8 left-2 font-black text-[#22ffad] text-xl">A</div>
           </div>
           {/* Case side dot */}
           <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Button B */}
        <div className="absolute right-6 top-[135px] flex flex-col items-center gap-2">
           <div className="relative group cursor-pointer active:scale-95 transition-transform">
              <div className="w-12 h-12 bg-[#333] rounded-lg border border-white/10 flex items-center justify-center shadow-lg relative">
                 {/* Internal dots */}
                 <div className="w-6 h-6 grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#a11]" />
                    ))}
                 </div>
              </div>
              {/* Teal Triangle B */}
              <div className="absolute -top-6 -right-2 w-0 h-0 border-l-[12px] border-l-[#22ffad] border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent" />
              <div className="absolute -top-11 right-2 font-black text-[#22ffad] text-xl">B</div>
           </div>
           {/* Case side dot */}
           <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Bottom Gold Pins Header - NEW DESIGN */}
        <div className="absolute bottom-0 left-0 w-full h-[70px] bg-[#d4af37] flex justify-between px-2 pt-2 border-t border-black/10">
           {[
              { label: "0", size: "lg" },
              { label: "1", size: "lg" },
              { label: "2", size: "lg" },
              { label: "3V", size: "sm" },
              { label: "GND", size: "sm" }
           ].map((pin, i) => (
              <div key={i} className="flex flex-col items-center flex-1 relative">
                 {/* Vertical lines pattern */}
                 <div className="absolute inset-0 flex justify-center gap-[2px] opacity-10 pointer-events-none">
                    {[...Array(6)].map((_, j) => <div key={j} className="w-[1px] h-full bg-black" />)}
                 </div>
                 
                 <div className={`
                    mt-2 rounded-full border-4 border-[#111] flex items-center justify-center font-black text-black
                    ${pin.size === "lg" ? "w-11 h-11 text-base" : "w-10 h-10 text-xs"}
                 `}>
                    {pin.label}
                 </div>
              </div>
           ))}
        </div>
      </div>

      {/* Simulator Control Bar - Image Styled */}
      <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 rounded-lg">
         <button className="p-2 text-gray-500 hover:bg-gray-300 rounded"><div className="w-3.5 h-3.5 bg-gray-600 rounded-sm" /></button>
         <button className="p-2 text-gray-500 hover:bg-gray-300 rounded"><RotateCcw size={16} strokeWidth={3} /></button>
         <button className="p-2 text-gray-500 hover:bg-gray-300 rounded"><Bug size={16} strokeWidth={3} /></button>
         <div className="w-[1px] h-4 bg-gray-400 mx-1" />
         <button className="p-2 text-gray-500 hover:bg-gray-300 rounded"><Volume2 size={16} strokeWidth={3} /></button>
         <button className="p-2 text-gray-500 hover:bg-gray-300 rounded"><Camera size={16} strokeWidth={3} /></button>
         <button className="p-2 text-gray-500 hover:bg-gray-300 rounded"><Maximize2 size={16} strokeWidth={3} /></button>
      </div>
    </div>
  );
}

