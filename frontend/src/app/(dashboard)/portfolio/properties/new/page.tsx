"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Tooltip from "@/components/ui/Tooltip";

const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

export default function NewProperty() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    property_type: "Residential",
    status: "Personal",
    address: "",
    city: "",
    state: "",
    purchase_price: "",
    purchase_currency: "NGN",
    bedrooms: "",
    bathrooms: "",
    year_built: "",
    land_area_sqm: "",
    condition: "Good",
    owner_name: "",
    features: [] as {name: string, quantity: number}[]
  });

  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureQty, setNewFeatureQty] = useState("");

  const [userPrefs, setUserPrefs] = useState({ portfolio_currency: "NGN", exchange_rate: 1400 });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("provaluer_user") || "{}");
      setUserPrefs({
        portfolio_currency: user.portfolio_currency || "NGN",
        exchange_rate: user.exchange_rate || 1400
      });
    } catch(e) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("provaluer_token");

    try {
      // Convert numbers
      const payload = {
        ...formData,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price.toString().replace(/,/g, '')) : 0,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : 0,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : 0,
        year_built: formData.year_built ? Number(formData.year_built) : null,
        land_area_sqm: formData.land_area_sqm ? Number(formData.land_area_sqm) : 0,
        amenities: JSON.stringify(formData.features)
      };

      const res = await fetch("/api/portfolio/properties", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(err){}

      if (res.ok) {
        router.push("/portfolio/properties");
      } else {
        setError(data?.error || data?.message || "Failed to add property");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[800px] mx-auto w-full pb-20">
      <div className="mb-8">
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">Add New Property</h1>
        <div className="text-[13px] text-gray2 mt-1">
          <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link> <span className="mx-2">/</span> 
          <Link href="/portfolio/properties" className="hover:text-white transition-colors">Properties</Link> <span className="mx-2">/</span> 
          <b className="text-gray1">New</b>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
        
        {error && (
          <div className="bg-red/10 border border-red/20 text-red text-[13px] p-4 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Property Title / Nickname
              <Tooltip content="A short nickname to easily identify this property in your portfolio."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <input 
              required type="text"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors"
              placeholder="e.g. Lekki Phase 1 Duplex"
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Owner Name (Optional)
              <Tooltip content="If you manage this property for a client, enter their name here."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <input 
              type="text"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors"
              placeholder="If managing for a client"
              value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-gray2 font-medium">Property Type</label>
            <select 
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors appearance-none"
              value={formData.property_type} onChange={e => setFormData({...formData, property_type: e.target.value})}
            >
              <option>Residential</option>
              <option>Commercial</option>
              <option>Land</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-gray2 font-medium">Current Status</label>
            <select 
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors appearance-none"
              value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option>Personal</option>
              <option>Rented</option>
              <option>Vacant</option>
              <option>For Sale</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Purchase Price
              <Tooltip content="The price you or the owner originally purchased the property for."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <div className="flex gap-2">
              <select 
                className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-3 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors appearance-none w-[100px]"
                value={formData.purchase_currency} onChange={e => setFormData({...formData, purchase_currency: e.target.value})}
              >
                <option>NGN</option>
                <option>USD</option>
              </select>
              <input 
                required type="number" min="0"
                className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors flex-1"
                placeholder="0.00"
                value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})}
              />
            </div>
            {formData.purchase_currency === "USD" && formData.purchase_price && !isNaN(Number(formData.purchase_price.toString().replace(/,/g, ''))) && (
              <div className="text-[12px] text-blue font-medium mt-1">
                ≈ ₦{(Number(formData.purchase_price.toString().replace(/,/g, '')) * userPrefs.exchange_rate).toLocaleString()} (at ₦{userPrefs.exchange_rate}/$)
              </div>
            )}
          </div>
        </div>

        <h3 className="text-[14px] font-semibold text-gray1 mt-10 mb-5 pb-2 border-b border-black/5 dark:border-white/5 uppercase tracking-widest">2. Building Characteristics</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Bedrooms
              <Tooltip content="Total number of dedicated bedrooms."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <input 
              type="number" min="0" placeholder="e.g. 5"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors w-full"
              value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Bathrooms
              <Tooltip content="Total number of full and half bathrooms."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <input 
              type="number" min="0" placeholder="e.g. 6"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors w-full"
              value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Year Built
              <Tooltip content="The year the property construction was completed. Affects valuation depreciation."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <input 
              type="number" min="1800" max={new Date().getFullYear()} placeholder="e.g. 2018"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors w-full"
              value={formData.year_built} onChange={e => setFormData({...formData, year_built: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium">
              Land Area (Sqm)
              <Tooltip content="The total land area of the property in square meters."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            <input 
              type="number" min="0" step="0.01" placeholder="e.g. 600"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors w-full"
              value={formData.land_area_sqm} onChange={e => setFormData({...formData, land_area_sqm: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 mt-4">
            <label className="flex items-center gap-2 text-[13px] text-gray2 font-medium block">
              Additional Features
              <Tooltip content="Add custom amenities like a Swimming Pool, Gym, or Boy's Quarters."><span className="cursor-help text-white/40 hover:text-white transition-colors">ⓘ</span></Tooltip>
            </label>
            
            <div className="bg-black/30 border border-black/5 dark:border-white/5 rounded-xl p-4">
              <div className="flex gap-3 mb-4">
                <input 
                  type="text" placeholder="Feature (e.g. Gym, Pool)" 
                  className="bg-black border border-black/10 dark:border-white/10 rounded-lg px-4 py-2.5 text-[13px] text-white focus:border-blue outline-none flex-1"
                  value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)}
                />
                <input 
                  type="number" placeholder="Qty (e.g. 1)" min="1"
                  className="bg-black border border-black/10 dark:border-white/10 rounded-lg px-4 py-2.5 text-[13px] text-white focus:border-blue outline-none w-[100px]"
                  value={newFeatureQty} onChange={e => setNewFeatureQty(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newFeatureName && newFeatureQty) {
                      setFormData({...formData, features: [...formData.features, { name: newFeatureName, quantity: Number(newFeatureQty) }]});
                      setNewFeatureName("");
                      setNewFeatureQty("");
                    }
                  }}
                  className="bg-black/10 dark:bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
                >
                  Add
                </button>
              </div>

              {formData.features.length > 0 && (
                <div className="flex flex-col gap-2">
                  {formData.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black/5 dark:bg-white/5 px-4 py-2.5 rounded-lg border border-black/5 dark:border-white/5">
                      <span className="text-[13px] text-white font-medium">{feat.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[12px] text-gray2 bg-black px-2 py-1 rounded">Qty: {feat.quantity}</span>
                        <button 
                          type="button" 
                          className="text-red/80 hover:text-red text-[12px] font-bold"
                          onClick={() => setFormData({...formData, features: formData.features.filter((_, i) => i !== idx)})}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-[14px] font-semibold text-gray1 mt-10 mb-5 pb-2 border-b border-black/5 dark:border-white/5 uppercase tracking-widest">3. Location Info</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-[13px] text-gray2 font-medium">Full Address</label>
            <input 
              type="text"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors"
              placeholder="123 Example Street"
              value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-gray2 font-medium">City</label>
            <input 
              type="text"
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors"
              placeholder="e.g. Ikeja"
              value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] text-gray2 font-medium">State</label>
            <select 
              className="bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue transition-colors appearance-none"
              value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}
            >
              {NIGERIA_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 mt-6 border-t border-black/10 dark:border-white/10">
          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue hover:bg-[#0070f0] text-white py-4 rounded-xl text-[14px] font-bold transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Property to Portfolio"}
          </button>
        </div>

      </form>
    </div>
  );
}
