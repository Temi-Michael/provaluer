"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<{name: string, role: string} | null>(null);

  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    // Check which user profile to load based on context
    const storageKey = isAdminRoute ? "provaluer_admin_user" : "provaluer_user";
    const userStr = localStorage.getItem(storageKey);
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        // Admin user payload from backend has "name", standard user has "fullName" or "name"
        setUser({ name: parsed.name || parsed.fullName || "Admin", role: parsed.role });
      } catch (e) {}
    }
  }, [isAdminRoute]);

  const handleLogout = () => {
    if (isAdminRoute) {
      localStorage.removeItem("provaluer_admin_token");
      localStorage.removeItem("provaluer_admin_user");
      router.push("/admin-login");
    } else {
      localStorage.removeItem("provaluer_token");
      localStorage.removeItem("provaluer_user");
      router.push("/login");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "A";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-[60px] bg-surface/85 dark:bg-black/85 backdrop-blur-[20px] saturate-180 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-4 sm:px-7 sticky top-0 z-[150] shrink-0">
      
      {/* Left side: Hamburger + Page Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden text-black dark:text-white text-[20px] hover:text-gray1 transition-colors"
        >
          ☰
        </button>
        <div className="text-[14px] text-gray2 font-medium hidden sm:block">
          {isAdminRoute ? "Admin Command Center" : "Automated Estimation Model"}
        </div>
      </div>

      {/* Right side: Profile Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${isAdminRoute ? 'bg-gradient-to-br from-red to-orange-500' : 'bg-gradient-to-br from-purple to-blue'} flex items-center justify-center text-[13px] font-bold text-white shadow-inner`}>
              {getInitials(user?.name || "")}
            </div>
            <span className="text-[13px] font-semibold text-black dark:text-white hidden sm:block">
              {user?.name?.split(" ")[0] || "Account"}
            </span>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Invisible click-away overlay */}
              <div 
                className="fixed inset-0 z-[-1]" 
                onClick={() => setDropdownOpen(false)}
              ></div>
              
              <div className="absolute top-[48px] right-0 w-[200px] bg-surface dark:bg-[#1c1c1e] border border-black/10 dark:border-white/10 rounded-[14px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                {!isAdminRoute && (
                  <>
                    <Link 
                      href="/profile" 
                      className="block px-4 py-3 text-[13px] text-gray2 dark:text-gray1 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link 
                      href="/subscription/mine" 
                      className="block px-4 py-3 text-[13px] text-gray2 dark:text-gray1 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Subscription Plan
                    </Link>
                    <div className="h-[1px] bg-black/10 dark:bg-white/10 my-1 mx-2" />
                  </>
                )}
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-[13px] text-red hover:bg-red/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </header>
  );
}
