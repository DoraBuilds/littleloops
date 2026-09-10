import { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LandingPage } from '@/pages/LandingPage';
import { AccountEntryScreen } from '@/components/AccountEntryScreen';
import { ExistingFamilyRecoveryScreen } from '@/components/ExistingFamilyRecoveryScreen';
import { HouseholdLoadErrorScreen } from '@/components/HouseholdLoadErrorScreen';
import { PaywallScreen } from '@/components/PaywallScreen';
import { ImportFamilySetupScreen } from '@/components/ImportFamilySetupScreen';
import { KidHome } from '@/components/KidHome';
import { KidApp } from '@/components/KidApp';
import { useAuth } from '@/lib/auth/use-auth';
import { loadCloudHouseholdState } from '@/lib/data/cloud-household-state';
import { saveHouseholdConfigToCloud } from '@/lib/data/cloud-household-write';
import { mergeTodaysCompletions } from '@/lib/data/merge-same-day-progress';
import { getDisplayRoutine, getHouseholdTheme } from '@/lib/routine-schedule';
import { deleteCloudHousehold } from '@/lib/data/delete-cloud-household';
import { importLocalFamilyToCloud } from '@/lib/data/local-to-cloud-import';
import { SupabaseProgressRepository } from '@/lib/data/supabase-progress-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { DEFAULT_BADGES, DEFAULT_MOODS } from '@/lib/mascots';
import type { AppView, Child, HomeScene, RoutineType } from '@/lib/types';
import {
  clearLocalAppState,
  loadLocalAppState,
  saveLocalAppState,
} from '@/lib/storage/local-app-state';

const InitialSetup = lazy(() => import('@/components/InitialSetup').then((module) => ({ default: module.InitialSetup })));
const ParentSettings = lazy(() => import('@/components/ParentSettings').then((module) => ({ default: module.ParentSettings })));

const createSetupChildren = (): Child[] => [];
const getLocalProgressDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const serializeHouseholdConfig = (input: {
  children: Child[];
  homeScene: HomeScene;
  setupComplete: boolean;
}) =>
  JSON.stringify({
    children: input.children.map((child) => ({
      id: child.id,
      name: child.name,
      age: child.age ?? null,
      ageBucket: child.ageBucket ?? null,
      avatarAnimal: child.avatarAnimal ?? null,
      avatarSeed: child.avatarSeed ?? null,
      mascotId: child.mascotId ?? null,
      streak: child.streak ?? 0,
      streakDate: child.streakDate ?? null,
      affirmations: child.affirmations ?? [],
      badges: child.badges ?? {},
      moods: (child.moods ?? []).map((m) => ({ day: m.day, emoji: m.emoji, note: m.note ?? null })),
      schedule: child.schedule ?? null,
      morning: child.morning.map((task) => ({
        id: task.id,
        title: task.title,
        icon: task.icon,
        completed: task.completed,
      })),
      evening: child.evening.map((task) => ({
        id: task.id,
        title: task.title,
        icon: task.icon,
        completed: task.completed,
      })),
    })),
    homeScene: input.homeScene,
    setupComplete: input.setupComplete,
  });

const ViewLoadingFallback = ({ title = 'Loading next step' }: { title?: string }) => (
  <div className="flex min-h-svh items-center justify-center px-5 py-10">
    <div className="w-full max-w-lg rounded-[32px] border border-border bg-card p-8 text-center shadow-card">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-primary">Little Loops</p>
      <h1 className="mt-4 text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">This should only take a moment.</p>
    </div>
  </div>
);

