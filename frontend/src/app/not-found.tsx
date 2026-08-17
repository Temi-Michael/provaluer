import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="flex min-h-screen bg-black text-white selection:bg-blue selection:text-white flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-[600px]">
        {/* Animated 404 Text */}
        <div className="text-[120px] sm:text-[180px] font-black tracking-tighter leading-none bg-gradient-to-b from-white to-white/10 text-transparent bg-clip-text mb-4 select-none">
          404
        </div>

        <h1 className="text-[24px] sm:text-[32px] font-bold tracking-tight mb-4">
          Lost in the real estate market.
        </h1>
        
        <p className="text-[16px] text-gray2 leading-relaxed mb-10 max-w-[400px]">
          The page or property you are looking for does not exist, has been removed, or is temporarily unavailable.
        </p>

        <Link 
          href="/" 
          className="bg-white text-black font-semibold text-[15px] px-8 py-3.5 rounded-xl hover:bg-[#e8e8ed] transition-transform hover:-translate-y-0.5 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Return to Dashboard
        </Link>
      </div>

      {/* Brand Watermark */}
      <div className="absolute bottom-10 flex items-center gap-2 opacity-30 select-none pointer-events-none">
        <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black font-bold text-xs">P</div>
        <span className="text-[14px] font-bold tracking-widest uppercase">Provaluer</span>
      </div>

    </main>
  );
}
