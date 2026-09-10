import type { AgeBucket, HomeScene, IconKey, RoutineType } from '@/lib/types';

export type HouseholdRole = 'owner' | 'parent';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export interface HouseholdRecord {
  id: string;
  name: string;
  timezone: string;
  homeScene: HomeScene;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export interface HouseholdMemberRecord {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  createdAt: string;
}

export interface ChildProfileRecord {
  id: string;
  householdId: string;
  name: string;
  age: number | null;
  ageBucket: AgeBucket | null;
  avatarAnimal: string | null;
  avatarSeed: string | null;
  // Cozy Pastel redesign fields
  mascotId: string | null;
  streak: number;
  affirmations: string[];
  badges: Record<string, boolean>;
  moods: Array<{ day: string; emoji: string | null; note?: string | null }>;
  /**
   * date-keyed map of completed task titles, e.g. { "2026-05-31": { morning: ["Brush teeth"], evening: [] } }
   * Also carries a special "_streakDate" key (string) that records the last day the streak was incremented.
   */
  taskCompletion: Record<string, { morning: string[]; evening: string[] } | string | null>;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineRecord {
  id: string;
  childProfileId: string;
  type: RoutineType;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineTaskRecord {
  id: string;
  routineId: string;
  taskTemplateId: string | null;
  customTitle: string | null;
  customIcon: IconKey | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyRoutineProgressRecord {
  id: string;
  childProfileId: string;
  routineType: RoutineType;
  progressDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTaskProgressRecord {
  id: string;
  dailyRoutineProgressId: string;
  routineTaskId: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
