/**
 * Mapbox Static Images URL for link-preview (Open Graph / Twitter) images.
 * Used when an expedition or entry has no cover photo, so shared links still
 * show where the journey happens.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const STYLE = 'mapbox/outdoors-v12';
const COPPER = 'ac6d46';
const MAX_PINS = 20; // keep the URL well under Mapbox's length limit

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export function staticMapUrl(points: Array<{ lat: number; lon: number }>): string | null {
  const seen = new Set<string>();
  const valid = points.filter((p) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return false;
    if (p.lat === 0 && p.lon === 0) return false;
    // Duplicates would make an auto-fit zoom in absurdly far.
    const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!MAPBOX_TOKEN || valid.length === 0) return null;

  // Evenly sample so long routes keep their start, end and shape.
  const step = Math.max(1, Math.ceil(valid.length / MAX_PINS));
  const sampled = valid.filter((_, i) => i % step === 0 || i === valid.length - 1);

  const overlay = sampled
    .map((p) => `pin-s+${COPPER}(${p.lon.toFixed(4)},${p.lat.toFixed(4)})`)
    .join(',');
  const view =
    sampled.length === 1
      ? `${sampled[0].lon.toFixed(4)},${sampled[0].lat.toFixed(4)},7`
      : 'auto';
  const { width, height } = OG_IMAGE_SIZE;

  // Mapbox only accepts `padding` with an auto-fit view.
  const padding = view === 'auto' ? 'padding=80&' : '';

  return `https://api.mapbox.com/styles/v1/${STYLE}/static/${overlay}/${view}/${width}x${height}?${padding}access_token=${MAPBOX_TOKEN}`;
}

export const DEFAULT_OG_IMAGE = 'https://heimursaga.com/og-image.jpg';
