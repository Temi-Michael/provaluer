"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { adminLogout, ADMIN_USER_KEY } from "@/lib/adminApi";

export default function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem(ADMIN_USER_KEY);
    if (userStr) {
      setAdminUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = async () => {
    await adminLogout();
    router.push("/admin-login");
  };

  return (
    <header className="h-[72px] bg-background dark:bg-[#121214] border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex items-center gap-5">
        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="hidden md:block text-right">
              <div className="text-[13px] font-bold text-black dark:text-white leading-tight">{adminUser?.FullName || "Admin"}</div>
              <div className="text-[11px] text-gray2 dark:text-gray1">{adminUser?.Role || "Moderator"}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-red text-white flex items-center justify-center font-bold text-[15px] border-2 border-surface dark:border-[#1a1a1c]">
              {adminUser?.FullName?.charAt(0) || "A"}
            </div>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-[120%] w-[200px] bg-surface dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-50 py-2">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Secure Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
