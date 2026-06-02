import { describe, it, expect } from 'vitest';
import { computeRouteNumbering } from './routeNumbering';

const wp = (id: string, entryIds: string[] = []) => ({ id, entryIds });
const entry = (id: string, date: string, createdAt?: string) => ({ id, date, createdAt });

describe('computeRouteNumbering', () => {
  it('numbers a converted-entry waypoint and an unconverted waypoint in one sequence (the reported bug)', () => {
    // Stop 1 is an entry (converted waypoint), stop 2 is a plain waypoint.
    const waypoints = [wp('w1', ['e1']), wp('w2')];
    const entries = [entry('e1', '2026-06-01')];
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering(waypoints, entries);
    expect(numberByEntryId.get('e1')).toBe(1);
    expect(numberByWaypointId.get('w2')).toBe(2); // not 1 — single shared counter
  });

  it('keeps numbering sequential across alternating types', () => {
    const waypoints = [wp('w1'), wp('w2', ['e1']), wp('w3'), wp('w4', ['e2'])];
    const entries = [entry('e1', '2026-06-02'), entry('e2', '2026-06-04')];
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering(waypoints, entries);
    expect(numberByWaypointId.get('w1')).toBe(1);
    expect(numberByEntryId.get('e1')).toBe(2);
    expect(numberByWaypointId.get('w3')).toBe(3);
    expect(numberByEntryId.get('e2')).toBe(4);
  });

  it('counts each entry of a multi-entry waypoint as its own position', () => {
    const waypoints = [wp('w1', ['e1', 'e2']), wp('w2')];
    const entries = [entry('e1', '2026-06-01'), entry('e2', '2026-06-02')];
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering(waypoints, entries);
    expect(numberByEntryId.get('e1')).toBe(1);
    expect(numberByEntryId.get('e2')).toBe(2);
    expect(numberByWaypointId.get('w2')).toBe(3);
  });

  it('appends entries linked to no waypoint after the route, sorted by date', () => {
    const waypoints = [wp('w1')];
    const entries = [entry('e2', '2026-06-10'), entry('e1', '2026-06-05')];
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering(waypoints, entries);
    expect(numberByWaypointId.get('w1')).toBe(1);
    expect(numberByEntryId.get('e1')).toBe(2); // earlier date first
    expect(numberByEntryId.get('e2')).toBe(3);
  });

  it('still assigns numbers to start/end waypoints (S/E override happens at render)', () => {
    const waypoints = [wp('w1'), wp('w2'), wp('w3')];
    const { numberByWaypointId } = computeRouteNumbering(waypoints, []);
    expect(numberByWaypointId.get('w1')).toBe(1);
    expect(numberByWaypointId.get('w3')).toBe(3);
  });

  it('ignores entryIds that reference a missing entry', () => {
    const waypoints = [wp('w1', ['missing']), wp('w2')];
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering(waypoints, []);
    expect(numberByEntryId.has('missing')).toBe(false);
    expect(numberByWaypointId.get('w2')).toBe(1); // missing entry consumed no position
  });

  it('numbers an entries-only expedition (no waypoints) by date', () => {
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering([], [
      entry('e2', '2026-06-10'),
      entry('e1', '2026-06-01'),
    ]);
    expect(numberByWaypointId.size).toBe(0);
    expect(numberByEntryId.get('e1')).toBe(1);
    expect(numberByEntryId.get('e2')).toBe(2);
  });

  it('counts only the resolvable entries of a partially-orphaned waypoint', () => {
    const waypoints = [wp('w1', ['missing', 'e1']), wp('w2')];
    const { numberByEntryId, numberByWaypointId } = computeRouteNumbering(waypoints, [entry('e1', '2026-06-01')]);
    expect(numberByEntryId.has('missing')).toBe(false);
    expect(numberByEntryId.get('e1')).toBe(1);
    expect(numberByWaypointId.get('w2')).toBe(2);
  });
});
