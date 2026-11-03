import { describe, it, expect, beforeAll, vi } from 'vitest';

let staticMapUrl: typeof import('./static-map').staticMapUrl;

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test');
  ({ staticMapUrl } = await import('./static-map'));
});

describe('staticMapUrl', () => {
  it('returns null without usable points', () => {
    expect(staticMapUrl([])).toBeNull();
    expect(staticMapUrl([{ lat: 0, lon: 0 }])).toBeNull();
  });

  it('centres a single point and omits padding (Mapbox rejects it there)', () => {
    const url = staticMapUrl([{ lat: 44.3841, lon: -68.2033 }])!;
    expect(url).toContain('/-68.2033,44.3841,7/1200x630?');
    expect(url).not.toContain('padding');
  });

  it('drops out-of-range points and treats duplicates as one point', () => {
    expect(staticMapUrl([{ lat: 95, lon: 10 }])).toBeNull();
    const url = staticMapUrl([
      { lat: 44.3841, lon: -68.2033 },
      { lat: 44.3841, lon: -68.2033 },
    ])!;
    expect(url).toContain('/-68.2033,44.3841,7/');
  });

  it('auto-fits several points with padding', () => {
    const url = staticMapUrl([
      { lat: 46.59, lon: -69.47 },
      { lat: 46.92, lon: -69.18 },
    ])!;
    expect(url).toContain('/auto/1200x630?padding=80&');
    expect(url.match(/pin-s/g)).toHaveLength(2);
  });

  it('caps the number of pins and keeps the last point', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ lat: 10 + i / 100, lon: 20 + i / 100 }));
    const url = staticMapUrl(pts)!;
    expect(url.match(/pin-s/g)!.length).toBeLessThanOrEqual(21);
    expect(url).toContain('(20.9900,10.9900)');
  });
});
