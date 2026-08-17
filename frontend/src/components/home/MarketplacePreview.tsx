"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function MarketplacePreview() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const res = await fetch("/api/marketplace");
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {}

        if (res.ok && data) {
          setProperties(data.slice(0, 6) || []); // show top 6
        }
      } catch (err) {
        console.error("Failed to load marketplace properties");
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[300px] bg-black/5 dark:bg-white/5 animate-pulse rounded-[20px]" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-[#1c1c1e] border border-transparent dark:border-white/5 shadow-md dark:shadow-none rounded-2xl mb-10">
        <div className="text-[48px] mb-4">🏠</div>
        <h3 className="text-[18px] font-bold text-black dark:text-white mb-2">No Properties Available</h3>
        <p className="text-[14px] text-gray2 max-w-[400px] mx-auto">There are currently no properties marked as "For Sale" on the Provaluer network. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
      {properties.map((property, index) => {
        const id = property.id ?? property.ID;
        const title = property.title ?? property.Title ?? "Untitled Property";
        const location = property.address
          ? `${property.address}, ${property.city || ""}, ${property.state || ""}`.replace(/,\s*,/g, ",").trim()
          : (property.Location ?? "No Location Provided");
        const price = property.current_value ?? property.purchase_price ?? property.Price ?? property.price ?? 0;
        const currency = property.purchase_currency ?? property.Currency ?? property.currency ?? "NGN";
        const bedrooms = property.bedrooms ?? property.Bedrooms ?? 0;
        const bathrooms = property.bathrooms ?? property.Bathrooms ?? 0;
        const area = property.land_area_sqm ?? property.building_area_sqm ?? property.SquareFootage ?? property.square_footage ?? 0;
        
        const houseImages = [
          "/house_1_1781675764179.png",
          "/house_2_1781675776617.png",
          "/house_3_1781675788510.png",
        ];
        const imageUrls = property.image_urls ?? property.ImageUrls;
        const imageSrc = (imageUrls && imageUrls.length > 0) ? imageUrls[0] : houseImages[index % houseImages.length];

        return (
          <div key={id} className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all flex flex-col">
            <div className="h-[100px] md:h-[200px] w-full relative shrink-0">
              <Image src={imageSrc} alt={title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/20" />
              <span className="absolute top-3 left-3 text-[10px] md:text-[11px] font-bold tracking-widest uppercase bg-blue/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full z-10">Sale</span>
            </div>
            <div className="p-4 md:p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[16px] md:text-[20px] font-bold text-black dark:text-white tracking-tight mb-1 truncate">
                  {currency === "USD" ? "$" : "₦"}{price.toLocaleString()}
                </div>
                <div className="text-[13px] md:text-[15px] font-medium text-black dark:text-white mb-1 line-clamp-1">{title}</div>
                <div className="text-[11px] md:text-[13px] text-gray2 mb-3 flex items-center gap-1 truncate">📍 {location}</div>
                <div className="flex flex-wrap gap-2 pt-3 border-t border-black/5 dark:border-white/5 text-[11px] md:text-[13px] text-gray2">
                  <span>🛏 {bedrooms} Beds</span>
                  <span>🛁 {bathrooms} Baths</span>
                  <span>📐 {area} sqm</span>
                </div>
              </div>
              <div className="flex flex-col xl:flex-row gap-2 mt-4 md:mt-5">
                <button className="w-full bg-blue text-white text-[12px] md:text-[13px] font-semibold py-2 md:py-2.5 rounded-full hover:bg-[#0070f0] transition-colors">Details</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
