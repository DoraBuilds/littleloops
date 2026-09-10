import type { SupabaseClient } from '@supabase/supabase-js';
import type { HouseholdMemberRecord, HouseholdRecord } from './models';
import type { HouseholdRepository } from './repositories';

const HOUSEHOLDS_TABLE = 'households';
const HOUSEHOLD_MEMBERS_TABLE = 'household_members';

const shouldFallbackToDirectBootstrap = (error: unknown) => {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message).toLowerCase()
      : '';

  return (
    message.includes('bootstrap_household') ||
    message.includes('function') ||
    message.includes('could not find')
  );
};

const mapHousehold = (row: Record<string, unknown>): HouseholdRecord => ({
  id: String(row.id),
  name: String(row.name),
  timezone: String(row.timezone),
  homeScene: String(row.home_scene) as HouseholdRecord['homeScene'],
  createdByUserId: String(row.created_by_user_id),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  subscriptionStatus: (row.subscription_status as HouseholdRecord['subscriptionStatus']) ?? 'none',
  currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
});

const mapMember = (row: Record<string, unknown>): HouseholdMemberRecord => ({
  id: String(row.id),
  householdId: String(row.household_id),
  userId: String(row.user_id),
  role: String(row.role) as HouseholdMemberRecord['role'],
  createdAt: String(row.created_at),
});

export class SupabaseHouseholdRepository implements HouseholdRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getCurrentHousehold(userId: string) {
    // IMPORTANT: a parent account should resolve to one stable household.
    // If multiple households exist (due to earlier bugs or tests), we pick the
    // most recently updated owner household so existing accounts converge on the
    // household that actually contains data.
    //
    // NOTE: We intentionally avoid PostgREST embedded-resource joins here
    // (e.g. `household:households(*)`) because those depend on PostgREST having
    // detected the FK relationship in its schema cache. That cache can be stale
    // after manual migrations, causing the join to fail even when both tables and
    // the FK exist perfectly. Two plain queries are slower by one round-trip but
    // are completely immune to schema-cache issues.
    const { data: memberRows, error: memberError } = await this.supabase
      .from(HOUSEHOLD_MEMBERS_TABLE)
      .select('household_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .order('created_at', { ascending: true });

    if (memberError) {
      throw memberError;
    }

    const householdIds = (Array.isArray(memberRows) ? memberRows : memberRows ? [memberRows] : [])
      .map((row) => (row && typeof row === 'object' && 'household_id' in row ? String((row as Record<string, unknown>).household_id) : null))
      .filter(Boolean) as string[];

    if (!householdIds.length) {
      return null;
    }

    const { data: householdRows, error: householdError } = await this.supabase
      .from(HOUSEHOLDS_TABLE)
      .select('*')
      .in('id', householdIds);

    if (householdError) {
      throw householdError;
    }

    const households = (Array.isArray(householdRows) ? householdRows : householdRows ? [householdRows] : []) as Array<Record<string, unknown>>;

    if (!households.length) {
      return null;
    }

    const pick = households
      .slice()
      .sort((left, right) => {
        const leftUpdated = Date.parse(String(left.updated_at ?? '')) || 0;
        const rightUpdated = Date.parse(String(right.updated_at ?? '')) || 0;
        if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;

        const leftCreated = Date.parse(String(left.created_at ?? '')) || 0;
        const rightCreated = Date.parse(String(right.created_at ?? '')) || 0;
        return leftCreated - rightCreated;
      })[0];

    return mapHousehold(pick);
  }

  async createInitialHousehold(input: { householdName: string; timezone: string; userId: string }) {
    // Prefer the RPC bootstrap path: it's server-side, idempotent, and safe under
    // concurrent callback / tab transitions.
    const { data: rpcData, error: rpcError } = await this.supabase.rpc('bootstrap_household', {
      p_name: input.householdName,
      p_timezone: input.timezone,
    });

    if (!rpcError && rpcData) {
      return mapHousehold(rpcData);
    }

    // After any RPC failure, check whether the household already exists.
    // This handles: (a) race conditions where two tabs called bootstrap
    // simultaneously, (b) retries after a partial failure, and (c) cases
    // where the RPC ran but returned null/empty data.
    try {
      const alreadyExists = await this.getCurrentHousehold(input.userId);
      if (alreadyExists) return alreadyExists;
    } catch {
      // ignore — fall through to the error/fallback path below
    }

    // Fallback: older environments may not have the RPC yet.
    if (rpcError && !shouldFallbackToDirectBootstrap(rpcError)) {
      throw rpcError;
    }

    // Direct inserts are a fallback path only.
    const { data: householdRow, error: householdError } = await this.supabase
      .from(HOUSEHOLDS_TABLE)
      .insert({
        name: input.householdName,
        timezone: input.timezone,
        created_by_user_id: input.userId,
      })
      .select('*')
      .single();

    if (householdError) {
      // If another tab/device created the household first (unique constraint),
      // resolve the stable household and continue gracefully.
      const normalizedMessage =
        typeof householdError === 'object' && householdError !== null && 'message' in householdError
          ? String(householdError.message).toLowerCase()
          : '';

      if (normalizedMessage.includes('created_by_user_id') || normalizedMessage.includes('households_one_per_creator')) {
        const existing = await this.getCurrentHousehold(input.userId);
        if (existing) return existing;
      }

      throw householdError;
    }

    const household = mapHousehold(householdRow);

    const { error: membershipError } = await this.supabase
      .from(HOUSEHOLD_MEMBERS_TABLE)
      .insert({
        household_id: household.id,
        user_id: input.userId,
        role: 'owner',
      });

    if (!membershipError) {
      return household;
    }

    // Best-effort cleanup: avoid leaving an orphan household row behind.
    await this.supabase.from(HOUSEHOLDS_TABLE).delete().eq('id', household.id);

    throw membershipError;
  }

  async listMembers(householdId: string) {
    const { data, error } = await this.supabase
      .from(HOUSEHOLD_MEMBERS_TABLE)
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapMember);
  }

  async updateHomeScene(householdId: string, homeScene: HouseholdRecord['homeScene']) {
    const { data, error } = await this.supabase
      .from(HOUSEHOLDS_TABLE)
      .update({ home_scene: homeScene })
      .eq('id', householdId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapHousehold(data);
  }

  async remove(householdId: string) {
    const { error } = await this.supabase
      .from(HOUSEHOLDS_TABLE)
      .delete()
      .eq('id', householdId);

    if (error) {
      throw error;
    }
  }
}
