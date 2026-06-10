import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useExpeditionBannerVisible } from '@/components/ui/ExpeditionBanner';

/**
 * Top safe-area inset for screen headers, aware of the global expedition
 * banner. The banner (rendered above the navigation stack) already pads
 * itself past the status bar / Dynamic Island, so while it's visible the
 * screen content starts BELOW the safe area — a header that re-applies
 * `insets.top` would double-pad and leave a dead gap under the banner.
 *
 * Use this instead of `useSafeAreaInsets().top` for any header that sits
 * at the top of a screen inside the root stack. Do NOT use it inside
 * Modals — they present in their own window hierarchy where the banner
 * isn't visible, so they need the real inset.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  const bannerVisible = useExpeditionBannerVisible();
  return bannerVisible ? 0 : insets.top;
}
