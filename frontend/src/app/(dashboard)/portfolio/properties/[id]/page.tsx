"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface PortfolioProperty {
  id: string;
  title: string;
  property_type: string;
  status: string;
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  land_area_sqm: number;
  building_area_sqm: number;
  condition: string;
  purchase_price: number;
  purchase_currency: string;
  current_value: number;
  owner_name: string;
  year_built: number;
  description: string;
  created_at: string;
}

interface ValuationResult {
  model_id: string;
  estimated_value: number;
  confidence_score: number;
}

const MODEL_TYPES = [
  {
    id: "comparable",
    label: "Comparable",
    icon: "📊",
    desc: "Uses real scraped market listings for this state to find a price-per-sqm median.",
    free: true,
  },
  {
    id: "income",
    label: "Income",
    icon: "💰",
    desc: "Capitalises annual net operating income at a market cap rate.",
    free: false,
  },
  {
    id: "cost",
    label: "Cost",
    icon: "🏗️",
    desc: "Land value + depreciated replacement cost of the building.",
    free: false,
  },
  {
    id: "dcf",
    label: "DCF",
    icon: "📈",
    desc: "Discounted cash flow over a holding period with terminal value.",
    free: false,
  },
];

function confidenceLabel(score: number) {
  if (score >= 85) return { label: "High", color: "text-green bg-green/10" };
  if (score >= 70) return { label: "Medium", color: "text-gold bg-gold/10" };
  return { label: "Low", color: "text-red bg-red/10" };
}

function fmt(n: number) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  return `₦${n.toLocaleString()}`;
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-gray2 dark:text-gray1 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-[14px] font-medium text-black dark:text-white">{value || "—"}</div>
    </div>
  );
}

