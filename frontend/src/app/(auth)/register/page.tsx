"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    role: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok) {
        setIsSuccess(true);
      } else {
        setError(data?.error || data?.message || text || "Failed to register. Please try again.");
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
          <div className="text-[12px] font-semibold tracking-widest uppercase text-accent mb-4">Start Your Journey</div>
          <h2 className="text-[44px] font-bold tracking-tight leading-[1.05] mb-6">
            Make confident<br/>
            decisions, faster.
          </h2>
          <p className="text-[17px] text-gray2 leading-relaxed mb-12">
            Join thousands of modern real estate professionals who trust Provaluer to price, analyze, and list properties with surgical precision.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white text-[12px]">1</div>
              <div>
                <h4 className="text-[15px] font-semibold text-white mb-1">Create your account</h4>
                <p className="text-[14px] text-gray2">Takes less than 60 seconds.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white text-[12px]">2</div>
              <div>
                <h4 className="text-[15px] font-semibold text-white mb-1">Choose a valuation model</h4>
                <p className="text-[14px] text-gray2">Select from Comparable, Income, Cost, or DCF.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white text-[12px]">3</div>
              <div>
                <h4 className="text-[15px] font-semibold text-white mb-1">Get instant results</h4>
                <p className="text-[14px] text-gray2">Export professional PDF reports instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 h-screen overflow-y-auto relative">
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
          <Link href="/marketplace" className="text-[13px] text-gray2 hover:text-white transition-colors font-medium flex items-center gap-1">
            Browse Marketplace <span className="text-lg">→</span>
          </Link>
        </div>
        <div className="w-full max-w-[440px] my-auto py-12">
          {/* Mobile Logo (hidden on desktop since left pane has it) */}
          <div className="lg:hidden mb-12">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_14px_rgba(10,132,255,0.4)]">P</div>
              <span className="text-[22px] font-bold tracking-tight text-white">Provaluer</span>
            </Link>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-blue/10 border border-blue/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-[28px] font-bold tracking-tight text-white mb-4">Check your email</h1>
              <p className="text-[15px] text-gray2 leading-relaxed mb-8">
                We've sent a verification link to <b className="text-white">{formData.email}</b>. 
                Please click the link in the email to activate your account.
              </p>
              <Link href="/login" className="inline-block w-full bg-white text-black font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#e8e8ed] transition-transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                Return to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <h1 className="text-[28px] font-bold tracking-tight text-white mb-2">Create an account</h1>
                <p className="text-[15px] text-gray2">Start valuing properties with absolute precision.</p>
              </div>

              <form className="space-y-5" onSubmit={handleRegister}>
                {error && (
                  <div className="bg-red/10 border border-red/20 text-red text-[13px] p-3 rounded-xl text-center">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] text-gray2 font-medium">Full Name</label>
                    <input 
                      type="text" 
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe" 
                      className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors placeholder:text-gray4" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] text-gray2 font-medium">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      placeholder="+234 ..." 
                      className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors placeholder:text-gray4" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] text-gray2 font-medium">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com" 
                    className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors placeholder:text-gray4" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] text-gray2 font-medium">Primary Role</label>
                  <select 
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-black">Select your role</option>
                    <option value="Homeowner" className="text-black">Homeowner</option>
                    <option value="Investor" className="text-black">Investor</option>
                    <option value="Agent" className="text-black">Real Estate Agent</option>
                    <option value="Lender" className="text-black">Lender / Bank</option>
                    <option value="Valuer" className="text-black">Valuer / Appraiser</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] text-gray2 font-medium">Password</label>
                  <input 
                    type="password" 
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••" 
                    className="bg-[#141415] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white outline-none focus:border-blue focus:bg-[#1c1c1e] transition-colors placeholder:text-gray4" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-white text-black font-semibold text-[15px] py-3.5 rounded-xl hover:bg-[#e8e8ed] transition-transform hover:scale-[1.02] mt-6 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <div className="mt-8 text-center text-[14px] text-gray2">
                Already have an account? <Link href="/login" className="text-white hover:underline font-medium">Sign in here</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
