"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { limitForTier } from "@/lib/tiers";
import { adminFetch } from "@/lib/adminApi";
import AlertModal, { AlertState } from "@/components/ui/AlertModal";

interface AdminStats {
  total_users: number;
  total_active_subs: number;
  total_models: number;
  estimated_mrr: number;
}

interface User {
  ID: string;
  FullName: string;
  Email: string;
  Role: string;
  CreatedAt: string;
  Subscriptions?: any[];
}

export default function AdminPortal() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  
  // Modal Form State
  const [planTier, setPlanTier] = useState("Free");
  const [monthlyLimit, setMonthlyLimit] = useState(limitForTier("Free"));
  const [customAgency, setCustomAgency] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [customLogo, setCustomLogo] = useState("");
  const [customFont, setCustomFont] = useState("");

  // The admin layout already gates on token presence; the backend enforces the
  // real check and adminFetch redirects if the session has expired.
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminFetch("/api/admin/stats"),
        adminFetch("/api/admin/users")
      ]);

      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success) setStats(json.data);
      }
      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.success) setUsers(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    
    // Pre-fill form if they have an active sub
    const activeSub = user.Subscriptions?.find((s: any) => s.IsActive);
    if (activeSub) {
      setPlanTier(activeSub.PlanTier);
      setMonthlyLimit(activeSub.MonthlyLimit);
      setCustomAgency(activeSub.CustomAgencyName || "");
      setCustomColor(activeSub.CustomBrandColor || "");
      setCustomLogo(activeSub.CustomLogo || "");
      setCustomFont(activeSub.CustomFont || "");
    } else {
      setPlanTier("Free");
      setMonthlyLimit(limitForTier("Free"));
      setCustomAgency("");
      setCustomColor("");
      setCustomLogo("");
      setCustomFont("");
    }
    
    setShowModal(true);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      const res = await adminFetch(`/api/admin/users/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.ID,
          plan_tier: planTier,
          monthly_limit: Number(monthlyLimit),
          custom_agency_name: customAgency,
          custom_brand_color: customColor,
          custom_logo: customLogo,
          custom_font: customFont
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        fetchData(); // Refresh table
        setAlert({
          variant: "success",
          title: "Subscription updated",
          message: `${selectedUser.Email} is now on the ${planTier} plan. They have been emailed a confirmation.`,
        });
      } else {
        setAlert({
          variant: "error",
          title: "Update failed",
          message: data.error || "The subscription could not be updated. Please try again.",
        });
      }
    } catch (err) {
      // adminFetch redirects on 401, so anything reaching here is a network fault.
      setAlert({
        variant: "error",
        title: "Network error",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  };

  if (loading) {
    return <div className="p-10 flex justify-center text-gray2 dark:text-gray1">Loading Admin Portal...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-[32px] font-black tracking-tight mb-2">Admin Portal</h1>
        <p className="text-gray2 dark:text-gray1 text-[16px]">Manage users, subscriptions, and platform metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-surface dark:bg-[#1a1a1c] p-6 rounded-2xl border border-black/10 dark:border-white/10 ">
          <div className="text-gray2 dark:text-gray1 text-[13px] font-semibold uppercase tracking-widest mb-1">Total Users</div>
          <div className="text-[32px] font-bold text-blue">{stats?.total_users || 0}</div>
        </div>
        <div className="bg-surface dark:bg-[#1a1a1c] p-6 rounded-2xl border border-black/10 dark:border-white/10 ">
          <div className="text-gray2 dark:text-gray1 text-[13px] font-semibold uppercase tracking-widest mb-1">Active Pro Subs</div>
          <div className="text-[32px] font-bold text-green">{stats?.total_active_subs || 0}</div>
        </div>
        <div className="bg-surface dark:bg-[#1a1a1c] p-6 rounded-2xl border border-black/10 dark:border-white/10 ">
          <div className="text-[12px] font-bold tracking-widest uppercase text-gray2 dark:text-gray1 mb-2">Models Generated</div>
          <div className="text-[32px] font-bold text-black dark:text-white ">{stats?.total_models || 0}</div>
        </div>
        <div className="bg-surface dark:bg-[#1a1a1c] p-6 rounded-2xl border border-black/10 dark:border-white/10 ">
          <div className="text-gray2 dark:text-gray1 text-[13px] font-semibold uppercase tracking-widest mb-1">Est. MRR (NGN)</div>
          <div className="text-[32px] font-bold text-gold">₦{(stats?.estimated_mrr || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="p-6 border-b border-black/10 dark:border-white/10 ">
          <h2 className="text-[20px] font-bold">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-[13px] text-gray2 dark:text-gray1 uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Current Tier</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10 ">
              {users.map(u => {
                const activeSub = u.Subscriptions?.find((s: any) => s.IsActive);
                const tier = activeSub ? activeSub.PlanTier : "Free";
                
                return (
                  <tr key={u.ID} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{u.FullName}</td>
                    <td className="px-6 py-4 text-gray2 dark:text-gray1 ">{u.Email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[12px] font-bold rounded-full ${u.Role === 'Admin' ? 'bg-red/10 text-red' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>
                        {u.Role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[12px] font-bold rounded-full ${
                        tier === 'Enterprise' ? 'bg-gold/10 text-gold' : 
                        tier === 'Professional' ? 'bg-blue/10 text-blue' : 'bg-gray3 text-white'
                      }`}>
                        {tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEditClick(u)}
                        className="text-[13px] font-semibold text-blue hover:underline transition-colors"
                      >
                        Edit Subscription
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Override Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-[#1a1a1c] w-full max-w-md rounded-2xl shadow-2xl dark:shadow-none overflow-hidden border border-black/10 dark:border-white/10 ">
            <div className="p-6 border-b border-black/10 dark:border-white/10 ">
              <h3 className="text-[20px] font-bold">Override Subscription</h3>
              <p className="text-gray2 dark:text-gray1 text-[14px]">Modifying tier for {selectedUser.Email}</p>
            </div>
            
            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-gray2 dark:text-gray1 uppercase tracking-widest mb-2">Plan Tier</label>
                <select 
                  value={planTier}
                  onChange={(e) => {
                    const newTier = e.target.value;
                    setPlanTier(newTier);
                    setMonthlyLimit(limitForTier(newTier));
                  }}
                  className="w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-blue transition-colors"
                >
                  <option value="Free">Free</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[13px] font-semibold text-gray2 dark:text-gray1 uppercase tracking-widest mb-2">Monthly Models Limit</label>
                <input 
                  type="number" 
                  value={monthlyLimit}
                  readOnly
                  className="w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[15px] focus:outline-none transition-colors opacity-60 cursor-not-allowed"
                />
              </div>

              {planTier === "Enterprise" && (
                <>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray2 dark:text-gray1 uppercase tracking-widest mb-2">Custom Agency Name</label>
                    <input 
                      type="text" 
                      value={customAgency}
                      onChange={(e) => setCustomAgency(e.target.value)}
                      placeholder="e.g. Knight Frank"
                      className="w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray2 dark:text-gray1 uppercase tracking-widest mb-2">Custom Brand Color</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={customColor || "#000000"}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-[48px] h-[48px] rounded-xl cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input 
                        type="text" 
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        placeholder="#FF0000"
                        className="flex-1 bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-blue transition-colors uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray2 dark:text-gray1 uppercase tracking-widest mb-2">Custom Logo URL</label>
                    <input 
                      type="text" 
                      value={customLogo}
                      onChange={(e) => setCustomLogo(e.target.value)}
                      placeholder="e.g. https://example.com/logo.png"
                      className="w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray2 dark:text-gray1 uppercase tracking-widest mb-2">Custom Font</label>
                    <select 
                      value={customFont}
                      onChange={(e) => setCustomFont(e.target.value)}
                      className="w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-blue transition-colors appearance-none"
                    >
                      <option value="">Default (System)</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Lato">Lato</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Merriweather">Merriweather</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10 ">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-gray2 dark:text-gray1 hover:text-black dark:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl font-semibold bg-blue text-white hover:bg-blue/90 transition-colors"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal alert={alert} onClose={() => setAlert(null)} />
    </div>
  );
}
