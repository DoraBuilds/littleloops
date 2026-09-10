import { describe, expect, it, vi } from 'vitest';
import { SupabaseHouseholdRepository } from '@/lib/data/supabase-household-repository';

const createSupabaseClient = (rpcResult: { data: unknown; error: unknown }, tables: Record<string, unknown>) =>
  ({
    rpc: vi.fn().mockResolvedValue(rpcResult),
    from: vi.fn((table: string) => tables[table]),
  }) as never;

describe('SupabaseHouseholdRepository', () => {
  it('selects the most recently updated owner household when duplicates exist', async () => {
    // Step 1 mock: household_members → returns household_ids
    const memberOrder = vi.fn().mockResolvedValue({
      data: [{ household_id: 'house-old' }, { household_id: 'house-new' }],
      error: null,
    });
    const memberEqRole = vi.fn(() => ({ order: memberOrder }));
    const memberEqUser = vi.fn(() => ({ eq: memberEqRole }));
    const memberSelect = vi.fn(() => ({ eq: memberEqUser }));

    // Step 2 mock: households → returns full household rows
    const householdIn = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'house-old',
          name: "Dora's Family",
          timezone: 'Europe/Madrid',
          home_scene: 'bike',
          created_by_user_id: 'user-1',
          created_at: '2026-05-01T12:00:00Z',
          updated_at: '2026-05-01T12:00:00Z',
        },
        {
          id: 'house-new',
          name: "Dora's Family",
          timezone: 'Europe/Madrid',
          home_scene: 'school',
          created_by_user_id: 'user-1',
          created_at: '2026-05-02T12:00:00Z',
          updated_at: '2026-05-04T12:00:00Z',
        },
      ],
      error: null,
    });
    const householdSelect = vi.fn(() => ({ in: householdIn }));

    const repository = new SupabaseHouseholdRepository({
      from: vi.fn((table: string) =>
        table === 'household_members'
          ? { select: memberSelect }
          : { select: householdSelect }
      ),
    } as never);

    await expect(repository.getCurrentHousehold('user-1')).resolves.toEqual({
      id: 'house-new',
      name: "Dora's Family",
      timezone: 'Europe/Madrid',
      homeScene: 'school',
      createdByUserId: 'user-1',
      createdAt: '2026-05-02T12:00:00Z',
      updatedAt: '2026-05-04T12:00:00Z',
      subscriptionStatus: 'none',
      currentPeriodEnd: null,
    });

    expect(memberSelect).toHaveBeenCalledWith('household_id');
    expect(memberEqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(memberEqRole).toHaveBeenCalledWith('role', 'owner');
    expect(memberOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(householdSelect).toHaveBeenCalledWith('*');
    expect(householdIn).toHaveBeenCalledWith('id', ['house-old', 'house-new']);
  });

  it('returns the RPC household when bootstrap_household succeeds', async () => {
    // Repository tries direct inserts first; force that path to fail with a bootstrap-style
    // error so it falls back to the RPC result.
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Could not find the function public.bootstrap_household' },
    });
    const householdInsert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));

    const repository = new SupabaseHouseholdRepository(
      createSupabaseClient(
        {
          data: {
            id: 'house-1',
            name: "Dora's Family",
            timezone: 'Europe/Madrid',
            home_scene: 'bike',
            created_by_user_id: 'user-1',
            created_at: '2026-05-03T12:00:00Z',
            updated_at: '2026-05-03T12:00:00Z',
          },
          error: null,
        },
        {
          households: {
            insert: householdInsert,
          },
        }
      )
    );

    await expect(
      repository.createInitialHousehold({
        householdName: "Dora's Family",
        timezone: 'Europe/Madrid',
        userId: 'user-1',
      })
    ).resolves.toEqual({
      id: 'house-1',
      name: "Dora's Family",
      timezone: 'Europe/Madrid',
      homeScene: 'bike',
      createdByUserId: 'user-1',
      createdAt: '2026-05-03T12:00:00Z',
      updatedAt: '2026-05-03T12:00:00Z',
      subscriptionStatus: 'none',
      currentPeriodEnd: null,
    });
  });

  it('falls back to direct inserts when the bootstrap RPC is unavailable', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'house-2',
        name: "Dora's Family",
        timezone: 'Europe/Madrid',
        home_scene: 'bike',
        created_by_user_id: 'user-1',
        created_at: '2026-05-03T12:00:00Z',
        updated_at: '2026-05-03T12:00:00Z',
      },
      error: null,
    });
    const householdInsert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
    const membershipInsert = vi.fn().mockResolvedValue({ error: null });

    const repository = new SupabaseHouseholdRepository(
      createSupabaseClient(
        {
          data: null,
          error: { message: 'Could not find the function public.bootstrap_household' },
        },
        {
          households: {
            insert: householdInsert,
          },
          household_members: {
            insert: membershipInsert,
          },
        }
      )
    );

    await expect(
      repository.createInitialHousehold({
        householdName: "Dora's Family",
        timezone: 'Europe/Madrid',
        userId: 'user-1',
      })
    ).resolves.toMatchObject({
      id: 'house-2',
      name: "Dora's Family",
      createdByUserId: 'user-1',
    });

    expect(householdInsert).toHaveBeenCalledWith({
      name: "Dora's Family",
      timezone: 'Europe/Madrid',
      created_by_user_id: 'user-1',
    });
    expect(membershipInsert).toHaveBeenCalledWith({
      household_id: 'house-2',
      user_id: 'user-1',
      role: 'owner',
    });
  });

  it('does not fall back to RPC when membership insert fails for a non-bootstrap reason', async () => {
    const householdRow = {
      id: 'house-3',
      name: "Dora's Family",
      timezone: 'Europe/Madrid',
      home_scene: 'bike',
      created_by_user_id: 'user-1',
      created_at: '2026-05-03T12:00:00Z',
      updated_at: '2026-05-03T12:00:00Z',
    };

    const single = vi.fn().mockResolvedValue({ data: householdRow, error: null });
    const householdInsert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }));
    const cleanupEq = vi.fn().mockResolvedValue({ error: null });
    const householdDelete = vi.fn(() => ({ eq: cleanupEq }));

    const repository = new SupabaseHouseholdRepository(
      createSupabaseClient(
        {
          data: null,
          error: { message: 'Not authenticated' },
        },
        {
          households: {
            insert: householdInsert,
            delete: householdDelete,
          },
          household_members: {
            insert: vi.fn().mockResolvedValue({ error: { message: 'Not authenticated' } }),
          },
        }
      )
    );

    await expect(
      repository.createInitialHousehold({
        householdName: "Dora's Family",
        timezone: 'Europe/Madrid',
        userId: 'user-1',
      })
    ).rejects.toMatchObject({ message: 'Not authenticated' });
  });

  it('deletes the household row by id', async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const repository = new SupabaseHouseholdRepository(
      createSupabaseClient(
        {
          data: null,
          error: null,
        },
        {
          households: {
            delete: vi.fn(() => ({
              eq: deleteEq,
            })),
          },
        }
      )
    );

    await expect(repository.remove('house-1')).resolves.toBeUndefined();
    expect(deleteEq).toHaveBeenCalledWith('id', 'house-1');
  });
});
