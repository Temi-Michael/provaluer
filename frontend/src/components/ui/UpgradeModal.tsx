import React from "react";
import Link from "next/link";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const DoodleCrownDiamond = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[160px] mb-6">
    <g transform="translate(0, 10)">
      {/* Offset Color Fills (Premium Gold) */}
      <path d="M68 50 L80 18 L100 35 L120 18 L132 50 Z" fill="#D4AF37" fillOpacity="0.8" transform="translate(6, -4)"/>
      <path d="M38 85 L100 170 L162 85 L120 50 L80 50 Z" fill="#D4AF37" fillOpacity="0.2" transform="translate(-6, 8)"/>
      
      {/* Sparkles */}
      <path d="M30 30 L33 40 L43 43 L33 46 L30 56 L27 46 L17 43 L27 40 Z" fill="#F3E5AB"/>
      <path d="M165 40 L167 46 L173 48 L167 50 L165 56 L163 50 L157 48 L163 46 Z" fill="white" fillOpacity="0.8"/>
      <path d="M150 140 L152 144 L156 146 L152 148 L150 152 L148 148 L144 146 L148 144 Z" fill="#F3E5AB" fillOpacity="0.6"/>

      {/* Diamond Rough Strokes */}
      <path d="M40 80 Q 60 115, 100 175 Q 130 135, 160 80 Q 140 60, 120 50 Q 100 48, 80 50 Q 60 60, 40 80 Z" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38 80 Q 100 78, 162 80" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M80 50 Q 65 65, 55 80 Q 75 125, 100 175" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M120 50 Q 135 65, 145 80 Q 125 125, 100 175" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M80 50 Q 95 65, 100 80" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M120 50 Q 105 65, 100 80" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Crown Rough Strokes */}
      <path d="M68 50 Q 75 30, 80 15 Q 90 25, 100 35 Q 110 25, 120 15 Q 125 30, 132 50" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Crown Jewels */}
      <circle cx="80" cy="15" r="4.5" fill="white"/>
      <circle cx="100" cy="35" r="4.5" fill="white"/>
      <circle cx="120" cy="15" r="4.5" fill="white"/>
    </g>
  </svg>
);

export default function UpgradeModal({
  isOpen,
  onClose,
  title = "Upgrade to Pro",
  message = "You've reached the monthly limit for your current plan. Upgrade to a premium tier to unlock more valuations and advanced features."
}: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[450px] bg-[#141415] border border-white/10 rounded-3xl shadow-2xl overflow-hidden transform transition-all">
        {/* Decorative Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue via-purple-500 to-blue" />
        
        <div className="p-8">
          <div className="w-16 h-16 rounded-2xl bg-blue/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          
          <DoodleCrownDiamond />

          <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
          <p className="text-[15px] text-gray2 leading-relaxed mb-8">
            {message}
          </p>
          
          <div className="flex flex-col gap-3">
            <Link 
              href="/subscription"
              onClick={onClose}
              className="w-full py-3.5 bg-blue hover:bg-[#0070f0] text-white text-[15px] font-semibold rounded-xl transition-colors text-center shadow-[0_0_20px_rgba(10,132,255,0.3)]"
            >
              View Upgrade Options
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white text-[15px] font-medium rounded-xl transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
