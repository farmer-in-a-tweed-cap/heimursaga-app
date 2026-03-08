/**
 * Mock factory for EventService.
 */
export function createMockEventService() {
  return {
    trigger: jest.fn(),
  };
}

export type MockEventService = ReturnType<typeof createMockEventService>;
