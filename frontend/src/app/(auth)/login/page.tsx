"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok && data) {
        localStorage.setItem("provaluer_token", data.token);
        localStorage.setItem("provaluer_user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        throw new Error(data?.error || data?.message || text || "Failed to login. Please try again.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-black text-white selection:bg-blue selection:text-white">
      {/* Left Pane - Marketing / Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <Image src="/auth-bg.png" alt="Provaluer Background" fill className="object-cover pointer-events-none" />
        <div className="absolute inset-0 bg-black/60" /> {/* Dark overlay for text readability */}
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_14px_rgba(10,132,255,0.4)]">P</div>
            <span className="text-[22px] font-bold tracking-tight text-white">Provaluer</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-[480px]">
          <div className="text-[12px] font-semibold tracking-widest uppercase text-blue mb-4">Provaluer Intelligence</div>
          <h2 className="text-[44px] font-bold tracking-tight leading-[1.05] mb-6">
            Property valuation,<br/>
            engineered for precision.
          </h2>
          <p className="text-[17px] text-gray2 leading-relaxed mb-8">
            Access institutional-grade valuation models, real-time market data, and instant reporting tools—all from a single, unified dashboard.
          </p>

          <div className="flex items-center gap-4 text-[14px] text-gray3">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-gray5 flex items-center justify-center text-[12px] font-medium text-white">OA</div>
              <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-blue flex items-center justify-center text-[12px] font-medium text-white">CN</div>
              <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-accent flex items-center justify-center text-[12px] font-medium text-white">JD</div>
            </div>
            <div>Joined by 2,000+ real estate professionals.</div>
          </div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
          <Link href="/marketplace" className="text-[13px] text-gray2 hover:text-white transition-colors font-medium flex items-center gap-1">
            Browse Marketplace <span className="text-lg">→</span>
          </Link>
        </div>
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo (hidden on desktop since left pane has it) */}
          <div className="lg:hidden mb-12">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_14px_rgba(10,132,255,0.4)]">P</div>
              <span className="text-[22px] font-bold tracking-tight text-white">Provaluer</span>
            </Link>
          </div>

          <div className="mb-10">
            <h1 className="text-[28px] font-bold tracking-tight text-white mb-2">Welcome back</h1>
            <p className="text-[15px] text-gray2">Sign in to your Provaluer dashboard.</p>
          </div>

          {isVerified && (
            <div className="bg-[#30d158]/10 border border-[#30d158]/30 text-[#30d158] text-[13px] p-4 rounded-xl text-center mb-6 font-medium">
              Your account has been successfully verified! Please log in below.
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red/10 border border-red/20 text-red text-[13px] p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-gray2 font-medium">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors placeholder:text-gray4" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[13px] text-gray2 font-medium">Password</label>
                <Link href="#" className="text-[13px] text-blue hover:underline">Forgot password?</Link>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors placeholder:text-gray4" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#e8e8ed] transition-transform hover:scale-[1.02] mt-6 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-center text-[14px] text-gray2">
            Don't have an account? <Link href="/register" className="text-white hover:underline font-medium">Create one now</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
