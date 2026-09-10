import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Index from "@/pages/Index";
import { CURRENT_LOCAL_APP_STATE_VERSION } from "@/lib/storage/local-app-state";
import type { Child } from "@/lib/types";

const authState = {
  configured: true,
  status: "signed_out",
  user: null,
  householdStatus: "idle",
  household: null,
  error: null,
  clearError: vi.fn(),
  sendEmailLink: vi.fn(),
  retryHousehold: vi.fn(),
  signOut: vi.fn(),
};

const { loadCloudHouseholdState } = vi.hoisted(() => ({
  loadCloudHouseholdState: vi.fn(),
}));
const { importLocalFamilyToCloud } = vi.hoisted(() => ({
  importLocalFamilyToCloud: vi.fn(),
}));
const { saveHouseholdConfigToCloud } = vi.hoisted(() => ({
  saveHouseholdConfigToCloud: vi.fn(),
}));
const { deleteCloudHousehold } = vi.hoisted(() => ({
  deleteCloudHousehold: vi.fn(),
}));
const { getSupabaseClient, upsertRoutineProgress, setTaskCompletion } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  upsertRoutineProgress: vi.fn(),
  setTaskCompletion: vi.fn(),
}));

vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/data/cloud-household-state", () => ({
  loadCloudHouseholdState,
}));
vi.mock("@/lib/data/local-to-cloud-import", () => ({
  importLocalFamilyToCloud,
}));
vi.mock("@/lib/data/cloud-household-write", () => ({
  saveHouseholdConfigToCloud,
}));
vi.mock("@/lib/data/delete-cloud-household", () => ({
  deleteCloudHousehold,
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient,
}));
vi.mock("@/lib/data/supabase-progress-repository", () => ({
  SupabaseProgressRepository: class {
    upsertRoutineProgress = upsertRoutineProgress;
    setTaskCompletion = setTaskCompletion;
  },
}));

const today = () => new Date().toDateString();

const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toDateString();
};

// KidHome replaces ChildSelector as the main home screen
vi.mock("@/components/KidHome", () => ({
  KidHome: ({
    kids,
    onPick,
    onParent,
  }: {
    kids: Array<{ id: string; name: string }>;
    onPick: (id: string) => void;
    onParent: () => void;
  }) => (
    <div>
      <div data-testid="child-count">{kids.length}</div>
      <button type="button" onClick={() => onPick(kids[0].id)}>
        select-first-child
      </button>
      <button type="button" onClick={onParent}>
        open-settings
      </button>
    </div>
  ),
}));

// KidApp replaces RoutineView — note the new onToggleTask signature (kidId, routine, taskId)
vi.mock("@/components/KidApp", () => ({
  KidApp: ({
    kid,
    theme,
    onToggleTask,
    onBack,
  }: {
    kid: { id: string; name: string; morning: Array<{ id: string; completed: boolean }>; evening: Array<{ id: string; completed: boolean }> };
    theme: "morning" | "evening";
    onToggleTask: (kidId: string, routine: "morning" | "evening", taskId: string) => void;
    onBack: () => void;
  }) => (
    <div>
      <div data-testid="active-child">{kid.name}</div>
      <div data-testid="active-routine">{theme}</div>
      <div data-testid="first-task-completed">
        {String(kid[theme][0]?.completed ?? false)}
      </div>
      <button type="button" onClick={() => onToggleTask(kid.id, theme, kid[theme][0].id)}>
        toggle-first-task
      </button>
      <button type="button" onClick={onBack}>
        back-home
      </button>
    </div>
  ),
}));

// ParentSettings is the primary admin/settings screen, reached via the parent hold gesture
vi.mock("@/components/ParentSettings", () => ({
  ParentSettings: ({
    onBack,
    onRestartSetup,
    onResetAppData,
    cloudConfigSyncError,
    onRetryCloudConfigSync,
  }: {
    onBack: () => void;
    onRestartSetup: () => void;
    onResetAppData: () => void;
    cloudConfigSyncError?: string | null;
    onRetryCloudConfigSync?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onBack}>
        back-home
      </button>
      <button type="button" onClick={onRestartSetup}>
        restart-setup
      </button>
      <button type="button" onClick={onResetAppData}>
        reset-app-data
      </button>
      <div data-testid="parent-cloud-sync-error">{cloudConfigSyncError ?? ""}</div>
      <button type="button" onClick={onRetryCloudConfigSync}>
        retry-parent-cloud-sync
      </button>
    </div>
  ),
}));

