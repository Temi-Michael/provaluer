"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UpgradeModal from "@/components/ui/UpgradeModal";
import AlertModal, { AlertState } from "@/components/ui/AlertModal";

function ModelsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") || "all";

  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchModels = async () => {
      const token = localStorage.getItem("provaluer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(`/api/models?type=${typeFilter}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        const sorted = data.sort((a: any, b: any) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
        } catch (e) {}

        if (res.ok && data) {
          setModels(data || []);
        } else {
          console.error(data?.error || data?.message || text || "Failed to fetch models");
        }
      } catch (e) {
        console.error("Failed to fetch models");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [router, typeFilter]);

  const tabs = [
    { id: "all", label: "All Models" },
    { id: "comparable", label: "Market Comparable" },
    { id: "income", label: "Income Estimation" },
    { id: "cost", label: "Cost Estimation" },
    { id: "dcf", label: "Discounted Cash Flow" },
  ];

  const getModelBadgeColor = (type: string) => {
    switch(type.toLowerCase()) {
      case "comparable": return "bg-[#6e5ce6]/15 text-[#a78bfa]";
      case "cost": return "bg-[#30d158]/15 text-[#30d158]";
      case "income": return "bg-[#0a84ff]/15 text-[#5ac8fa]";
      case "dcf": return "bg-[#ff9f0a]/15 text-[#ffd60a]";
      default: return "bg-gray3/30 text-gray1";
    }
  };

  const handleDownloadPDF = async (id: string) => {
    const token = localStorage.getItem("provaluer_token");
    try {
      const res = await fetch(`/api/models/${id}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 402) {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error("Failed to export PDF");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Provaluer_Report_${id.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      setAlert({
        variant: "error",
        title: "Download failed",
        message: "We couldn't generate that PDF. Please try again in a moment.",
      });
    }
  };

  const handleEmailPDF = async (id: string) => {
    setEmailingId(id);
    const token = localStorage.getItem("provaluer_token");
    try {
      const res = await fetch(`/api/models/${id}/export/email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 402) {
          setShowUpgradeModal(true);
          setEmailingId(null);
          return;
        }
        throw new Error("Failed to email report");
      }
      setAlert({
        variant: "success",
        title: "Report sent",
        message: "Your valuation report is on its way. Check your inbox in a minute or two.",
      });
    } catch (e) {
      console.error(e);
      setAlert({
        variant: "error",
        title: "Couldn't send report",
        message: "Something went wrong emailing your report. Please try again.",
      });
    } finally {
      setEmailingId(null);
    }
  };
  const filteredModels = models.filter(m => {
    if (typeFilter !== "all" && m.ModelType.toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const typeStr = (m.ModelType || "").toLowerCase();
    const stateStr = (m.Property?.State || "").toLowerCase();
    return typeStr.includes(q) || stateStr.includes(q);
  });

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-[24px] font-bold tracking-tight">My Models</h1>
        <div className="text-[13px] text-gray2">
          Dashboard <span className="mx-2">/</span> <b className="text-gray1">Models</b>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar border-b border-black/5 dark:border-white/5">
        {tabs.map(tab => (
          <Link 
            key={tab.id}
            href={`/models?type=${tab.id}`}
            className={`whitespace-nowrap px-4 py-2 text-[14px] font-medium transition-colors border-b-2 ${
              typeFilter === tab.id 
                ? "text-blue border-blue" 
                : "text-gray2 border-transparent hover:text-black dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Models Table */}
      <div className="bg-surface dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-black/5 dark:border-white/5">
          <div className="relative w-full max-w-[300px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray2 text-[14px]">🔍</span>
            <input 
              type="text" 
              placeholder="Search by model type or state..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/5 dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-[13px] text-black dark:text-white outline-none focus:border-blue/50 transition-colors"
            />
          </div>
          <Link 
            href="/create" 
            className="hidden sm:flex bg-blue hover:bg-[#0070f0] text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors items-center gap-2"
          >
            + Create New Model
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Model Type</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Property State</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Estimated Value</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Date Created</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-gray2">
                    Loading your models...
                  </td>
                </tr>
              ) : filteredModels.length === 0 && searchQuery ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-gray2">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-[32px]">🔍</span>
                      <p>No models match your search for "{searchQuery}".</p>
                      <button onClick={() => setSearchQuery("")} className="text-blue hover:underline mt-2">Clear search</button>
                    </div>
                  </td>
                </tr>
              ) : filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-gray2">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-[32px]">📄</span>
                      <p>You haven't generated any {typeFilter !== "all" ? typeFilter : ""} valuation models yet.</p>
                      <Link href="/create" className="text-blue hover:underline mt-2">Generate your first model</Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredModels.map(model => (
                  <tr key={model.ID} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-black/5 dark:border-white/5 last:border-0 group">
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full tracking-wide ${getModelBadgeColor(model.ModelType)}`}>
                        {model.ModelType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray2 dark:text-gray1 font-medium">{model.Property?.State || "N/A"}</td>
                    <td className="px-6 py-4 text-[13px] text-black dark:text-white font-semibold font-mono">
                      ₦{model.EstimatedValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray3 dark:text-gray2">
                      {new Date(model.CreatedAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4 items-center">
                        <Link 
                          href={`/models/${model.ID}`}
                          className="text-[12px] text-black dark:text-white font-bold hover:underline transition-colors"
                        >
                          View Online
                        </Link>
                        <button 
                          onClick={() => handleDownloadPDF(model.ID)}
                          className="text-[12px] text-blue hover:text-[#5ac8fa] font-medium transition-colors"
                        >
                          Download PDF
                        </button>
                        <button 
                          onClick={() => handleEmailPDF(model.ID)}
                          disabled={emailingId === model.ID}
                          className="text-[12px] text-gray3 hover:text-black dark:text-gray2 dark:hover:text-white font-medium transition-colors disabled:opacity-50"
                        >
                          {emailingId === model.ID ? "Sending..." : "Email to Me"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AlertModal alert={alert} onClose={() => setAlert(null)} />

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        title="Upgrade to Export PDFs" 
        message="You must be on a Professional or Enterprise plan to download and email PDF reports."
      />
    </div>
  );
}

export default function ModelsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray2">Loading...</div>}>
      <ModelsPageContent />
    </Suspense>
  );
}
