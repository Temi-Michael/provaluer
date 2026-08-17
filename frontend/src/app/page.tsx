import Link from "next/link";
import Image from "next/image";
import NavbarAuth from "@/components/home/NavbarAuth";
import MarketplacePreview from "@/components/home/MarketplacePreview";
import { TIER_LIMITS, priceForTier } from "@/lib/tiers";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background dark:bg-black">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 h-[64px] flex items-center bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/10 dark:border-white/10 transition-all">
        <div className="w-full max-w-[1080px] mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-blue flex items-center justify-center text-white font-bold text-sm shadow-[0_2px_10px_rgba(10,132,255,0.4)]">P</div>
            <span className="text-[19px] font-bold tracking-tight text-black dark:text-white">Provaluer</span>
          </Link>
          <ul className="hidden md:flex gap-7">
            <li><Link href="#features" className="text-[13px] text-gray2 hover:text-white transition-colors">Platform</Link></li>
            <li><Link href="#models" className="text-[13px] text-gray2 hover:text-white transition-colors">Models</Link></li>
            <li><Link href="#marketplace" className="text-[13px] text-gray2 hover:text-white transition-colors">Marketplace</Link></li>
            <li><Link href="#pricing" className="text-[13px] text-gray2 hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="#contact" className="text-[13px] text-gray2 hover:text-white transition-colors">Contact</Link></li>
          </ul>
          <NavbarAuth />
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center text-center pt-20 pb-24 px-6 overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(110,92,230,0.18)_0%,transparent_65%)] pointer-events-none" />
        
        <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-5 animate-fade-up">Property Intelligence Platform</div>
        <h1 className="text-[40px] md:text-[88px] font-bold tracking-tight leading-[1.05] mb-6 animate-fade-up animation-delay-100">
          Know exactly what<br/>
          <span className="bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#34d399] text-transparent bg-clip-text">It's worth.</span>
        </h1>
        <p className="text-[17px] md:text-[22px] text-gray2 max-w-[560px] leading-relaxed mb-9 animate-fade-up animation-delay-200">
          Instant, data-driven property valuations. We synthesize market comparables, income yields, and cost approaches to give you the most accurate price estimate in seconds.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-20 animate-fade-up animation-delay-300">
          <Link href="/register" className="bg-blue text-white text-[15px] font-semibold px-6 py-3 rounded-full hover:bg-[#0070f0] transition-transform hover:scale-102">
            Calculate Property Value
          </Link>
          <Link href="#models" className="bg-transparent border border-black/25 dark:border-white/25 text-black dark:text-white text-[15px] font-medium px-6 py-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/40 dark:hover:border-white/40 transition-colors">
            Explore Models
          </Link>
        </div>

        {/* Hero Value Card */}
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-[28px] overflow-hidden flex flex-col shadow-[0_32px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.6)] w-full max-w-[420px] animate-fade-up animation-delay-500 relative z-10">
          <div className="w-full h-[220px] relative">
            <Image src="/house_1_1781675764179.png" alt="Featured Property" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-[#1c1c1e]/90 to-transparent" />
          </div>
          <div className="px-8 pb-8 md:px-12 md:pb-12 pt-4 flex flex-col items-center relative z-10">
            <div className="text-[12px] font-semibold tracking-widest uppercase text-gray2 mb-2">Estimated Value</div>
            <div className="text-[32px] md:text-[52px] font-bold tracking-tight tabular-nums text-black dark:text-white">₦185,500,000</div>
            <div className="flex items-center gap-1.5 mt-2 text-[14px] text-green font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              High Confidence
            </div>
            
            <div className="flex gap-8 mt-6 pt-6 border-t border-black/10 dark:border-white/10 w-full justify-center">
              <div className="text-center">
                <div className="text-[18px] md:text-[22px] font-semibold text-black dark:text-white tracking-tight">₦4.2M</div>
                <div className="text-[12px] text-gray2 mt-0.5">Est. Rent / yr</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] md:text-[22px] font-semibold text-black dark:text-white tracking-tight">5.8%</div>
                <div className="text-[12px] text-gray2 mt-0.5">Rental Yield</div>
              </div>
            </div>

            <div className="w-full h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-blue w-[87%]"></div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section id="features" className="py-24 bg-surface dark:bg-gray6">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-3.5">The Platform</div>
          <h2 className="text-[28px] md:text-[52px] font-bold tracking-tight leading-[1.1] mb-4">Precision tools for <br/>real estate professionals.</h2>
          <p className="text-[19px] text-gray2 leading-relaxed max-w-[520px] mx-auto">
            Everything you need to value, analyze, and list properties in one unified ecosystem.
          </p>

          <div 
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 mt-16 pb-8 -mx-6 px-6 md:mx-0 md:px-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style dangerouslySetInnerHTML={{__html: `div::-webkit-scrollbar { display: none; }`}} />
            <div className="flex-none w-[85%] md:w-[400px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all">
              <div className="h-[220px] w-full relative">
                <Image src="/feature_calculations_clean_1781676814445.png" alt="Instant Calculations" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-8 text-left">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Instant Calculations</h3>
                <p className="text-[15px] text-gray2 leading-relaxed">Get accurate valuations in seconds without manually crunching numbers across multiple spreadsheets.</p>
              </div>
            </div>
            <div className="flex-none w-[85%] md:w-[400px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all">
              <div className="h-[220px] w-full relative">
                <Image src="/feature_models_1781676352744.png" alt="Estimation Models" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-8 text-left">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">4 Estimation Models</h3>
                <p className="text-[15px] text-gray2 leading-relaxed">Choose between Comparable, Income, Cost, and DCF models depending on your specific use case.</p>
              </div>
            </div>
            <div className="flex-none w-[85%] md:w-[400px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all">
              <div className="h-[220px] w-full relative">
                <Image src="/feature_reports_1781676365810.png" alt="Export Reports" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-8 text-left">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Export Professional Reports</h3>
                <p className="text-[15px] text-gray2 leading-relaxed">Generate beautiful PDF reports to share with clients, lenders, or investors with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ESTIMATION MODELS */}
      <section id="models" className="py-24 bg-background dark:bg-black">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center">
            <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-3.5">Estimation Models</div>
            <h2 className="text-[28px] md:text-[52px] font-bold tracking-tight leading-[1.1] mb-4">Choose your methodology.</h2>
            <p className="text-[19px] text-gray2 leading-relaxed max-w-[520px] mx-auto">
              Different properties require different approaches. We give you the tools to value any asset accurately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16">
            {/* Comparable */}
            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-all">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6e5ce6] to-[#a78bfa]" />
              <div className="text-[13px] font-semibold tracking-widest uppercase text-gray3 mb-4">Model 01</div>
              <h3 className="text-[22px] font-bold text-black dark:text-white mb-1.5">Comparable Method</h3>
              <div className="text-[13px] font-medium text-gray2 mb-4.5">Aka: Sales Comparison Approach</div>
              <p className="text-[15px] text-gray2 leading-relaxed mb-6">
                Estimates value by comparing the property to similar recently sold properties in the exact same neighborhood. Perfect for standard residential homes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Residential</span>
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Standard Homes</span>
              </div>
            </div>

            {/* Income */}
            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-all">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0a84ff] to-[#5ac8fa]" />
              <div className="text-[13px] font-semibold tracking-widest uppercase text-gray3 mb-4">Model 02</div>
              <h3 className="text-[22px] font-bold text-black dark:text-white mb-1.5">Income Capitalization</h3>
              <div className="text-[13px] font-medium text-gray2 mb-4.5">Aka: Investment Method</div>
              <p className="text-[15px] text-gray2 leading-relaxed mb-6">
                Calculates value based on the income the property generates. We divide the Net Operating Income (NOI) by the market cap rate. Essential for investors.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Commercial</span>
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Rental Properties</span>
              </div>
            </div>

            {/* Cost */}
            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-all">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#30d158] to-[#a3e635]" />
              <div className="text-[13px] font-semibold tracking-widest uppercase text-gray3 mb-4">Model 03</div>
              <h3 className="text-[22px] font-bold text-black dark:text-white mb-1.5">Cost Approach</h3>
              <div className="text-[13px] font-medium text-gray2 mb-4.5">Aka: Contractor's Method</div>
              <p className="text-[15px] text-gray2 leading-relaxed mb-6">
                Estimates the cost to rebuild the structure from scratch, subtracts depreciation, and adds the land value. Best for unique or newly built structures.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">New Builds</span>
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Special Purpose</span>
              </div>
            </div>

            {/* DCF */}
            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-10 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-all">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#ff9f0a] to-[#ff6b6b]" />
              <div className="text-[13px] font-semibold tracking-widest uppercase text-gray3 mb-4">Model 04</div>
              <h3 className="text-[22px] font-bold text-black dark:text-white mb-1.5">Discounted Cash Flow</h3>
              <div className="text-[13px] font-medium text-gray2 mb-4.5">Aka: DCF Analysis</div>
              <p className="text-[15px] text-gray2 leading-relaxed mb-6">
                Projects future cash flows over a holding period (e.g., 5-10 years) and discounts them back to present value. For complex, multi-tenant investments.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Institutional</span>
                <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[12px] font-medium text-gray1">Multi-Family</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section id="marketplace" className="py-24 bg-surface dark:bg-gray6">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center">
            <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-3.5">Marketplace</div>
            <h2 className="text-[28px] md:text-[52px] font-bold tracking-tight leading-[1.1] mb-4">Real properties. Real value.</h2>
            <p className="text-[19px] text-gray2 leading-relaxed max-w-[520px] mx-auto">
              Browse properties listed by our users, verified by our valuation algorithms.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap mt-12 mb-8">
            <div className="flex bg-gray5 rounded-full p-1 gap-0.5">
              <button className="text-[13px] font-semibold px-4.5 py-1.5 rounded-full bg-white text-black shadow-sm">All</button>
              <button className="text-[13px] font-medium px-4.5 py-1.5 rounded-full text-gray2 hover:text-white transition-colors">For Sale</button>
              <button className="text-[13px] font-medium px-4.5 py-1.5 rounded-full text-gray2 hover:text-white transition-colors">For Rent</button>
            </div>
            
            <div className="flex gap-2.5 flex-wrap">
              <select className="bg-gray5 border border-white/10 rounded-full px-4 py-1.5 text-[13px] font-medium text-gray1 outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer">
                <option>Any Type</option>
                <option>House</option>
                <option>Apartment</option>
                <option>Commercial</option>
                <option>Land</option>
              </select>
              <select className="bg-gray5 border border-white/10 rounded-full px-4 py-1.5 text-[13px] font-medium text-gray1 outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer">
                <option>Any Location (State)</option>
                <option>Lagos (Premium)</option>
                <option>Abuja (Premium)</option>
                <option>Rivers (Premium)</option>
                <option>Ogun</option>
                <option>Oyo</option>
                <option>Kano</option>
              </select>
              <select className="bg-gray5 border border-white/10 rounded-full px-4 py-1.5 text-[13px] font-medium text-gray1 outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer">
                <option>Price (Any)</option>
                <option>Under ₦50M</option>
                <option>₦50M - ₦200M</option>
                <option>Over ₦200M</option>
              </select>
            </div>
          </div>

          <MarketplacePreview />


        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-background dark:bg-black">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center">
            <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-3.5">Pricing</div>
            <h2 className="text-[28px] md:text-[52px] font-bold tracking-tight leading-[1.1] mb-4">Value without compromise.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 items-start">
            {/* Starter */}
            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-8 pb-9 relative">
              <h3 className="text-[20px] font-bold text-black dark:text-white mb-1">Starter</h3>
              <p className="text-[14px] text-gray2 mb-6 h-10">For individuals checking home values.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-[36px] font-bold tracking-tight">Free</span>
              </div>
              <Link href="/register" className="block w-full text-center bg-white text-black text-[15px] font-semibold py-3 rounded-full hover:bg-[#e8e8ed] transition-colors mb-8">Get Started</Link>
              <ul className="space-y-4">
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> {TIER_LIMITS.Free} Valuations / month</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> Comparable Model Only</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> Browse Marketplace</li>
              </ul>
            </div>

            {/* Professional */}
            <div className="bg-white dark:bg-gray5 rounded-[28px] p-8 pb-9 relative border border-accent transform md:-translate-y-4 shadow-[0_20px_40px_rgba(110,92,230,0.15)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-accent text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-b-lg">Most Popular</div>
              <h3 className="text-[20px] font-bold text-black dark:text-white mb-1 mt-2">Professional</h3>
              <p className="text-[14px] text-gray2 mb-6 h-10">For agents and active investors.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-[36px] font-bold tracking-tight">{priceForTier("Professional")}</span>
                <span className="text-[15px] text-gray2">/mo</span>
              </div>
              <Link href="/register" className="block w-full text-center bg-accent text-white text-[15px] font-semibold py-3 rounded-full hover:bg-[#5a48d6] transition-colors mb-8">Upgrade to Pro</Link>
              <ul className="space-y-4">
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> {TIER_LIMITS.Professional} Valuations / month</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> All 4 Estimation Models</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> PDF Report Generation</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> Post to Marketplace</li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-8 pb-9 relative">
              <h3 className="text-[20px] font-bold text-black dark:text-white mb-1">Enterprise</h3>
              <p className="text-[14px] text-gray2 mb-6 h-10">For large firms and lenders.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-[36px] font-bold tracking-tight">{priceForTier("Enterprise")}</span>
                <span className="text-[15px] text-gray2">/mo</span>
              </div>
              <Link href="#contact" className="block w-full text-center bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white text-[15px] font-semibold py-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors mb-8">Contact Sales</Link>
              <ul className="space-y-4">
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> Everything in Pro</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> API Access</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> Multi-user accounts</li>
                <li className="flex gap-3 text-[14px] text-gray1"><span className="text-green">✓</span> Dedicated Support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-24 bg-surface dark:bg-gray6">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-3.5">Who It's For</div>
          <h2 className="text-[28px] md:text-[52px] font-bold tracking-tight leading-[1.1] mb-16">Built for every player<br/>in real estate.</h2>
          
          <div 
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-6 px-6 md:mx-0 md:px-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex-none w-[70%] md:w-[280px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col">
              <div className="h-[160px] w-full relative">
                <Image src="/role_homeowner_1781676378594.png" alt="Homeowners" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 text-center flex-1">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Homeowners</h3>
                <p className="text-[14px] text-gray2 leading-relaxed">Know your home's worth before you sell, refinance, or negotiate.</p>
              </div>
            </div>
            
            <div className="flex-none w-[70%] md:w-[280px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col">
              <div className="h-[160px] w-full relative">
                <Image src="/role_investor_1781676390130.png" alt="Investors" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 text-center flex-1">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Investors</h3>
                <p className="text-[14px] text-gray2 leading-relaxed">Evaluate multiple assets fast and build a high-yield portfolio.</p>
              </div>
            </div>

            <div className="flex-none w-[70%] md:w-[280px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col">
              <div className="h-[160px] w-full relative">
                <Image src="/role_agent_1781676402246.png" alt="Agents" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 text-center flex-1">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Agents</h3>
                <p className="text-[14px] text-gray2 leading-relaxed">Generate credible reports to impress clients and win listings.</p>
              </div>
            </div>

            <div className="flex-none w-[70%] md:w-[280px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col">
              <div className="h-[160px] w-full relative">
                <Image src="/role_lender_1781676414554.png" alt="Lenders" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 text-center flex-1">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Lenders</h3>
                <p className="text-[14px] text-gray2 leading-relaxed">Screen properties faster with data-backed valuation methodology.</p>
              </div>
            </div>

            <div className="flex-none w-[70%] md:w-[280px] snap-center bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all flex flex-col">
              <div className="h-[160px] w-full relative">
                <Image src="/role_valuer_1781676427693.png" alt="Valuers" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6 text-center flex-1">
                <h3 className="text-[17px] font-semibold text-black dark:text-white mb-2">Valuers</h3>
                <p className="text-[14px] text-gray2 leading-relaxed">Assess and value properties at professional speed and precision.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 bg-background dark:bg-black">
        <div className="max-w-[1080px] mx-auto px-6">
          <div className="mb-12">
            <div className="text-[13px] font-semibold tracking-widest uppercase text-accent mb-3.5">Get In Touch</div>
            <h2 className="text-[28px] md:text-[52px] font-bold tracking-tight leading-[1.1]">We'd love to hear<br/>from you.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
            <div>
              <p className="text-[17px] text-gray2 leading-relaxed mb-9">
                Questions about pricing, enterprise access, or API integration? Our team responds within 24 hours.
              </p>
              
              <div className="flex items-start gap-3.5 mb-10">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">✉️</div>
                <div>
                  <div className="text-[12px] text-gray2 uppercase tracking-widest mb-1">Email</div>
                  <div className="text-[15px] text-white font-medium">propertyemulator@gmail.com</div>
                </div>
              </div>

              <div>
                <div className="text-[13px] font-semibold uppercase tracking-widest text-gray2 mb-4">Plans & Pricing</div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-xl">
                    <span className="text-[15px] font-medium text-black dark:text-white">Starter</span>
                    <span className="text-[15px] font-semibold text-green">Free</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-xl">
                    <span className="text-[15px] font-medium text-black dark:text-white">Professional</span>
                    <span className="text-[15px] font-semibold text-black dark:text-white">{priceForTier("Professional")}/mo</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-xl">
                    <span className="text-[15px] font-medium text-black dark:text-white">Enterprise</span>
                    <span className="text-[15px] font-semibold text-black dark:text-white">{priceForTier("Enterprise")}/mo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray5 border border-black/5 dark:border-transparent rounded-[28px] p-6 md:p-9">
              <h3 className="text-[20px] md:text-[24px] font-bold tracking-tight text-black dark:text-white mb-6">Send a message</h3>
              <form className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray2 font-medium">First Name</label>
                    <input type="text" placeholder="First name" className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 md:py-2 text-[15px] text-white outline-none focus:border-blue transition-colors placeholder:text-gray3" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray2 font-medium">Last Name</label>
                    <input type="text" placeholder="Last name" className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 md:py-2 text-[15px] text-white outline-none focus:border-blue transition-colors placeholder:text-gray3" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-gray2 font-medium">Email</label>
                  <input type="email" placeholder="you@example.com" className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 md:py-2 text-[15px] text-white outline-none focus:border-blue transition-colors placeholder:text-gray3" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-gray2 font-medium">I Am A</label>
                  <select defaultValue="" className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 md:py-2 text-[15px] text-white outline-none focus:border-blue transition-colors appearance-none cursor-pointer">
                    <option value="" disabled className="text-black">Select your role</option>
                    <option className="text-black">Homeowner</option>
                    <option className="text-black">Investor</option>
                    <option className="text-black">Real Estate Agent</option>
                    <option className="text-black">Lender / Bank</option>
                    <option className="text-black">Valuer / Appraiser</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-gray2 font-medium">Message</label>
                  <textarea rows={3} placeholder="How can we help?" className="bg-white/5 border border-white/10 rounded-xl px-4 py-1.5 md:py-2 text-[15px] text-white outline-none focus:border-blue transition-colors placeholder:text-gray3 resize-none"></textarea>
                </div>
                <button type="button" className="w-full bg-blue text-white font-semibold text-[15px] py-2.5 md:py-3 rounded-xl hover:bg-[#0070f0] transition-transform hover:scale-[1.02] shadow-[0_8px_20px_rgba(10,132,255,0.3)] mt-2">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-surface dark:bg-gray6 border-t border-black/10 dark:border-white/10 pt-12 pb-8 mt-20">
        <div className="max-w-[980px] mx-auto px-6 text-center text-gray2 text-[13px]">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-gray3 flex items-center justify-center text-white font-bold text-sm">P</div>
            <span className="text-[18px] font-bold tracking-tight text-white">Provaluer</span>
          </Link>
          <p className="mb-2">© 2026 Provaluer Intelligence. Built for Nigeria.</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
