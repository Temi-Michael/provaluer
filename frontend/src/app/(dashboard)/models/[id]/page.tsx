"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function ModelViewer() {
  const router = useRouter();
  const params = useParams();
  const [model, setModel] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("provaluer_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/models/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setModel(await res.json());
        } else {
          router.push("/models");
        }

        const subRes = await fetch("/api/subscription/mine", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (subRes.ok) {
          setSubscription(await subRes.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  if (loading) {
    return <div className="p-8 text-gray2">Loading report...</div>;
  }

  if (!model) {
    return <div className="p-8 text-red">Report not found.</div>;
  }

  const isFree = subscription?.Tier === "Free";

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden">
      {/* FREE TIER WATERMARK OVERLAY */}
      {isFree && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden flex flex-wrap justify-center items-center opacity-[0.04] dark:opacity-[0.06]">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="text-[60px] font-black transform -rotate-45 p-8 whitespace-nowrap text-black dark:text-white">
              PROVALUER FREE TIER
            </div>
          ))}
        </div>
      )}

      <div className="p-4 sm:p-8 max-w-[1000px] mx-auto w-full relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
          <div>
            <Link href="/models" className="text-[12px] text-blue hover:underline mb-2 inline-block font-semibold">← Back to Models</Link>
            <h1 className="text-[28px] font-bold tracking-tight text-black dark:text-white">Valuation Report</h1>
            <p className="text-[14px] text-gray2">Generated on {new Date(model.CreatedAt).toLocaleDateString()}</p>
          </div>
          <div className="sm:text-right bg-blue/10 rounded-2xl p-6 border border-blue/20">
            <div className="text-[11px] font-bold text-blue uppercase tracking-widest mb-1">Final Estimated Value</div>
            <div className="text-[32px] font-extrabold text-blue tracking-tight">₦{model.EstimatedValue?.toLocaleString()}</div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-[#1c1c1e] shadow-lg dark:shadow-none border border-transparent dark:border-white/5 rounded-2xl p-8 mb-6">
          <h2 className="text-[18px] font-bold mb-6 border-b border-black/5 dark:border-white/5 pb-4 text-black dark:text-white">Property Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
            <div>
              <div className="text-[11px] font-bold text-gray3 uppercase tracking-wider mb-1">Type</div>
              <div className="text-[15px] font-medium text-black dark:text-gray1">
                {model.Property?.Type ?? model.Property?.type ?? "N/A"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray3 uppercase tracking-wider mb-1">Location</div>
              <div className="text-[15px] font-medium text-black dark:text-gray1">{model.Property?.State || "N/A"}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray3 uppercase tracking-wider mb-1">Land Area</div>
              <div className="text-[15px] font-medium text-black dark:text-gray1">{model.Property?.LandAreaSqm} SQM</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray3 uppercase tracking-wider mb-1">Building Area</div>
              <div className="text-[15px] font-medium text-black dark:text-gray1">{model.Property?.BuildingAreaSqm} SQM</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1c1c1e] shadow-lg dark:shadow-none border border-transparent dark:border-white/5 rounded-2xl p-8">
          <h2 className="text-[18px] font-bold mb-6 border-b border-black/5 dark:border-white/5 pb-4 text-black dark:text-white">Valuation Model Parameters ({model.ModelType})</h2>
          
          {(() => {
            let inputs: Record<string, any> = {};
            if (typeof model.Inputs === "string") {
              try {
                inputs = JSON.parse(model.Inputs);
              } catch (e) {
                return (
                  <pre className="text-[13px] bg-surface dark:bg-black/50 p-6 rounded-xl overflow-x-auto text-black dark:text-gray2 font-mono">
                    {model.Inputs}
                  </pre>
                );
              }
            } else {
              inputs = model.Inputs || {};
            }

            const keys = Object.keys(inputs);
            if (keys.length === 0) {
              return (
                <div className="text-[14px] text-gray2">
                  No custom parameters specified. Valuation was calculated based on market comparables in this area.
                </div>
              );
            }

            const formatCurrency = (val: any) => {
              const num = parseFloat(val);
              if (isNaN(num)) return val;
              const isUSD = model.Property?.PurchaseCurrency === "USD";
              return (isUSD ? "$" : "₦") + num.toLocaleString();
            };

            const formatPercentage = (val: any) => {
              const num = parseFloat(val);
              if (isNaN(num)) return val;
              return `${num}%`;
            };

            const formatOpexRatio = (val: any) => {
              const num = parseFloat(val);
              if (isNaN(num)) return val;
              return `${(num * 100).toFixed(0)}% (${val})`;
            };

            const fieldMapping: Record<string, { label: string; format: (val: any) => string }> = {
              gross_rent: { label: "Annual Gross Rent", format: formatCurrency },
              cap_rate: { label: "Yield / Cap Rate", format: formatPercentage },
              opex_ratio: { label: "Operating Expense (OpEx) Ratio", format: formatOpexRatio },
              growth_rate: { label: "Annual Rental Growth Rate", format: formatPercentage },
              discount_rate: { label: "Discount Rate (Cost of Capital)", format: formatPercentage },
              exit_cap_rate: { label: "Exit Cap Rate", format: formatPercentage },
              quality: { label: "Construction Material Quality", format: (val) => String(val) },
            };

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {keys.map((key) => {
                  const mapping = fieldMapping[key];
                  const label = mapping ? mapping.label : key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  const formattedValue = mapping ? mapping.format(inputs[key]) : String(inputs[key]);

                  return (
                    <div key={key} className="bg-surface dark:bg-black/30 border border-black/5 dark:border-white/5 rounded-xl p-5 shadow-sm">
                      <div className="text-[11px] font-bold text-gray2 uppercase tracking-wider mb-2">{label}</div>
                      <div className="text-[18px] font-black text-black dark:text-white tracking-tight">{formattedValue}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
