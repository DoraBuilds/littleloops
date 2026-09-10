import React, { useState } from 'react';
import { Reorder } from 'framer-motion';
import { TaskIcon } from './TaskIcon';
import { TaskSuggestionPicker } from './TaskSuggestionPicker';
import { AccountSettingsCard } from './AccountSettingsCard';
import { AdminAffirmations } from './admin/AdminAffirmations';
import { AdminAchievements } from './admin/AdminAchievements';
import { AdminMood } from './admin/AdminMood';
import { getMascot, MASCOTS } from '@/lib/mascots';
import { useAuth } from '@/lib/auth/use-auth';
import { openBillingPortal, startCheckout } from '@/lib/billing/subscription-client';
import type { Child, HomeScene, RoutineType } from '@/lib/types';
import { AGE_BUCKETS, groupTasksByAge, ICON_OPTIONS, TASK_CATALOG } from '@/lib/types';
import type { TaskCatalogItem } from '@/lib/task-catalog';

const LogoMark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <linearGradient id="ps-llg" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#A693CC" />
        <stop offset="1" stopColor="#8AAF98" />
      </linearGradient>
    </defs>
    <path d="M100,28 C140,28 172,60 172,100 C172,144 136,172 100,172 C60,172 32,138 32,100 C32,66 58,44 88,47 C113,49.5 128,72 121,96 C116,113 98,120 88,110" fill="none" stroke="url(#ps-llg)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Design tokens ──────────────────────────────────────────
const T = {
  fonts: `'Fredoka', system-ui, sans-serif`,
  ink: '#3d2c1f',
  inkMute: '#8a7866',
  cream: '#fff9f0',
  peach: '#ffe8d6',
  white: '#ffffff',
  border: 'rgba(180,120,80,0.10)',
  borderMed: 'rgba(180,120,80,0.18)',
  orange: '#f97316',
  orangeLight: '#fff1e8',
  shadow: '0 4px 14px rgba(180,120,80,0.08)',
  shadowMd: '0 6px 20px rgba(180,120,80,0.12)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 14,
  border: `1.5px solid ${T.borderMed}`,
  background: T.cream,
  fontFamily: T.fonts,
  fontSize: 14,
  fontWeight: 500,
  color: T.ink,
  outline: 'none',
  boxSizing: 'border-box',
};

// ── Types ──────────────────────────────────────────────────
type CloudSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ParentSettingsProps {
  children: Child[];
  homeScene: HomeScene;
  cloudConfigSyncStatus?: CloudSyncStatus;
  cloudConfigSyncError?: string | null;
  onRetryCloudConfigSync?: () => void;
  onChange: (children: Child[]) => void;
  onHomeSceneChange: (scene: HomeScene) => void;
  onRestartSetup: () => void;
  onResetAppData: () => Promise<void> | void;
  onBack: () => void;
}

const DEFAULT_SCHEDULE = {
  morning: { start: '07:00', end: '09:00' },
  evening: { start: '17:00', end: '20:00' },
} as const;

type ParentSection = 'kids' | 'parents' | 'household' | 'admin' | 'billing';
type KidEditorTab = 'profile' | 'routines' | 'affirmations' | 'awards' | 'mood';

// ── Task Modal ─────────────────────────────────────────────
interface TaskModalProps {
  initial?: { title: string; icon: string };
  routine: RoutineType;
  mode: 'add' | 'edit';
  suggestions: readonly TaskCatalogItem[];
  onSave: (title: string, icon: string) => void;
  onClose: () => void;
}

