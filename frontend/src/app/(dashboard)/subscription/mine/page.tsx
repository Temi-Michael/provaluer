"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_LIMITS, priceForTier } from "@/lib/tiers";

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      const token = localStorage.getItem("provaluer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/subscription/mine", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {}

        if (res.ok && data) {
          setSubscription(data);
        } else {
          console.error(data?.error || data?.message || text || "Failed to fetch subscription");
        }
      } catch (e) {
        console.error("Failed to fetch subscription");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [router]);

  const handleUpgrade = async (plan: string) => {
    setUpgradingTo(plan);
    const token = localStorage.getItem("provaluer_token");
    
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ plan_tier: plan })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok) {
        // Refresh page to show new active subscription
        window.location.reload();
      } else {
        console.error(data?.error || data?.message || text || "Upgrade failed");
      }
    } finally {
      setUpgradingTo(null);
    }
  };

  if (loading) return <div className="p-8 text-gray2">Loading subscription data...</div>;

  const currentPlan = subscription?.PlanTier || "Free";
  const used = subscription?.ModelsUsedThisMonth || 0;
  const limit = subscription?.MonthlyLimit || 5;
  const progressPercent = Math.min((used / limit) * 100, 100);

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-[24px] font-bold tracking-tight">Subscription Plan</h1>
        <div className="text-[13px] text-gray2">
          Dashboard <span className="mx-2">/</span> <b className="text-gray1">Subscription</b>
        </div>
      </div>

      {/* Current Usage Banner */}
      <div className="bg-white dark:bg-[#1c1c1e] shadow-lg dark:shadow-none border border-transparent dark:border-white/5 rounded-xl p-6 sm:p-8 mb-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-[18px] font-bold text-black dark:text-white mb-2">Current Plan: <span className="text-blue">{currentPlan}</span></h2>
          <p className="text-[14px] text-gray2">You have used {used} of your {limit} models this month.</p>
        </div>
        
        <div className="w-full md:max-w-[400px]">
          <div className="flex justify-between text-[12px] font-bold text-gray2 mb-2 uppercase tracking-widest">
            <span>Usage</span>
            <span className={used >= limit ? "text-red" : "text-black dark:text-white"}>{used} / {limit}</span>
          </div>
          <div className="h-[8px] bg-gray5 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out rounded-full ${
                progressPercent > 80 ? "bg-red" : "bg-blue"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <h2 className="text-[20px] font-bold tracking-tight mb-6">Upgrade your plan</h2>
      
      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Free Tier */}
        <div className={`rounded-2xl p-8 border transition-all ${
          currentPlan === "Free" ? "bg-white dark:bg-white/5 border-transparent dark:border-white/20 shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-2 ring-blue z-10" : "bg-surface dark:bg-transparent border-transparent dark:border-white/10 shadow-sm"
        }`}>
          {currentPlan === "Free" && <div className="text-[11px] font-bold text-blue uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue animate-pulse"></span> Active Plan</div>}
          <h3 className="text-[24px] font-bold mb-2">Starter</h3>
          <div className="text-[36px] font-extrabold mb-6">₦0<span className="text-[16px] text-gray3 dark:text-gray2 font-normal"> /mo</span></div>
          <ul className="space-y-4 mb-8 text-[14px] text-gray1">
            <li className="flex items-center gap-3"><span className="text-green">✓</span> {TIER_LIMITS.Free} property valuations/month</li>
            <li className="flex items-center gap-3"><span className="text-green">✓</span> Market Comparable Models</li>
            <li className="flex items-center gap-3 text-gray3"><span className="text-gray3">×</span> API Access</li>
            <li className="flex items-center gap-3 text-gray3"><span className="text-gray3">×</span> Custom Report Branding</li>
          </ul>
          <button 
            disabled={currentPlan === "Free"}
            className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-colors ${
              currentPlan === "Free" ? "bg-blue/10 text-blue cursor-default" : "bg-gray5 dark:bg-white/5 text-gray2 hover:text-black dark:hover:text-white"
            }`}
          >
            {currentPlan === "Free" ? "Currently Active" : "Downgrade"}
          </button>
        </div>

        {/* Professional Tier */}
        <div className={`rounded-2xl p-8 border relative overflow-hidden transition-all ${
          currentPlan === "Professional" ? "bg-blue/10 border-blue shadow-xl dark:shadow-[0_0_30px_rgba(10,132,255,0.15)] scale-105 z-10 ring-2 ring-blue" : "bg-white dark:bg-[#1c1c1e] border-transparent dark:border-white/10 shadow-sm"
        }`}>
          {currentPlan !== "Professional" && (
            <div className="absolute top-0 right-0 bg-blue text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
              Most Popular
            </div>
          )}
          {currentPlan === "Professional" && <div className="text-[11px] font-bold text-blue uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue animate-pulse"></span> Active Plan</div>}
          
          <h3 className="text-[24px] font-bold mb-2">Professional</h3>
          <div className="text-[36px] font-extrabold mb-6 text-black dark:text-white">{priceForTier("Professional")}<span className="text-[16px] text-gray3 dark:text-gray2 font-normal"> /mo</span></div>
          <ul className="space-y-4 mb-8 text-[14px] text-gray1 dark:text-white/90">
            <li className="flex items-center gap-3"><span className="text-blue">✓</span> {TIER_LIMITS.Professional} property valuations/month</li>
            <li className="flex items-center gap-3"><span className="text-blue">✓</span> All 4 Model Types (DCF, Cost, Income)</li>
            <li className="flex items-center gap-3"><span className="text-blue">✓</span> Developer API Access</li>
            <li className="flex items-center gap-3 text-gray3"><span className="text-gray3">×</span> Custom Report Branding</li>
          </ul>
          <button 
            onClick={() => handleUpgrade("Professional")}
            disabled={currentPlan === "Professional" || upgradingTo === "Professional"}
            className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-colors ${
              currentPlan === "Professional" ? "bg-blue/20 text-blue cursor-default" : "bg-blue hover:bg-[#0070f0] text-white"
            }`}
          >
            {currentPlan === "Professional" ? "Currently Active" : upgradingTo === "Professional" ? "Upgrading..." : "Upgrade to Pro"}
          </button>
        </div>

        {/* Enterprise Tier */}
        <div className={`rounded-2xl p-8 border transition-all ${
          currentPlan === "Enterprise" ? "bg-purple/10 border-purple shadow-xl dark:shadow-[0_0_30px_rgba(175,82,222,0.15)] ring-2 ring-purple z-10" : "bg-surface dark:bg-transparent border-transparent dark:border-white/10 shadow-sm"
        }`}>
          {currentPlan === "Enterprise" && <div className="text-[11px] font-bold text-purple uppercase tracking-widest mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple animate-pulse"></span> Active Plan</div>}
          <h3 className="text-[24px] font-bold mb-2">Enterprise</h3>
          <div className="text-[36px] font-extrabold mb-6">{priceForTier("Enterprise")}<span className="text-[16px] text-gray3 dark:text-gray2 font-normal"> /mo</span></div>
          <ul className="space-y-4 mb-8 text-[14px] text-gray1">
            <li className="flex items-center gap-3"><span className="text-purple">✓</span> {TIER_LIMITS.Enterprise} valuations/month</li>
            <li className="flex items-center gap-3"><span className="text-purple">✓</span> Priority Support</li>
            <li className="flex items-center gap-3"><span className="text-purple">✓</span> Dedicated Account Manager</li>
            <li className="flex items-center gap-3"><span className="text-purple">✓</span> Custom Report Branding</li>
          </ul>
          <button 
            onClick={() => handleUpgrade("Enterprise")}
            disabled={currentPlan === "Enterprise" || upgradingTo === "Enterprise"}
            className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-colors ${
              currentPlan === "Enterprise" ? "bg-purple/20 text-purple cursor-default" : "bg-black text-white hover:bg-gray1 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
            }`}
          >
            {currentPlan === "Enterprise" ? "Currently Active" : upgradingTo === "Enterprise" ? "Upgrading..." : "Upgrade to Enterprise"}
          </button>
        </div>

      </div>

    </div>
  );
}
