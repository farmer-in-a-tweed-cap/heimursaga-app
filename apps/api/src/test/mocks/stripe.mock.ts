/**
 * Mock factory for StripeService.
 * Returns jest.fn() stubs for all accessor getters and public methods.
 */
function createResourceMock() {
  return {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    cancel: jest.fn(),
    del: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
  };
}

export function createMockStripeService() {
  return {
    // Accessor getters (Stripe SDK resources)
    accounts: createResourceMock(),
    subscriptions: createResourceMock(),
    payouts: createResourceMock(),
    paymentIntents: createResourceMock(),
    balance: { retrieve: jest.fn() },
    refunds: createResourceMock(),
    charges: createResourceMock(),
    paymentMethods: createResourceMock(),
    prices: createResourceMock(),
    products: createResourceMock(),
    promotionCodes: createResourceMock(),
    invoices: createResourceMock(),
    setupIntents: createResourceMock(),
    transfers: createResourceMock(),
    accountLinks: createResourceMock(),
    customers: createResourceMock(),
    webhooks: { constructEvent: jest.fn() },

    // Public methods
    webhook: jest.fn(),
    createAccount: jest.fn(),
    linkAccount: jest.fn(),
    getAccount: jest.fn(),
    getOrCreateCustomer: jest.fn(),
    createPaymentIntent: jest.fn(),
    createSetupIntent: jest.fn(),
    generateIdempotencyKey: jest.fn(
      (prefix: string, ...parts: (string | number)[]) =>
        `${prefix}_${parts.join('_')}`,
    ),
  };
}

export type MockStripeService = ReturnType<typeof createMockStripeService>;
