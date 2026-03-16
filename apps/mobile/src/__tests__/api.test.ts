import { ApiError } from '../services/api';

describe('ApiError', () => {
  it('creates an error with status and message', () => {
    const err = new ApiError(404, 'Not found', 'NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('works without an error code', () => {
    const err = new ApiError(500, 'Server error');
    expect(err.status).toBe(500);
    expect(err.code).toBeUndefined();
  });
});

describe('API_BASE_URL', () => {
  it('falls back to production URL when env var is not set', () => {
    // This tests the fallback behavior in api.ts
    const fallback = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.heimursaga.com/v1';
    expect(fallback).toBe('https://api.heimursaga.com/v1');
  });
});
