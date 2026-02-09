/**
 * Pre-defined sponsorship tier slots with fixed labels and price ranges.
 * Explorers can enable/disable tiers and adjust prices within the allowed range.
 */

export interface TierSlotConfig {
  slot: number;
  label: string;
  minPrice: number; // in dollars
  maxPrice: number | null; // null = no max
  defaultPrice: number; // in dollars
}

export const ONE_TIME_TIER_SLOTS: TierSlotConfig[] = [
  { slot: 1, label: 'Torchbearer', minPrice: 1, maxPrice: 15, defaultPrice: 5 },
  { slot: 2, label: 'Trail Guide', minPrice: 15, maxPrice: 50, defaultPrice: 25 },
  { slot: 3, label: 'Pathfinder', minPrice: 50, maxPrice: 150, defaultPrice: 75 },
  { slot: 4, label: 'Navigator', minPrice: 150, maxPrice: 500, defaultPrice: 250 },
  { slot: 5, label: 'Expedition Patron', minPrice: 500, maxPrice: null, defaultPrice: 500 },
];

export const MONTHLY_TIER_SLOTS: TierSlotConfig[] = [
  { slot: 1, label: 'Fellow Traveler', minPrice: 1, maxPrice: 15, defaultPrice: 5 },
  { slot: 2, label: 'Journey Partner', minPrice: 15, maxPrice: 50, defaultPrice: 15 },
  { slot: 3, label: 'Expedition Ally', minPrice: 50, maxPrice: null, defaultPrice: 50 },
];

// Default tiers created when an explorer upgrades to Pro (first 3 one-time, first 2 monthly)
export const DEFAULT_ONE_TIME_TIERS = ONE_TIME_TIER_SLOTS.slice(0, 3);
export const DEFAULT_MONTHLY_TIERS = MONTHLY_TIER_SLOTS.slice(0, 2);

/**
 * Get the tier slot config for a given type and slot number
 */
export function getTierSlotConfig(type: 'ONE_TIME' | 'MONTHLY', slot: number): TierSlotConfig | undefined {
  const slots = type === 'ONE_TIME' ? ONE_TIME_TIER_SLOTS : MONTHLY_TIER_SLOTS;
  return slots.find(s => s.slot === slot);
}

/**
 * Validate that a price is within the allowed range for a tier slot
 */
export function isValidTierPrice(type: 'ONE_TIME' | 'MONTHLY', slot: number, price: number): boolean {
  const config = getTierSlotConfig(type, slot);
  if (!config) return false;

  if (price < config.minPrice) return false;
  if (config.maxPrice !== null && price > config.maxPrice) return false;

  return true;
}

/**
 * Get the label for a tier slot (labels are fixed and cannot be changed by users)
 */
export function getTierLabel(type: 'ONE_TIME' | 'MONTHLY', slot: number): string {
  const config = getTierSlotConfig(type, slot);
  return config?.label || 'Supporter';
}
