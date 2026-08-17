"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/adminApi";

/* ─── Types ─── */

interface CostItem {
  id: number; key: string; label: string;
  category: string; value: number; unit: string; updated_at: string;
}

interface StateRate {
  id: number; state: string; is_premium: boolean;
  land_rate_per_sqm: number; building_rate_per_sqm: number; updated_at: string;
}

/* ─── Constants ─── */

const CATEGORY_ORDER = ["Build Rates", "Rent Rates", "Raw Materials", "Labour"];
const CATEGORY_DESC: Record<string, string> = {
  "Build Rates":   "Used directly by the Cost Approach model to compute replacement cost per sqm.",
  "Rent Rates":    "Fallback annual rent per sqm for the Income and DCF models when no rent comparables have been scraped.",
  "Raw Materials": "Current market prices for primary construction inputs. Reference only.",
  "Labour":        "Labour and finishing rates. Reference only.",
};

/* ─── Helpers ─── */

function formatUpdated(d: string) {
  if (!d || d.startsWith("0001")) return "never";
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function RateInput({ value, onChange, changed }: { value: string; onChange: (v: string) => void; changed: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray2 dark:text-gray1 pointer-events-none">₦</span>
      <input
        type="number" min="0" step="1000"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full pl-6 pr-2 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors focus:outline-none ${
          changed
            ? "border-blue bg-blue/5 dark:bg-blue/10 text-blue"
            : "border-black/10 dark:border-white/10 bg-background dark:bg-[#121214] focus:border-blue"
        }`}
      />
    </div>
  );
}

/* ─── Page ─── */

export default function AdminSettingsPage() {

  /* Material costs state */
  const [costs,        setCosts]        = useState<CostItem[]>([]);
  const [costDraft,    setCostDraft]    = useState<Record<string, string>>({});
  const [costsLoading, setCostsLoading] = useState(true);
  const [costsSaving,  setCostsSaving]  = useState(false);
  const [costsSaved,   setCostsSaved]   = useState(false);

  /* State rates state */
  const [rates,        setRates]        = useState<StateRate[]>([]);
  const [rateDraft,    setRateDraft]    = useState<Record<string, string>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesSaving,  setRatesSaving]  = useState(false);
  const [ratesSaved,   setRatesSaved]   = useState(false);

  const [error, setError] = useState("");

  /* ── Fetch material costs ── */
  const fetchCosts = useCallback(async () => {
    setCostsLoading(true);
    try {
      const res = await adminFetch("/api/admin/material-costs");
      const j = await res.json();
      if (j.success && Array.isArray(j.data)) {
        setCosts(j.data);
        const d: Record<string, string> = {};
        j.data.forEach((c: CostItem) => { d[c.key] = String(c.value); });
        setCostDraft(d);
      }
    } catch { setError("Failed to load material costs."); }
    finally { setCostsLoading(false); }
  }, []);

  /* ── Fetch state rates ── */
  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await adminFetch("/api/admin/state-rates");
      const j = await res.json();
      if (j.success && Array.isArray(j.data)) {
        setRates(j.data);
        const d: Record<string, string> = {};
        j.data.forEach((r: StateRate) => {
          d[rateKey(r.state, r.is_premium, "land")]     = String(r.land_rate_per_sqm);
          d[rateKey(r.state, r.is_premium, "building")] = String(r.building_rate_per_sqm);
        });
        setRateDraft(d);
      }
    } catch { setError("Failed to load state rates."); }
    finally { setRatesLoading(false); }
  }, []);

  useEffect(() => { fetchCosts(); fetchRates(); }, [fetchCosts, fetchRates]);

  const rateKey = (state: string, premium: boolean, field: string) =>
    `${state}__${premium ? "1" : "0"}__${field}`;

  /* ── Save material costs ── */
  const saveCosts = async () => {
    setCostsSaving(true); setCostsSaved(false); setError("");
    const updates = Object.entries(costDraft).map(([key, val]) => ({ key, value: parseFloat(val) || 0 }));
    try {
      const res = await adminFetch("/api/admin/material-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const j = await res.json();
      if (j.success) { setCostsSaved(true); fetchCosts(); }
      else setError("Failed to save material costs.");
    } catch { setError("Network error."); }
    finally { setCostsSaving(false); }
  };

  /* ── Save state rates ── */
  const saveRates = async () => {
    setRatesSaving(true); setRatesSaved(false); setError("");
    const updates = rates.map(r => ({
      state:                r.state,
      is_premium:           r.is_premium,
      land_rate_per_sqm:    parseFloat(rateDraft[rateKey(r.state, r.is_premium, "land")])    || 0,
      building_rate_per_sqm: parseFloat(rateDraft[rateKey(r.state, r.is_premium, "building")]) || 0,
    }));
    try {
      const res = await adminFetch("/api/admin/state-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const j = await res.json();
      if (j.success) { setRatesSaved(true); fetchRates(); }
      else setError("Failed to save state rates.");
    } catch { setError("Network error."); }
    finally { setRatesSaving(false); }
  };

  const costsDirty = costs.some(c => String(c.value) !== costDraft[c.key]);
  const ratesDirty = rates.some(r =>
    String(r.land_rate_per_sqm)     !== rateDraft[rateKey(r.state, r.is_premium, "land")] ||
    String(r.building_rate_per_sqm) !== rateDraft[rateKey(r.state, r.is_premium, "building")]
  );

  const grouped = CATEGORY_ORDER.reduce<Record<string, CostItem[]>>((acc, cat) => {
    acc[cat] = costs.filter(i => i.category === cat);
    return acc;
  }, {});

  // Group state rates: one entry per state with {standard, premium}
  const stateGroups = rates
    .filter(r => !r.is_premium)
    .map(std => ({
      state:    std.state,
      standard: std,
      premium:  rates.find(r => r.state === std.state && r.is_premium)!,
    }))
    .filter(g => g.premium);

  const sel = "border border-black/10 dark:border-white/10 bg-background dark:bg-[#121214] rounded-xl px-3 py-2 text-[13px]";

  return (
    <div className="max-w-[960px] mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-[28px] font-black tracking-tight mb-1">Config Settings</h1>
        <p className="text-gray2 dark:text-gray1 text-[14px]">
          All valuation rates and construction costs — editable here, no code changes needed.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red/10 border border-red/20 text-red text-[13px] font-medium">{error}</div>
      )}

      {/* ════ SECTION 1: State Rates ════ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-black">State Land &amp; Building Rates</h2>
            <p className="text-[12px] text-gray2 dark:text-gray1 mt-0.5">
              Fallback rates used by every model when scraped comparables are insufficient.
              Updated here — no code deploy required.
            </p>
          </div>
          <button
            onClick={saveRates}
            disabled={ratesSaving || !ratesDirty}
            className="shrink-0 px-5 py-2 bg-blue text-white font-semibold rounded-xl text-[13px] hover:bg-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {ratesSaving ? "Saving…" : ratesSaved ? "Saved ✓" : "Save Rates"}
          </button>
        </div>

        <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
          {ratesLoading ? (
            <div className="flex items-center justify-center py-12 text-gray2 dark:text-gray1 text-[13px]">
              <span className="w-4 h-4 border-2 border-blue/30 border-t-blue rounded-full animate-spin mr-2" />
              Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 text-[10px] font-bold uppercase tracking-wider text-gray2 dark:text-gray1">
                    <th className="px-5 py-3 text-left">State</th>
                    <th className="px-4 py-3 text-right">Standard Land (₦/sqm)</th>
                    <th className="px-4 py-3 text-right">Standard Build (₦/sqm)</th>
                    <th className="px-4 py-3 text-right">Premium Land (₦/sqm)</th>
                    <th className="px-4 py-3 text-right">Premium Build (₦/sqm)</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {stateGroups.map(({ state, standard, premium }) => {
                    const stdLandKey  = rateKey(state, false, "land");
                    const stdBldKey   = rateKey(state, false, "building");
                    const premLandKey = rateKey(state, true,  "land");
                    const premBldKey  = rateKey(state, true,  "building");

                    const isDefault = state === "Default";

                    return (
                      <tr key={state} className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${isDefault ? "bg-gold/5" : ""}`}>
                        <td className="px-5 py-3 font-semibold whitespace-nowrap">
                          {isDefault
                            ? <span className="flex items-center gap-1.5"><span className="px-1.5 py-px text-[9px] font-black bg-gold/20 text-gold rounded">DEFAULT</span> All other states</span>
                            : state}
                        </td>
                        <td className="px-4 py-2 w-[140px]">
                          <RateInput
                            value={rateDraft[stdLandKey] ?? ""}
                            onChange={v => setRateDraft(d => ({ ...d, [stdLandKey]: v }))}
                            changed={rateDraft[stdLandKey] !== String(standard.land_rate_per_sqm)}
                          />
                        </td>
                        <td className="px-4 py-2 w-[140px]">
                          <RateInput
                            value={rateDraft[stdBldKey] ?? ""}
                            onChange={v => setRateDraft(d => ({ ...d, [stdBldKey]: v }))}
                            changed={rateDraft[stdBldKey] !== String(standard.building_rate_per_sqm)}
                          />
                        </td>
                        <td className="px-4 py-2 w-[140px]">
                          <RateInput
                            value={rateDraft[premLandKey] ?? ""}
                            onChange={v => setRateDraft(d => ({ ...d, [premLandKey]: v }))}
                            changed={rateDraft[premLandKey] !== String(premium.land_rate_per_sqm)}
                          />
                        </td>
                        <td className="px-4 py-2 w-[140px]">
                          <RateInput
                            value={rateDraft[premBldKey] ?? ""}
                            onChange={v => setRateDraft(d => ({ ...d, [premBldKey]: v }))}
                            changed={rateDraft[premBldKey] !== String(premium.building_rate_per_sqm)}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray2 dark:text-gray1 whitespace-nowrap">
                          {formatUpdated(standard.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ════ SECTION 2: Material Costs ════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-black">Construction Material Costs</h2>
            <p className="text-[12px] text-gray2 dark:text-gray1 mt-0.5">
              Build Rates are used directly by the Cost Model. Raw Materials and Labour are reference only.
            </p>
          </div>
          <button
            onClick={saveCosts}
            disabled={costsSaving || !costsDirty}
            className="shrink-0 px-5 py-2 bg-blue text-white font-semibold rounded-xl text-[13px] hover:bg-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {costsSaving ? "Saving…" : costsSaved ? "Saved ✓" : "Save Costs"}
          </button>
        </div>

        {costsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray2 dark:text-gray1 text-[13px]">
            <span className="w-4 h-4 border-2 border-blue/30 border-t-blue rounded-full animate-spin mr-2" />
            Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {CATEGORY_ORDER.map(cat => {
              const rows = grouped[cat] ?? [];
              if (!rows.length) return null;
              const isBuildRates = cat === "Build Rates";
              return (
                <div key={cat} className={`bg-surface dark:bg-[#1a1a1c] rounded-2xl border overflow-hidden ${isBuildRates ? "border-blue/30" : "border-black/10 dark:border-white/10"}`}>
                  <div className={`px-5 py-3 border-b text-[13px] ${isBuildRates ? "border-blue/20 bg-blue/5 dark:bg-blue/10" : "border-black/10 dark:border-white/10"}`}>
                    <div className="flex items-center gap-2">
                      {isBuildRates && <span className="px-2 py-0.5 rounded-full bg-blue text-white text-[10px] font-bold uppercase">Live</span>}
                      <span className="font-bold">{cat}</span>
                    </div>
                    <p className="text-[11px] text-gray2 dark:text-gray1 mt-0.5">{CATEGORY_DESC[cat]}</p>
                  </div>
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {rows.map(item => {
                      const current = costDraft[item.key] ?? String(item.value);
                      const changed = current !== String(item.value);
                      return (
                        <div key={item.key} className="flex items-center gap-4 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold">{item.label}</span>
                              {changed && <span className="px-1.5 py-px rounded text-[10px] font-bold bg-gold/15 text-gold">edited</span>}
                            </div>
                            <span className="text-[11px] text-gray2 dark:text-gray1">Updated: {formatUpdated(item.updated_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative w-[160px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray2 dark:text-gray1 pointer-events-none">₦</span>
                              <input
                                type="number" min="0" step="1000"
                                value={current}
                                onChange={e => { setCostsSaved(false); setCostDraft(d => ({ ...d, [item.key]: e.target.value })); }}
                                className={`w-full pl-7 pr-3 py-2 text-[13px] font-semibold rounded-xl border transition-colors focus:outline-none ${
                                  changed
                                    ? "border-blue bg-blue/5 dark:bg-blue/10 text-blue"
                                    : "border-black/10 dark:border-white/10 bg-background dark:bg-[#121214] focus:border-blue"
                                }`}
                              />
                            </div>
                            <span className="text-[11px] text-gray2 dark:text-gray1 w-[60px]">{item.unit.replace("₦/", "per ")}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      {(costsDirty || ratesDirty) && (
        <div className="fixed bottom-0 left-[250px] right-0 p-4 bg-background/90 dark:bg-[#0c0c0e]/90 backdrop-blur border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
          <span className="text-[13px] text-gray2 dark:text-gray1">You have unsaved changes.</span>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const cr: Record<string,string> = {};
                costs.forEach(c => { cr[c.key] = String(c.value); });
                setCostDraft(cr);
                const rr: Record<string,string> = {};
                rates.forEach(r => {
                  rr[rateKey(r.state, r.is_premium, "land")]     = String(r.land_rate_per_sqm);
                  rr[rateKey(r.state, r.is_premium, "building")] = String(r.building_rate_per_sqm);
                });
                setRateDraft(rr);
              }}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >Discard</button>
            {costsDirty && (
              <button onClick={saveCosts} disabled={costsSaving}
                className="px-5 py-2 bg-blue text-white font-semibold rounded-xl text-[13px] hover:bg-blue/90 disabled:opacity-50 transition-colors">
                {costsSaving ? "Saving…" : "Save Costs"}
              </button>
            )}
            {ratesDirty && (
              <button onClick={saveRates} disabled={ratesSaving}
                className="px-5 py-2 bg-blue text-white font-semibold rounded-xl text-[13px] hover:bg-blue/90 disabled:opacity-50 transition-colors">
                {ratesSaving ? "Saving…" : "Save Rates"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
