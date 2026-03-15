import { formatTimeAgo, formatDuration } from '../utils/formatTime';

describe('formatTime utilities', () => {
  // Basic smoke tests — expand as the module grows
  it('exports formatTimeAgo', () => {
    expect(typeof formatTimeAgo).toBe('function');
  });

  it('exports formatDuration', () => {
    expect(typeof formatDuration).toBe('function');
  });
});