const Index = () => {
  const { status: authStatus, householdStatus, household, signOut, user } = useAuth();
  const [view, setView] = useState<AppView>('setup');
  const [children, setChildren] = useState<Child[]>(createSetupChildren);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  // Locked at the moment the child card is tapped — never re-derived from the live
  // clock while the routine is in progress. This prevents the displayed routine from
  // flipping mid-session when a schedule boundary is crossed.
  const [activeRoutine, setActiveRoutine] = useState<RoutineType>('morning');
  const [setupComplete, setSetupComplete] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [cloudConfigSyncError, setCloudConfigSyncError] = useState<string | null>(null);
  const [cloudConfigSyncStatus, setCloudConfigSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [cloudConfigSyncRetryTick, setCloudConfigSyncRetryTick] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [homeScene, setHomeScene] = useState<HomeScene>('bike');
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const lastSyncedConfigRef = useRef<string | null>(null);
  // ISO date (YYYY-MM-DD) when lastSyncedConfigRef was last updated.
  // Used to detect stale local completion state across midnight.
  const lastSyncedDateRef = useRef<string | null>(null);
  const configSyncInFlightRef = useRef<string | null>(null);
  const pendingCloudConfigSyncRef = useRef<{
    signature: string;
    state: { children: Child[]; homeScene: HomeScene; setupComplete: boolean };
    force: boolean;
  } | null>(null);
  const shouldSyncFirstConfigRef = useRef(false);
  const skipLocalPersistenceRef = useRef(false);
  const currentSessionSetupRef = useRef<{
    children: Child[];
    homeScene: HomeScene;
    setupComplete: boolean;
  }>({
    children: createSetupChildren(),
    homeScene: 'bike',
    setupComplete: false,
  });

  useEffect(() => {
    currentSessionSetupRef.current = {
      children,
      homeScene,
      setupComplete,
    };
  }, [children, homeScene, setupComplete]);

  const clearLocalAndState = useCallback((nextView: AppView) => {
    skipLocalPersistenceRef.current = true;
    clearLocalAppState(user?.id ? { userId: user.id } : undefined);
    setChildren(createSetupChildren());
    setActiveChildId(null);
    setSetupComplete(false);
    setHomeScene('bike');
    setView(nextView);
    setNow(new Date());
  }, [user?.id]);

  const resetToFreshSetup = useCallback(async () => {
    if (authStatus === 'signed_in' && householdStatus === 'ready' && household) {
      await deleteCloudHousehold(household);
      clearLocalAndState('account');
      await signOut();
      return;
    }

    clearLocalAndState('setup');
  }, [authStatus, clearLocalAndState, household, householdStatus, signOut]);

  const restartSetup = useCallback(() => {
    setActiveChildId(null);
    setSetupComplete(false);
    setView('setup');
    setNow(new Date());
  }, []);

  // Startup is auth-first: signed-out users always land on account entry.
  useEffect(() => {
    if (
      authStatus === 'loading' ||
      (authStatus === 'signed_in' && (householdStatus === 'idle' || householdStatus === 'loading'))
    ) {
      return;
    }

    let isMounted = true;

    const bootstrap = async () => {
      if (authStatus === 'signed_out' || authStatus === 'unavailable') {
        if (!isMounted) return;

        setBootstrapError(null);
        setCloudConfigSyncError(null);
        setCloudConfigSyncStatus('idle');
        setChildren(createSetupChildren());
        setActiveChildId(null);
        setSetupComplete(false);
        setHomeScene('bike');
        // Show landing for fresh loads; return to sign-in after an explicit sign-out
        // (when the user was already inside the app, view !== 'landing' and !== 'setup').
        setView((prev) =>
          prev === 'home' || prev === 'parent' || prev === 'advanced-settings' || prev === 'routine'
            ? 'account'
            : 'landing'
        );
        lastSyncedConfigRef.current = null;
        shouldSyncFirstConfigRef.current = false;
        skipLocalPersistenceRef.current = false;
        setIsReady(true);
        return;
      }

      const storedState =
        authStatus === 'signed_in' && user?.id ? loadLocalAppState({ userId: user.id }) : loadLocalAppState();
      const currentSessionSetup = currentSessionSetupRef.current;
      const recoverableLocalState =
        storedState ??
        (authStatus !== 'signed_in' && currentSessionSetup.children.length > 0
          ? {
              version: 1,
              children: currentSessionSetup.children,
              homeScene: currentSessionSetup.homeScene,
              lastReset: new Date().toDateString(),
              setupComplete: currentSessionSetup.setupComplete,
            }
          : null);
      let cloudState: Awaited<ReturnType<typeof loadCloudHouseholdState>> | null = null;
      let cloudLoadError: string | null = null;

      if (authStatus === 'signed_in' && householdStatus === 'ready' && household) {
        try {
          cloudState = await loadCloudHouseholdState(household);
        } catch (error) {
          console.warn('Could not load cloud household state.', error);
          // Never show raw Supabase/Postgres error text to the user — it can leak
          // internal table/column names. The raw error is still logged above.
          cloudLoadError = 'Could not load this household from the cloud right now.';
        }
      }

      if (recoverableLocalState) {
        if (authStatus === 'signed_in' && householdStatus === 'ready' && household && cloudState?.children.length) {
          // recoverableLocalState may be from today (a same-device task toggle
          // whose cloud write is still in flight or failed silently) or from a
          // previous day (stale, cloud should fully win). Only merge same-day
          // completions in so a local checkmark doesn't silently revert.
          const isLocalFromToday = recoverableLocalState.lastReset === new Date().toDateString();
          const nextChildren = isLocalFromToday
            ? mergeTodaysCompletions(cloudState.children, recoverableLocalState.children)
            : cloudState.children;
          if (isMounted) {
            setChildren(nextChildren);
            setHomeScene(cloudState.homeScene);
            setSetupComplete(cloudState.children.length > 0);
            setView(cloudState.children.length > 0 ? 'home' : 'setup');
            lastSyncedConfigRef.current = serializeHouseholdConfig({
              children: cloudState.children,
              homeScene: cloudState.homeScene,
              setupComplete: cloudState.children.length > 0,
            });
            lastSyncedDateRef.current = getLocalProgressDate(new Date());
            configSyncInFlightRef.current = null;
            shouldSyncFirstConfigRef.current = false;
            setIsReady(true);
          }
          return;
        }

        if (
          !cloudLoadError &&
          authStatus === 'signed_in' &&
          householdStatus === 'ready' &&
          household &&
          recoverableLocalState.children.length > 0 &&
          (cloudState?.children.length ?? 0) === 0
        ) {
          if (isMounted) {
            setChildren(recoverableLocalState.children);
            setHomeScene(recoverableLocalState.homeScene);
            setSetupComplete(recoverableLocalState.setupComplete);
            setCloudConfigSyncError(null);
            setCloudConfigSyncStatus('idle');
            setView('import');
            setIsReady(true);
          }
          return;
        }

        if (
          !cloudLoadError &&
          authStatus === 'signed_in' &&
          householdStatus === 'ready' &&
          household &&
          recoverableLocalState.children.length === 0 &&
          (cloudState?.children.length ?? 0) === 0
        ) {
          if (isMounted) {
            setBootstrapError(null);
            setChildren(createSetupChildren());
            setActiveChildId(null);
            setSetupComplete(false);
            setHomeScene(recoverableLocalState.homeScene);
            setCloudConfigSyncError(null);
            setCloudConfigSyncStatus('idle');
            setView('recovery');
            setIsReady(true);
          }
          return;
        }

        const today = new Date().toDateString();
        const todayIso = getLocalProgressDate(new Date());
        const yesterdayIso = getLocalProgressDate(new Date(Date.now() - 86_400_000));
        if (recoverableLocalState.lastReset !== today) {
          const reset = recoverableLocalState.children.map((c: Child) => {
            // Reset task completions for the new day.
            const updated = {
              ...c,
              morning: c.morning.map((t: Child['morning'][0]) => ({ ...t, completed: false })),
              evening: c.evening.map((t: Child['evening'][0]) => ({ ...t, completed: false })),
            };
            // Reset streak if a day was missed (streakDate is neither today nor yesterday).
            if (
              c.streakDate !== undefined &&
              c.streakDate !== todayIso &&
              c.streakDate !== yesterdayIso
            ) {
              return { ...updated, streak: 0 };
            }
            return updated;
          });
          if (isMounted) {
            setChildren(reset);
          }
        } else if (isMounted) {
          setChildren(recoverableLocalState.children);
        }

        if (isMounted) {
          setBootstrapError(null);
          setCloudConfigSyncError(null);
          setCloudConfigSyncStatus('idle');
          setSetupComplete(recoverableLocalState.setupComplete);
          setHomeScene(recoverableLocalState.homeScene);
          setView(recoverableLocalState.setupComplete ? 'home' : 'setup');
          setIsReady(true);
        }
        return;
      }

      if (cloudState) {
        if (!isMounted) return;

        setBootstrapError(null);
        setCloudConfigSyncError(null);
        setCloudConfigSyncStatus(cloudState.children.length > 0 ? 'saved' : 'idle');
        setChildren(cloudState.children);
        setHomeScene(cloudState.homeScene);
        setSetupComplete(cloudState.children.length > 0);
        setView(cloudState.children.length > 0 ? 'home' : 'recovery');
        if (cloudState.children.length > 0) {
          lastSyncedConfigRef.current = serializeHouseholdConfig({
            children: cloudState.children,
            homeScene: cloudState.homeScene,
            setupComplete: true,
          });
          lastSyncedDateRef.current = getLocalProgressDate(new Date());
          configSyncInFlightRef.current = null;
          shouldSyncFirstConfigRef.current = false;
        } else if (authStatus === 'signed_in') {
          shouldSyncFirstConfigRef.current = true;
        }
        setIsReady(true);
        return;
      }

      if (cloudLoadError && authStatus === 'signed_in' && householdStatus === 'ready' && household) {
        if (!isMounted) return;

        setActiveChildId(null);
        setChildren(createSetupChildren());
        setSetupComplete(false);
        setHomeScene('bike');
        setBootstrapError(cloudLoadError);
        setCloudConfigSyncError(null);
        setCloudConfigSyncStatus('error');
        setView('bootstrap-error');
        setIsReady(true);
        return;
      }

      if (isMounted) {
        setBootstrapError(null);
        setCloudConfigSyncError(null);
        setCloudConfigSyncStatus('idle');
        setChildren(createSetupChildren());
        setActiveChildId(null);
        setSetupComplete(false);
        setHomeScene('bike');
        const nextView: AppView =
          authStatus === 'signed_in' && householdStatus === 'ready'
            ? 'recovery'
            : authStatus === 'signed_in' && householdStatus !== 'error'
              ? 'setup'
              : 'landing';
        setView(nextView);
        shouldSyncFirstConfigRef.current = authStatus === 'signed_in' && householdStatus !== 'error';
        setIsReady(true);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [authStatus, bootstrapAttempt, household, householdStatus]);

  const householdConfigSignature = useMemo(
    () => serializeHouseholdConfig({ children, homeScene, setupComplete }),
    [children, homeScene, setupComplete]
  );

  const attemptCloudConfigSync = useCallback(
    async (
      nextState: {
        children: Child[];
        homeScene: HomeScene;
        setupComplete: boolean;
      },
      options?: { force?: boolean }
    ) => {
      const nextSignature = serializeHouseholdConfig(nextState);
      const force = Boolean(options?.force);

      // If household bootstrap is still in-flight, queue the latest desired state and flush it
      // automatically once the household becomes ready. This prevents local-only edits right
      // after sign-in (common on mobile Safari) from causing split devices.
      if (!isReady || authStatus !== 'signed_in' || householdStatus !== 'ready' || !household) {
        if (authStatus === 'signed_in') {
          pendingCloudConfigSyncRef.current = {
            signature: nextSignature,
            state: nextState,
            force,
          };
          setCloudConfigSyncStatus('saving');
          setCloudConfigSyncError(null);
        }
        return false;
      }

      if (!options?.force && lastSyncedConfigRef.current === nextSignature) {
        setCloudConfigSyncStatus('saved');
        setCloudConfigSyncError(null);
        return true;
      }

      if (configSyncInFlightRef.current === nextSignature) {
        setCloudConfigSyncStatus('saving');
        return true;
      }

      shouldSyncFirstConfigRef.current = false;
      configSyncInFlightRef.current = nextSignature;
      setCloudConfigSyncStatus('saving');
      setCloudConfigSyncError(null);

      try {
        await saveHouseholdConfigToCloud({
          household,
          children: nextState.children,
          homeScene: nextState.homeScene,
          removeMissingChildren: true,
        });

        // Best-effort verification: re-read cloud state to confirm the save landed.
        // We log a warning on mismatch but treat the save as successful — the write
        // already committed and a re-read mismatch most likely means Supabase replication
        // lag, not data loss. The next polling cycle will re-sync if needed.
        try {
          const verifiedCloudState = await loadCloudHouseholdState(household);
          const expectedChildIds = [...nextState.children.map((child) => child.id)].sort();
          const actualChildIds = [...verifiedCloudState.children.map((child) => child.id)].sort();
          const childrenVerified =
            expectedChildIds.length === actualChildIds.length &&
            expectedChildIds.every((childId, index) => childId === actualChildIds[index]);
          const homeSceneVerified = verifiedCloudState.homeScene === nextState.homeScene;

          if (!childrenVerified || !homeSceneVerified) {
            console.warn(
              'Cloud save verification mismatch — the write committed but re-read differs.',
              { expectedChildIds, actualChildIds, homeSceneVerified }
            );
          }
        } catch (verifyError) {
          console.warn('Cloud save verification read failed (non-fatal).', verifyError);
        }

        lastSyncedConfigRef.current = nextSignature;
        lastSyncedDateRef.current = getLocalProgressDate(new Date());
        setCloudConfigSyncStatus('saved');
        setCloudConfigSyncError(null);
        return true;
      } catch (error) {
        setCloudConfigSyncStatus('error');
        // Never show raw Supabase/Postgres error text to the user — see cloudLoadError above.
        setCloudConfigSyncError('Could not save this family setup to the cloud yet.');
        console.warn('Could not sync household configuration to cloud.', error);
        return false;
      } finally {
        if (configSyncInFlightRef.current === nextSignature) {
          configSyncInFlightRef.current = null;
        }
      }
    },
    [authStatus, household, householdStatus, isReady]
  );

  useEffect(() => {
    if (!isReady || authStatus !== 'signed_in' || householdStatus !== 'ready' || !household) {
      lastSyncedConfigRef.current = null;
      setCloudConfigSyncStatus('idle');
      return;
    }

    if (lastSyncedConfigRef.current === null) {
      if (!shouldSyncFirstConfigRef.current) {
        lastSyncedConfigRef.current = householdConfigSignature;
        lastSyncedDateRef.current = getLocalProgressDate(new Date());
        setCloudConfigSyncStatus('saved');
        return;
      }
    }

    if (lastSyncedConfigRef.current === householdConfigSignature) {
      return;
    }

    if (configSyncInFlightRef.current === householdConfigSignature) {
      return;
    }

    void attemptCloudConfigSync({ children, homeScene, setupComplete });
  }, [
    attemptCloudConfigSync,
    authStatus,
    children,
    cloudConfigSyncRetryTick,
    homeScene,
    household,
    householdConfigSignature,
    householdStatus,
    isReady,
    setupComplete,
    view,
  ]);

  useEffect(() => {
    const pending = pendingCloudConfigSyncRef.current;
    if (!pending) return;

    if (!isReady || authStatus !== 'signed_in' || householdStatus !== 'ready' || !household) {
      return;
    }

    if (configSyncInFlightRef.current) {
      return;
    }

    // Only flush when the pending state is still different from what we believe is synced.
    if (lastSyncedConfigRef.current && lastSyncedConfigRef.current === pending.signature) {
      pendingCloudConfigSyncRef.current = null;
      setCloudConfigSyncStatus('saved');
      setCloudConfigSyncError(null);
      return;
    }

    pendingCloudConfigSyncRef.current = null;
    void attemptCloudConfigSync(pending.state, { force: pending.force }).then((ok) => {
      if (!ok) {
        // Re-queue; user can retry or the next ready transition can try again.
        pendingCloudConfigSyncRef.current = pending;
      }
    });
  }, [attemptCloudConfigSync, authStatus, household, householdStatus, isReady]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshFromCloudIfSafe = async (options?: { reason?: string }) => {
      // Always keep time-based UI fresh.
      setNow(new Date());

      // Pull remote updates when:
      // - signed in with a ready household
      // - we're not currently editing setup/import flows
      // - local state has no unsynced changes (so we won't clobber local edits)
      if (
        !isReady ||
        authStatus !== 'signed_in' ||
        householdStatus !== 'ready' ||
        !household ||
        (view !== 'home' && view !== 'setup')
      ) {
        return;
      }

      if (cloudConfigSyncStatus === 'saving' || configSyncInFlightRef.current) {
        return;
      }

      // If local diverged from last known synced signature, do not overwrite it.
      if (lastSyncedConfigRef.current && lastSyncedConfigRef.current !== householdConfigSignature) {
        return;
      }

      try {
        const cloudState = await loadCloudHouseholdState(household);
        const nextSetupComplete = cloudState.children.length > 0;
        const nextSignature = serializeHouseholdConfig({
          children: cloudState.children,
          homeScene: cloudState.homeScene,
          setupComplete: nextSetupComplete,
        });

        // No change, nothing to do.
        if (lastSyncedConfigRef.current === nextSignature) {
          return;
        }

        // Merge cloud data with local state, preferring the more-complete local
        // values for fields that are written frequently from the client:
        //   • task completions — toggled locally, cloud may lag by one sync cycle
        //     BUT only if local state is from today — stale overnight state must not
        //     override cloud's fresh new-day reset.
        //   • affirmations — local is authoritative within the session
        //   • streak / streakDate — incremented locally; cloud value may be one
        //     sync behind. Keep the higher streak to avoid rollback on refresh.
        const todayForMerge = getLocalProgressDate(new Date());
        const localCompletionIsCurrent = lastSyncedDateRef.current === todayForMerge;
        setChildren((prev) =>
          cloudState.children.map((cloudChild) => {
            const local = prev.find((c) => c.id === cloudChild.id);
            if (!local) return cloudChild;
            const mergeCompletion = (
              cloudTasks: typeof cloudChild.morning,
              localTasks: typeof local.morning,
            ) =>
              cloudTasks.map((ct) => {
                if (!localCompletionIsCurrent) return ct;
                const lt = localTasks.find((t) => t.id === ct.id);
                return lt ? { ...ct, completed: lt.completed } : ct;
              });
            // Prefer local affirmations when non-empty (guards against stale cloud overwrite).
            const mergedAffirmations =
              (local.affirmations ?? []).length > 0
                ? local.affirmations
                : cloudChild.affirmations;
            // Prefer the higher streak value and the more-recent streakDate.
            const mergedStreak = Math.max(local.streak ?? 0, cloudChild.streak ?? 0);
            const mergedStreakDate =
              local.streakDate && cloudChild.streakDate
                ? local.streakDate > cloudChild.streakDate
                  ? local.streakDate
                  : cloudChild.streakDate
                : local.streakDate ?? cloudChild.streakDate;
            return {
              ...cloudChild,
              morning: mergeCompletion(cloudChild.morning, local.morning),
              evening: mergeCompletion(cloudChild.evening, local.evening),
              affirmations: mergedAffirmations,
              streak: mergedStreak,
              streakDate: mergedStreakDate,
            };
          })
        );
        setHomeScene(cloudState.homeScene);
        setSetupComplete(nextSetupComplete);
        setView(nextSetupComplete ? 'home' : 'setup');
        setCloudConfigSyncStatus(nextSetupComplete ? 'saved' : 'idle');
        setCloudConfigSyncError(null);
        lastSyncedConfigRef.current = nextSignature;
        lastSyncedDateRef.current = getLocalProgressDate(new Date());
      } catch (error) {
        // Keep running with existing local state; cloud refresh can fail temporarily.
        console.warn('Could not refresh cloud household state.', options?.reason ?? 'unknown', error);
      }
    };

    const onFocus = () => {
      // iOS Safari is inconsistent about focus events; we listen to multiple signals.
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return;
      }
      void refreshFromCloudIfSafe({ reason: 'focus' });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return;
      }
      void refreshFromCloudIfSafe({ reason: 'visibilitychange' });
    };

    const onPageShow = () => {
      void refreshFromCloudIfSafe({ reason: 'pageshow' });
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    // Background polling + realtime subscriptions are valuable in production, but they
    // create long-lived timers/sockets that make unit tests flaky unless every test
    // unmounts. We disable them under Vitest and rely on focus/pageshow refresh tests instead.
    const enableBackgroundSync = !import.meta.env.VITEST;

    const pollId = enableBackgroundSync
      ? window.setInterval(() => {
          void refreshFromCloudIfSafe({ reason: 'poll' });
        }, 15_000)
      : null;

    const supabase = enableBackgroundSync ? getSupabaseClient() : null;
    const canUseRealtime = Boolean(supabase && typeof supabase.channel === 'function');
    const channel =
      canUseRealtime && authStatus === 'signed_in' && householdStatus === 'ready' && household
        ? supabase
            .channel(`household:${household.id}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'households', filter: `id=eq.${household.id}` },
              () => void refreshFromCloudIfSafe({ reason: 'realtime:households' })
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'child_profiles', filter: `household_id=eq.${household.id}` },
              () => void refreshFromCloudIfSafe({ reason: 'realtime:child_profiles' })
            )
            // Routines and tasks don't include household_id, so we can't filter cheaply.
            // MVP approach: listen and refresh on any routine/task change; scoped channels keep this manageable.
            .on('postgres_changes', { event: '*', schema: 'public', table: 'routines' }, () =>
              void refreshFromCloudIfSafe({ reason: 'realtime:routines' })
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_tasks' }, () =>
              void refreshFromCloudIfSafe({ reason: 'realtime:routine_tasks' })
            )
            .subscribe()
        : null;

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      if (pollId) {
        window.clearInterval(pollId);
      }
      if (channel && supabase && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [
    authStatus,
    cloudConfigSyncStatus,
    household,
    householdConfigSignature,
    householdStatus,
    isReady,
    view,
  ]);

  // Persist
  useEffect(() => {
    if (!isReady || authStatus !== 'signed_in') return;

    if (skipLocalPersistenceRef.current) {
      return;
    }

    try {
      saveLocalAppState({
        children,
        homeScene,
        lastReset: new Date().toDateString(),
        setupComplete,
      }, user?.id ? { userId: user.id } : undefined);
    } catch (error) {
      console.warn('Could not save app state to local storage.', error);
    }
  }, [authStatus, children, homeScene, isReady, setupComplete, user?.id]);

  const activeChild = children.find((c) => c.id === activeChildId);

  /** Toggle a task by kidId + routine + taskId */
  const handleToggleTask = useCallback(
    (kidId: string, routine: RoutineType, taskId: string) => {
      const child = children.find((c) => c.id === kidId);
      if (!child) return;

      const toggledAt = new Date().toISOString();
      const today = getLocalProgressDate(new Date());
      const nextRoutine = child[routine].map((task) => {
        if (task.id !== taskId) return task;
        return { ...task, completed: !task.completed };
      });
      const completed = nextRoutine.find((t) => t.id === taskId)?.completed ?? false;
      const routineCompleted = nextRoutine.length > 0 && nextRoutine.every((t) => t.completed);

      // Increment streak when the routine becomes fully complete — but only
      // once per calendar day per child (guard via streakDate).
      const streakAlreadyCounted = child.streakDate === today;
      const shouldIncrementStreak = routineCompleted && !streakAlreadyCounted;

      setChildren((prev) =>
        prev.map((c) => {
          if (c.id !== kidId) return c;
          const updated: typeof c = { ...c, [routine]: nextRoutine };
          if (shouldIncrementStreak) {
            return { ...updated, streak: (c.streak ?? 0) + 1, streakDate: today };
          }
          return updated;
        })
      );

      if (authStatus === 'signed_in' && householdStatus === 'ready' && household) {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        const progressRepository = new SupabaseProgressRepository(supabase);
        const progressDate = getLocalProgressDate(new Date());

        void progressRepository
          .upsertRoutineProgress({ childProfileId: kidId, routineType: routine, progressDate, completedAt: null })
          .then(async (dailyRoutineProgress) => {
            await progressRepository.setTaskCompletion({
              dailyRoutineProgressId: dailyRoutineProgress.id,
              routineTaskId: taskId,
              completed,
              completedAt: completed ? toggledAt : null,
            });
            await progressRepository.upsertRoutineProgress({
              childProfileId: kidId,
              routineType: routine,
              progressDate,
              completedAt: routineCompleted ? new Date().toISOString() : null,
            });
          })
          .catch((error) => {
            console.warn('Could not sync routine progress to cloud.', error);
          });
      }
    },
    [authStatus, children, household, householdStatus]
  );

  const handleSetMood = useCallback((kidId: string, dayIdx: number, emoji: string) => {
    setChildren((prev) =>
      prev.map((k) =>
        k.id !== kidId
          ? k
          : {
              ...k,
              moods: (k.moods?.length === 7 ? k.moods : DEFAULT_MOODS).map((m, i) =>
                i === dayIdx ? { ...m, emoji } : m
              ),
            }
      )
    );
  }, []);

  const handleSaveNote = useCallback((kidId: string, dayIdx: number, note: string) => {
    setChildren((prev) =>
      prev.map((k) =>
        k.id !== kidId ? k : {
          ...k,
          moods: (k.moods?.length === 7 ? k.moods : DEFAULT_MOODS).map((m, i) =>
            i === dayIdx ? { ...m, note } : m
          ),
        }
      )
    );
  }, []);

  const handleKidFaveAffirmation = useCallback((kidId: string, text: string) => {
    setChildren((prev) =>
      prev.map((k) =>
        k.id !== kidId ? k : {
          ...k,
          affirmations: (k.affirmations ?? []).includes(text)
            ? (k.affirmations ?? [])
            : [...(k.affirmations ?? []), text],
        }
      )
    );
  }, []);

  const handleKidUnfaveAffirmation = useCallback((kidId: string, text: string) => {
    setChildren((prev) =>
      prev.map((k) =>
        k.id !== kidId ? k : {
          ...k,
          affirmations: (k.affirmations ?? []).filter((a) => a !== text),
        }
      )
    );
  }, []);

  // ── Theme detection ────────────────────────────────────────
  // Kid-picker greeting/backdrop theme, schedule-aware across all children
  // (not a fixed clock-hour boundary — see getHouseholdTheme's doc comment).
  const kidTheme = getHouseholdTheme(children, now);

  if (!isReady) {
    return null;
  }

  // Hard paywall: every signed-in household needs an active/trialing
  // subscription to use anything past this point. Only gates the
  // cloud-synced path — signed-out local-only sessions have no household
  // row to check a subscription against, so they're unaffected.
  if (
    authStatus === 'signed_in' &&
    householdStatus === 'ready' &&
    household &&
    household.subscriptionStatus !== 'active' &&
    household.subscriptionStatus !== 'trialing'
  ) {
    return <PaywallScreen subscriptionStatus={household.subscriptionStatus} onSignOut={() => void signOut()} />;
  }

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('account')} />;
  }

  if (view === 'account') {
    return <AccountEntryScreen onBack={() => setView('landing')} />;
  }

  if (view === 'bootstrap-error') {
    return (
      <HouseholdLoadErrorScreen
        error={bootstrapError ?? 'Could not load this household right now.'}
        onRetry={() => {
          setBootstrapError(null);
          setIsReady(false);
          setBootstrapAttempt((count) => count + 1);
        }}
      />
    );
  }

  if (view === 'import') {
    return (
      <ImportFamilySetupScreen
        isImporting={isImporting}
        error={importError}
        onImport={() => {
          if (!household) return;

          setIsImporting(true);
          setImportError(null);

          void importLocalFamilyToCloud({
            household,
            children,
            homeScene,
          })
            .then(async () => {
              const cloudState = await loadCloudHouseholdState(household);
              setChildren(cloudState.children);
              setHomeScene(cloudState.homeScene);
              setSetupComplete(cloudState.children.length > 0);
              setView(cloudState.children.length > 0 ? 'home' : 'setup');
              setCloudConfigSyncError(null);
              setCloudConfigSyncStatus(cloudState.children.length > 0 ? 'saved' : 'idle');
              lastSyncedConfigRef.current = serializeHouseholdConfig({
                children: cloudState.children,
                homeScene: cloudState.homeScene,
                setupComplete: cloudState.children.length > 0,
              });
              lastSyncedDateRef.current = getLocalProgressDate(new Date());
              configSyncInFlightRef.current = null;
              shouldSyncFirstConfigRef.current = false;
            })
            .catch((error) => {
              console.warn('Could not import local family setup to cloud.', error);
              // Never show raw Supabase/Postgres error text to the user — see cloudLoadError above.
              setImportError('Could not import this family setup right now.');
            })
            .finally(() => {
              setIsImporting(false);
            });
        }}
        onStartFresh={() => {
          clearLocalAppState(user?.id ? { userId: user.id } : undefined);
          setActiveChildId(null);
          setChildren(createSetupChildren());
          setSetupComplete(false);
          setHomeScene('bike');
          setCloudConfigSyncError(null);
          setCloudConfigSyncStatus('idle');
          setView('setup');
          setImportError(null);
          shouldSyncFirstConfigRef.current = true;
        }}
      />
    );
  }

  if (view === 'recovery') {
    return (
      <ExistingFamilyRecoveryScreen
        onStartFresh={() => {
          setChildren(createSetupChildren());
          setSetupComplete(false);
          setHomeScene('bike');
          setCloudConfigSyncStatus('idle');
          setView('setup');
          shouldSyncFirstConfigRef.current = true;
        }}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (view === 'setup') {
    return (
      <Suspense fallback={<ViewLoadingFallback title="Opening setup" />}>
        <InitialSetup
          children={children}
          signedInEmail={authStatus === 'signed_in' ? user?.email ?? null : null}
          onSignOut={authStatus === 'signed_in' ? () => void signOut() : undefined}
          cloudSyncStatus={cloudConfigSyncStatus}
          cloudSyncError={cloudConfigSyncError}
          onRetryCloudSync={
            authStatus === 'signed_in'
              ? () => {
                  void attemptCloudConfigSync({ children, homeScene, setupComplete }, { force: true }).then(
                    (didSync) => {
                      if (!didSync) {
                        setCloudConfigSyncRetryTick((count) => count + 1);
                      }
                    }
                  );
                }
              : undefined
          }
          onChange={(nextChildren) => {
            setChildren(nextChildren);
            if (authStatus === 'signed_in') {
              void attemptCloudConfigSync({
                children: nextChildren,
                homeScene,
                setupComplete: false,
              });
            }
          }}
          onComplete={(configuredChildren) => {
            setChildren(configuredChildren);
            setCloudConfigSyncError(null);
            setCloudConfigSyncStatus(authStatus === 'signed_in' ? 'saving' : 'idle');
            setSetupComplete(true);
            setView('home');
            if (authStatus === 'signed_in') {
              void attemptCloudConfigSync(
                {
                  children: configuredChildren,
                  homeScene,
                  setupComplete: true,
                },
                { force: true }
              );
            }
          }}
        />
      </Suspense>
    );
  }

  if (view === 'routine' && activeChild) {
    return (
      <KidApp
        kid={activeChild}
        theme={activeRoutine}
        onBack={() => setView('home')}
        onToggleTask={handleToggleTask}
        onSetMood={handleSetMood}
        onSaveNote={handleSaveNote}
        onAddAffirmation={handleKidFaveAffirmation}
        onRemoveAffirmation={handleKidUnfaveAffirmation}
      />
    );
  }

  if (view === 'parent' || view === 'advanced-settings') {
    return (
      <Suspense fallback={<ViewLoadingFallback title="Opening settings" />}>
        <ParentSettings
          children={children}
          homeScene={homeScene}
          cloudConfigSyncStatus={cloudConfigSyncStatus}
          cloudConfigSyncError={cloudConfigSyncError}
          onRetryCloudConfigSync={() => {
            setCloudConfigSyncError(null);
            setCloudConfigSyncRetryTick((count) => count + 1);
          }}
          onChange={setChildren}
          onHomeSceneChange={setHomeScene}
          onRestartSetup={restartSetup}
          onResetAppData={resetToFreshSetup}
          onBack={() => setView('home')}
        />
      </Suspense>
    );
  }

  return (
    <KidHome
      kids={children}
      theme={kidTheme}
      onPick={(id) => {
        const freshNow = new Date();
        setNow(freshNow);
        setActiveChildId(id);
        const child = children.find((c) => c.id === id);
        if (child) setActiveRoutine(getDisplayRoutine(child, freshNow));
        setView('routine');
      }}
      onParent={() => setView('parent')}
    />
  );
};

export default Index;
