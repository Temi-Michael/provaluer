"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UpgradeModal from "@/components/ui/UpgradeModal";
import Tooltip from "@/components/ui/Tooltip";

const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

const MODEL_TYPES = [
  { 
    id: "comparable", 
    title: "Market Comparable", 
    desc: "Estimates value by comparing with recently sold similar properties.", 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
    color: "from-[#6e5ce6] to-[#4c3bb5]" 
  },
  { 
    id: "income", 
    title: "Income Estimation", 
    desc: "Values property based on the rental income it generates over time.", 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, 
    color: "from-[#0a84ff] to-[#0058c2]" 
  },
  { 
    id: "cost", 
    title: "Cost Estimation", 
    desc: "Estimates value based on the cost to rebuild or replace the structure.", 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, 
    color: "from-[#30d158] to-[#1ea53e]" 
  },
  { 
    id: "dcf", 
    title: "Discounted Cash Flow", 
    desc: "Projects future cash flows and discounts them to present value.", 
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
    color: "from-[#ff9f0a] to-[#d48000]" 
  },
];

// Built structures are scored on physical condition; land is scored on how ready
// it is to build on. These labels must stay in sync with the multipliers in
// backend/src/Services/valuation_engine.go.
const BUILDING_CONDITIONS = [
  "Excellent (Newly Built)",
  "Good (Renovated)",
  "Fair (Requires minor repair)",
  "Poor (Dilapidated)",
];

const LAND_CONDITIONS = [
  "Fully Serviced (Road & Drainage)",
  "Partially Serviced",
  "Unserviced / Raw Land",
  "Difficult Terrain (Waterlogged)",
];

// Income and DCF capitalise rental income, which undeveloped land does not produce.
const RENTAL_MODELS = ["income", "dcf"];

interface StateRate {
  state: string;
  is_premium: boolean;
  land_rate_per_sqm: number;
  building_rate_per_sqm: number;
}

function CreateModelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const areaParam = searchParams.get("area");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [formData, setFormData] = useState({
    property_type: "Residential",
    state: "Lagos",
    neighborhood_class: "Mid-Market",
    land_area_sqm: areaParam || "",
    building_area_sqm: "",
    condition: BUILDING_CONDITIONS[1], // "Good (Renovated)"
  });

  const [inputs, setInputs] = useState<Record<string, any>>({});

  // Admin-managed rates pulled from the backend so this preview mirrors the real
  // valuation engine instead of duplicating a hardcoded rate table.
  const [stateRates, setStateRates] = useState<StateRate[]>([]);
  const [configRates, setConfigRates] = useState<Record<string, number>>({});

  // Live result from the real backend engine (null until it responds).
  const [preview, setPreview] = useState<{ estimated_value: number; confidence_score: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isLand = formData.property_type === "Land";
  const conditionOptions = isLand ? LAND_CONDITIONS : BUILDING_CONDITIONS;
  const rentalModelOnLand = isLand && !!typeParam && RENTAL_MODELS.includes(typeParam);

  useEffect(() => {
    const token = localStorage.getItem("provaluer_token");
    fetch("/api/valuation/rates", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => {
        if (j?.success) {
          setStateRates(j.data.state_rates || []);
          setConfigRates(j.data.rates || {});
        }
      })
      .catch(() => {});
  }, []);

  // Condition options differ by property type — reset to a valid one on switch so
  // a building condition can never be submitted for land (or vice versa).
  useEffect(() => {
    setFormData(prev => {
      const valid = prev.property_type === "Land" ? LAND_CONDITIONS : BUILDING_CONDITIONS;
      return valid.includes(prev.condition) ? prev : { ...prev, condition: valid[0] };
    });
  }, [formData.property_type]);

  useEffect(() => {
    if (areaParam) {
      setFormData(prev => ({
        ...prev,
        land_area_sqm: areaParam
      }));
    }
  }, [areaParam]);

  // Set default inputs based on chosen methodology
  useEffect(() => {
    if (typeParam === "income") {
      setInputs({
        gross_rent: "",
        cap_rate: "8.5",
        opex_ratio: "0.15",
        custom_land_rate: "",
        custom_building_rate: ""
      });
    } else if (typeParam === "cost") {
      setInputs({
        quality: "Standard",
        custom_land_rate: "",
        custom_building_rate: ""
      });
    } else if (typeParam === "dcf") {
      setInputs({
        gross_rent: "",
        growth_rate: "5.0",
        discount_rate: "12.0",
        exit_cap_rate: "8.0",
        opex_ratio: "0.15",
        custom_land_rate: "",
        custom_building_rate: ""
      });
    } else {
      setInputs({
        custom_land_rate: "",
        custom_building_rate: ""
      });
    }
  }, [typeParam]);

  // Resolve the admin-configured rates for the selected state and tier, matching
  // the backend's lookup order: exact state -> "Default" row -> hardcoded minimum.
  const getBaseRates = () => {
    const isPremium = formData.neighborhood_class === "Prime";
    const isDeveloping = formData.neighborhood_class === "Developing";

    const lookup = (state: string) =>
      stateRates.find(r => r.state === state && r.is_premium === isPremium);

    const row = lookup(formData.state) || lookup("Default");

    let landRate = row?.land_rate_per_sqm ?? (isPremium ? 87500 : 25000);
    let buildingRate = row?.building_rate_per_sqm ?? (isPremium ? 264000 : 120000);

    // "Developing" has no dedicated rate row; discount the standard tier instead.
    if (isDeveloping) {
      landRate = landRate * 0.5;
      buildingRate = buildingRate * 0.7;
    }

    return { landRate, buildingRate };
  };

  const { landRate: estimatedBaseLandRate, buildingRate: estimatedBaseBuildingRate } = getBaseRates();

  // Real-time calculation logic that runs live in-browser
  const calculateLiveValuation = () => {
    const landArea = parseFloat(formData.land_area_sqm) || 0;
    let buildingArea = parseFloat(formData.building_area_sqm) || 0;
    const propertyType = formData.property_type;
    const condition = formData.condition;

    if (landArea <= 0) {
      return { value: 0, score: 0, breakdown: [] };
    }

    // Get baseline rates
    const baseRates = getBaseRates();

    // Enforce custom user overrides if typed, otherwise fall back to statistical defaults
    const landRate = parseFloat(inputs.custom_land_rate) || baseRates.landRate;
    const buildingRate = parseFloat(inputs.custom_building_rate) || baseRates.buildingRate;

    // Condition/servicing multiplier — mirrors conditionMultiplier() in the engine.
    let condMult = 0.95;
    let depreciationRate = 0.12;
    if (condition.startsWith("Fully Serviced")) {
      condMult = 1.05;
      depreciationRate = 0;
    } else if (condition.startsWith("Partially Serviced")) {
      condMult = 0.95;
      depreciationRate = 0;
    } else if (condition.startsWith("Unserviced")) {
      condMult = 0.80;
      depreciationRate = 0;
    } else if (condition.startsWith("Difficult Terrain")) {
      condMult = 0.55;
      depreciationRate = 0;
    } else if (condition.startsWith("Excellent")) {
      condMult = 1.05;
      depreciationRate = 0.03;
    } else if (condition.startsWith("Good")) {
      condMult = 0.95;
      depreciationRate = 0.12;
    } else if (condition.startsWith("Fair")) {
      condMult = 0.75;
      depreciationRate = 0.32;
    } else if (condition.startsWith("Poor")) {
      condMult = 0.45;
      depreciationRate = 0.65;
    }

    // Property Type
    let typeMult = 1.0;
    if (propertyType === "Commercial") {
      typeMult = 1.15;
    } else if (propertyType === "Industrial") {
      typeMult = 1.10;
    } else if (propertyType === "Land") {
      typeMult = 0.85;
      buildingArea = 0;
    }

    let val = 0;
    let score = 90;
    let breakdown: { label: string; value: string }[] = [];

    if (typeParam === "comparable") {
      const landVal = landArea * landRate;
      const buildVal = buildingArea * buildingRate;
      const raw = landVal + buildVal;
      val = raw * condMult * typeMult;
      score = 92;

      breakdown = [
        { label: "Base Land Value", value: `₦${landVal.toLocaleString()}` },
        { label: "Base Structure Value", value: `₦${buildVal.toLocaleString()}` },
        { label: "Applied Land Rate", value: `₦${landRate.toLocaleString()} / SQM` },
        { label: "Applied Building Rate", value: `₦${buildingRate.toLocaleString()} / SQM` },
        { label: "Condition Adjust.", value: `${((condMult - 1) * 100).toFixed(0)}%` },
      ];
    } else if (typeParam === "income") {
      let grossRent = parseFloat(inputs.gross_rent) || 0;
      let capRate = parseFloat(inputs.cap_rate) || 8.5;
      const opexRatio = parseFloat(inputs.opex_ratio) || 0.15;

      if (grossRent <= 0) {
        const rentArea = buildingArea > 0 ? buildingArea : landArea * 0.4;
        const rentRate = formData.neighborhood_class === "Prime"
          ? (configRates.rent_rate_premium || 45000)
          : (configRates.rent_rate_standard || 15000);
        grossRent = rentArea * rentRate * condMult;
      }

      const opex = grossRent * opexRatio;
      const noi = grossRent - opex;
      val = noi / (capRate / 100);
      score = 87;

      breakdown = [
        { label: "Annual Gross Rent", value: `₦${grossRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: "Operating Expenses (OpEx)", value: `₦${opex.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${(opexRatio * 100).toFixed(0)}%)` },
        { label: "Net Operating Income (NOI)", value: `₦${noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: "Capitalization Rate", value: `${capRate.toFixed(1)}%` },
      ];
    } else if (typeParam === "cost") {
      const landVal = landArea * landRate;
      const replacementCost = buildingArea * buildingRate;
      const depreciatedBuilding = replacementCost * (1 - depreciationRate);
      val = landVal + depreciatedBuilding;
      score = 89;

      breakdown = [
        { label: "Land Market Value", value: `₦${landVal.toLocaleString()}` },
        { label: "New Construction Cost", value: `₦${replacementCost.toLocaleString()}` },
        { label: "Accrued Depreciation", value: `-${(depreciationRate * 100).toFixed(0)}%` },
        { label: "Depreciated Structure", value: `₦${depreciatedBuilding.toLocaleString()}` },
      ];
    } else if (typeParam === "dcf") {
      let initialRent = parseFloat(inputs.gross_rent) || 0;
      const growthRate = parseFloat(inputs.growth_rate) || 5.0;
      const discountRate = parseFloat(inputs.discount_rate) || 12.0;
      const exitCap = parseFloat(inputs.exit_cap_rate) || 8.0;
      const opexRatio = parseFloat(inputs.opex_ratio) || 0.15;

      if (initialRent <= 0) {
        const rentArea = buildingArea > 0 ? buildingArea : landArea * 0.4;
        const rentRate = formData.neighborhood_class === "Prime"
          ? (configRates.rent_rate_premium || 45000)
          : (configRates.rent_rate_standard || 15000);
        initialRent = rentArea * rentRate * condMult;
      }

      const r = discountRate / 100;
      const g = growthRate / 100;
      const c = exitCap / 100;

      let pv = 0;
      let currentRent = initialRent;
      for (let year = 1; year <= 5; year++) {
        const cf = currentRent * (1 - opexRatio);
        const discountFactor = Math.pow(1 + r, year);
        pv += cf / discountFactor;

        if (year === 5) {
          const nextRent = currentRent * (1 + g);
          const terminalVal = (nextRent * (1 - opexRatio)) / c;
          pv += terminalVal / discountFactor;
        }
        currentRent *= (1 + g);
      }

      val = pv;
      score = 84;

      breakdown = [
        { label: "Year 1 Cash Flow", value: `₦${(initialRent * (1 - opexRatio)).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { label: "Rental Growth Rate", value: `${growthRate.toFixed(1)}% / yr` },
        { label: "Discount Rate (Hurdle)", value: `${discountRate.toFixed(1)}%` },
        { label: "Terminal Value (Year 5)", value: `₦${((initialRent * Math.pow(1 + g, 5) * (1 - opexRatio)) / c).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
      ];
    }

    return { value: Math.max(0, val), score, breakdown };
  };

  // Ask the backend to run the real engine against live market comparables.
  // Debounced so typing in the form doesn't hammer the API. The returned value
  // and confidence are what the saved model will contain — the local
  // calculation above only supplies the itemised breakdown.
  useEffect(() => {
    const landArea = parseFloat(formData.land_area_sqm) || 0;
    if (landArea <= 0) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      const numericInputs: Record<string, any> = {};
      Object.keys(inputs).forEach(key => {
        if (inputs[key] !== "") {
          numericInputs[key] = isNaN(Number(inputs[key])) ? inputs[key] : Number(inputs[key]);
        }
      });

      try {
        const token = localStorage.getItem("provaluer_token");
        const res = await fetch("/api/valuation/preview", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            model_type: typeParam === "dcf" ? "DCF" : (typeParam ? typeParam.charAt(0).toUpperCase() + typeParam.slice(1) : "Comparable"),
            property_type: formData.property_type,
            state: formData.state,
            is_premium: formData.neighborhood_class === "Prime",
            land_area_sqm: landArea,
            building_area_sqm: parseFloat(formData.building_area_sqm) || 0,
            condition: formData.condition,
            inputs: numericInputs,
          }),
        });
        const j = await res.json();
        // A 403 here means the tier gate blocked the model; the submit button
        // surfaces the upgrade modal, so just fall back to the local estimate.
        setPreview(res.ok && j?.success ? j.data : null);
      } catch {
        // Aborted or offline — keep showing the local estimate.
      } finally {
        setPreviewLoading(false);
      }
    }, 500);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [formData, inputs, typeParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const bArea = parseFloat(formData.building_area_sqm) || 0;
    const lArea = parseFloat(formData.land_area_sqm) || 0;
    if (bArea > 0 && bArea > lArea) {
      setError("Building Area cannot be greater than Land Area.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("provaluer_token");

    // Format fields for calculations
    const finalInputs: Record<string, any> = {};
    Object.keys(inputs).forEach(key => {
      if (inputs[key] !== "") {
        finalInputs[key] = isNaN(Number(inputs[key])) ? inputs[key] : Number(inputs[key]);
      }
    });

    try {
      const res = await fetch("/api/valuation/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          model_type: typeParam === "dcf" ? "DCF" : (typeParam ? typeParam.charAt(0).toUpperCase() + typeParam.slice(1) : "Comparable"),
          property_type: formData.property_type,
          state: formData.state,
          is_premium: formData.neighborhood_class === "Prime",
          land_area_sqm: parseFloat(formData.land_area_sqm) || 0,
          building_area_sqm: parseFloat(formData.building_area_sqm) || 0,
          condition: formData.condition,
          inputs: finalInputs
        })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {}

      if (res.ok && data) {
        router.push(`/models`);
      } else {
        if (res.status === 402 || res.status === 403) {
          setShowUpgradeModal(true);
        } else {
          setError(data?.error || data?.message || "Failed to generate valuation model");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Select Model Type
  if (!typeParam) {
    return (
      <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
        <h1 className="text-[28px] font-bold tracking-tight mb-2 text-center mt-8">What type of valuation are you running?</h1>
        <p className="text-[15px] text-gray2 text-center mb-12 max-w-[600px] mx-auto">
          Select the methodology that best fits your property. You can always run multiple models for the same property later.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px] mx-auto">
          {MODEL_TYPES.map(model => (
            <Link 
              key={model.id}
              href={`/create?type=${model.id}`}
              className="bg-white dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none hover:border-blue/50 dark:hover:border-white/20 rounded-2xl p-6 transition-all hover:-translate-y-1 group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center text-[24px] mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {model.icon}
              </div>
              <h3 className="text-[18px] font-bold mb-2 text-black dark:text-white">{model.title}</h3>
              <p className="text-[13px] text-gray2 leading-relaxed">{model.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const currentModel = MODEL_TYPES.find(m => m.id === typeParam) || MODEL_TYPES[0];
  const { value: localValue, breakdown: liveBreakdown } = calculateLiveValuation();

  // Prefer the server's answer — it is computed from live market comparables and
  // is exactly what gets saved. The local figure is only a placeholder while the
  // debounced request is in flight or if it fails.
  const liveValue = preview ? preview.estimated_value : localValue;
  const liveScore = preview ? preview.confidence_score : 0;

  // STEP 2: Fill Inputs Form with Real-Time Calculations
  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      <Link href="/create" className="text-blue text-[13px] hover:underline mb-6 inline-flex items-center gap-2">
        ← Back to Model Selection
      </Link>
      
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentModel.color} flex items-center justify-center text-[20px] shadow-lg`}>
          {currentModel.icon}
        </div>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{currentModel.title}</h1>
          <p className="text-[13px] text-gray2">Configure parameters in real-time to analyze structural valuation.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Input Form */}
        <form onSubmit={handleSubmit} className="w-full lg:w-[60%] bg-white dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none rounded-2xl p-6 sm:p-10">
          
          {error && (
            <div className="bg-red/10 border border-red/20 text-red text-[13px] p-4 rounded-xl mb-8 flex items-center gap-3">
              <span className="text-[18px]">⚠️</span> {error}
            </div>
          )}

          {rentalModelOnLand && (
            <div className="bg-[#ff9f0a]/10 border border-[#ff9f0a]/25 text-[#b06f00] dark:text-[#ff9f0a] text-[13px] p-4 rounded-xl mb-8 flex items-start gap-3">
              <span className="text-[18px] leading-none">⚠️</span>
              <span>
                The <b>{typeParam === "dcf" ? "Discounted Cash Flow" : "Income Estimation"}</b> model
                values a property from the rent it produces, and undeveloped land produces none.
                This estimate falls back to a notional ground rent and should be treated as
                indicative only — use the <Link href="/create?type=comparable" className="underline font-semibold">Market Comparable</Link> model for land.
              </span>
            </div>
          )}

          <h3 className="text-[12px] font-semibold text-gray2 mb-5 pb-2 border-b border-gray5 dark:border-white/5 uppercase tracking-widest">1. Property Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Property Type
                <Tooltip content="The classification of the property being valued."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <select 
                value={formData.property_type}
                onChange={e => setFormData({...formData, property_type: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
              >
                <option>Residential</option>
                <option>Commercial</option>
                <option>Industrial</option>
                <option>Land</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Location State
                <Tooltip content="The primary state where the property is located in Nigeria."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <select 
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
              >
                {NIGERIA_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Neighborhood Class
                <Tooltip content="Applies location multipliers based on neighborhood economic status (Prime, Suburb, Outskirts)."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <select 
                value={formData.neighborhood_class}
                onChange={e => setFormData({...formData, neighborhood_class: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
              >
                <option value="Prime">Prime / High-End</option>
                <option value="Mid-Market">Mid-Market / Suburb</option>
                <option value="Developing">Developing / Outskirts</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                {isLand ? "Land Servicing" : "Condition"}
                <Tooltip content={isLand
                  ? "How ready the land is to build on — access roads, drainage and utilities. Raw or waterlogged plots are discounted."
                  : "Physical state of the property, which significantly impacts valuation depreciation."}><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <select
                value={formData.condition}
                onChange={e => setFormData({...formData, condition: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
              >
                {conditionOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Land Area (SQM)
                <Tooltip content="Total area of the plot of land in square meters."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <input 
                type="number" 
                placeholder="e.g. 500"
                value={formData.land_area_sqm}
                onChange={e => setFormData({...formData, land_area_sqm: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Building Area (SQM)
                <Tooltip content="The gross floor area of the actual building structure. Set to 0 if it is undeveloped land."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <input 
                type="number" 
                placeholder="e.g. 350"
                value={formData.building_area_sqm}
                disabled={formData.property_type === "Land"}
                onChange={e => setFormData({...formData, building_area_sqm: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors disabled:opacity-40"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Custom Land Rate (₦/SQM)
                <Tooltip content="Override the default estimated land price per square meter. Leave empty to use statistical baselines."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <input 
                type="number" 
                placeholder={`Estimated: ₦${estimatedBaseLandRate.toLocaleString()}`}
                value={inputs.custom_land_rate || ""}
                onChange={e => setInputs({...inputs, custom_land_rate: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                Custom Building Rate (₦/SQM)
                <Tooltip content="Override the default estimated construction cost per square meter. Leave empty to use statistical baselines."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
              </label>
              <input 
                type="number" 
                placeholder={formData.property_type === "Land" ? "N/A (Undeveloped Land)" : `Estimated: ₦${estimatedBaseBuildingRate.toLocaleString()}`}
                disabled={formData.property_type === "Land"}
                value={inputs.custom_building_rate || ""}
                onChange={e => setInputs({...inputs, custom_building_rate: e.target.value})}
                className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors disabled:opacity-40"
              />
            </div>
          </div>

          {/* Dynamic Methodology Forms */}
          {typeParam === 'income' && (
            <>
              <h3 className="text-[12px] font-semibold text-gray2 mt-10 mb-5 pb-2 border-b border-gray5 dark:border-white/5 uppercase tracking-widest">2. Income Cap Parameters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Annual Gross Rent (₦)
                    <Tooltip content="Leave blank to auto-estimate rent based on property area and premium environment."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5000000"
                    value={inputs.gross_rent || ""}
                    onChange={e => setInputs({...inputs, gross_rent: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Capitalization Rate (%)
                    <Tooltip content="The expected yield rate for property capitalization in this region (e.g., 8.5%)."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="8.5"
                    value={inputs.cap_rate || ""}
                    onChange={e => setInputs({...inputs, cap_rate: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    OpEx Ratio (Decimal)
                    <Tooltip content="Operating expense ratio as a decimal of gross rent (e.g., 0.15 for 15% expenses)."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.15"
                    value={inputs.opex_ratio || ""}
                    onChange={e => setInputs({...inputs, opex_ratio: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {typeParam === 'dcf' && (
            <>
              <h3 className="text-[12px] font-semibold text-gray2 mt-10 mb-5 pb-2 border-b border-gray5 dark:border-white/5 uppercase tracking-widest">2. Cash Flow Projections</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Year 1 Gross Rent (₦)
                    <Tooltip content="The starting annual rent. Leave blank to auto-estimate."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    placeholder="e.g. 6000000"
                    value={inputs.gross_rent || ""}
                    onChange={e => setInputs({...inputs, gross_rent: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Rent Growth Rate (% / Year)
                    <Tooltip content="Expected annual percentage increase in rental income (e.g. 5.0%)."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="5.0"
                    value={inputs.growth_rate || ""}
                    onChange={e => setInputs({...inputs, growth_rate: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Discount Rate / Hurdle (%)
                    <Tooltip content="The required rate of return or discount rate to determine present value (e.g. 12.0%)."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="12.0"
                    value={inputs.discount_rate || ""}
                    onChange={e => setInputs({...inputs, discount_rate: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Exit Cap Rate (%)
                    <Tooltip content="The capitalization rate used to calculate resale value at the end of Year 5 (e.g. 8.0%)."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="8.0"
                    value={inputs.exit_cap_rate || ""}
                    onChange={e => setInputs({...inputs, exit_cap_rate: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {typeParam === 'cost' && (
            <>
              <h3 className="text-[12px] font-semibold text-gray2 mt-10 mb-5 pb-2 border-b border-gray5 dark:border-white/5 uppercase tracking-widest">2. Construction Specs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray2 uppercase tracking-widest">
                    Build Quality Class
                    <Tooltip content="Determines standard construction replacement cost parameter limits."><span className="cursor-help text-gray3 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">ⓘ</span></Tooltip>
                  </label>
                  <select 
                    value={inputs.quality || "Standard"}
                    onChange={e => setInputs({...inputs, quality: e.target.value})}
                    className="bg-surface dark:bg-black/50 border border-gray5 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
                  >
                    <option>Standard</option>
                    <option>Premium High-End</option>
                    <option>Luxury Custom</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-blue hover:bg-[#0070f0] text-white text-[15px] font-bold px-6 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-3"
          >
            {loading ? "Analyzing Data & Generating Model..." : "Generate Valuation Model"}
          </button>
        </form>

        {/* Right Column: Real-Time Valuation Preview */}
        <div className="w-full lg:w-[40%] lg:sticky lg:top-8 bg-[#0e0e10]/95 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-[12px] font-bold text-blue tracking-wider uppercase mb-5">Real-Time Valuation Preview</h2>

          <div className="mb-6">
            <span className="text-[11px] text-gray2 font-medium">Estimated Market Value</span>
            <div className="text-[32px] sm:text-[36px] font-black tracking-tight text-white mt-1 select-all drop-shadow-[0_0_12px_rgba(10,132,255,0.2)] font-mono">
              {liveValue > 0 
                ? `₦${liveValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : "₦0"
              }
            </div>
            {liveScore > 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] text-emerald-400 font-semibold">
                  Confidence Score: {liveScore}% <span className="text-gray2 font-normal">· live market data</span>
                </span>
              </div>
            ) : previewLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray3 animate-pulse" />
                <span className="text-[12px] text-gray2">Checking market comparables…</span>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/5 pt-5">
            <h4 className="text-[11px] font-bold text-gray2 tracking-widest uppercase mb-4">Calculation Breakdown</h4>
            
            {liveBreakdown.length > 0 ? (
              <div className="space-y-3.5">
                {liveBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[13px] border-b border-white/5 pb-2">
                    <span className="text-gray2">{item.label}</span>
                    <span className="text-white font-semibold font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray3 italic py-4">Please input a valid Land Area to view calculations.</p>
            )}
          </div>

          <div className="mt-8 bg-white/5 dark:bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <h5 className="text-[11px] font-semibold text-white uppercase tracking-wider mb-2">Valuation Formula</h5>
            <p className="text-[12px] text-gray2 leading-relaxed font-mono">
              {typeParam === 'comparable' && "Value = (Land Area × Rate + Structure Area × Rate) × Condition × Property Type Adjustments"}
              {typeParam === 'income' && "Value = Net Operating Income (NOI) / Cap Rate"}
              {typeParam === 'cost' && "Value = Land Market Value + (New Structure Cost - Depreciation)"}
              {typeParam === 'dcf' && "Value = PV of Year 1-5 Operational Cash Flows + PV of Resale Terminal Value"}
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </div>
  );
}

export default function CreateModelPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray2">Loading...</div>}>
      <CreateModelContent />
    </Suspense>
  );
}
