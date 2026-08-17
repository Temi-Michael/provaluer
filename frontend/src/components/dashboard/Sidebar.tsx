"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Track open state for submenus
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSubmenu = (menu: string) => {
    if (openSubmenu === menu) setOpenSubmenu(null);
    else setOpenSubmenu(menu);
  };

  const handleLogout = () => {
    localStorage.removeItem("provaluer_token");
    localStorage.removeItem("provaluer_user");
    router.push("/login");
  };

  const navLinkClass = (path: string) => {
    const isActive = pathname === path || pathname.startsWith(path + "/");
    return `flex items-center gap-3 px-6 py-2.5 text-[14px] font-medium cursor-pointer transition-colors border-l-[3px] ${
      isActive 
        ? "bg-blue/10 text-blue border-blue" 
        : "text-gray2 dark:text-gray1 border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
    }`;
  };

  const submenuLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `block py-2 px-6 pl-14 text-[13px] transition-colors ${
      isActive ? "text-blue font-semibold" : "text-gray2 hover:text-white hover:bg-white/5"
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
        className={`fixed top-0 left-0 h-screen w-[250px] bg-surface dark:bg-[#0d0d0e] border-r border-black/10 dark:border-white/10 flex flex-col z-[200] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 text-[18px] font-black tracking-tight border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_#30d158]"></div>
          PROvaluer
        </div>

        {/* Scrollable Nav */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-gray3 px-6 pb-2">Menu</div>

          <Link href="/dashboard" className={navLinkClass("/dashboard")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">🏠</span> Dashboard
          </Link>

          <Link href="/portfolio" className={navLinkClass("/portfolio")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">🏢</span> Portfolio CRM
          </Link>

          <Link href="/models" className={navLinkClass("/models")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">▤</span> My Models
          </Link>

          <Link href="/create" className={navLinkClass("/create")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">➕</span> Create Model
          </Link>

          <div className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-gray3 px-6 pb-2">Tools</div>

          <Link href="/measure" className={navLinkClass("/measure")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">📏</span> Distance &amp; Area Tool
          </Link>

          <div className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-gray3 px-6 pb-2">Discover</div>

          <Link href="/intelligence" className={navLinkClass("/intelligence")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">📊</span> Market Intelligence
          </Link>

          <Link href="/marketplace" className={navLinkClass("/marketplace")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">🌍</span> Marketplace
          </Link>

          <Link href="/subscription" className={navLinkClass("/subscription")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">💳</span> Subscription
          </Link>

          <Link href="/profile" className={navLinkClass("/profile")} onClick={() => setIsOpen(false)}>
            <span className="w-5 text-center text-[16px]">👤</span> My Profile
          </Link>
        </div>

        {/* Footer actions */}
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
            <span className="w-5 text-center text-[16px]">↪</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
