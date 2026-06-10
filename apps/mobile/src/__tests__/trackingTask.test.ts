/**
 * Scenario tests for the headless background-tracking task — the path
 * iOS drives when it wakes the app (possibly in a fresh JS context) to
 * deliver buffered location updates. Everything here must hold with NO
 * React tree mounted: points land in the SQLite buffer, bad fixes are
 * dropped, and a stopped session swallows late deliveries.
 */
import type { LocationObject } from 'expo-location';

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));
jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(),
}));
jest.mock('../services/trackingBuffer', () => ({
  bufferInsert: jest.fn(),
  getTrackingSession: jest.fn(),
}));

import * as TaskManager from 'expo-task-manager';

import {
  MAX_ACCURACY_M,
  TRACKING_TASK_NAME,
  addLocationListener,
} from '../services/trackingTask';
import {
  bufferInsert,
  getTrackingSession,
} from '../services/trackingBuffer';

type TaskCallback = (body: {
  data?: { locations?: LocationObject[] };
  error?: { message: string } | null;
}) => Promise<void>;

const mockBufferInsert = bufferInsert as jest.MockedFunction<typeof bufferInsert>;
const mockGetSession = getTrackingSession as jest.MockedFunction<
  typeof getTrackingSession
>;

// The module registers its callback at import time; grab the call record
// NOW, at module scope — beforeEach's clearAllMocks wipes mock.calls
// before any test body runs.
const defineTaskMock = TaskManager.defineTask as jest.Mock;
const [registeredTaskName, taskCallback] = defineTaskMock.mock.calls[0] as [
  string,
  TaskCallback,
];

const SESSION = {
  expeditionId: 'exp-1',
  trackId: 42,
  mode: 'active' as const,
  startedAt: 1_779_950_000_000,
  expeditionTitle: 'Test Expedition',
  paused: false,
};

function loc(overrides: Partial<LocationObject['coords']> & { timestamp?: number } = {}): LocationObject {
  const { timestamp, ...coords } = overrides;
  return {
    timestamp: timestamp ?? 1_780_000_000_000,
    coords: {
      latitude: 60.1,
      longitude: 10.2,
      accuracy: 15,
      altitude: 320,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 1.4,
      ...coords,
    },
  } as LocationObject;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockBufferInsert.mockResolvedValue(undefined as never);
});

describe('trackingTask — registration', () => {
  it('registers the task by its stable name at module load', () => {
    expect(registeredTaskName).toBe(TRACKING_TASK_NAME);
    expect(taskCallback).toEqual(expect.any(Function));
  });
});

describe('trackingTask — headless point delivery', () => {
  it('buffers a delivered point against the persisted session', async () => {
    await taskCallback({ data: { locations: [loc()] } });

    expect(mockBufferInsert).toHaveBeenCalledTimes(1);
    expect(mockBufferInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        expeditionId: 'exp-1',
        trackId: 42,
        lat: 60.1,
        lon: 10.2,
        accuracyM: 15,
        speedMps: 1.4,
        altitudeM: 320,
        recordedAt: new Date(1_780_000_000_000).toISOString(),
        clientUuid: expect.any(String),
      }),
    );
  });

  it('assigns a distinct clientUuid per point (offline-retry idempotency)', async () => {
    await taskCallback({ data: { locations: [loc(), loc()] } });
    const [a, b] = mockBufferInsert.mock.calls.map((c) => c[0].clientUuid);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('drops fixes with accuracy worse than the shared cutoff, keeps the rest', async () => {
    await taskCallback({
      data: {
        locations: [
          loc({ accuracy: MAX_ACCURACY_M + 1 }),
          loc({ accuracy: MAX_ACCURACY_M }),
          loc({ accuracy: null }),
        ],
      },
    });
    expect(mockBufferInsert).toHaveBeenCalledTimes(2);
    expect(mockBufferInsert.mock.calls[0][0].accuracyM).toBe(MAX_ACCURACY_M);
    expect(mockBufferInsert.mock.calls[1][0].accuracyM).toBeUndefined();
  });

  it('normalizes the iOS "invalid speed" sentinel (-1) to undefined', async () => {
    await taskCallback({ data: { locations: [loc({ speed: -1 })] } });
    expect(mockBufferInsert.mock.calls[0][0].speedMps).toBeUndefined();
  });

  it('silently drops late deliveries after the session was stopped', async () => {
    mockGetSession.mockResolvedValue(null);
    await taskCallback({ data: { locations: [loc()] } });
    expect(mockBufferInsert).not.toHaveBeenCalled();
  });

  it('drops the batch when the session read itself fails', async () => {
    mockGetSession.mockRejectedValue(new Error('sqlite locked'));
    await expect(
      taskCallback({ data: { locations: [loc()] } }),
    ).resolves.toBeUndefined();
    expect(mockBufferInsert).not.toHaveBeenCalled();
  });

  it('bails out on an OS-level task error without touching the buffer', async () => {
    await taskCallback({ error: { message: 'location services reset' } });
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockBufferInsert).not.toHaveBeenCalled();
  });

  it('does nothing for an empty delivery', async () => {
    await taskCallback({ data: { locations: [] } });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('keeps processing later points when one bufferInsert fails', async () => {
    mockBufferInsert
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined as never);
    await expect(
      taskCallback({ data: { locations: [loc(), loc()] } }),
    ).resolves.toBeUndefined();
    expect(mockBufferInsert).toHaveBeenCalledTimes(2);
  });
});

describe('trackingTask — foreground listener fan-out', () => {
  it('notifies subscribed listeners per accepted point and honors unsubscribe', async () => {
    const seen: number[] = [];
    const unsubscribe = addLocationListener((l) => seen.push(l.timestamp));

    await taskCallback({ data: { locations: [loc({ timestamp: 111 })] } });
    expect(seen).toEqual([111]);

    unsubscribe();
    await taskCallback({ data: { locations: [loc({ timestamp: 222 })] } });
    expect(seen).toEqual([111]);
  });

  it('does not notify listeners for points the accuracy filter rejected', async () => {
    const seen: number[] = [];
    const unsubscribe = addLocationListener((l) => seen.push(l.timestamp));
    await taskCallback({
      data: { locations: [loc({ accuracy: 9999, timestamp: 333 })] },
    });
    unsubscribe();
    expect(seen).toEqual([]);
    expect(mockBufferInsert).not.toHaveBeenCalled();
  });

  it('isolates a throwing listener so other listeners and buffering continue', async () => {
    const seen: string[] = [];
    const un1 = addLocationListener(() => {
      throw new Error('bad consumer');
    });
    const un2 = addLocationListener(() => seen.push('ok'));

    await expect(
      taskCallback({ data: { locations: [loc()] } }),
    ).resolves.toBeUndefined();
    expect(seen).toEqual(['ok']);
    expect(mockBufferInsert).toHaveBeenCalledTimes(1);

    un1();
    un2();
  });
});
