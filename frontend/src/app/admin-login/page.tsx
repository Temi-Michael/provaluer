"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Strict isolation: store admin tokens under a different namespace
        localStorage.setItem("provaluer_admin_token", data.data.token);
        localStorage.setItem("provaluer_admin_user", JSON.stringify(data.data.admin));
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Invalid admin credentials");
      }
    } catch (err) {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Red ambient glow for Admin context */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-red/30 bg-red/10 text-red mb-6">
            <div className="w-2 h-2 rounded-full bg-red shadow-[0_0_8px_#ff453a] animate-pulse"></div>
            <span className="text-[13px] font-bold tracking-widest uppercase">Admin Gateway</span>
          </div>
          <h1 className="text-[32px] font-black text-white tracking-tight mb-2">Restricted Access</h1>
          <p className="text-gray2 text-[15px]">Please authenticate to access the command center.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#121214] border border-white/10 rounded-[24px] p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red/10 border border-red/20 rounded-xl text-red text-[14px] text-center">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-gray2 uppercase tracking-widest mb-2">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white focus:outline-none focus:border-red transition-colors"
                placeholder="admin@provaluer.com"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-bold text-gray2 uppercase tracking-widest mb-2">Secure Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white focus:outline-none focus:border-red transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red text-white font-bold py-4 rounded-xl hover:bg-red/90 transition-colors mt-4 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Enter Command Center"}
            </button>
          </div>
        </form>

        <div className="text-center mt-8">
          <Link href="/login" className="text-gray2 hover:text-white transition-colors text-[14px]">
            Return to Standard User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
