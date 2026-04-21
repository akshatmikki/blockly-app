"use client";

import React from "react";

export default function MicrobitSimulator() {
  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <div className="relative w-[340px] h-[280px] bg-[#1a1a1a] rounded-[28px] shadow-2xl overflow-hidden border-[1px] border-white/10">
        {/* Top Branding / Design Area */}
        <div className="absolute top-0 left-0 w-full h-[80px] overflow-hidden pointer-events-none">
           {/* Abstract green pattern like in the image */}
           <div className="absolute top-0 left-0 w-full h-full bg-[#000]" />
           <div 
             className="absolute -top-10 -left-10 w-48 h-48 bg-[#22d1ee] rotate-12 origin-bottom-right" 
             style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 80% 60%, 60% 90%, 40% 70%, 20% 90%, 0% 60%)' }}
           />
           <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <div className="w-14 h-8 rounded-full bg-[#111] border-2 border-[#333] flex items-center justify-center gap-1.5 p-1 px-2 cursor-pointer hover:border-[#444] transition-colors shadow-inner">
                 <div className="w-3 h-3 rounded-sm bg-[#55ffcc] shadow-[0_0_10px_rgba(85,255,204,0.6)]" />
                 <div className="w-3 h-3 rounded-sm bg-[#55ffcc] shadow-[0_0_10px_rgba(85,255,204,0.6)]" />
              </div>
           </div>
        </div>

        {/* LED Matrix Area */}
        <div className="absolute top-[85px] left-1/2 -translate-x-1/2 grid grid-cols-5 gap-4">
          {[...Array(25)].map((_, i) => (
            <div 
              key={i} 
              className="w-2 h-6 bg-[#252525] rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border-b border-white/5" 
            />
          ))}
        </div>

        {/* Buttons A & B */}
        <div className="absolute left-8 top-[140px] group cursor-pointer active:scale-95 transition-transform">
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#333] to-[#111] border-2 border-[#444] flex items-center justify-center shadow-xl">
             <div className="w-10 h-10 rounded-full bg-[#222] border border-white/5 flex items-center justify-center">
                <div className="w-4 h-4 grid grid-cols-2 gap-1">
                   {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#333]" />)}
                </div>
             </div>
          </div>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[#55ffcc] font-black text-2xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">A</div>
        </div>

        <div className="absolute right-8 top-[140px] group cursor-pointer active:scale-95 transition-transform">
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#333] to-[#111] border-2 border-[#444] flex items-center justify-center shadow-xl">
             <div className="w-10 h-10 rounded-full bg-[#222] border border-white/5 flex items-center justify-center">
                <div className="w-4 h-4 grid grid-cols-2 gap-1">
                   {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#333]" />)}
                </div>
             </div>
          </div>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[#55ffcc] font-black text-2xl tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">B</div>
        </div>

        {/* Directional marks for buttons */}
        <div className="absolute left-4 top-[170px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-[#55ffcc]/40" />
        <div className="absolute right-4 top-[170px] w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-[#55ffcc]/40" />

        {/* Bottom Pin Header */}
        <div className="absolute bottom-0 left-0 w-full h-[75px] bg-[#f2c94c] grid grid-cols-5 gap-0 px-2 pt-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.15)] rounded-b-[20px] overflow-hidden">
           {[
              { label: "0", size: "w-full" },
              { label: "1", size: "w-full" },
              { label: "2", size: "w-full" },
              { label: "3V", size: "w-full" },
              { label: "GND", size: "w-full" }
           ].map((pin, i) => (
              <div key={i} className={`relative flex flex-col items-center justify-start h-full pt-1 border-x border-black/10 group cursor-default`}>
                 <div className="w-[85%] h-[90%] flex flex-col gap-0.5 opacity-20">
                    {[...Array(24)].map((_, j) => (
                       <div key={j} className="h-[2px] w-full bg-black/60" />
                    ))}
                 </div>
                 <div className="absolute top-2 w-10 h-10 rounded-full border-[3px] border-black/80 flex items-center justify-center text-black font-black text-sm group-hover:scale-110 transition-transform">
                    {pin.label}
                 </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
}