const TaskModal = ({ initial, routine, mode, suggestions, onSave, onClose }: TaskModalProps) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'smile');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const handleSelectSuggestion = (suggestion: TaskCatalogItem) => {
    setTitle(suggestion.title);
    setIcon(suggestion.icon);
    setSelectedSuggestionId(suggestion.id);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(61,44,31,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: T.white, borderRadius: 28, padding: '28px 24px', maxWidth: 560, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto', fontFamily: T.fonts, color: T.ink }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'edit' ? 'Edit Task' : 'New Task'}</div>
            <div style={{ fontSize: 15, color: T.inkMute, marginTop: 3 }}>
              {mode === 'edit' ? 'Tweak the task for this child.' : `Start with a ${routine === 'morning' ? 'morning' : 'bedtime'} suggestion or build your own.`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', color: T.inkMute, flexShrink: 0 }}>
            ×
          </button>
        </div>

        {mode === 'add' && (
          <TaskSuggestionPicker
            suggestions={suggestions}
            selectedSuggestionId={selectedSuggestionId}
            onSelectSuggestion={handleSelectSuggestion}
          />
        )}

        {/* Task name */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Task Name</div>
          <input
            style={inputStyle}
            placeholder="e.g. Brush teeth"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            maxLength={80}
          />
        </div>

        {/* Icon picker */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Icon</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setIcon(opt.key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px',
                  borderRadius: 14, border: icon === opt.key ? `2px solid ${T.orange}` : `1.5px solid ${T.border}`,
                  background: icon === opt.key ? T.orangeLight : T.cream,
                  cursor: 'pointer', fontFamily: 'inherit', color: icon === opt.key ? T.orange : T.inkMute,
                  gap: 4, transition: 'all 0.15s',
                }}
              >
                <TaskIcon iconKey={opt.key} size={22} strokeWidth={2.5} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (title.trim()) onSave(title.trim(), icon); }}
          disabled={!title.trim()}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 16, border: 'none',
            background: title.trim() ? T.orange : '#fdba74',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: title.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            boxShadow: title.trim() ? '0 3px 0 rgba(194,65,12,0.35)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          ✓ Save
        </button>
      </div>
    </div>
  );
};

// ── Routine Column ─────────────────────────────────────────
interface RoutineColumnProps {
  type: RoutineType;
  tasks: Child['morning'];
  otherKids: Child[];
  onReorder: (tasks: Child['morning']) => void;
  onDelete: (taskId: string) => void;
  onQuickAdd: (task: TaskCatalogItem) => void;
  onAdd: () => void;
  onEdit: (taskId: string) => void;
  onCopyFrom: (sourceKid: Child) => void;
}

