/**
 * Unit tests — CreditService race-condition fixes
 *
 * Covers:
 *  • charge() — atomic check-and-deduct (no double-spend under concurrency)
 *  • charge() — returns false when balance insufficient
 *  • add()    — balanceAfter reflects committed value, not pre-computed stale value
 *  • cache invalidation after charge/add
 *
 * These tests mock Prisma and the cache so they run without a live DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these variables are available when the vi.mock factories run
// (vi.mock calls are hoisted to the top of the file by Vitest)
const {
  mockCache,
  mockQueryRaw,
  mockFindUnique,
  mockUpdate,
  mockCreate,
  mockTransaction,
} = vi.hoisted(() => {
  const mockQueryRaw   = vi.fn();
  const mockFindUnique = vi.fn();
  const mockUpdate     = vi.fn();
  const mockCreate     = vi.fn();

  const mockTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const tx = {
      $queryRaw: mockQueryRaw,
      creditBalance:       { findUnique: mockFindUnique, update: mockUpdate },
      creditTransaction:   { create: mockCreate },
    };
    return fn(tx);
  });

  const mockCache = {
    get:  vi.fn().mockResolvedValue(null),
    set:  vi.fn().mockResolvedValue(undefined),
    del:  vi.fn().mockResolvedValue(undefined),
  };

  return { mockCache, mockQueryRaw, mockFindUnique, mockUpdate, mockCreate, mockTransaction };
});

vi.mock('../../../core/database', () => ({
  prisma: {
    $transaction: mockTransaction,
    user:          { findUnique: vi.fn() },
    creditBalance: { findUnique: mockFindUnique, create: vi.fn(), update: mockUpdate },
  },
}));

vi.mock('../../../core/cache', () => ({
  cache:       mockCache,
  cacheKeys:   { userCredits: (id: string) => `credits:${id}` },
  cacheTTL:    { userCredits: 60 },
}));

vi.mock('../../../config/admin', () => ({
  isAdminEmail: () => false,
}));

// ---------------------------------------------------------------------------
// Module under test (imported AFTER mocks are registered)
// ---------------------------------------------------------------------------

import { CreditService } from '../credit.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeService() {
  const svc = new CreditService();
  // Bypass isAdmin — always non-admin for these tests
  vi.spyOn(svc as unknown as { isAdmin: () => Promise<boolean> }, 'isAdmin').mockResolvedValue(false);
  return svc;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreditService.charge()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds and returns newBalance when balance is sufficient', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ balance: 5 }]);
    mockCreate.mockResolvedValueOnce({});

    const svc    = makeService();
    const result = await svc.charge(USER_ID, 25, 'test_charge');

    expect(result).toEqual({ success: true, newBalance: 5 });
  });

  it('fails when balance is insufficient (empty UPDATE result)', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockFindUnique.mockResolvedValueOnce({ balance: 10 });

    const svc    = makeService();
    const result = await svc.charge(USER_ID, 25, 'test_charge');

    expect(result).toEqual({ success: false, newBalance: 10 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does NOT double-spend when two concurrent charges race', async () => {
    // First charge wins; second's UPDATE returns no rows (balance already consumed)
    mockQueryRaw
      .mockResolvedValueOnce([{ balance: 5 }])
      .mockResolvedValueOnce([]);
    mockCreate.mockResolvedValue({});
    mockFindUnique.mockResolvedValueOnce({ balance: 5 });

    const svc = makeService();
    const [r1, r2] = await Promise.all([
      svc.charge(USER_ID, 25, 'charge_1'),
      svc.charge(USER_ID, 25, 'charge_2'),
    ]);

    const successes = [r1, r2].filter((r) => r.success);
    const failures  = [r1, r2].filter((r) => !r.success);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it('invalidates cache regardless of outcome', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    mockFindUnique.mockResolvedValueOnce({ balance: 0 });

    const svc = makeService();
    await svc.charge(USER_ID, 25, 'test_charge');

    expect(mockCache.del).toHaveBeenCalledWith(`credits:${USER_ID}`);
  });
});

describe('CreditService.add()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the committed newBalance from the DB (not pre-computed)', async () => {
    mockUpdate.mockResolvedValueOnce({ balance: 35 });
    mockCreate.mockResolvedValueOnce({});

    const svc    = makeService();
    const result = await svc.add(USER_ID, 5, 'BONUS', 'test_add');

    expect(result).toEqual({ success: true, newBalance: 35 });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ balanceAfter: 35 }),
      })
    );
  });

  it('increments lifetimePurchased only for PURCHASE type', async () => {
    mockUpdate.mockResolvedValueOnce({ balance: 100 });
    mockCreate.mockResolvedValueOnce({});

    const svc = makeService();
    await svc.add(USER_ID, 50, 'PURCHASE', 'credit_purchase');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lifetimePurchased: { increment: 50 } }),
      })
    );
  });

  it('does NOT increment lifetimePurchased for BONUS type', async () => {
    mockUpdate.mockResolvedValueOnce({ balance: 55 });
    mockCreate.mockResolvedValueOnce({});

    const svc = makeService();
    await svc.add(USER_ID, 5, 'BONUS', 'daily_bonus');

    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty('lifetimePurchased');
  });

  it('invalidates cache after adding credits', async () => {
    mockUpdate.mockResolvedValueOnce({ balance: 60 });
    mockCreate.mockResolvedValueOnce({});

    const svc = makeService();
    await svc.add(USER_ID, 10, 'REWARD', 'referral');

    expect(mockCache.del).toHaveBeenCalledWith(`credits:${USER_ID}`);
  });
});
