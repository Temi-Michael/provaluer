"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UpgradeModal from "@/components/ui/UpgradeModal";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function IntelligenceDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const fetchIntelligence = async () => {
      const token = localStorage.getItem("provaluer_token");
      try {
        const res = await fetch("/api/intelligence", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 403 || res.status === 402) {
          setShowUpgradeModal(true);
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIntelligence();
  }, []);

  if (loading) {
    return <div className="p-8 text-white">Loading Intelligence Data...</div>;
  }

  if (showUpgradeModal) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto w-full">
        <h1 className="text-3xl font-bold text-white mb-4">Market Intelligence</h1>
        <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-12 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Pro Feature Locked</h2>
          <p className="text-gray2 mb-6">You must be on a Professional or Enterprise plan to view state-wide market intelligence data.</p>
          <button 
            onClick={() => setShowUpgradeModal(true)}
            className="bg-blue hover:bg-[#0070f0] text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Upgrade Plan
          </button>
        </div>
        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => router.push("/dashboard")} 
          title="Upgrade to Access Intelligence" 
          message="Unlock the Market Intelligence dashboard with real-time Cap Rates, ROI, and Volume trends across all 36 states."
        />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-white">Failed to load data.</div>;
  }

  const chartData = {
    labels: data.state_insights.map((s: any) => s.state),
    datasets: [
      {
        label: 'Average Cap Rate (%)',
        data: data.state_insights.map((s: any) => s.avg_cap_rate),
        backgroundColor: '#0a84ff',
        borderRadius: 4,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#8e8e93' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#8e8e93' }
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight mb-2 text-white">Market Intelligence</h1>
          <p className="text-[15px] text-gray2">Macro data and trends across 36 states in Nigeria</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6">
          <div className="text-[13px] font-semibold text-gray2 uppercase tracking-widest mb-2">Trending Property Type</div>
          <div className="text-3xl font-bold text-white">{data.trending_type}</div>
        </div>
        <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6">
          <div className="text-[13px] font-semibold text-gray2 uppercase tracking-widest mb-2">Total Monitored Volume</div>
          <div className="text-3xl font-bold text-white">₦ {(data.total_volume / 1000000000).toFixed(1)} Billion</div>
        </div>
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Average Capitalization Rates by State</h2>
        <div className="h-[300px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-4 text-[13px] font-semibold text-gray2 uppercase tracking-wider">State</th>
                <th className="p-4 text-[13px] font-semibold text-gray2 uppercase tracking-wider">Avg Cap Rate</th>
                <th className="p-4 text-[13px] font-semibold text-gray2 uppercase tracking-wider">Avg Price/Sqm</th>
                <th className="p-4 text-[13px] font-semibold text-gray2 uppercase tracking-wider">Total Listings</th>
              </tr>
            </thead>
            <tbody>
              {data.state_insights.map((insight: any, index: number) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-white">{insight.state}</td>
                  <td className="p-4 text-white font-medium">{insight.avg_cap_rate}%</td>
                  <td className="p-4 text-gray2">₦{insight.avg_price_per_sqm.toLocaleString()}</td>
                  <td className="p-4 text-gray2">{insight.total_listings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
