"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, email: string, role: string} | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [customAgencyName, setCustomAgencyName] = useState("");
  const [customBrandColor, setCustomBrandColor] = useState("");
  const [customLogo, setCustomLogo] = useState("");
  const [customFont, setCustomFont] = useState("");
  const [savingEnterprise, setSavingEnterprise] = useState(false);
  const [enterpriseSuccess, setEnterpriseSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("provaluer_token");
    const userData = localStorage.getItem("provaluer_user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
      
      // Initialize preferences from user data
      const parsedUser = JSON.parse(userData);
      setPortfolioCurrency(parsedUser.portfolio_currency || "NGN");
      setExchangeRate(parsedUser.exchange_rate?.toString() || "1400");

      fetch("/api/subscription/mine", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
         if (!data.error && data.PlanTier) {
           setSubscription(data);
           setCustomAgencyName(data.CustomAgencyName || "");
           setCustomBrandColor(data.CustomBrandColor || "");
           setCustomLogo(data.CustomLogo || "");
           setCustomFont(data.CustomFont || "");
         }
      }).catch(e => console.error(e));

    } catch (e) {}
  }, [router]);

  const [portfolioCurrency, setPortfolioCurrency] = useState("NGN");
  const [exchangeRate, setExchangeRate] = useState("1400");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState("");

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setError("");
    setPrefsSuccess("");

    try {
      const token = localStorage.getItem("provaluer_token");
      const res = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          portfolio_currency: portfolioCurrency,
          exchange_rate: Number(exchangeRate) || 1400
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save preferences");

      // Update local storage
      const userData = JSON.parse(localStorage.getItem("provaluer_user") || "{}");
      userData.portfolio_currency = portfolioCurrency;
      userData.exchange_rate = Number(exchangeRate) || 1400;
      localStorage.setItem("provaluer_user", JSON.stringify(userData));

      setPrefsSuccess("Preferences saved successfully!");
      setTimeout(() => setPrefsSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveEnterpriseSettings = async () => {
    setSavingEnterprise(true);
    setError("");
    setEnterpriseSuccess("");

    try {
      const token = localStorage.getItem("provaluer_token");
      const res = await fetch("/api/subscription/enterprise-settings", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          custom_agency_name: customAgencyName,
          custom_brand_color: customBrandColor,
          custom_logo: customLogo,
          custom_font: customFont
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save enterprise settings");

      setEnterpriseSuccess("Enterprise settings saved successfully!");
      setTimeout(() => setEnterpriseSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingEnterprise(false);
    }
  };

  const handleGenerateKey = async () => {
    setLoadingKey(true);
    setError("");
    setApiKey(null);
    
    try {
      const token = localStorage.getItem("provaluer_token");
      const res = await fetch("/api/profile/api-key", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok && data) {
        setApiKey(data.api_key);
      } else {
        throw new Error(data?.message || data?.error || text || "Failed to generate API Key");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingKey(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "A";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("provaluer_token");
      const res = await fetch("/api/profile/account", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        localStorage.removeItem("provaluer_token");
        localStorage.removeItem("provaluer_user");
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-gray2">Loading profile...</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-[800px] w-full pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-[24px] font-bold tracking-tight">My Profile</h1>
        <div className="text-[13px] text-gray2">
          Dashboard <span className="mx-2">/</span> <b className="text-gray1">Profile</b>
        </div>
      </div>

      <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-xl p-6 sm:p-10 mb-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-[80px] h-[80px] rounded-full bg-gradient-to-br from-purple to-blue flex items-center justify-center text-[28px] font-bold text-white shadow-inner mb-4">
            {getInitials(user.name)}
          </div>
          <h2 className="text-[20px] font-bold text-black dark:text-white">{user.name}</h2>
          <div className="text-[14px] text-gray2">{user.role}</div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Full Name</label>
            <input 
              type="text" 
              readOnly
              value={user.name} 
              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none w-full" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Email Address</label>
            <input 
              type="email" 
              readOnly
              value={user.email} 
              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none w-full opacity-70" 
            />
          </div>

          <div className="pt-8 mt-8 border-t border-black/10 dark:border-white/10">
            <h2 className="text-[17px] font-semibold text-black dark:text-white mb-2">Danger Zone</h2>
            <p className="text-[14px] text-gray2 mb-6">
              Irreversible actions related to your account.
            </p>
            <div className="bg-background dark:bg-[#141415] border border-red/20 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-medium text-black dark:text-white">Delete Account</h3>
                  <p className="text-[13px] text-gray2 mt-1">Permanently remove your account and all associated data.</p>
                </div>
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 bg-red/10 text-red text-[13px] font-medium rounded-lg hover:bg-red/20 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and will permanently wipe out all your properties, models, and personal data."
        confirmText="Delete Account"
        cancelText="Keep Account"
        isDanger={true}
        isLoading={loading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-xl p-6 sm:p-10 mb-8">
        <div className="mb-6 border-b border-black/10 dark:border-white/10 pb-4">
          <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">Financial Preferences</h3>
          <p className="text-[13px] text-gray2 leading-relaxed">
            Set your preferred portfolio currency and custom exchange rate. This will be used to calculate and display your total portfolio value consistently.
          </p>
        </div>

        {prefsSuccess && (
          <div className="bg-[#30d158]/10 border border-[#30d158]/30 text-[#30d158] text-[13px] p-3 rounded-xl mb-6">
            ✓ {prefsSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Portfolio Currency</label>
            <select 
              value={portfolioCurrency}
              onChange={e => setPortfolioCurrency(e.target.value)}
              className="bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors appearance-none"
            >
              <option value="NGN">Naira (₦)</option>
              <option value="USD">US Dollar ($)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Custom Exchange Rate (₦/$)</label>
            <input 
              type="number" 
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              className="bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors" 
            />
          </div>
        </div>

        <button 
          onClick={handleSavePreferences}
          disabled={savingPrefs}
          className="bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white text-[14px] font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {savingPrefs ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {subscription?.PlanTier === "Enterprise" && (
        <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-xl p-6 sm:p-10 mb-8">
          <div className="mb-6 border-b border-black/10 dark:border-white/10 pb-4">
            <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">Enterprise Plan Settings</h3>
            <p className="text-[13px] text-gray2 leading-relaxed">
              Customize the look and feel of your exported reports with your agency details.
            </p>
          </div>

          {enterpriseSuccess && (
            <div className="bg-[#30d158]/10 border border-[#30d158]/30 text-[#30d158] text-[13px] p-3 rounded-xl mb-6">
              ✓ {enterpriseSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Custom Agency Name</label>
              <input 
                type="text" 
                value={customAgencyName}
                onChange={e => setCustomAgencyName(e.target.value)}
                placeholder="e.g. Knight Frank"
                className="bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Brand Color (Hex)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={customBrandColor || "#000000"}
                  onChange={e => setCustomBrandColor(e.target.value)}
                  className="w-[45px] h-[45px] rounded-xl cursor-pointer bg-transparent border-0 p-0" 
                />
                <input 
                  type="text" 
                  value={customBrandColor}
                  onChange={e => setCustomBrandColor(e.target.value)}
                  placeholder="#FF0000"
                  className="flex-1 bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors uppercase" 
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Company Letterhead (Background URL)</label>
              <input 
                type="text" 
                value={customLogo}
                onChange={e => setCustomLogo(e.target.value)}
                placeholder="https://your-domain.com/logo.png"
                className="bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold text-gray2 tracking-widest uppercase">Custom Font</label>
              <select 
                value={customFont}
                onChange={e => setCustomFont(e.target.value)}
                className="bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors appearance-none" 
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
          </div>

          <button 
            onClick={handleSaveEnterpriseSettings}
            disabled={savingEnterprise}
            className="bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white text-[14px] font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {savingEnterprise ? "Saving..." : "Save Enterprise Settings"}
          </button>
        </div>
      )}

      <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-xl p-6 sm:p-10">
        <div className="mb-6 border-b border-black/10 dark:border-white/10 pb-4">
          <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">Developer API Key</h3>
          <p className="text-[13px] text-gray2 leading-relaxed">
            Generate an API Key to authenticate programmatic requests to the Provaluer API. 
            Generating a new key will instantly revoke your old key. 
            For your security, we will only show you the key once.
          </p>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/20 text-red text-[13px] p-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {apiKey ? (
          <div className="bg-[#0a84ff]/10 border border-[#0a84ff]/30 p-5 rounded-xl mb-6">
            <div className="text-[13px] text-[#5ac8fa] font-medium mb-3">
              Your API Key has been generated successfully. Please copy it now, as it will not be shown again.
            </div>
            <div className="bg-black/5 dark:bg-black/50 p-4 rounded-lg flex items-center justify-between">
              <code className="text-[#34d399] text-[14px] font-mono break-all">{apiKey}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(apiKey)}
                className="ml-4 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleGenerateKey}
            disabled={loadingKey}
            className="bg-blue hover:bg-[#0070f0] text-white text-[14px] font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loadingKey ? "Generating..." : "Generate New API Key"}
          </button>
        )}
      </div>

    </div>
  );
}