vi.mock("@/components/InitialSetup", () => ({
  InitialSetup: ({
    children,
    cloudSyncStatus,
    cloudSyncError,
    onRetryCloudSync,
    onChange,
    onComplete,
  }: {
    children: Child[];
    cloudSyncStatus?: string;
    cloudSyncError?: string | null;
    onRetryCloudSync?: () => void;
    onChange?: (children: Child[]) => void;
    onComplete: (children: Child[]) => void;
  }) => (
    <div>
      <div data-testid="setup-child-count">{children.length}</div>
      <div data-testid="setup-cloud-sync-status">{cloudSyncStatus ?? ""}</div>
      <div data-testid="setup-cloud-sync-error">{cloudSyncError ?? ""}</div>
      <button type="button" onClick={onRetryCloudSync}>
        retry-setup-cloud-sync
      </button>
      <button
        type="button"
        onClick={() =>
          onChange?.([
            {
              id: "draft-1",
              name: "Elie",
              morning: [{ id: "m1", title: "Brush teeth", icon: "brush", completed: false }],
              evening: [{ id: "e1", title: "Put on pajamas", icon: "shirt", completed: false }],
            },
          ])
        }
      >
        sync-draft-child
      </button>
      <button
        type="button"
        onClick={() =>
          onComplete([
            {
              id: "1",
              name: "Lily",
              morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
              evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
            },
          ])
        }
      >
        finish-setup
      </button>
    </div>
  ),
}));

vi.mock("@/components/ExistingFamilyRecoveryScreen", () => ({
  ExistingFamilyRecoveryScreen: ({
    onStartFresh,
    onSignOut,
  }: {
    onStartFresh: () => void;
    onSignOut: () => void;
  }) => (
    <div>
      <div data-testid="existing-family-recovery-screen">existing-family-recovery</div>
      <button type="button" onClick={onStartFresh}>
        recovery-start-fresh
      </button>
      <button type="button" onClick={onSignOut}>
        recovery-sign-out
      </button>
    </div>
  ),
}));

vi.mock("@/components/AccountEntryScreen", () => ({
  AccountEntryScreen: () => (
    <div>
      <div data-testid="account-entry-screen">account-entry</div>
    </div>
  ),
}));

vi.mock("@/pages/LandingPage", () => ({
  LandingPage: ({ onGetStarted }: { onGetStarted: () => void }) => (
    <div>
      <div data-testid="landing-page">landing</div>
      <button onClick={onGetStarted}>get-started</button>
    </div>
  ),
}));

vi.mock("@/components/HouseholdLoadErrorScreen", () => ({
  HouseholdLoadErrorScreen: ({
    error,
    onRetry,
  }: {
    error: string;
    onRetry: () => void;
  }) => (
    <div>
      <div data-testid="household-load-error-screen">household-load-error</div>
      <div data-testid="household-load-error">{error}</div>
      <button type="button" onClick={onRetry}>
        retry-household-load
      </button>
    </div>
  ),
}));

vi.mock("@/components/ImportFamilySetupScreen", () => ({
  ImportFamilySetupScreen: ({
    onImport,
    onStartFresh,
    isImporting,
    error,
  }: {
    onImport: () => void;
    onStartFresh: () => void;
    isImporting: boolean;
    error?: string | null;
  }) => (
    <div>
      <div data-testid="import-family-setup-screen">import-family-setup</div>
      <div data-testid="import-state">{String(isImporting)}</div>
      <div data-testid="import-error">{error ?? ""}</div>
      <button type="button" onClick={onImport}>
        import-family-setup
      </button>
      <button type="button" onClick={onStartFresh}>
        start-fresh-instead
      </button>
    </div>
  ),
}));

const createStoredState = (completed: boolean, lastReset: string) => ({
  children: [
    {
      id: "1",
      name: "Lily",
      morning: [
        { id: "m1", title: "Make bed", icon: "bed", completed },
        { id: "m2", title: "Brush teeth", icon: "brush", completed: false },
      ],
      evening: [],
    },
  ],
  lastReset,
});

