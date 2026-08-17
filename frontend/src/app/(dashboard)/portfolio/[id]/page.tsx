"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const propertyId = unwrappedParams.id;
  
  const [property, setProperty] = useState<any>(null);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      const token = localStorage.getItem("provaluer_token");
      if (!token) return router.push("/login");

      try {
        const res = await fetch(`/api/portfolio/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
          setProperty(data.property);
          setLeases(data.leases || []);
        }
      } catch (err) {
        console.error("Failed to load property details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [propertyId, router]);

  if (loading) return <div className="p-8 text-gray2">Loading property data...</div>;
  if (!property) return <div className="p-8 text-red">Property not found.</div>;

  const activeLease = leases.find(l => l.is_active);

  return (
    <div className="p-4 sm:p-8 max-w-[1000px] mx-auto w-full pb-20">
      <div className="mb-8">
        <h1 className="text-[24px] font-bold tracking-tight">{property.title}</h1>
        <div className="text-[13px] text-gray2 mt-1">
          <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link> <span className="mx-2">/</span> 
          <Link href="/portfolio/properties" className="hover:text-white transition-colors">Properties</Link> <span className="mx-2">/</span> 
          <b className="text-gray1">{property.title}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Property Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-[18px] font-bold text-white mb-1">Property Overview</h2>
                <p className="text-[13px] text-gray2">{property.address}, {property.city}, {property.state}</p>
              </div>
              <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                property.status === 'Rented' ? 'bg-[#30d158]/15 text-[#30d158]' : 
                property.status === 'For Sale' ? 'bg-[#0a84ff]/15 text-[#5ac8fa]' :
                'bg-gray3/30 text-gray1'
              }`}>
                {property.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-[11px] text-gray2 uppercase tracking-widest mb-1">Type</div>
                <div className="text-[14px] font-medium">{property.property_type}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray2 uppercase tracking-widest mb-1">Bed/Bath</div>
                <div className="text-[14px] font-medium">{property.bedrooms} / {property.bathrooms}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray2 uppercase tracking-widest mb-1">Land Area</div>
                <div className="text-[14px] font-medium">{property.land_area_sqm} Sqm</div>
              </div>
              <div>
                <div className="text-[11px] text-gray2 uppercase tracking-widest mb-1">Year Built</div>
                <div className="text-[14px] font-medium">{property.year_built || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Lease / Rent Automation */}
        <div className="space-y-6">
          <div className="bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl p-6">
            <h2 className="text-[16px] font-bold text-white mb-4">Rent Automation</h2>
            
            {activeLease ? (
              <div>
                <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 mb-4">
                  <div className="text-[12px] text-gray2 mb-1">Active Tenant</div>
                  <div className="text-[15px] font-bold text-white">{activeLease.Tenant?.full_name || "Unknown"}</div>
                </div>

                <div className="bg-blue/10 border border-blue/20 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-[12px] text-blue font-medium uppercase tracking-widest">Next Rent Due</div>
                    <div className="text-[16px] font-bold text-blue">{activeLease.currency} {activeLease.rent_amount.toLocaleString()}</div>
                  </div>
                  <div className="text-[13px] text-white">
                    {new Date(activeLease.next_due_date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                
                <button className="w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[13px] font-semibold rounded-lg transition-colors">
                  Log Payment
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-[32px] mb-2">📄</div>
                <p className="text-[13px] text-gray2 mb-4">No active lease found. Add a tenant to enable rent automation.</p>
                <button className="w-full py-2 bg-blue hover:bg-[#0070f0] text-white text-[13px] font-semibold rounded-lg transition-colors">
                  + Create Lease
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
