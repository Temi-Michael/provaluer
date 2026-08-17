"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function DashboardOverview() {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, role: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("provaluer_token");
    const userData = localStorage.getItem("provaluer_user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (e) {}

    const fetchModels = async () => {
      try {
        const res = await fetch("/api/models?type=all", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {}
        if (res.ok && data) {
          setModels(data || []);
        }
      } catch (e) {
        console.error("Failed to fetch models");
      }

      try {
        const subRes = await fetch("/api/subscription/mine", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const subData = await subRes.json();
        if (subRes.ok) {
          setSubscription(subData);
        }
      } catch (e) {
        console.error("Failed to fetch subscription");
      }

      setLoading(false);
    };

    fetchModels();
  }, [router]);

  if (loading || !user) {
    return <div className="p-8 text-gray2">Loading dashboard...</div>;
  }

  const comparableCount = models.filter(m => m.ModelType === "Comparable").length;
  const incomeCount = models.filter(m => m.ModelType === "Income").length;
  const costCount = models.filter(m => m.ModelType === "Cost").length;
  const dcfCount = models.filter(m => m.ModelType === "DCF" || m.ModelType === "Dcf").length;

  // --- LIVE DATA FOR CHARTS ---
  const doughnutData = {
    labels: ['Comparable', 'Income', 'Cost', 'DCF'],
    datasets: [{
      data: [comparableCount, incomeCount, costCount, dcfCount],
      backgroundColor: ['#6e5ce6', '#0a84ff', '#30d158', '#ff9f0a'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const comparableValue = models.filter(m => m.ModelType === "Comparable").reduce((sum, m) => sum + (m.EstimatedValue || 0), 0) / 1000000000;
  const incomeValue = models.filter(m => m.ModelType === "Income").reduce((sum, m) => sum + (m.EstimatedValue || 0), 0) / 1000000000;
  const costValue = models.filter(m => m.ModelType === "Cost").reduce((sum, m) => sum + (m.EstimatedValue || 0), 0) / 1000000000;
  const dcfValue = models.filter(m => m.ModelType === "DCF" || m.ModelType === "Dcf").reduce((sum, m) => sum + (m.EstimatedValue || 0), 0) / 1000000000;

  const barData = {
    labels: ['Comparable', 'Income', 'Cost', 'DCF'],
    datasets: [{
      label: 'Total Value (₦ Billions)',
      data: [comparableValue, incomeValue, costValue, dcfValue],
      backgroundColor: ['#6e5ce6', '#0a84ff', '#30d158', '#ff9f0a'],
      borderRadius: 6,
    }]
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1280px] mx-auto w-full pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-[24px] font-bold tracking-tight">Dashboard Overview</h1>
        <div className="text-[13px] text-gray2">
          Dashboard <span className="mx-2">/</span> <b className="text-gray1">Overview</b>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#1c1c1e] dark:to-[#0d0d0e] rounded-xl p-5 hover:-translate-y-1 transition-transform border border-transparent dark:border-white/5 shadow-md dark:shadow-none">
          <div className="text-[12px] text-gray3 dark:text-white/70 font-medium mb-2">Usage This Month</div>
          <div className="text-[26px] font-extrabold tracking-tight mb-3 text-black dark:text-white">
            {subscription ? `${subscription.ModelsUsedThisMonth}/${subscription.MonthlyLimit}` : "..."}
          </div>
          <div className="w-full bg-gray6 dark:bg-white/10 rounded-full h-1.5 mb-2">
            <div 
              className="bg-blue h-1.5 rounded-full" 
              style={{ width: subscription ? `${Math.min(100, (subscription.ModelsUsedThisMonth / subscription.MonthlyLimit) * 100)}%` : '0%' }}
            />
          </div>
          <a href="/subscription" className="text-[11px] text-blue hover:text-blue/80 transition-colors uppercase font-bold tracking-wider">
            {subscription?.Tier} Plan
          </a>
        </div>
        <div className="bg-white dark:bg-gradient-to-br dark:from-[#1c1c1e] dark:to-[#0d0d0e] rounded-xl p-5 hover:-translate-y-1 transition-transform border border-transparent dark:border-white/5 shadow-md dark:shadow-none">
          <div className="text-[12px] text-gray3 dark:text-white/70 font-medium mb-2">Total Models</div>
          <div className="text-[26px] font-extrabold tracking-tight mb-3 text-black dark:text-white">{models.length}</div>
          <a href="/models" className="text-[12px] text-blue dark:text-white/80 hover:text-blue/80 dark:hover:text-white underline">View All Models</a>
        </div>
        <div className="bg-gradient-to-br from-[#6e5ce6] to-[#4c3bb5] rounded-xl p-5 hover:-translate-y-1 transition-transform">
          <div className="text-[12px] text-white/80 font-medium mb-2">Market Comparable</div>
          <div className="text-[26px] font-extrabold tracking-tight mb-3">{comparableCount}</div>
          <a href="/models?type=comparable" className="text-[12px] text-white/90 hover:text-white underline">View Market Models</a>
        </div>
        <div className="bg-gradient-to-br from-[#0a84ff] to-[#0058c2] rounded-xl p-5 hover:-translate-y-1 transition-transform">
          <div className="text-[12px] text-white/80 font-medium mb-2">Income Estimation</div>
          <div className="text-[26px] font-extrabold tracking-tight mb-3">{incomeCount}</div>
          <a href="/models?type=income" className="text-[12px] text-white/90 hover:text-white underline">View Income Models</a>
        </div>
        <div className="bg-gradient-to-br from-[#30d158] to-[#1ea53e] rounded-xl p-5 hover:-translate-y-1 transition-transform">
          <div className="text-[12px] text-white/80 font-medium mb-2">Cost Estimation</div>
          <div className="text-[26px] font-extrabold tracking-tight mb-3 text-white">{costCount}</div>
          <a href="/models?type=cost" className="text-[12px] text-white/90 hover:text-white underline">View Cost Models</a>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="bg-surface dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none rounded-xl p-6">
          <h3 className="text-[14px] font-semibold text-black dark:text-gray1 mb-4">Model Distribution</h3>
          <div className="relative h-[240px] flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#86868b' } } } }} />
          </div>
        </div>
        <div className="bg-surface dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none rounded-xl p-6">
          <h3 className="text-[14px] font-semibold text-black dark:text-gray1 mb-4">Total Estimated Value by Model Type</h3>
          <div className="relative h-[240px]">
            <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#86868b' } }, x: { grid: { display: false }, ticks: { color: '#86868b' } } } }} />
          </div>
        </div>
      </div>

      {/* Recent Models Table */}
      <div className="bg-surface dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none rounded-xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-black/5 dark:border-white/5">
          <h3 className="text-[16px] font-bold text-black dark:text-white">Recent Models</h3>
          <button onClick={() => router.push("/create")} className="bg-blue hover:bg-[#0070f0] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-transform hover:scale-105">
            + Create Model
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Model Type</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Model Title</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Estimated Value</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Date Created</th>
                <th className="text-[11px] font-semibold uppercase tracking-wider text-gray3 px-6 py-4 border-b border-black/5 dark:border-white/5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[13px] text-gray2">
                    No models generated yet.
                  </td>
                </tr>
              ) : (
                models.slice(0, 5).map(model => (
                  <tr key={model.ID} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-black/5 dark:border-white/5 last:border-0 group">
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full tracking-wide ${
                        model.ModelType === 'Comparable' ? 'bg-[#6e5ce6]/15 text-[#a78bfa]' :
                        model.ModelType === 'Cost' ? 'bg-[#30d158]/15 text-[#30d158]' :
                        model.ModelType === 'Income' ? 'bg-[#0a84ff]/15 text-[#5ac8fa]' :
                        'bg-[#ff9f0a]/15 text-[#ffd60a]'
                      }`}>
                        {model.ModelType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-black dark:text-gray1 font-medium">{model.Property?.State || "N/A"}</td>
                    <td className="px-6 py-4 text-[13px] text-black dark:text-white font-semibold font-mono">
                      ₦ {model.EstimatedValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray3 dark:text-gray2">
                      {new Date(model.CreatedAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => router.push(`/models/${model.ID}`)} className="text-[12px] text-blue hover:underline font-semibold">View Report</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
