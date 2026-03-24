/**
 * Pre-defined sponsorship tier slots with fixed labels and price ranges.
 * Explorers can enable/disable tiers and adjust prices within the allowed range.
 *
 * One-time tiers: expedition-scoped, 3 threshold-based tiers (no prominent labels)
 * Monthly tiers: explorer-scoped, 3 named tiers with escalating perks
 */

export interface TierSlotConfig {
  slot: number;
  label: string;
  minPrice: number; // in dollars
  maxPrice: number | null; // null = no max
  defaultPrice: number; // in dollars
}

export const ONE_TIME_TIER_SLOTS: TierSlotConfig[] = [
  { slot: 1, label: 'Tier 1', minPrice: 5, maxPrice: 25, defaultPrice: 5 },
  { slot: 2, label: 'Tier 2', minPrice: 25, maxPrice: 75, defaultPrice: 25 },
  { slot: 3, label: 'Tier 3', minPrice: 75, maxPrice: null, defaultPrice: 75 },
];

export const MONTHLY_TIER_SLOTS: TierSlotConfig[] = [
  { slot: 1, label: 'Fellow Traveler', minPrice: 5, maxPrice: 15, defaultPrice: 5 },
  { slot: 2, label: 'Journey Partner', minPrice: 15, maxPrice: 50, defaultPrice: 15 },
  { slot: 3, label: 'Expedition Patron', minPrice: 50, maxPrice: 150, defaultPrice: 50 },
];

// Default tiers created when an explorer upgrades to Pro (all tiers for both types)
export const DEFAULT_ONE_TIME_TIERS = ONE_TIME_TIER_SLOTS;
export const DEFAULT_MONTHLY_TIERS = MONTHLY_TIER_SLOTS;

/**
 * Get the tier slot config for a given type and slot number
 */
export function getTierSlotConfig(type: 'ONE_TIME' | 'MONTHLY', slot: number): TierSlotConfig | undefined {
  const slots = type === 'ONE_TIME' ? ONE_TIME_TIER_SLOTS : MONTHLY_TIER_SLOTS;
  return slots.find(s => s.slot === slot);
}

/**
 * Validate that a price is within the allowed range for a tier slot.
 */
export function isValidTierPrice(type: 'ONE_TIME' | 'MONTHLY', slot: number, price: number): boolean {
  const slots = type === 'ONE_TIME' ? ONE_TIME_TIER_SLOTS : MONTHLY_TIER_SLOTS;
  const config = slots.find(s => s.slot === slot);
  if (!config) return false;
  if (price < config.minPrice) return false;
  if (config.maxPrice !== null && price > config.maxPrice) return false;
  return true;
}

/**
 * Validate tier ordering — each tier's price must be strictly greater than the previous tier.
 */
export function validateTierOrdering(prices: { slot: number; price: number }[]): boolean {
  const sorted = [...prices].sort((a, b) => a.slot - b.slot);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].price <= sorted[i - 1].price) return false;
  }
  return true;
}

/**
 * Get the label for a tier slot (labels are fixed and cannot be changed by users)
 */
export function getTierLabel(type: 'ONE_TIME' | 'MONTHLY', slot: number): string {
  const config = getTierSlotConfig(type, slot);
  return config?.label || 'Supporter';
}

/**
 * Early access hours by tier slot.
 * Slot 1 = no early access, Slot 2 = 24h, Slot 3 = 48h.
 * Applies to both one-time (expedition-scoped) and monthly (explorer-scoped).
 */
const EARLY_ACCESS_HOURS: Record<number, number> = { 1: 0, 2: 24, 3: 48 };

/**
 * Get early access hours for a monthly subscription tier slot
 */
export function getEarlyAccessHoursForTier(slot: number): number {
  return EARLY_ACCESS_HOURS[slot] ?? 0;
}

/**
 * Get early access hours for a one-time donation amount (in dollars).
 * Checks against one-time tier thresholds to determine which tier the amount qualifies for.
 */
export function getEarlyAccessHoursForAmount(amountDollars: number): number {
  // Walk tiers from highest to lowest to find the best match
  for (let i = ONE_TIME_TIER_SLOTS.length - 1; i >= 0; i--) {
    if (amountDollars >= ONE_TIME_TIER_SLOTS[i].minPrice) {
      return EARLY_ACCESS_HOURS[ONE_TIME_TIER_SLOTS[i].slot] ?? 0;
    }
  }
  return 0;
}

/**
 * Perk definitions for sponsor-facing UI.
 * Each perk has a label and which tier slots include it.
 */
export interface TierPerk {
  label: string;
  /** Tier slots (1-indexed) that include this perk */
  slots: number[];
}

export const MONTHLY_TIER_PERKS: TierPerk[] = [
  { label: 'Expedition notes access', slots: [1, 2, 3] },
  { label: 'Name on sponsor wall', slots: [1, 2, 3] },
  { label: '24h early entry access', slots: [2, 3] },
  { label: '48h early entry access', slots: [3] },
  { label: 'Voice note updates', slots: [3] },
];

export const ONE_TIME_TIER_PERKS: TierPerk[] = [
  { label: 'Sponsor wall listing', slots: [1, 2, 3] },
  { label: 'Funding goal contribution', slots: [1, 2, 3] },
  { label: 'Expedition notes access', slots: [1, 2, 3] },
  { label: '24h early entry access', slots: [2, 3] },
  { label: '48h early entry access', slots: [3] },
  { label: 'Voice note updates', slots: [3] },
  { label: 'Highlighted on sponsor wall', slots: [3] },
];

/**
 * Get perks for a specific tier slot, filtering to only the perks that apply.
 * Collapses early access to the best tier (e.g. slot 3 shows "48h" not both "24h" and "48h").
 */
export function getPerksForSlot(type: 'ONE_TIME' | 'MONTHLY', slot: number): string[] {
  const allPerks = type === 'ONE_TIME' ? ONE_TIME_TIER_PERKS : MONTHLY_TIER_PERKS;
  const perks: string[] = [];

  for (const perk of allPerks) {
    if (!perk.slots.includes(slot)) continue;
    // Collapse early access — keep only the best (last matching) label
    if (perk.label.includes('early entry access')) {
      const idx = perks.findIndex(p => p.includes('early entry access'));
      if (idx >= 0) {
        perks[idx] = perk.label;
      } else {
        perks.push(perk.label);
      }
    } else {
      perks.push(perk.label);
    }
  }
  return perks;
}
