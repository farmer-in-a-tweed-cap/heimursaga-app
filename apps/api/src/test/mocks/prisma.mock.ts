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
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  };
}

export function createMockPrismaService() {
  return {
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
    $transaction: jest.fn((cb: any) => {
      if (typeof cb === 'function') {
        // Pass mock prisma as tx so inner tx.* calls use our mocks
        return cb(createMockPrismaService());
      }
      return Promise.resolve(cb);
    }),
  };
}

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
