/**
 * Mock factory for Logger.
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

export type MockLogger = ReturnType<typeof createMockLogger>;
