"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PortfolioDashboard() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPrefs, setUserPrefs] = useState({ portfolio_currency: "NGN", exchange_rate: 1400 });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("provaluer_user") || "{}");
      setUserPrefs({
        portfolio_currency: user.portfolio_currency || "NGN",
        exchange_rate: user.exchange_rate || 1400
      });
    } catch(e) {}

    const fetchPortfolio = async () => {
      const token = localStorage.getItem("provaluer_token");
      if (!token) return router.push("/login");

      try {
        const res = await fetch("/api/portfolio/properties", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {}

        if (res.ok && data) {
          setProperties(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [router]);

  if (loading) return <div className="p-8 text-gray2">Loading portfolio...</div>;

  const totalValue = properties.reduce((sum, p) => {
    let val = p.current_value || p.purchase_price || 0;
    
    // Normalize to User's Portfolio Currency
    if (p.purchase_currency === "USD" && userPrefs.portfolio_currency === "NGN") {
      val = val * userPrefs.exchange_rate;
    } else if (p.purchase_currency === "NGN" && userPrefs.portfolio_currency === "USD") {
      val = val / userPrefs.exchange_rate;
    }

    return sum + val;
  }, 0);

  const rentedCount = properties.filter(p => p.status === "Rented").length;

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Portfolio CRM</h1>
          <p className="text-[14px] text-gray2 mt-1">Manage all your properties, tenants, and financials in one place.</p>
        </div>
        <Link 
          href="/portfolio/properties/new" 
          className="bg-blue hover:bg-[#0070f0] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-[18px] leading-none">+</span> Add Property
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl p-6">
          <div className="text-[13px] font-bold text-gray2 uppercase tracking-widest mb-2">Total Value</div>
          <div className="text-[32px] font-black text-black dark:text-white">
            {userPrefs.portfolio_currency === "NGN" ? "₦" : "$"}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl p-6">
          <div className="text-[13px] font-bold text-gray2 uppercase tracking-widest mb-2">Total Properties</div>
          <div className="text-[32px] font-black text-black dark:text-white">{properties.length}</div>
        </div>
        <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl p-6">
          <div className="text-[13px] font-bold text-gray2 uppercase tracking-widest mb-2">Occupancy Rate</div>
          <div className="text-[32px] font-black text-blue">
            {properties.length > 0 ? Math.round((rentedCount / properties.length) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/portfolio/properties" className="group bg-surface dark:bg-[#1c1c1e] hover:bg-black/5 dark:hover:bg-[#2c2c2e] border border-black/5 dark:border-white/5 rounded-2xl p-6 transition-colors flex items-center justify-between">
          <div>
            <h3 className="text-[20px] font-bold text-black dark:text-white mb-1">Properties List</h3>
            <p className="text-[13px] text-gray2">View and manage your {properties.length} properties.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue text-white flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            →
          </div>
        </Link>
        <Link href="/portfolio/transactions" className="group bg-surface dark:bg-[#1c1c1e] hover:bg-black/5 dark:hover:bg-[#2c2c2e] border border-black/5 dark:border-white/5 rounded-2xl p-6 transition-colors flex items-center justify-between">
          <div>
            <h3 className="text-[20px] font-bold text-black dark:text-white mb-1">Financial Ledger</h3>
            <p className="text-[14px] text-gray2">Track income, rent, and maintenance expenses.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue group-hover:text-white transition-colors">
            →
          </div>
        </Link>
      </div>

    </div>
  );
}
