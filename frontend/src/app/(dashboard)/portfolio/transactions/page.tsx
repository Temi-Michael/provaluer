"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  property_id: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
};

// Categories that have subcategories — stored as "Category – Subcategory"
const INCOME_CATEGORIES = ["Rent", "Service Charge", "Other"];
const EXPENSE_CATEGORIES = ["Maintenance", "Tax", "Agent Fee", "Service Charge", "Other"];

const SUBCATEGORIES: Record<string, string[]> = {
  Maintenance: [
    "Plumbing", "Electrical", "Painting", "Roofing", "Gardening",
    "Air Conditioning", "Generator/Power", "Cleaning", "Security System",
    "Tiling & Flooring", "Other",
  ],
  Tax: ["Land Use Charge", "Development Levy", "Capital Gains Tax", "Withholding Tax", "Other"],
  "Agent Fee": ["Letting Fee", "Management Fee", "Renewal Commission", "Other"],
  "Service Charge": ["Security", "Waste Management", "Water", "Facility Management", "Other"],
};

function getStoredExchangeRate(): number {
  try {
    const u = JSON.parse(localStorage.getItem("provaluer_user") || "{}");
    return Number(u.exchange_rate) || 1400;
  } catch {
    return 1400;
  }
}

function defaultSubcategory(cat: string) {
  return SUBCATEGORIES[cat]?.[0] ?? "";
}

function defaultCategory(type: "INCOME" | "EXPENSE") {
  return type === "INCOME" ? "Rent" : "Maintenance";
}

