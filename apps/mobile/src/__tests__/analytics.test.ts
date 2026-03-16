import { analytics } from '../services/analytics';

describe('analytics', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('identify logs user id', () => {
    analytics.identify('user_123', { plan: 'pro' });
    expect(console.log).toHaveBeenCalledWith(
      '[analytics] identify',
      'user_123',
      { plan: 'pro' },
    );
  });

  it('track logs event name and properties', () => {
    analytics.track('button_tap', { screen: 'home' });
    expect(console.log).toHaveBeenCalledWith(
      '[analytics] track',
      'button_tap',
      { screen: 'home' },
    );
  });

  it('screen logs screen name', () => {
    analytics.screen('Discover');
    expect(console.log).toHaveBeenCalledWith(
      '[analytics] screen',
      'Discover',
      undefined,
    );
  });

  it('reset clears user', () => {
    analytics.identify('user_123');
    analytics.reset();
    expect(console.log).toHaveBeenCalledWith('[analytics] reset');
  });
});