function NumInput({
  label, hint, value, onChange, prefix = "₦", suffix, step = "1000", min = "0",
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; step?: string; min?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-black dark:text-white mb-1">{label}</label>
      {hint && <p className="text-[11px] text-gray2 dark:text-gray1 mb-1.5">{hint}</p>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray2 dark:text-gray1 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl py-2.5 text-[13px] focus:outline-none focus:border-blue transition-colors ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-10" : "pr-3"}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray2 dark:text-gray1 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [property, setProperty] = useState<PortfolioProperty | null>(null);
  const [loading, setLoading]   = useState(true);
  const [planTier, setPlanTier] = useState<string>("Free");

  const [modalOpen,  setModalOpen]  = useState(false);
  const [modelType,  setModelType]  = useState("comparable");
  const [isPremium,  setIsPremium]  = useState(false);
  const [running,    setRunning]    = useState(false);
  const [runError,   setRunError]   = useState("");
  const [result,     setResult]     = useState<ValuationResult | null>(null);

  // Model-specific inputs
  const [grossRent,    setGrossRent]    = useState("");
  const [capRate,      setCapRate]      = useState("8.5");
  const [opexRatio,    setOpexRatio]    = useState("30");
  const [depRate,      setDepRate]      = useState("12");
  const [growthRate,   setGrowthRate]   = useState("5");
  const [discountRate, setDiscountRate] = useState("12");
  const [exitCap,      setExitCap]      = useState("8");
  const [holdingYears, setHoldingYears] = useState("10");

  const tok = () => localStorage.getItem("provaluer_token") ?? "";

  const fetchProperty = useCallback(async () => {
    if (!tok()) { router.push("/login"); return; }
    try {
      const res = await fetch(`/api/portfolio/${id}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) { router.push("/portfolio/properties"); return; }
      const j = await res.json();
      setProperty(j.property ?? j);
    } catch {}
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => {
    fetchProperty();
    // Fetch subscription tier to gate advanced models
    fetch("/api/subscription/mine", { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.json())
      .then(j => setPlanTier(j?.Tier ?? j?.plan_tier ?? "Free"))
      .catch(() => {});
  }, [fetchProperty]);

  const openModal = () => {
    setResult(null);
    setRunError("");
    setModalOpen(true);
  };

  const buildInputs = () => {
    const n = (s: string, def: number) => parseFloat(s) || def;
    switch (modelType) {
      case "income":
        return {
          ...(grossRent ? { gross_rent: parseFloat(grossRent) } : {}),
          cap_rate:    n(capRate, 8.5),
          opex_ratio:  n(opexRatio, 30) / 100,
        };
      case "cost":
        return { depreciation_rate: n(depRate, 12) / 100 };
      case "dcf":
        return {
          ...(grossRent ? { gross_rent: parseFloat(grossRent) } : {}),
          growth_rate:    n(growthRate, 5),
          discount_rate:  n(discountRate, 12),
          exit_cap_rate:  n(exitCap, 8),
          holding_period: n(holdingYears, 10),
        };
      default:
        return {};
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunError("");
    setResult(null);
    try {
      const res = await fetch("/api/portfolio/valuate", {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: id,
          model_type:  modelType,
          is_premium:  isPremium,
          inputs:      buildInputs(),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setRunError(j.error || j.message || "Valuation failed. Please try again.");
        return;
      }
      setResult({ model_id: j.model_id, estimated_value: j.estimated_value, confidence_score: j.confidence_score });
      // Refresh property to reflect new current_value
      fetchProperty();
    } catch {
      setRunError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="p-8 text-gray2">Loading property…</div>;
  if (!property) return <div className="p-8 text-red">Property not found.</div>;

  const gainLoss = property.current_value && property.purchase_price
    ? property.current_value - property.purchase_price : null;

  const conf = result ? confidenceLabel(result.confidence_score) : null;

  return (
    <div className="max-w-[1200px] mx-auto pb-24 px-4 sm:px-0">
      {/* Breadcrumb */}
      <div className="mb-6 text-[13px] text-gray2 dark:text-gray1">
        <Link href="/portfolio/properties" className="hover:text-black dark:hover:text-white transition-colors">Properties</Link>
        <span className="mx-2">/</span>
        <span className="text-black dark:text-white font-semibold">{property.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Details */}
          <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 p-6">
            <h2 className="text-[16px] font-bold mb-5">{property.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <Field label="Type"           value={property.property_type} />
              <Field label="Status"         value={property.status} />
              <Field label="Condition"      value={property.condition} />
              <Field label="State"          value={property.state} />
              <Field label="City"           value={property.city} />
              <Field label="Bedrooms"       value={property.bedrooms > 0 ? `${property.bedrooms} beds` : undefined} />
              <Field label="Bathrooms"      value={property.bathrooms > 0 ? `${property.bathrooms} baths` : undefined} />
              <Field label="Land Area"      value={property.land_area_sqm > 0 ? `${property.land_area_sqm.toLocaleString()} sqm` : undefined} />
              <Field label="Building Area"  value={property.building_area_sqm > 0 ? `${property.building_area_sqm.toLocaleString()} sqm` : undefined} />
              {property.year_built > 0 && <Field label="Year Built" value={property.year_built} />}
              {property.owner_name && <Field label="Owner" value={property.owner_name} />}
            </div>
            {property.address && (
              <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10">
                <Field label="Address" value={property.address} />
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 p-6">
              <h2 className="text-[14px] font-bold mb-3">Description</h2>
              <p className="text-[13px] text-gray2 dark:text-gray1 leading-relaxed">{property.description}</p>
            </div>
          )}
        </div>

        {/* Right — Financials + Actions */}
        <div className="space-y-5">
          {/* Financial Summary */}
          <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 p-6">
            <h2 className="text-[14px] font-bold mb-4">Financial Overview</h2>

            <div className="mb-4">
              <div className="text-[11px] font-bold text-gray2 dark:text-gray1 uppercase tracking-widest mb-1">Purchase Price</div>
              <div className="text-[16px] font-bold text-black dark:text-white">
                {property.purchase_price > 0
                  ? `${property.purchase_currency === "USD" ? "$" : "₦"}${property.purchase_price.toLocaleString()}`
                  : "—"}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[11px] font-bold text-gray2 dark:text-gray1 uppercase tracking-widest mb-1">Estimated Value</div>
              <div className="text-[28px] font-black text-blue">
                {property.current_value > 0 ? fmt(property.current_value) : "Not valued yet"}
              </div>
            </div>

            {gainLoss !== null && (
              <div className={`flex items-center gap-1.5 text-[13px] font-semibold mb-4 ${gainLoss >= 0 ? "text-green" : "text-red"}`}>
                <span>{gainLoss >= 0 ? "▲" : "▼"}</span>
                <span>{fmt(Math.abs(gainLoss))} {gainLoss >= 0 ? "gain" : "loss"}</span>
              </div>
            )}

            <button
              onClick={openModal}
              className="w-full bg-blue text-white font-semibold py-3 rounded-xl text-[13px] hover:bg-blue/90 transition-colors"
            >
              ⚡ Run Valuation Engine
            </button>
          </div>

          {/* Quick links */}
          <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-3">
            <h2 className="text-[14px] font-bold mb-3">Quick Links</h2>
            <Link
              href="/models"
              className="flex items-center gap-3 text-[13px] text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white transition-colors"
            >
              <span>📋</span> View All Valuation Models
            </Link>
            <Link
              href="/portfolio/transactions"
              className="flex items-center gap-3 text-[13px] text-gray2 dark:text-gray1 hover:text-black dark:hover:text-white transition-colors"
            >
              <span>💳</span> Transaction Ledger
            </Link>
          </div>
        </div>
      </div>

      {/* Valuation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !running && setModalOpen(false)} />
          <div className="relative bg-background dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/10 dark:border-white/10">
              <div>
                <h2 className="text-[17px] font-black">Run Valuation Engine</h2>
                <p className="text-[12px] text-gray2 dark:text-gray1 mt-0.5">{property.title} · {property.state}</p>
              </div>
              {!running && (
                <button onClick={() => setModalOpen(false)} className="text-gray2 hover:text-black dark:hover:text-white text-[20px] leading-none">×</button>
              )}
            </div>

            {/* Result view */}
            {result ? (
              <div className="p-6">
                <div className="text-center py-4 mb-6">
                  <div className="text-[42px] mb-2">✓</div>
                  <div className="text-[13px] text-gray2 dark:text-gray1 mb-1">Estimated Market Value</div>
                  <div className="text-[36px] font-black text-blue mb-3">{fmt(result.estimated_value)}</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${conf!.color}`}>
                      {conf!.label} Confidence
                    </span>
                    <span className="text-[12px] text-gray2 dark:text-gray1">{result.confidence_score}%</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/models/${result.model_id}`}
                    className="flex-1 text-center px-4 py-3 bg-blue text-white font-semibold rounded-xl text-[13px] hover:bg-blue/90 transition-colors"
                  >
                    View Full Report →
                  </Link>
                  <button
                    onClick={() => setResult(null)}
                    className="flex-1 px-4 py-3 border border-black/10 dark:border-white/10 font-semibold rounded-xl text-[13px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Run Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">

                {/* Model type selector */}
                <div>
                  <div className="text-[12px] font-bold mb-3 text-black dark:text-white">Select Model</div>
                  <div className="grid grid-cols-2 gap-2">
                    {MODEL_TYPES.map(m => {
                      const locked = !m.free && planTier === "Free";
                      return (
                        <button
                          key={m.id}
                          onClick={() => !locked && setModelType(m.id)}
                          className={`relative text-left p-3.5 rounded-xl border transition-all ${
                            modelType === m.id && !locked
                              ? "border-blue bg-blue/5 dark:bg-blue/10"
                              : locked
                              ? "border-black/5 dark:border-white/5 opacity-50 cursor-not-allowed"
                              : "border-black/10 dark:border-white/10 hover:border-blue/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[15px]">{m.icon}</span>
                            <span className="text-[13px] font-bold">{m.label}</span>
                            {m.free && (
                              <span className="px-1.5 py-px text-[9px] font-bold bg-green/15 text-green rounded">FREE</span>
                            )}
                            {locked && (
                              <span className="text-[11px] text-gray2">🔒</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray2 dark:text-gray1 leading-snug">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                  {planTier === "Free" && (
                    <p className="text-[11px] text-gray2 dark:text-gray1 mt-2">
                      <Link href="/subscription" className="text-blue hover:underline font-semibold">Upgrade your plan</Link>
                      {" "}to unlock Income, Cost, and DCF models.
                    </p>
                  )}
                </div>

                {/* Premium toggle */}
                <div className="flex items-center justify-between py-3 border-t border-black/10 dark:border-white/10">
                  <div>
                    <div className="text-[13px] font-semibold">Premium Location</div>
                    <div className="text-[11px] text-gray2 dark:text-gray1">Lekki, VI, Maitama, GRA, etc.</div>
                  </div>
                  <button
                    onClick={() => setIsPremium(p => !p)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${isPremium ? "bg-blue" : "bg-black/20 dark:bg-white/20"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isPremium ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>

                {/* Model-specific inputs */}
                {modelType === "income" && (
                  <div className="space-y-4 pt-1">
                    <NumInput
                      label="Annual Gross Rent (optional)"
                      hint="Leave blank to auto-estimate from market data."
                      value={grossRent} onChange={setGrossRent}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Cap Rate" value={capRate} onChange={setCapRate} prefix="" suffix="%" step="0.5" />
                      <NumInput label="OpEx Ratio" value={opexRatio} onChange={setOpexRatio} prefix="" suffix="%" step="1" />
                    </div>
                  </div>
                )}

                {modelType === "cost" && (
                  <div className="space-y-4 pt-1">
                    <NumInput
                      label="Depreciation Rate"
                      hint="Annual depreciation of the building structure."
                      value={depRate} onChange={setDepRate} prefix="" suffix="%" step="1"
                    />
                  </div>
                )}

                {modelType === "dcf" && (
                  <div className="space-y-4 pt-1">
                    <NumInput
                      label="Annual Gross Rent (optional)"
                      hint="Leave blank to auto-estimate."
                      value={grossRent} onChange={setGrossRent}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Growth Rate" value={growthRate} onChange={setGrowthRate} prefix="" suffix="%" step="0.5" />
                      <NumInput label="Discount Rate" value={discountRate} onChange={setDiscountRate} prefix="" suffix="%" step="0.5" />
                      <NumInput label="Exit Cap Rate" value={exitCap} onChange={setExitCap} prefix="" suffix="%" step="0.5" />
                      <NumInput label="Holding Period" value={holdingYears} onChange={setHoldingYears} prefix="" suffix="yrs" step="1" min="1" />
                    </div>
                  </div>
                )}

                {modelType === "comparable" && (
                  <div className="py-2 px-4 rounded-xl bg-blue/5 dark:bg-blue/10 border border-blue/20 text-[12px] text-gray2 dark:text-gray1">
                    The Comparable model runs automatically using scraped market listings in <strong className="text-black dark:text-white">{property.state}</strong>. No additional inputs needed.
                  </div>
                )}

                {runError && (
                  <div className="px-4 py-3 rounded-xl bg-red/10 border border-red/20 text-red text-[12px] font-medium">
                    {runError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setModalOpen(false)}
                    disabled={running}
                    className="flex-1 px-4 py-3 border border-black/10 dark:border-white/10 font-semibold rounded-xl text-[13px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRun}
                    disabled={running}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue text-white font-semibold rounded-xl text-[13px] hover:bg-blue/90 disabled:opacity-50 transition-colors"
                  >
                    {running ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Calculating…
                      </>
                    ) : (
                      "Run Valuation"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
