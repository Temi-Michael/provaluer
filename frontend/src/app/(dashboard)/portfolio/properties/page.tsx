"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PropertiesList() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const token = localStorage.getItem("provaluer_token");
      if (!token) return router.push("/login");

      try {
        const res = await fetch("/api/portfolio/properties", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {}

        if (res.ok && data) {
          setProperties(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [router]);

  if (loading) return <div className="p-8 text-gray2">Loading properties...</div>;

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-foreground">My Properties</h1>
          <div className="text-[13px] text-gray2 mt-1">
            <Link href="/portfolio" className="hover:text-black dark:hover:text-white transition-colors">Portfolio</Link> <span className="mx-2">/</span> <b className="text-black dark:text-gray1">Properties</b>
          </div>
        </div>
        <Link 
          href="/portfolio/properties/new" 
          className="bg-blue hover:bg-[#0070f0] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-[18px] leading-none">+</span> Add Property
        </Link>
      </div>

      <div className="bg-surface dark:bg-[#1c1c1e] border border-black/10 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-[12px] uppercase tracking-widest text-gray2 border-b border-black/10 dark:border-white/5">
                <th className="px-6 py-4 font-semibold">Title & Location</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Purchase Price</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray2">
                    No properties logged yet. Click "Add Property" to start.
                  </td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr key={p.id} className="border-b border-black/10 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-bold text-foreground">{p.title}</div>
                      <div className="text-[12px] text-gray2">{p.city}, {p.state}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        p.status === "Rented" ? "bg-green/10 text-green" :
                        p.status === "For Sale" ? "bg-blue/10 text-blue" :
                        "bg-black/10 dark:bg-white/10 text-black dark:text-gray1"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] font-medium">
                      {p.purchase_currency} {p.purchase_price?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/portfolio/properties/${p.id}`} className="text-blue hover:text-blue/80 dark:hover:text-white text-[13px] font-semibold transition-colors">
                        View Details →
                      </Link>
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
