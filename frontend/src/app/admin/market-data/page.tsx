"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { adminFetch } from "@/lib/adminApi";

interface ScrapedListing {
  id: string;
  source: string;
  source_id: string;
  title: string;
  property_type: string;
  status: string;
  price: number;
  currency: string;
  state: string;
  area_name: string;
  is_premium: boolean;
  land_area_sqm: number;
  building_area_sqm: number;
  bedrooms: number;
  bathrooms: number;
  url: string;
  scraped_at: string;
}

interface ListingsData {
  listings: ScrapedListing[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface StateCount { state: string; count: number; avg_price: number; }
interface TypeCount  { property_type: string; count: number; }

interface ScraperStats {
  total: number;
  last_scraped_at: string | null;
  by_state: StateCount[];
  by_type: TypeCount[];
}

interface ScraperProgress {
  is_running: boolean;
  started_at: string | null;
  completed_at: string | null;
  current_feed: string;
  current_page: number;
  total_feeds: number;
  feeds_complete: number;
  total_upserted: number;
  last_error: string;
}

const NIGERIAN_STATES = [
  "Lagos","FCT - Abuja","Rivers","Oyo","Ogun","Delta",
  "Anambra","Enugu","Kano","Edo","Kwara","Kaduna","Ondo",
  "Osun","Ekiti","Cross River","Akwa Ibom","Abia","Imo",
  "Benue","Plateau","Bauchi","Niger","Kogi","Nassarawa",
];
const PROPERTY_TYPES = ["House","Apartment","Land","Commercial"];

function formatPrice(price: number, currency: string) {
  if (price == null || price <= 0) return "—";
  const sym = currency === "USD" ? "$" : "₦";
  if (price >= 1_000_000_000) return `${sym}${(price/1_000_000_000).toFixed(2)}B`;
  if (price >= 1_000_000)     return `${sym}${(price/1_000_000).toFixed(1)}M`;
  return `${sym}${price.toLocaleString()}`;
}
function formatPricePerSqm(price: number, area: number) {
  if (!area || area <= 0 || price <= 0) return "—";
  const r = price / area;
  if (r >= 1_000_000) return `₦${(r/1_000_000).toFixed(2)}M`;
  return `₦${Math.round(r).toLocaleString()}`;
}
function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
}
function formatAvgPrice(p: number) {
  if (!p||p<=0) return "—";
  if (p>=1_000_000_000) return `₦${(p/1_000_000_000).toFixed(1)}B`;
  if (p>=1_000_000)     return `₦${(p/1_000_000).toFixed(0)}M`;
  return `₦${Math.round(p).toLocaleString()}`;
}
function formatElapsed(start: string | null) {
  if (!start) return "";
  const s = Math.floor((Date.now() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}m ${s%60}s`;
}
function formatDuration(start: string | null, end: string | null) {
  if (!start||!end) return "";
  const s = Math.floor((new Date(end).getTime()-new Date(start).getTime())/1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}m ${s%60}s`;
}

export default function MarketDataPage() {

  const [stats,        setStats]        = useState<ScraperStats | null>(null);
  const [data,         setData]         = useState<ListingsData | null>(null);
  const [progress,     setProgress]     = useState<ScraperProgress | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [scraping,        setScraping]        = useState(false);
  const [tick,            setTick]            = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stateFilter,     setStateFilter]     = useState("");
  const [typeFilter,      setTypeFilter]      = useState("");
  const [statusFilter,    setStatusFilter]    = useState("");
  const [premiumFilter,   setPremiumFilter]   = useState("");
  const [page,            setPage]            = useState(1);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1-second clock while scraper is running (drives elapsed time display)
  useEffect(() => {
    if (!progress?.is_running) return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [progress?.is_running]);

  void tick;

  // Auto-dismiss the completed banner after 4 minutes
  useEffect(() => {
    if (!progress?.completed_at || progress.is_running) return;
    setBannerDismissed(false);
    const t = setTimeout(() => setBannerDismissed(true), 4 * 60 * 1000);
    return () => clearTimeout(t);
  }, [progress?.completed_at, progress?.is_running]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); },
    [debouncedSearch, stateFilter, typeFilter, statusFilter, premiumFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/market-data/stats");
      const j = await res.json();
      if (j.success) setStats(j.data);
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  const fetchListings = useCallback(async () => {
    setTableLoading(true);
    const p = new URLSearchParams({ page: String(page), per_page: "50" });
    if (debouncedSearch) p.set("search",     debouncedSearch);
    if (stateFilter)     p.set("state",      stateFilter);
    if (typeFilter)      p.set("type",       typeFilter);
    if (statusFilter)    p.set("status",     statusFilter);
    if (premiumFilter)   p.set("is_premium", premiumFilter);
    try {
      const res = await adminFetch(`/api/admin/market-data?${p}`);
      const j = await res.json();
      if (j.success) setData(j.data);
    } catch {}
    finally { setTableLoading(false); }
  }, [page, debouncedSearch, stateFilter, typeFilter, statusFilter, premiumFilter]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await adminFetch("/api/cron/scraper-status");
      const j = await res.json();
      if (!j.success) return;
      const prog: ScraperProgress = j.data;
      setProgress(prog);
      if (!prog.is_running) {
        stopPolling();
        if (prog.completed_at) { fetchStats(); fetchListings(); }
      }
    } catch {}
  }, [stopPolling, fetchStats, fetchListings]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchProgress();
    pollRef.current = setInterval(fetchProgress, 3000);
  }, [fetchProgress]);

  // Boot: load everything + check if scraper is already running
  useEffect(() => {
    fetchStats();
    fetchListings();
    fetchProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { if (progress?.is_running) startPolling(); }, [progress?.is_running, startPolling]);
  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleRunScraper = async () => {
    setScraping(true);
    try {
      const res = await adminFetch("/api/cron/trigger-scraper", { method: "POST" });
      if (res.ok) setTimeout(() => { fetchProgress(); startPolling(); }, 800);
    } catch {}
    finally { setScraping(false); }
  };

  const clearFilters = () => {
    setSearch(""); setStateFilter(""); setTypeFilter("");
    setStatusFilter(""); setPremiumFilter("");
  };
  const hasFilters = !!(search || stateFilter || typeFilter || statusFilter || premiumFilter);

  const pct = progress && progress.total_feeds > 0
    ? Math.round((progress.feeds_complete / progress.total_feeds) * 100)
    : 0;

  const sel = "bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-blue transition-colors";

  return (
    <div className="max-w-[1400px] mx-auto pb-24">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-black tracking-tight mb-1">Market Data</h1>
          <p className="text-gray2 dark:text-gray1 text-[14px]">
            Live scraped listings — rates, prices &amp; locations across Nigeria.
          </p>
        </div>
        <button
          onClick={handleRunScraper}
          disabled={scraping || !!progress?.is_running}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue text-white font-semibold rounded-xl text-[14px] hover:bg-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {(scraping || progress?.is_running)
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <span>⚡</span>}
          {progress?.is_running ? "Scraping…" : scraping ? "Starting…" : "Run Scraper Now"}
        </button>
      </div>

      {/* Progress banner — hidden 4 mins after completion */}
      {progress && progress.total_feeds > 0 && !bannerDismissed && (
        <div className={`rounded-2xl border mb-6 overflow-hidden transition-all ${
          progress.is_running
            ? "border-blue/30 bg-blue/5 dark:bg-blue/10"
            : progress.last_error
            ? "border-red/30 bg-red/5 dark:bg-red/10"
            : "border-green/30 bg-green/5 dark:bg-green/10"
        }`}>
          <div className="px-6 py-4">
            {/* Top row */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {progress.is_running
                  ? <span className="w-4 h-4 border-2 border-blue/40 border-t-blue rounded-full animate-spin shrink-0" />
                  : progress.last_error
                  ? <span className="text-red text-[16px] shrink-0">✗</span>
                  : <span className="text-green text-[16px] shrink-0">✓</span>}
                <span className="font-semibold text-[14px] truncate">
                  {progress.is_running ? (
                    <>Scraping <span className="text-blue">{progress.current_feed}</span> — page {progress.current_page}</>
                  ) : progress.last_error ? (
                    `Error: ${progress.last_error}`
                  ) : (
                    `Scrape complete — ${progress.total_upserted.toLocaleString()} listings updated`
                  )}
                </span>
              </div>
              <span className="text-[12px] text-gray2 dark:text-gray1 shrink-0">
                {progress.is_running ? (
                  <>Elapsed: <span className="font-semibold text-black dark:text-white">{formatElapsed(progress.started_at)}</span></>
                ) : progress.completed_at ? (
                  <>Took: <span className="font-semibold text-black dark:text-white">{formatDuration(progress.started_at, progress.completed_at)}</span></>
                ) : null}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.is_running ? "bg-blue" : progress.last_error ? "bg-red" : "bg-green"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Counters */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-gray2 dark:text-gray1">
              <span>
                <span className="font-semibold text-black dark:text-white">{progress.feeds_complete}</span>
                {" / "}{progress.total_feeds} feeds
              </span>
              <span>
                <span className="font-semibold text-black dark:text-white">{pct}%</span> complete
              </span>
              <span>
                <span className="font-semibold text-black dark:text-white">{progress.total_upserted.toLocaleString()}</span>
                {" listings saved"}
              </span>
              {progress.completed_at && (
                <span>
                  Finished at{" "}
                  <span className="font-semibold text-black dark:text-white">
                    {new Date(progress.completed_at).toLocaleTimeString("en-NG",{hour:"2-digit",minute:"2-digit"})}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface dark:bg-[#1a1a1c] p-5 rounded-2xl border border-black/10 dark:border-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray2 dark:text-gray1 mb-1">Total Listings</div>
          <div className="text-[28px] font-black text-blue">{statsLoading?"—":(stats?.total||0).toLocaleString()}</div>
        </div>
        <div className="bg-surface dark:bg-[#1a1a1c] p-5 rounded-2xl border border-black/10 dark:border-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray2 dark:text-gray1 mb-1">States Covered</div>
          <div className="text-[28px] font-black text-green">{statsLoading?"—":(stats?.by_state?.length||0)}</div>
        </div>
        <div className="bg-surface dark:bg-[#1a1a1c] p-5 rounded-2xl border border-black/10 dark:border-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray2 dark:text-gray1 mb-1">Last Scraped</div>
          <div className="text-[15px] font-black text-black dark:text-white mt-1">
            {statsLoading?"—":stats?.last_scraped_at?formatDate(stats.last_scraped_at):"Never"}
          </div>
        </div>
        <div className="bg-surface dark:bg-[#1a1a1c] p-5 rounded-2xl border border-black/10 dark:border-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray2 dark:text-gray1 mb-1">Property Types</div>
          <div className="text-[28px] font-black text-gold">{statsLoading?"—":(stats?.by_type?.length||0)}</div>
        </div>
      </div>

      {/* State + Type breakdown */}
      {stats && (stats.by_state?.length > 0 || stats.by_type?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex justify-between text-[13px]">
              <span className="font-bold">By State</span>
              <span className="text-gray2 dark:text-gray1">avg sale price</span>
            </div>
            <div className="overflow-y-auto max-h-[240px]">
              <table className="w-full text-[13px]">
                <tbody>
                  {stats.by_state?.map(s => (
                    <tr key={s.state}
                      onClick={() => { setStateFilter(s.state); setPage(1); }}
                      className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-2 font-medium">{s.state}</td>
                      <td className="px-5 py-2 text-right text-gray2 dark:text-gray1">{s.count.toLocaleString()}</td>
                      <td className="px-5 py-2 text-right font-semibold text-blue">{formatAvgPrice(s.avg_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 text-[13px] font-bold">By Property Type</div>
            <div className="p-5 space-y-3">
              {stats.by_type?.map(t => {
                const pct2 = stats.total > 0 ? Math.round((t.count/stats.total)*100) : 0;
                const color =
                  t.property_type==="House"?"bg-blue":
                  t.property_type==="Apartment"?"bg-green":
                  t.property_type==="Land"?"bg-gold":"bg-red";
                return (
                  <div key={t.property_type}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <button
                        onClick={() => { setTypeFilter(t.property_type); setPage(1); }}
                        className="font-semibold hover:text-blue transition-colors"
                      >
                        {t.property_type}
                      </button>
                      <span className="text-gray2 dark:text-gray1">{t.count.toLocaleString()} ({pct2}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10">
                      <div className={`h-full rounded-full ${color}`} style={{ width:`${pct2}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray2 dark:text-gray1 text-[14px]">🔍</span>
            <input
              type="text"
              placeholder="Search area, title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-4 py-2 text-[13px] focus:outline-none focus:border-blue transition-colors"
            />
          </div>
          <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(1); }} className={sel}>
            <option value="">All States</option>
            {(stats?.by_state?.length ? stats.by_state.map(s=>s.state).sort() : NIGERIAN_STATES)
              .map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={sel}>
            <option value="">All Types</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={sel}>
            <option value="">All Status</option>
            <option value="For Sale">For Sale</option>
            <option value="For Rent">For Rent</option>
          </select>
          <select value={premiumFilter} onChange={e => { setPremiumFilter(e.target.value); setPage(1); }} className={sel}>
            <option value="">All Listings</option>
            <option value="true">Premium Only</option>
            <option value="false">Non-Premium</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2 rounded-xl text-[12px] font-semibold text-red hover:bg-red/10 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Data table */}
      <div className="bg-surface dark:bg-[#1a1a1c] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="text-[14px] font-bold">
            {tableLoading ? "Loading…" : `${(data?.total??0).toLocaleString()} results`}
            {hasFilters && <span className="ml-2 text-[12px] font-normal text-gray2 dark:text-gray1">(filtered)</span>}
          </div>
          {data && data.total_pages > 1 && (
            <span className="text-[12px] text-gray2 dark:text-gray1">Page {data.page} of {data.total_pages}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-[11px] text-gray2 dark:text-gray1 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Title</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Price</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">₦/sqm</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">State</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Area</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Beds / Baths</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Land sqm</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Premium</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Scraped</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {tableLoading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center text-gray2 dark:text-gray1">
                    <div className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
                      Loading listings…
                    </div>
                  </td>
                </tr>
              ) : !data?.listings?.length ? (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center text-gray2 dark:text-gray1">
                    {stats?.total === 0
                      ? "No data yet — run the scraper to populate the database."
                      : "No listings match your filters."}
                  </td>
                </tr>
              ) : data.listings.map(l => (
                <tr key={l.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="block truncate font-medium" title={l.title}>{l.title||"—"}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      l.property_type==="Land"       ? "bg-gold/10 text-gold" :
                      l.property_type==="Apartment"  ? "bg-green/10 text-green" :
                      l.property_type==="Commercial" ? "bg-red/10 text-red" :
                                                       "bg-blue/10 text-blue"
                    }`}>{l.property_type}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      l.status==="For Sale" ? "bg-green/10 text-green" : "bg-blue/10 text-blue"
                    }`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                    {formatPrice(l.price, l.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray2 dark:text-gray1 whitespace-nowrap">
                    {formatPricePerSqm(l.price, l.land_area_sqm || l.building_area_sqm)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => { setStateFilter(l.state); setPage(1); }} className="text-blue hover:underline">
                      {l.state}
                    </button>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <button
                      onClick={() => setSearch(l.area_name)}
                      className="block truncate hover:text-blue transition-colors text-left w-full"
                      title={l.area_name}
                    >
                      {l.area_name||"—"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap text-gray2 dark:text-gray1">
                    {l.bedrooms>0||l.bathrooms>0
                      ? `${l.bedrooms>0?l.bedrooms+"bd":"—"} / ${l.bathrooms>0?l.bathrooms+"ba":"—"}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray2 dark:text-gray1 whitespace-nowrap">
                    {l.land_area_sqm>0 ? l.land_area_sqm.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {l.is_premium
                      ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gold/10 text-gold">Premium</span>
                      : <span className="text-gray2 dark:text-gray1 text-[11px]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray2 dark:text-gray1 whitespace-nowrap">
                    {formatDate(l.scraped_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {l.url
                      ? <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline text-[12px] font-medium">View ↗</a>
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, data.total_pages) }, (_, i) => {
                const tp = data.total_pages;
                let pg: number;
                if (tp <= 7)          pg = i + 1;
                else if (page <= 4)   pg = i < 5 ? i+1 : i===5 ? -1 : tp;
                else if (page >= tp-3) pg = i===0 ? 1 : i===1 ? -1 : tp-(6-i);
                else                  pg = i===0 ? 1 : i===1 ? -1 : i===5 ? -2 : i===6 ? tp : page+(i-3);
                if (pg < 0) return <span key={`dot-${i}`} className="px-1 text-gray2 dark:text-gray1">…</span>;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-colors ${
                      pg === page ? "bg-blue text-white" : "hover:bg-black/5 dark:hover:bg-white/5 text-gray2 dark:text-gray1"
                    }`}
                  >{pg}</button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(data.total_pages, p+1))}
              disabled={page >= data.total_pages}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
