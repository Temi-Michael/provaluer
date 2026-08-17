"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NavbarAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("provaluer_token");
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("provaluer_token");
    setIsAuthenticated(false);
    router.refresh();
  };

  if (loading) {
    return <div className="w-[140px] h-8 animate-pulse bg-black/5 dark:bg-white/5 rounded-full"></div>;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/dashboard" className="text-[13px] text-gray2 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap">
          Dashboard
        </Link>
        <button onClick={handleLogout} className="bg-red-500 text-white text-[13px] font-semibold px-4 py-1.5 rounded-full hover:bg-red-600 transition-transform hover:scale-105 whitespace-nowrap">
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link href="/login" className="text-[13px] text-gray2 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap">
        Sign In
      </Link>
      <Link href="/register" className="bg-black text-white dark:bg-white dark:text-black text-[13px] font-semibold px-4 py-1.5 rounded-full hover:bg-gray-800 dark:hover:bg-[#e8e8ed] transition-transform hover:scale-105 whitespace-nowrap">
        Get Started
      </Link>
    </div>
  );
}