describe("Index", () => {
  beforeEach(() => {
    localStorage.clear();
    authState.configured = true;
    authState.status = "signed_out";
    authState.user = null;
    authState.householdStatus = "idle";
    authState.household = null;
    authState.error = null;
    loadCloudHouseholdState.mockReset();
    importLocalFamilyToCloud.mockReset();
    saveHouseholdConfigToCloud.mockReset();
    saveHouseholdConfigToCloud.mockResolvedValue(undefined);
    deleteCloudHousehold.mockReset();
    deleteCloudHousehold.mockReset();
    getSupabaseClient.mockReset();
    upsertRoutineProgress.mockReset();
    setTaskCompletion.mockReset();
    getSupabaseClient.mockReturnValue({});
    upsertRoutineProgress.mockResolvedValue({ id: "progress-1" });
    setTaskCompletion.mockResolvedValue({ id: "task-progress-1" });
    authState.clearError.mockReset();
    authState.sendEmailLink.mockReset();
    authState.retryHousehold.mockReset();
    authState.signOut.mockReset();
  });

  it("refreshes the signed-in home view from cloud on focus when there are no local unsynced changes", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "household-1",
      name: "Test Family",
      timezone: "UTC",
      homeScene: "bike",
      createdByUserId: "user-1",
      createdAt: "now",
      updatedAt: "now",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };

    const firstCloudChildren: Child[] = [
      {
        id: "child-1",
        name: "Child 1",
        morning: [],
        evening: [],
        avatarSeed: "child-1",
      } as Child,
      {
        id: "child-2",
        name: "Child 2",
        morning: [],
        evening: [],
        avatarSeed: "child-2",
      } as Child,
    ];

    const secondCloudChildren: Child[] = [
      ...firstCloudChildren,
      {
        id: "child-3",
        name: "Child 3",
        morning: [],
        evening: [],
        avatarSeed: "child-3",
      } as Child,
    ];

    loadCloudHouseholdState.mockResolvedValueOnce({ homeScene: "bike", children: firstCloudChildren });
    loadCloudHouseholdState.mockResolvedValueOnce({ homeScene: "bike", children: secondCloudChildren });

    render(<Index />);

    // Initial bootstrap should render home with 2 children.
    await waitFor(() => {
      expect(screen.getByTestId("child-count").textContent).toBe("2");
    });

    fireEvent.focus(window);

    await waitFor(() => {
      expect(screen.getByTestId("child-count").textContent).toBe("3");
    });
  });

  // Background polling is disabled under Vitest to keep tests stable; focus/pageshow
  // refresh is still covered in the test suite.

  it("prefers cloud progress when local storage is from a previous day", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [
            { id: "m1", title: "Make bed", icon: "bed", completed: true },
            { id: "m2", title: "Brush teeth", icon: "brush", completed: false },
          ],
          evening: [],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify(createStoredState(true, yesterday()))
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "select-first-child" }));

    expect(await screen.findByTestId("active-child")).toHaveTextContent("Lily");
    expect(screen.getByTestId("first-task-completed")).toHaveTextContent("true");
  });

  it("does not silently discard a same-day local completion when cloud hasn't caught up yet", async () => {
    // Simulates toggleTask's fire-and-forget cloud write failing/dropping:
    // local storage (today) says the task is done, cloud still says it isn't.
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [
            { id: "m1", title: "Make bed", icon: "bed", completed: false },
            { id: "m2", title: "Brush teeth", icon: "brush", completed: false },
          ],
          evening: [],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify(createStoredState(true, today()))
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "select-first-child" }));

    expect(await screen.findByTestId("active-child")).toHaveTextContent("Lily");
    expect(screen.getByTestId("first-task-completed")).toHaveTextContent("true");
  });

  it("persists task toggles back to localStorage for the current day", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [
            { id: "m1", title: "Make bed", icon: "bed", completed: false },
            { id: "m2", title: "Brush teeth", icon: "brush", completed: false },
          ],
          evening: [],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify(createStoredState(false, today()))
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "select-first-child" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle-first-task" }));

    await waitFor(() => {
      expect(screen.getByTestId("first-task-completed")).toHaveTextContent("true");
    });

    const stored = JSON.parse(localStorage.getItem("little_loops_data::user:user-1") ?? "{}");
    expect(stored.version).toBe(CURRENT_LOCAL_APP_STATE_VERSION);
    expect(stored.lastReset).toBe(today());
    expect(stored.children[0].morning[0].completed).toBe(true);
  });

  it("opens the due routine for the active child view", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        children: [
          {
            id: "1",
            name: "Lily",
            morning: [
              { id: "m1", title: "Make bed", icon: "bed", completed: false },
            ],
            evening: [
              { id: "e1", title: "Go to bed", icon: "moon-star", completed: false },
            ],
            schedule: {
              morning: { start: "00:00", end: "00:01" },
              evening: { start: "00:02", end: "23:59" },
            },
          },
        ],
      })
    );
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
          schedule: {
            morning: { start: "00:00", end: "00:01" },
            evening: { start: "00:02", end: "23:59" },
          },
        },
      ],
    });

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "select-first-child" }));

    expect(screen.getByTestId("active-routine")).toHaveTextContent("evening");
  });

  it("shows the landing page when there is no saved data and no signed-in parent", async () => {
    render(<Index />);

    expect(await screen.findByTestId("landing-page")).toBeInTheDocument();
  });

  it("keeps signed-out users on the landing page even when stale local data exists", async () => {
    localStorage.setItem(
      "little_loops_data",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
        homeScene: "school",
      })
    );

    render(<Index />);

    expect(await screen.findByTestId("landing-page")).toBeInTheDocument();
    expect(screen.queryByTestId("child-count")).toBeNull();
  });

  it("shows the paywall instead of the app for a signed-in household without an active subscription", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "none",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
        },
      ],
    });

    render(<Index />);

    expect(await screen.findByTestId("paywall-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("existing-family-recovery-screen")).toBeNull();
  });

  it("shows recovery first on a fresh signed-in device with an empty household", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });

    render(<Index />);

    expect(await screen.findByTestId("existing-family-recovery-screen")).toBeInTheDocument();
  });

  it("hydrates cloud household data on a fresh signed-in device", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
        },
      ],
    });

    render(<Index />);

    expect(await screen.findByTestId("child-count")).toHaveTextContent("1");
    expect(loadCloudHouseholdState).toHaveBeenCalledWith(authState.household);
  });

  it("falls back to cached local household data when signed-in cloud loading fails", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockRejectedValue(new Error("Network offline"));
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
        homeScene: "school",
      })
    );

    render(<Index />);

    expect(await screen.findByTestId("child-count")).toHaveTextContent("1");
    expect(screen.queryByTestId("household-load-error-screen")).not.toBeInTheDocument();
  });

  it("shows the recovery screen after retry when signed-in cloud loading fails and no local family data exists", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState
      .mockRejectedValueOnce(new Error("Supabase timeout"))
      .mockResolvedValueOnce({
        homeScene: "kite",
        children: [],
      });

    render(<Index />);

    expect(await screen.findByTestId("household-load-error-screen")).toBeInTheDocument();
    // The raw error ("Supabase timeout") must never reach the UI — only a generic message.
    expect(screen.getByTestId("household-load-error")).toHaveTextContent(
      "Could not load this household from the cloud right now.",
    );
    expect(screen.getByTestId("household-load-error")).not.toHaveTextContent("Supabase timeout");

    fireEvent.click(screen.getByRole("button", { name: "retry-household-load" }));

    expect(await screen.findByTestId("existing-family-recovery-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("setup-child-count")).not.toBeInTheDocument();
  });

  it("prefers cloud household state over stale local cache for signed-in households", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Cloud Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: true }],
          evening: [],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
      })
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "select-first-child" }));

    expect(await screen.findByTestId("active-child")).toHaveTextContent("Cloud Lily");
    expect(screen.getByTestId("first-task-completed")).toHaveTextContent("true");
  });

  it("shows an import decision when a signed-in device has local setup and cloud is empty", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
        homeScene: "school",
      })
    );

    render(<Index />);

    expect(await screen.findByTestId("import-family-setup-screen")).toBeInTheDocument();
  });

  it("imports local setup into the cloud household when requested", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    importLocalFamilyToCloud.mockResolvedValue(undefined);
    loadCloudHouseholdState.mockResolvedValueOnce({
      homeScene: "kite",
      children: [],
    }).mockResolvedValueOnce({
      homeScene: "school",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
        homeScene: "school",
      })
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "import-family-setup" }));

    await waitFor(() => {
      expect(importLocalFamilyToCloud).toHaveBeenCalledWith(
        expect.objectContaining({
          household: authState.household,
          homeScene: "school",
        })
      );
    });

    expect(await screen.findByTestId("child-count")).toHaveTextContent("1");
  });

  it("syncs configuration changes to cloud after signed-in setup is completed", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    saveHouseholdConfigToCloud.mockResolvedValue(undefined);

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(await screen.findByRole("button", { name: "finish-setup" }));

    await waitFor(() => {
      expect(saveHouseholdConfigToCloud).toHaveBeenCalledWith(
        expect.objectContaining({
          household: authState.household,
          removeMissingChildren: true,
        })
      );
    });
  });

  it("syncs signed-in draft child creation to cloud before setup is completed", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    saveHouseholdConfigToCloud.mockResolvedValue(undefined);

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(await screen.findByRole("button", { name: "sync-draft-child" }));

    await waitFor(() => {
      expect(saveHouseholdConfigToCloud).toHaveBeenCalledWith(
        expect.objectContaining({
          household: authState.household,
          children: [
            expect.objectContaining({
              id: "draft-1",
              name: "Elie",
            }),
          ],
          removeMissingChildren: true,
        })
      );
    });
  });

  it("does not treat a failed cloud config write as already synced", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    saveHouseholdConfigToCloud
      .mockRejectedValueOnce(new Error("Row-level security blocked child_profiles insert"))
      .mockResolvedValueOnce(undefined);

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(await screen.findByRole("button", { name: "sync-draft-child" }));

    await waitFor(() => {
      expect(saveHouseholdConfigToCloud.mock.calls.length).toBeGreaterThan(1);
    });

    expect(
      saveHouseholdConfigToCloud.mock.calls.some(
        ([input]) =>
          input.children?.some((child: { name?: string }) => child.name === "Elie")
      )
    ).toBe(true);

    expect(screen.getByRole("button", { name: "retry-setup-cloud-sync" })).toBeInTheDocument();
  });

  it("treats a successful cloud save as synced even when the verification re-read is stale", async () => {
    // The verification step is now non-blocking: if the save succeeds but the re-read
    // returns stale data (common under Supabase replication lag), we log a warning and
    // still mark the save as successful. We never surface this as a user-facing error.
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    // Re-read returns stale/empty data — simulates replication lag.
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    saveHouseholdConfigToCloud.mockResolvedValue(undefined);

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(await screen.findByRole("button", { name: "sync-draft-child" }));

    // The sync should complete as "saved" — no error shown to the user.
    await waitFor(() => {
      expect(screen.getByTestId("setup-cloud-sync-status")).toHaveTextContent("saved");
    });
    // The sync error should be empty (no error content surfaced to the user).
    expect(screen.getByTestId("setup-cloud-sync-error")).toHaveTextContent("");
  });

  it("lets a parent manually retry household setup cloud sync from setup", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    saveHouseholdConfigToCloud.mockResolvedValue(undefined);

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(screen.getByRole("button", { name: "retry-setup-cloud-sync" }));

    await waitFor(() => {
      expect(saveHouseholdConfigToCloud).toHaveBeenCalled();
    });
  });

  it("routes back to import when the current signed-in setup has in-memory children but cloud is still empty", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });

    const view = render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(await screen.findByRole("button", { name: "sync-draft-child" }));

    authState.householdStatus = "loading";
    view.rerender(<Index />);

    authState.householdStatus = "ready";
    view.rerender(<Index />);

    expect(await screen.findByTestId("import-family-setup-screen")).toBeInTheDocument();
  });

  it("does not jump into empty setup while a signed-in household is still idle", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "idle";
    authState.household = null;

    const view = render(<Index />);

    expect(screen.queryByTestId("setup-child-count")).not.toBeInTheDocument();
    expect(screen.queryByTestId("existing-family-recovery-screen")).not.toBeInTheDocument();

    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });

    view.rerender(<Index />);

    expect(await screen.findByTestId("existing-family-recovery-screen")).toBeInTheDocument();
  });

  it("lets a parent start fresh instead of importing existing local setup", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
      })
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "start-fresh-instead" }));

    expect(await screen.findByTestId("setup-child-count")).toHaveTextContent("0");
  });

  it("syncs signed-in task toggles to cloud-backed progress", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [],
          schedule: {
            morning: { start: "00:00", end: "23:59" },
            evening: { start: "00:00", end: "00:01" },
          },
        },
      ],
    });

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "select-first-child" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle-first-task" }));

    await waitFor(() => {
      expect(upsertRoutineProgress).toHaveBeenCalled();
      expect(setTaskCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyRoutineProgressId: "progress-1",
          routineTaskId: "m1",
          completed: true,
        })
      );
    });
  });

  it("shows a dedicated recovery screen when a signed-in household is empty in this browser context", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });

    render(<Index />);

    expect(await screen.findByTestId("existing-family-recovery-screen")).toBeInTheDocument();
  });

  it("shows the recovery screen instead of setup when a signed-in browser only has an empty local shell", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        version: CURRENT_LOCAL_APP_STATE_VERSION,
        children: [],
        homeScene: "bike",
        lastReset: today(),
        setupComplete: false,
      })
    );

    render(<Index />);

    expect(await screen.findByTestId("existing-family-recovery-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("setup-child-count")).toBeNull();
  });

  it("lets a parent intentionally continue into fresh setup from the recovery screen", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));

    expect(await screen.findByTestId("setup-child-count")).toHaveTextContent("0");
  });

  it("routes to import when saved local family data is incomplete but cloud is empty", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: false,
      })
    );

    render(<Index />);

    expect(await screen.findByTestId("import-family-setup-screen")).toBeInTheDocument();
  });

  it("hydrates legacy unversioned local data", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify(createStoredState(false, today()))
    );

    render(<Index />);

    expect(await screen.findByTestId("import-family-setup-screen")).toBeInTheDocument();
  });

  it("completes first-run setup and persists the configured routines", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [],
    });
    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "recovery-start-fresh" }));
    fireEvent.click(await screen.findByRole("button", { name: "finish-setup" }));

    expect(await screen.findByTestId("child-count")).toHaveTextContent("1");

    const stored = JSON.parse(localStorage.getItem("little_loops_data::user:user-1") ?? "{}");
    expect(stored.setupComplete).toBe(true);
    expect(stored.children).toHaveLength(1);
    expect(stored.children[0].morning[0].title).toBe("Make bed");
  });

  it("lets a parent clear app data from Parent Settings", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    deleteCloudHousehold.mockResolvedValue(undefined);
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
        homeScene: "kite",
      })
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "open-settings" }));
    fireEvent.click(await screen.findByRole("button", { name: "reset-app-data" }));

    await waitFor(() => {
      expect(deleteCloudHousehold).toHaveBeenCalledWith(authState.household);
      expect(authState.signOut).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem("little_loops_data::user:user-1")).toBeNull();
    expect(await screen.findByTestId("account-entry-screen")).toBeInTheDocument();
  });

  it("lets a parent restart setup without manual localStorage edits", async () => {
    authState.status = "signed_in";
    authState.user = { id: "user-1", email: "parent@example.com" };
    authState.householdStatus = "ready";
    authState.household = {
      id: "house-1",
      name: "Little Loops Family",
      timezone: "Europe/Madrid",
      homeScene: "kite",
      createdByUserId: "user-1",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-20T10:00:00Z",
      subscriptionStatus: "active",
      currentPeriodEnd: null,
    };
    loadCloudHouseholdState.mockResolvedValue({
      homeScene: "kite",
      children: [
        {
          id: "1",
          name: "Lily",
          morning: [{ id: "m1", title: "Make bed", icon: "bed", completed: false }],
          evening: [{ id: "e1", title: "Go to bed", icon: "moon-star", completed: false }],
        },
      ],
    });
    localStorage.setItem(
      "little_loops_data::user:user-1",
      JSON.stringify({
        ...createStoredState(false, today()),
        setupComplete: true,
      })
    );

    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "open-settings" }));
    fireEvent.click(screen.getByRole("button", { name: "restart-setup" }));

    expect(await screen.findByTestId("setup-child-count")).toHaveTextContent("1");

    const stored = JSON.parse(localStorage.getItem("little_loops_data::user:user-1") ?? "{}");
    expect(stored.setupComplete).toBe(false);
    expect(stored.children).toHaveLength(1);
    expect(stored.children[0].name).toBe("Lily");
  });
});
