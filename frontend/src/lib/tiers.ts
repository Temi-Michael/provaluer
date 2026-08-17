// Monthly valuation-model allowances per plan tier.
// Must stay in sync with backend/src/Helpers/SubscriptionHelper.go.
export const TIER_LIMITS: Record<string, number> = {
  Free: 5,
  Professional: 50,
  Enterprise: 150,
};

export const PLAN_TIERS = ["Free", "Professional", "Enterprise"] as const;

export function limitForTier(tier: string): number {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.Free;
}

// Monthly price in naira. Free is 0 and rendered as "Free" rather than a figure.
export const TIER_PRICES: Record<string, number> = {
  Free: 0,
  Professional: 55000,
  Enterprise: 90000,
};

/** Formats a tier's monthly price, e.g. "₦55,000". */
export function priceForTier(tier: string): string {
  const price = TIER_PRICES[tier] ?? 0;
  return price === 0 ? "Free" : `₦${price.toLocaleString("en-NG")}`;
}
