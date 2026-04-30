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

    // Version-tolerant readers — mirror the production helpers so callers
    // that pass real-looking subscription/invoice shapes get the right value.
    getSubscriptionCurrentPeriodEnd: jest.fn((sub: any): number | null => {
      const itemEnd = sub?.items?.data?.[0]?.current_period_end;
      if (typeof itemEnd === 'number') return itemEnd;
      const top = sub?.current_period_end;
      return typeof top === 'number' ? top : null;
    }),
    getInvoicePaymentIntentId: jest.fn((invoice: any): string | null => {
      const pi = invoice?.payment_intent;
      if (typeof pi === 'string') return pi;
      if (pi?.id) return pi.id;
      return null;
    }),
    getInvoiceClientSecret: jest.fn((invoice: any): string | null => {
      const cs = invoice?.confirmation_secret?.client_secret;
      if (cs) return cs;
      const pi = invoice?.payment_intent;
      if (pi?.client_secret) return pi.client_secret;
      return null;
    }),
  };
}

export type MockStripeService = ReturnType<typeof createMockStripeService>;
