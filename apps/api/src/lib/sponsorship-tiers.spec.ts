import { ensureDefaultSponsorshipTiers } from './sponsorship-tiers';

describe('ensureDefaultSponsorshipTiers', () => {
  const makeClient = (existing: Array<{ type: string; priority: number }>) => ({
    sponsorshipTier: {
      findMany: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({}),
    },
  });

  it('creates all six default slots for an explorer with none', async () => {
    const client = makeClient([]);
    await ensureDefaultSponsorshipTiers(client as any, 7);

    expect(client.sponsorshipTier.create).toHaveBeenCalledTimes(6);
    expect(client.sponsorshipTier.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'MONTHLY',
        priority: 1,
        price: 500,
        explorer_id: 7,
        is_available: true,
      }),
    });
  });

  it('leaves existing slots alone', async () => {
    const client = makeClient([
      { type: 'ONE_TIME', priority: 1 },
      { type: 'ONE_TIME', priority: 2 },
      { type: 'ONE_TIME', priority: 3 },
      { type: 'MONTHLY', priority: 1 },
    ]);
    await ensureDefaultSponsorshipTiers(client as any, 7);

    expect(client.sponsorshipTier.create).toHaveBeenCalledTimes(2);
    const created = client.sponsorshipTier.create.mock.calls.map(
      ([arg]) => `${arg.data.type}:${arg.data.priority}`,
    );
    expect(created).toEqual(['MONTHLY:2', 'MONTHLY:3']);
  });
});
