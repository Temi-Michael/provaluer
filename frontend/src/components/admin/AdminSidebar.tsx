"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { adminLogout } from "@/lib/adminApi";

export default function AdminSidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin-login");
  };

  const navLinkClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(path + "/");
    return `flex items-center gap-3 px-6 py-2.5 text-[14px] font-medium cursor-pointer transition-colors border-l-[3px] ${
      isActive 
        ? "bg-red/10 text-red border-red" 
        : "text-gray2 dark:text-gray1 border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
    }`;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[199] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-[250px] bg-surface dark:bg-[#1a1a1c] border-r border-black/10 dark:border-white/10 flex flex-col z-[200] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 text-[18px] font-black tracking-tight border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red shadow-[0_0_8px_#ff453a] animate-pulse"></div>
          ADMIN GATEWAY
        </div>

        {/* Scrollable Nav */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-gray3 px-6 pb-2">Command</div>

          <Link href="/admin/dashboard" className={navLinkClass("/admin/dashboard")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">⚙️</span> Command Center
          </Link>

          <Link href="/admin/market-data" className={navLinkClass("/admin/market-data")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">🗃️</span> Market Data
          </Link>

          <Link href="/admin/settings" className={navLinkClass("/admin/settings")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">🛠️</span> Config Settings
          </Link>
        </div>

        <div className="p-4 border-t border-black/10 dark:border-white/10 mt-auto flex flex-col gap-2">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 px-2 py-2.5 text-[14px] font-medium text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors w-full text-left"
            >
              <span className="w-5 text-center text-[16px]">{theme === "dark" ? "☀️" : "🌙"}</span> 
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-2 py-2.5 text-[14px] font-medium text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors w-full text-left"
          >
            <span className="w-5 text-center text-[16px]">↪</span> Secure Logout
          </button>
        </div>
      </aside>
    </>
  );
}