export default function TransactionsLedger() {
  const [properties, setProperties] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState("Rent");
  const [customCategory, setCustomCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [exchangeRate, setExchangeRate] = useState(1400);

  useEffect(() => {
    setExchangeRate(getStoredExchangeRate());
    const token = localStorage.getItem("provaluer_token");
    if (!token) return;
    fetch("/api/portfolio/properties", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProperties(data);
          if (data.length > 0) setSelectedProperty(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProperty) { setLoading(false); return; }
    setLoading(true);
    const token = localStorage.getItem("provaluer_token");
    fetch(`/api/portfolio/transactions?property_id=${selectedProperty}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTransactions(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedProperty]);

  // When type toggles, reset to smart defaults
  const handleTypeChange = (t: "INCOME" | "EXPENSE") => {
    setTxType(t);
    const cat = defaultCategory(t);
    setCategory(cat);
    setSubcategory(defaultSubcategory(cat));
    setCustomCategory("");
    setCustomSubcategory("");
  };

  // When top-level category changes
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setSubcategory(defaultSubcategory(cat));
    setCustomCategory("");
    setCustomSubcategory("");
  };

  // Build the effective category string sent to backend
  function effectiveCategory(): string {
    if (category === "Other") return customCategory.trim();
    const subs = SUBCATEGORIES[category];
    if (!subs) return category;
    if (subcategory === "Other") return `${category} – ${customSubcategory.trim()}`;
    return `${category} – ${subcategory}`;
  }

  const openModal = () => {
    const cat = defaultCategory("INCOME");
    setTxType("INCOME");
    setCategory(cat);
    setSubcategory(defaultSubcategory(cat));
    setCustomCategory("");
    setCustomSubcategory("");
    setAmount("");
    setCurrency("NGN");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cat = effectiveCategory();
    if (!cat) { setError("Please enter a category name."); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Please enter a valid amount."); return; }
    setSubmitting(true);
    setError("");
    const token = localStorage.getItem("provaluer_token");
    try {
      const res = await fetch("/api/portfolio/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          property_id: selectedProperty,
          type: txType,
          category: cat,
          amount: parseFloat(amount),
          currency,
          date: new Date(date).toISOString(),
          description,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to log transaction.");
        return;
      }
      const created = await res.json();
      setTransactions((prev) => [created, ...prev]);
      setShowModal(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toNGN = (amount: number, cur: string) => cur === "USD" ? amount * exchangeRate : amount;
  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + toNGN(t.amount, t.currency), 0);
  const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + toNGN(t.amount, t.currency), 0);
  const net = totalIncome - totalExpense;

  const topCategories = txType === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const subcategories = SUBCATEGORIES[category];
  const usdEquivalent = currency === "USD" && amount ? (parseFloat(amount) * exchangeRate).toLocaleString("en-NG", { minimumFractionDigits: 0 }) : null;

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto w-full pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-foreground">Financial Ledger</h1>
          <div className="text-[13px] text-gray2 mt-1">
            <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
            <span className="mx-2">/</span>
            <b className="text-gray1">Ledger</b>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <select
              className="bg-[#1c1c1e] border border-white/10 rounded-xl px-4 py-2 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors appearance-none max-w-[260px]"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          {selectedProperty && (
            <button onClick={openModal} className="bg-white text-black px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-white/90 transition-colors whitespace-nowrap">
              + Log Transaction
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {transactions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: "Total Income", value: totalIncome, color: "text-green-400" },
              { label: "Total Expenses", value: totalExpense, color: "text-red-400" },
              { label: "Net", value: net, color: net >= 0 ? "text-green-400" : "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4">
                <div className="text-[11px] text-gray2 mb-1">{s.label}</div>
                <div className={`text-[15px] font-bold ${s.color}`}>
                  {s.value < 0 ? "−" : ""}₦{Math.abs(s.value).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
          {transactions.some((t) => t.currency === "USD") && (
            <p className="text-[11px] text-gray2 mb-5 px-1">
              USD amounts converted at ₦{exchangeRate.toLocaleString()}/$ · adjust in <a href="/profile" className="underline hover:text-white transition-colors">Profile → Financial Preferences</a>
            </p>
          )}
        </>
      )}

      {/* Table / empty states */}
      <div className="bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray2 text-[14px]">Loading ledger...</div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center text-gray2 text-[14px]">You must add a property first before viewing the ledger.</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray2">
            <div className="text-[16px] font-bold text-white mb-2">No transactions yet</div>
            <p className="text-[14px]">Log rent payments or maintenance expenses for this property.</p>
            <button onClick={openModal} className="mt-6 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors">
              + Log Transaction
            </button>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/5 text-gray2">
                <th className="text-left px-6 py-4 font-medium">Date</th>
                <th className="text-left px-6 py-4 font-medium">Category</th>
                <th className="text-left px-6 py-4 font-medium">Description</th>
                <th className="text-right px-6 py-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-gray2 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${tx.type === "INCOME" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray2">{tx.description || "—"}</td>
                  <td className={`px-6 py-4 text-right font-semibold tabular-nums ${tx.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                    {tx.type === "INCOME" ? "+" : "−"}{tx.currency} {tx.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-[17px] font-bold text-white mb-5">Log Transaction</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Type toggle */}
              <div>
                <label className="block text-[11px] font-semibold text-gray2 uppercase tracking-widest mb-2">Type</label>
                <div className="flex rounded-xl overflow-hidden border border-white/10">
                  {(["INCOME", "EXPENSE"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => handleTypeChange(t)}
                      className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
                        txType === t
                          ? t === "INCOME" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          : "text-gray2 hover:bg-white/5"
                      }`}>
                      {t === "INCOME" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top-level category chips */}
              <div>
                <label className="block text-[11px] font-semibold text-gray2 uppercase tracking-widest mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {topCategories.map((c) => (
                    <button key={c} type="button" onClick={() => handleCategoryChange(c)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                        category === c ? "bg-white text-black border-white" : "border-white/10 text-gray2 hover:border-white/30 hover:text-white"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
                {category === "Other" && (
                  <input autoFocus required value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Insurance, Legal fees..."
                    className="mt-2.5 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
                )}
              </div>

              {/* Subcategory chips — only shown when the selected category has subcategories */}
              {subcategories && category !== "Other" && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray2 uppercase tracking-widest mb-2">Subcategory</label>
                  <div className="flex flex-wrap gap-2">
                    {subcategories.map((s) => (
                      <button key={s} type="button"
                        onClick={() => { setSubcategory(s); setCustomSubcategory(""); }}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                          subcategory === s ? "bg-white/15 text-white border-white/40" : "border-white/10 text-gray2 hover:border-white/30 hover:text-white"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {subcategory === "Other" && (
                    <input autoFocus required value={customSubcategory} onChange={(e) => setCustomSubcategory(e.target.value)}
                      placeholder={`e.g. ${category === "Maintenance" ? "Pool cleaning, Window repair..." : "Specify..."}`}
                      className="mt-2.5 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
                  )}
                </div>
              )}

              {/* Amount + currency toggle */}
              <div>
                <label className="block text-[11px] font-semibold text-gray2 uppercase tracking-widest mb-2">Amount</label>
                <div className="flex gap-2">
                  <div className="flex rounded-xl overflow-hidden border border-white/10 shrink-0">
                    {(["NGN", "USD"] as const).map((c) => (
                      <button key={c} type="button" onClick={() => setCurrency(c)}
                        className={`px-3 py-2.5 text-[12px] font-semibold transition-colors ${currency === c ? "bg-white/15 text-white" : "text-gray2 hover:bg-white/5"}`}>
                        {c === "NGN" ? "₦" : "$"}
                      </button>
                    ))}
                  </div>
                  <input type="number" min="0" step="0.01" required value={amount}
                    onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
                </div>
                {usdEquivalent && (
                  <p className="mt-1.5 text-[11px] text-gray2">≈ ₦{usdEquivalent} at ₦{exchangeRate.toLocaleString()}/$ (your profile rate)</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray2 uppercase tracking-widest mb-2">Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/30" />
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-semibold text-gray2 uppercase tracking-widest mb-2">
                  Note <span className="normal-case font-normal text-white/30">(optional)</span>
                </label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. March rent from Tenant A"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30" />
              </div>

              {error && <p className="text-red-400 text-[12px] -mt-1">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-white text-black px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-white/90 transition-colors disabled:opacity-50">
                  {submitting ? "Saving..." : "Log Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
