import { describe, it, expect } from 'vitest';
import { haversineKm, haversineFromLatLng, haversineMeters } from './haversine';

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm([0, 0], [0, 0])).toBe(0);
    expect(haversineKm([-73.9857, 40.7484], [-73.9857, 40.7484])).toBe(0);
  });

  it('calculates New York to London (~5570 km)', () => {
    // JFK [lng, lat] → Heathrow [lng, lat]
    const dist = haversineKm([-73.7781, 40.6413], [-0.4543, 51.4700]);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(5650);
  });

  it('calculates short distance — Empire State to Times Square (~1.3 km)', () => {
    const dist = haversineKm([-73.9857, 40.7484], [-73.9855, 40.7580]);
    expect(dist).toBeGreaterThan(1.0);
    expect(dist).toBeLessThan(1.2);
  });

  it('handles antipodal points (~20000 km half circumference)', () => {
    const dist = haversineKm([0, 0], [180, 0]);
    // Half of earth circumference ≈ 20015 km
    expect(dist).toBeGreaterThan(20000);
    expect(dist).toBeLessThan(20030);
  });

  it('is symmetric — order of coordinates does not matter', () => {
    const a = [-73.9857, 40.7484];
    const b = [-0.4543, 51.4700];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it('handles crossing the antimeridian', () => {
    // Tokyo (lng ~139.7) to Anchorage (lng ~-149.9)
    const dist = haversineKm([139.6917, 35.6895], [-149.9003, 61.2181]);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(6000);
  });

  it('handles crossing the equator', () => {
    // Quito, Ecuador to Bogota, Colombia
    const dist = haversineKm([-78.4678, -0.1807], [-74.0721, 4.7110]);
    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(800);
  });
});

describe('haversineFromLatLng', () => {
  it('delegates to haversineKm with correct argument mapping', () => {
    const a = { lat: 40.7484, lng: -73.9857 };
    const b = { lat: 51.4700, lng: -0.4543 };
    const fromLatLng = haversineFromLatLng(a, b);
    const fromCoords = haversineKm([a.lng, a.lat], [b.lng, b.lat]);
    expect(fromLatLng).toBe(fromCoords);
  });

  it('returns 0 for same point', () => {
    const p = { lat: 48.8566, lng: 2.3522 };
    expect(haversineFromLatLng(p, p)).toBe(0);
  });
});

describe('haversineMeters', () => {
  it('returns distance in meters (1000x km)', () => {
    const a = { lat: 40.7484, lng: -73.9857 };
    const b = { lat: 40.7580, lng: -73.9855 };
    const km = haversineFromLatLng(a, b);
    const m = haversineMeters(a, b);
    expect(m).toBeCloseTo(km * 1000, 6);
  });

  it('returns 0 for identical points', () => {
    const p = { lat: 0, lng: 0 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('calculates a short walking distance accurately', () => {
    // ~100m apart
    const a = { lat: 51.5074, lng: -0.1278 };
    const b = { lat: 51.5083, lng: -0.1278 };
    const m = haversineMeters(a, b);
    expect(m).toBeGreaterThan(90);
    expect(m).toBeLessThan(110);
  });
});