const RoutineColumn = ({ type, tasks, otherKids, onReorder, onDelete, onQuickAdd, onAdd, onEdit, onCopyFrom }: RoutineColumnProps) => {
  const isMorning = type === 'morning';
  const otherTasks = TASK_CATALOG[type].filter(
    (suggestion) => !tasks.some((task) => task.title === suggestion.title)
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{isMorning ? '☀️' : '🌙'}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{isMorning ? 'Morning' : 'Evening'}</span>
      </div>

      <Reorder.Group
        axis="y"
        values={tasks}
        onReorder={onReorder}
        style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}
      >
        {tasks.map((task) => (
          <Reorder.Item
            key={task.id}
            value={task}
            style={{
              display: 'flex', alignItems: 'center',
              background: T.white, padding: '10px 12px', borderRadius: 14,
              border: `1.5px solid ${T.border}`, cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 14, color: T.inkMute, marginRight: 8, cursor: 'grab' }}>⠿</span>
            <span style={{ marginRight: 8, color: T.inkMute, flexShrink: 0 }}>
              <TaskIcon iconKey={task.icon} size={16} strokeWidth={2.5} />
            </span>
            <button
              onClick={() => onEdit(task.id)}
              style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, color: T.ink, padding: 0 }}
            >
              {task.title}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.inkMute, padding: '0 4px', fontFamily: 'inherit' }}
            >
              ×
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Copy tasks from another child */}
      {otherKids.filter((k) => k[type].length > 0).length > 0 && (
        <div style={{ marginTop: 10, borderRadius: 14, border: `1.5px solid ${T.border}`, background: T.cream, padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Copy task list from
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {otherKids.filter((k) => k[type].length > 0).map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  if (tasks.length === 0 || window.confirm(`Replace ${type} tasks with ${k.name}'s list?`)) {
                    onCopyFrom(k);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderRadius: 99, border: `1.5px solid ${T.border}`,
                  background: T.white, padding: '5px 12px',
                  fontSize: 15, fontWeight: 600, color: T.ink,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {k.name}
                <span style={{ fontSize: 13, color: T.inkMute }}>
                  ({k[type].length} tasks)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Age bucket task suggestions */}
      {otherTasks.length > 0 && (
        <div style={{ marginTop: 12, borderRadius: 16, border: `2px dashed ${T.border}`, background: T.cream, padding: '12px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            More tasks to add
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupTasksByAge(otherTasks).map((group) => (
              <details key={`${type}-${group.key}`} style={{ borderRadius: 14, border: `1.5px solid ${T.border}`, background: T.white, overflow: 'hidden' }}>
                <summary style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', listStyle: 'none' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group.label}</div>
                    <div style={{ fontSize: 15, color: T.inkMute, marginTop: 1 }}>{group.description}</div>
                  </div>
                  <span style={{ fontSize: 15, color: T.inkMute }}>›</span>
                </summary>
                <div style={{ borderTop: `1px solid ${T.border}`, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {group.tasks.map((task) => (
                      <button
                        key={`${type}-${task.id}`}
                        onClick={() => onQuickAdd(task)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, borderRadius: 99,
                          border: `1.5px solid ${T.border}`, background: T.white,
                          padding: '5px 10px', fontSize: 15, fontWeight: 500, color: T.ink,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <TaskIcon iconKey={task.icon} size={13} strokeWidth={2.5} />
                        {task.title}
                        <span style={{ fontSize: 14, color: T.orange }}>+</span>
                      </button>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onAdd}
        style={{
          marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 14,
          border: `2px dashed ${isMorning ? T.orange + '55' : '#7c3aed55'}`,
          background: 'transparent', color: isMorning ? T.orange : '#7c3aed',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        + Add Task
      </button>
    </div>
  );
};

// ── Home scene options ─────────────────────────────────────
const HOME_SCENE_OPTIONS: { key: HomeScene; label: string; preview: string; description: string }[] = [
  { key: 'bike',       label: 'Bike ride',    preview: '🚲', description: 'Sunny grass and a playful bicycle sketch.' },
  { key: 'school',     label: 'School time',  preview: '📚', description: 'Books, stars, and notebook doodles.' },
  { key: 'kite',       label: 'Fly a kite',   preview: '🪁', description: 'A breezy sky with a colorful kite.' },
  { key: 'sandcastle', label: 'Sandcastle',   preview: '🏖️', description: 'Beach colors, towers, and a happy umbrella.' },
];

const SECTION_META: Record<ParentSection, { emoji: string; label: string }> = {
  kids:      { emoji: '👧', label: 'Kids' },
  parents:   { emoji: '👤', label: 'Parents' },
  household: { emoji: '🏠', label: 'Household setup' },
  admin:     { emoji: '⚙️', label: 'Admin' },
  billing:   { emoji: '💳', label: 'Billing' },
};

// ── Card wrapper ───────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.white, borderRadius: 22, padding: '20px 18px', border: `1.5px solid ${T.border}`, boxShadow: T.shadow, ...style }}>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export const ParentSettings = ({
  children,
  homeScene,
  cloudConfigSyncStatus = 'idle',
  cloudConfigSyncError,
  onRetryCloudConfigSync,
  onChange,
  onHomeSceneChange,
  onRestartSetup,
  onResetAppData,
  onBack,
}: ParentSettingsProps) => {
  const [viewportWidth, setViewportWidth] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  React.useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = viewportWidth < 768;
  const { status: authStatus, signOut, household, householdStatus } = useAuth();
  const isSignedIn = authStatus === 'signed_in';
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const handleStartCheckout = async () => {
    setBillingLoading(true);
    setBillingError(null);
    const { url, error: checkoutError } = await startCheckout('monthly');
    if (url) {
      window.location.assign(url);
      return;
    }
    setBillingError(checkoutError ?? 'Could not start checkout.');
    setBillingLoading(false);
  };

  const handleOpenBillingPortal = async () => {
    setBillingLoading(true);
    setBillingError(null);
    const { url, error: portalError } = await openBillingPortal();
    if (url) {
      window.location.assign(url);
      return;
    }
    setBillingError(portalError ?? 'Could not open billing management.');
    setBillingLoading(false);
  };
  const [modal, setModal] = useState<{ childId: string; routine: RoutineType; taskId?: string } | null>(null);
  const [activeSection, setActiveSection] = useState<ParentSection>('kids');
  const [kidEditorTab, setKidEditorTab] = useState<KidEditorTab>('profile');
  const [editorChildId, setEditorChildId] = useState<string>(children[0]?.id ?? '');
  const [editorRoutine, setEditorRoutine] = useState<RoutineType>('morning');

  const updateChild = (id: string, updater: (c: Child) => Child) =>
    onChange(children.map((c) => (c.id === id ? updater(c) : c)));

  const addChild = () =>
    onChange([
      ...children,
      {
        id: crypto.randomUUID(),
        name: 'New Child',
        age: 5,
        ageBucket: '4-6',
        avatarSeed: crypto.randomUUID(),
        avatarAnimal: MASCOTS[(children.length) % MASCOTS.length]?.id,
        mascotId: MASCOTS[(children.length) % MASCOTS.length]?.id,
        streak: 0,
        affirmations: [],
        badges: {},
        moods: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => ({ day, emoji: null })),
        schedule: { morning: DEFAULT_SCHEDULE.morning, evening: DEFAULT_SCHEDULE.evening },
        morning: [],
        evening: [],
      },
    ]);

  const handleSaveTask = (title: string, icon: string) => {
    if (!modal) return;
    const { childId, routine, taskId } = modal;
    updateChild(childId, (c) => ({
      ...c,
      [routine]: taskId
        ? c[routine].map((t) => (t.id === taskId ? { ...t, title, icon } : t))
        : [...c[routine], { id: crypto.randomUUID(), title, icon, completed: false }],
    }));
    setModal(null);
  };

  const editingTask = modal?.taskId
    ? children.find((c) => c.id === modal.childId)?.[modal.routine]?.find((t) => t.id === modal.taskId)
    : undefined;
  const selectedSuggestions = modal ? TASK_CATALOG[modal.routine] : [];
  const editorChild = children.find((c) => c.id === editorChildId) ?? children[0];

  return (
    <div style={{ minHeight: '100svh', background: T.cream, fontFamily: T.fonts, color: T.ink, padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBack}
              style={{ width: 38, height: 38, borderRadius: 12, background: T.white, border: `1.5px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', boxShadow: T.shadow }}
            >
              ‹
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                <LogoMark size={20} />
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: `'Comfortaa', 'Fredoka', system-ui, sans-serif`, color: T.ink, letterSpacing: '0.01em' }}>
                  Little<span style={{ color: '#866CB3' }}> Loops</span>
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Parent Settings</div>
              <div style={{ fontSize: 15, color: T.inkMute }}>Manage children and their daily routines.</div>
            </div>
          </div>
          <button
            onClick={onBack}
            style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 14, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 0 rgba(0,0,0,0.2)' }}
          >
            Done
          </button>
        </div>

        {/* Two-column layout — sidebar on left, content on right; stacks on mobile */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '240px minmax(0,1fr)', alignItems: 'start' }}>

          {/* ── Sidebar ── */}
          <Card>
            {/* Section nav */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
              {(['kids', 'parents', 'household', 'admin', 'billing'] as ParentSection[]).map((key) => {
                const meta = SECTION_META[key];
                const isActive = activeSection === key;
                const desc =
                  key === 'kids' ? `${children.length} profile${children.length === 1 ? '' : 's'}` :
                  key === 'parents' ? (isSignedIn ? 'Account connected' : 'Sign in for sync') :
                  key === 'household' ? 'Scenes and family home' :
                  key === 'admin' ? 'Reset and restart' :
                  !isSignedIn ? 'Sign in to subscribe' :
                  household?.subscriptionStatus === 'active' || household?.subscriptionStatus === 'trialing' ? 'Active' :
                  household?.subscriptionStatus === 'past_due' ? 'Payment needs attention' : 'From €6.99/month';

                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '10px 12px', borderRadius: 14, border: 'none', textAlign: 'left',
                      background: isActive ? T.orange : 'transparent',
                      color: isActive ? '#fff' : T.ink,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{meta.label}</div>
                      <div style={{ fontSize: 15, opacity: 0.75, marginTop: 1 }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick view */}
            <div style={{ background: T.cream, borderRadius: 14, padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Quick view</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{children.length} kids</div>
              <div style={{ fontSize: 14, color: T.inkMute, marginTop: 3 }}>Choose a section on the left instead of scrolling through everything at once.</div>
            </div>

            {/* Account status */}
            <div style={{ background: T.white, borderRadius: 14, padding: '10px 12px', border: `1.5px solid ${T.border}`, marginBottom: isSignedIn ? 14 : 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {isSignedIn ? 'Account status' : 'Sign-in required'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {isSignedIn ? 'Parent account connected' : 'Parent account not connected'}
              </div>
              <div style={{ fontSize: 14, color: T.inkMute, marginBottom: isSignedIn ? 10 : 0 }}>
                {isSignedIn
                  ? 'This browser is signed in. Manage sync from the Parents section.'
                  : 'Sign in from the Parents section to load and manage the household saved to this account.'}
              </div>
              {/* Sync status — errors get the more detailed banner below; this
                  covers the common saving/saved case so cloud sync isn't
                  silent, matching the indicator already shown during setup. */}
              {isSignedIn && !cloudConfigSyncError && cloudConfigSyncStatus !== 'idle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.cream, borderRadius: 10, padding: '6px 10px', marginBottom: 10 }}>
                  <span style={{ fontSize: 14 }}>{cloudConfigSyncStatus === 'saved' ? '✅' : '🔄'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: cloudConfigSyncStatus === 'saved' ? '#16a34a' : '#2563eb' }}>
                    {cloudConfigSyncStatus === 'saved' ? 'Saved to cloud' : 'Saving…'}
                  </span>
                </div>
              )}
              {isSignedIn && (
                <button
                  onClick={() => void signOut()}
                  style={{ width: '100%', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '7px 0', fontSize: 15, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Logout
                </button>
              )}
            </div>

            {/* Cloud sync — only surface errors, normal sync is silent */}
            {isSignedIn && cloudConfigSyncError && (
              <div style={{ background: '#fff5f5', borderRadius: 14, padding: '10px 12px', border: '1.5px solid rgba(220,38,38,0.18)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠️ Sync issue</div>
                <div style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.5, marginBottom: 8 }}>
                  {cloudConfigSyncError.length > 120 ? cloudConfigSyncError.slice(0, 120) + '…' : cloudConfigSyncError}
                </div>
                {onRetryCloudConfigSync && (
                  <button
                    onClick={onRetryCloudConfigSync}
                    style={{ width: '100%', background: T.white, border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '7px 0', fontSize: 13, fontWeight: 700, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    🔄 Retry
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* ── Main panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KIDS */}
            {activeSection === 'kids' && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Kids</div>
                    <div style={{ fontSize: 15, color: T.inkMute, marginTop: 2 }}>Pick one child, then switch between profile details and routine setup.</div>
                  </div>
                  {children.length < 3 && (
                    <button
                      onClick={addChild}
                      style={{ background: T.orange, color: '#fff', border: 'none', borderRadius: 14, padding: '9px 18px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 0 rgba(194,65,12,0.35)' }}
                    >
                      Add another child
                    </button>
                  )}
                </div>

                {children.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', border: `2px dashed rgba(249,115,22,0.3)`, borderRadius: 18, background: T.orangeLight }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🐣</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Create the first child profile</div>
                    <div style={{ fontSize: 15, color: T.inkMute, marginBottom: 18 }}>Add a child here first, then switch over to routines when you're ready.</div>
                    <button onClick={addChild} style={{ background: T.orange, color: '#fff', border: 'none', borderRadius: 14, padding: '10px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 0 rgba(194,65,12,0.35)' }}>
                      + Create first profile
                    </button>
                  </div>
                ) : editorChild ? (
                  <div>
                    {/* Child selector tabs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                      {children.map((child) => {
                        const m = getMascot(child.mascotId ?? child.avatarAnimal);
                        const isActive = editorChild.id === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => setEditorChildId(child.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                              borderRadius: 16, border: isActive ? `2px solid ${T.orange}` : `1.5px solid ${T.border}`,
                              background: isActive ? T.orangeLight : T.cream,
                              cursor: 'pointer', fontFamily: 'inherit', color: T.ink, transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${m.light},${m.color}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1.5px solid ${m.color}44` }}>
                              {m.emoji}
                            </div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 600 }}>{child.name}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Profile / Routines / Affirmations / Awards / Mood tabs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: T.cream, borderRadius: 14, padding: 4, border: `1.5px solid ${T.border}`, marginBottom: 18 }}>
                      {([
                        { key: 'profile',      label: '👤 Profile' },
                        { key: 'routines',     label: '📋 Routines' },
                        { key: 'affirmations', label: '💫 Affirmations' },
                        { key: 'awards',       label: '🏆 Awards' },
                        { key: 'mood',         label: '💗 Mood' },
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setKidEditorTab(key)}
                          style={{
                            padding: '8px 14px', borderRadius: 10, border: 'none',
                            background: kidEditorTab === key ? T.white : 'transparent',
                            color: kidEditorTab === key ? T.ink : T.inkMute,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: kidEditorTab === key ? T.shadow : 'none', transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* PROFILE tab */}
                    {kidEditorTab === 'profile' && (
                      <div style={{ background: T.cream, borderRadius: 18, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
                          {/* Mascot picker */}
                          <div style={{ background: T.white, borderRadius: 18, padding: '14px 12px', border: `1.5px solid ${T.border}`, textAlign: 'center' }}>
                            {(() => {
                              const m = getMascot(editorChild.mascotId ?? editorChild.avatarAnimal);
                              return (
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg,${m.light},${m.color}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 10px', border: `2px solid ${m.color}44` }}>
                                  {m.emoji}
                                </div>
                              );
                            })()}
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Pick mascot</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                              {MASCOTS.map((opt) => {
                                const selected = opt.id === (editorChild.mascotId ?? editorChild.avatarAnimal);
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => updateChild(editorChild.id, (c) => ({ ...c, mascotId: opt.id, avatarAnimal: opt.id }))}
                                    style={{
                                      background: selected ? opt.light : T.cream,
                                      borderRadius: 10, padding: '6px 2px',
                                      border: selected ? `2px solid ${opt.color}` : `1px solid ${T.border}`,
                                      cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                                    }}
                                  >
                                    <div style={{ fontSize: 18 }}>{opt.emoji}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Name / age / schedule */}
                          <div style={{ background: T.white, borderRadius: 18, padding: '14px', border: `1.5px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                              <input
                                style={{ ...inputStyle, fontSize: 17, fontWeight: 700, flex: 1, padding: '8px 12px' }}
                                value={editorChild.name}
                                onChange={(e) => updateChild(editorChild.id, (c) => ({ ...c, name: e.target.value }))}
                                placeholder="Child name"
                                maxLength={60}
                              />
                              {children.length > 1 && (
                                <button
                                  onClick={() => onChange(children.filter((c) => c.id !== editorChild.id))}
                                  style={{ background: '#fff5f5', border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 15, fontWeight: 700, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, marginBottom: 4 }}>Age</div>
                                <input
                                  type="number" min={2} max={12}
                                  style={inputStyle}
                                  value={editorChild.age ?? 5}
                                  onChange={(e) => updateChild(editorChild.id, (c) => ({ ...c, age: Number(e.target.value) }))}
                                />
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, marginBottom: 4 }}>Age group</div>
                                <select
                                  style={inputStyle}
                                  value={editorChild.ageBucket ?? '4-6'}
                                  onChange={(e) => updateChild(editorChild.id, (c) => ({ ...c, ageBucket: e.target.value as Child['ageBucket'] }))}
                                >
                                  {AGE_BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                                </select>
                              </div>
                            </div>

                            {/* Schedule */}
                            <div style={{ background: T.cream, borderRadius: 14, padding: '10px 12px', border: `1.5px solid ${T.border}` }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>⏰ Routine schedule</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {(['morning', 'evening'] as const).map((routine) => (
                                  <div key={`${editorChild.id}-${routine}`} style={{ background: T.white, borderRadius: 12, padding: '8px 10px', border: `1.5px solid ${T.border}` }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                      {routine === 'morning' ? '☀️' : '🌙'} {routine}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                      {(['start', 'end'] as const).map((bound) => (
                                        <div key={bound}>
                                          <div style={{ fontSize: 15, color: T.inkMute, marginBottom: 2 }}>{bound}</div>
                                          <input
                                            type="time"
                                            style={{ ...inputStyle, fontSize: 14, padding: '4px 6px', borderRadius: 8 }}
                                            value={editorChild.schedule?.[routine]?.[bound] ?? DEFAULT_SCHEDULE[routine][bound]}
                                            onChange={(e) =>
                                              updateChild(editorChild.id, (c) => ({
                                                ...c,
                                                schedule: {
                                                  morning: c.schedule?.morning ?? DEFAULT_SCHEDULE.morning,
                                                  evening: c.schedule?.evening ?? DEFAULT_SCHEDULE.evening,
                                                  [routine]: {
                                                    start: c.schedule?.[routine].start ?? DEFAULT_SCHEDULE[routine].start,
                                                    end: c.schedule?.[routine].end ?? DEFAULT_SCHEDULE[routine].end,
                                                    [bound]: e.target.value,
                                                  },
                                                },
                                              }))
                                            }
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AFFIRMATIONS tab */}
                    {kidEditorTab === 'affirmations' && (
                      <AdminAffirmations
                        kid={editorChild}
                        onBack={() => setKidEditorTab('profile')}
                        onAdd={(kidId, text) =>
                          updateChild(kidId, (c) => ({ ...c, affirmations: [...(c.affirmations ?? []), text] }))
                        }
                        onRemove={(kidId, idx) =>
                          updateChild(kidId, (c) => ({ ...c, affirmations: (c.affirmations ?? []).filter((_, i) => i !== idx) }))
                        }
                      />
                    )}

                    {/* AWARDS tab */}
                    {kidEditorTab === 'awards' && (
                      <AdminAchievements
                        kid={editorChild}
                        onBack={() => setKidEditorTab('profile')}
                        onToggleBadge={(kidId, badgeId) =>
                          updateChild(kidId, (c) => ({ ...c, badges: { ...(c.badges ?? {}), [badgeId]: !(c.badges ?? {})[badgeId] } }))
                        }
                        onToggleCelebration={(kidId) =>
                          updateChild(kidId, (c) => ({ ...c, celebrateStreaks: !(c.celebrateStreaks ?? true) }))
                        }
                      />
                    )}

                    {/* MOOD tab */}
                    {kidEditorTab === 'mood' && (
                      <AdminMood
                        kid={editorChild}
                        onBack={() => setKidEditorTab('profile')}
                      />
                    )}

                    {/* ROUTINES tab */}
                    {kidEditorTab === 'routines' && (
                      <div style={{ background: T.cream, borderRadius: 18, padding: '16px' }}>
                        {/* Morning / Evening selector */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                          {(['morning', 'evening'] as const).map((routine) => (
                            <button
                              key={routine}
                              onClick={() => setEditorRoutine(routine)}
                              style={{
                                padding: '9px 20px', borderRadius: 14,
                                background: editorRoutine === routine
                                  ? (routine === 'morning' ? 'linear-gradient(135deg,#fed7aa,#fdba74)' : 'linear-gradient(135deg,#a78bfa,#7c3aed)')
                                  : T.white,
                                color: editorRoutine === routine ? (routine === 'morning' ? '#7c2d12' : '#fff') : T.inkMute,
                                fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                border: `1.5px solid ${T.border}`, transition: 'all 0.15s',
                              }}
                            >
                              {routine === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                            </button>
                          ))}
                        </div>

                        <div style={{ background: T.white, borderRadius: 18, padding: '14px 14px', border: `1.5px solid ${T.border}` }}>
                          <RoutineColumn
                            type={editorRoutine}
                            tasks={editorChild[editorRoutine]}
                            otherKids={children.filter((c) => c.id !== editorChild.id)}
                            onReorder={(newOrder) => updateChild(editorChild.id, (c) => ({ ...c, [editorRoutine]: newOrder }))}
                            onDelete={(taskId) => updateChild(editorChild.id, (c) => ({ ...c, [editorRoutine]: c[editorRoutine].filter((t) => t.id !== taskId) }))}
                            onQuickAdd={(task) => updateChild(editorChild.id, (c) => ({ ...c, [editorRoutine]: [...c[editorRoutine], { id: crypto.randomUUID(), title: task.title, icon: task.icon, completed: false }] }))}
                            onAdd={() => setModal({ childId: editorChild.id, routine: editorRoutine })}
                            onEdit={(taskId) => setModal({ childId: editorChild.id, routine: editorRoutine, taskId })}
                            onCopyFrom={(sourceKid) =>
                              updateChild(editorChild.id, (c) => ({
                                ...c,
                                [editorRoutine]: sourceKid[editorRoutine].map((t) => ({
                                  ...t,
                                  id: crypto.randomUUID(),
                                  completed: false,
                                })),
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </Card>
            )}

            {/* PARENTS */}
            {activeSection === 'parents' && <AccountSettingsCard />}

            {/* HOUSEHOLD */}
            {activeSection === 'household' && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: T.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎨</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>Household setup</div>
                    <div style={{ fontSize: 15, color: T.inkMute }}>Pick the scene that appears when no routine is due.</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                  {HOME_SCENE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => onHomeSceneChange(option.key)}
                      style={{
                        borderRadius: 18, padding: '14px 12px', textAlign: 'left',
                        border: homeScene === option.key ? `2.5px solid ${T.orange}` : `1.5px solid ${T.border}`,
                        background: homeScene === option.key ? T.orangeLight : T.cream,
                        cursor: 'pointer', fontFamily: 'inherit', color: T.ink, transition: 'all 0.15s',
                        boxShadow: homeScene === option.key ? `0 4px 12px rgba(249,115,22,0.15)` : 'none',
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{option.preview}</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{option.label}</div>
                      <div style={{ fontSize: 14, color: T.inkMute, marginTop: 4, lineHeight: 1.4 }}>{option.description}</div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* ADMIN */}
            {activeSection === 'admin' && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚙️</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>Admin</div>
                    <div style={{ fontSize: 15, color: T.inkMute }}>Restart setup or clear everything and start over.</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                  {/* Restart setup */}
                  <div style={{ background: T.cream, borderRadius: 18, padding: '16px', border: `1.5px solid ${T.border}` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Restart setup</div>
                    <div style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.6, marginBottom: 14 }}>
                      Keep the current children and open the setup flow again to review profiles and routines.
                    </div>
                    <button
                      onClick={onRestartSetup}
                      style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 18px', fontSize: 15, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Restart setup
                    </button>
                  </div>

                  {/* Reset app data */}
                  <div style={{ background: '#fff5f5', borderRadius: 18, padding: '16px', border: '1.5px solid rgba(220,38,38,0.15)' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Reset app data</div>
                    <div style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.6, marginBottom: 14 }}>
                      {isSignedIn
                        ? 'Permanently delete the signed-in household, all child profiles, routines, schedules, and progress from Supabase and this browser.'
                        : 'This clears everything saved in this browser. Remove all saved children, routines, schedules, and progress and return to a fresh start.'}
                    </div>

                    {confirmReset ? (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>
                          {isSignedIn
                            ? 'This permanently deletes the signed-in household everywhere and clears this browser. Are you sure?'
                            : 'This clears everything. Are you sure?'}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            disabled={isResetting}
                            onClick={async () => {
                              setIsResetting(true);
                              try { await onResetAppData(); } finally { setIsResetting(false); setConfirmReset(false); }
                            }}
                            style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 0', fontSize: 15, fontWeight: 700, cursor: isResetting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {isResetting ? 'Deleting…' : 'Yes, reset everything'}
                          </button>
                          <button
                            disabled={isResetting}
                            onClick={() => setConfirmReset(false)}
                            style={{ flex: 1, background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 0', fontSize: 15, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        disabled={isResetting}
                        onClick={() => setConfirmReset(true)}
                        style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Reset everything
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* BILLING */}
            {activeSection === 'billing' && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: T.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💳</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>Billing</div>
                    <div style={{ fontSize: 15, color: T.inkMute }}>Manage your Little Loops subscription.</div>
                  </div>
                </div>

                {!isSignedIn ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', border: `2px dashed rgba(249,115,22,0.3)`, borderRadius: 18, background: T.orangeLight }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Sign in to subscribe</div>
                    <div style={{ fontSize: 15, color: T.inkMute }}>Billing is tied to your parent account — sign in from the Parents section first.</div>
                  </div>
                ) : householdStatus !== 'ready' || !household ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', border: `2px dashed ${T.border}`, borderRadius: 18, background: T.cream }}>
                    <div style={{ fontSize: 15, color: T.inkMute }}>Preparing your family space…</div>
                  </div>
                ) : (
                  <div style={{ background: T.cream, borderRadius: 18, padding: '18px 16px', border: `1.5px solid ${T.border}` }}>
                    {household.subscriptionStatus === 'active' || household.subscriptionStatus === 'trialing' ? (
                      <>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>✅ Little Loops is active</div>
                        <div style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.5, marginBottom: 14 }}>
                          {household.currentPeriodEnd
                            ? `Renews ${new Date(household.currentPeriodEnd).toLocaleDateString()}`
                            : 'Manage your plan and billing details below.'}
                        </div>
                        <button
                          onClick={() => void handleOpenBillingPortal()}
                          disabled={billingLoading}
                          style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 18px', fontSize: 15, fontWeight: 700, color: T.ink, cursor: billingLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {billingLoading ? 'Opening…' : 'Manage billing'}
                        </button>
                      </>
                    ) : household.subscriptionStatus === 'past_due' ? (
                      <>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#dc2626' }}>⚠️ Payment needs attention</div>
                        <div style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.5, marginBottom: 14 }}>
                          Your last payment didn't go through. Update your card to keep Little Loops active.
                        </div>
                        <button
                          onClick={() => void handleOpenBillingPortal()}
                          disabled={billingLoading}
                          style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 15, fontWeight: 700, cursor: billingLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {billingLoading ? 'Opening…' : 'Update payment method'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Subscribe to Little Loops</div>
                        <div style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.5, marginBottom: 14 }}>
                          €6.99/month (or €70/year) for full access, synced across every device.
                        </div>
                        <button
                          onClick={() => void handleStartCheckout()}
                          disabled={billingLoading}
                          style={{ background: T.orange, color: '#fff', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 15, fontWeight: 700, cursor: billingLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {billingLoading ? 'Loading…' : 'Subscribe — €6.99/mo'}
                        </button>
                      </>
                    )}
                    {billingError && (
                      <div style={{ marginTop: 12, fontSize: 14, color: '#dc2626' }}>⚠️ {billingError}</div>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {modal && (
        <TaskModal
          initial={editingTask ? { title: editingTask.title, icon: editingTask.icon } : undefined}
          routine={modal.routine}
          mode={modal.taskId ? 'edit' : 'add'}
          suggestions={selectedSuggestions}
          onSave={handleSaveTask}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};
