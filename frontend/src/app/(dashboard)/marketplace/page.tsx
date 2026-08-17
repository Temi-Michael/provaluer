"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MarketplacePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketplace = async () => {
      const token = localStorage.getItem("provaluer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/marketplace", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {}

        if (res.ok && data) {
          setProperties(data || []);
        }
      } catch (err) {
        console.error("Failed to load marketplace properties");
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, [router]);

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Marketplace</h1>
          <p className="text-[14px] text-gray2 mt-1">Discover premium real estate opportunities from verified Provaluer users.</p>
        </div>
        <div className="text-[13px] text-gray2">
          Dashboard <span className="mx-2">/</span> <b className="text-gray1">Marketplace</b>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray2">Loading marketplace properties...</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none rounded-2xl">
          <div className="text-[48px] mb-4">🏠</div>
          <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">No Properties Available</h3>
          <p className="text-[14px] text-gray2 max-w-[400px] mx-auto">There are currently no properties marked as "For Sale" on the Provaluer network. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(property => (
            <div key={property.id} className="bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md dark:shadow-none rounded-2xl overflow-hidden hover:-translate-y-1 transition-all group">
              <div className="h-[200px] bg-[#fafafa] dark:bg-black relative flex items-center justify-center border-b border-black/5 dark:border-white/5">
                <span className="text-[48px] opacity-20 group-hover:scale-110 transition-transform">🏢</span>
                <div className="absolute top-4 right-4 bg-blue text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  For Sale
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[16px] font-bold text-black dark:text-white line-clamp-1">{property.title}</h3>
                </div>
                
                <p className="text-[13px] text-gray2 mb-4 line-clamp-1">{property.address}, {property.city}, {property.state}</p>
                
                <div className="flex gap-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray3 uppercase tracking-widest font-bold">Type</span>
                    <span className="text-[13px] font-medium text-black dark:text-white">{property.property_type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray3 uppercase tracking-widest font-bold">Area</span>
                    <span className="text-[13px] font-medium text-black dark:text-white">{property.land_area_sqm} Sqm</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray3 uppercase tracking-widest font-bold">Price</span>
                    <span className="text-[13px] font-bold text-blue">₦{(property.purchase_price * 1.15).toLocaleString()}</span>
                  </div>
                </div>

                <button className="w-full py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white text-[13px] font-bold rounded-xl transition-colors">
                  View Full Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
