/**
 * Mock factory for PrismaService.
 * Returns jest.fn() stubs for all model CRUD operations.
 */
function createModelMock() {
  return {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirstOrThrow: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  };
}

export function createMockPrismaService() {
  const mock = {
    payoutMethod: createModelMock(),
    payout: createModelMock(),
    explorer: createModelMock(),
    checkout: createModelMock(),
    sponsorship: createModelMock(),
    sponsorshipTier: createModelMock(),
    expedition: createModelMock(),
    paymentMethod: createModelMock(),
    explorerPlan: createModelMock(),
    explorerSubscription: createModelMock(),
    processedWebhookEvent: createModelMock(),
    entry: createModelMock(),
    profile: createModelMock(),
    plan: createModelMock(),
    track: createModelMock(),
    trackPoint: createModelMock(),
    $transaction: jest.fn(),
  };

  // `tx` must be this same instance, not a fresh one. Handing the callback a new
  // createMockPrismaService() gives it jest.fn()s the test never configured and
  // cannot assert on, so anything a service does inside $transaction silently
  // vanishes — writes appear as zero calls and mockResolvedValue has no effect.
  mock.$transaction.mockImplementation((cb: any) => {
    if (typeof cb === 'function') {
      return cb(mock);
    }
    // Array form: $transaction([p1, p2]) resolves the operations together.
    return Promise.resolve(cb);
  });

  return mock;
}

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
