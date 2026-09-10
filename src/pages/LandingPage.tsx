import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

/* ─── Brand tokens ───────────────────────────────────────────────────── */
const T = {
  fonts: `'Comfortaa', 'Fredoka', system-ui, sans-serif`,
  ink: '#3C3347',
  inkMute: '#988fa3',
  bg: '#F3EDFA',
  bgDeep: '#e8dff5',
  white: '#ffffff',
  cream: '#F9F7EF',
  border: 'rgba(134,108,179,0.15)',
  indigo: '#866CB3',
  indigoDark: '#3C3347',
  indigoLight: '#F3EDFA',
  violet: '#8AAF98',
  violetLight: '#eef5f0',
  purple: '#618B73',
  teal: '#618B73',
  tealLight: '#eef5f0',
  rose: '#A693CC',
  roseLight: '#F3EDFA',
  shadow: '0 4px 24px rgba(134,108,179,0.18)',
};

/* ─── Inline SVG helpers ─────────────────────────────────────────────── */
const StarSVG = ({ size = 18, color = '#866CB3', style }: { size?: number; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} />
  </svg>
);

let _logoMarkId = 0;
const LogoMark = ({ size = 32, style }: { size?: number; style?: React.CSSProperties }) => {
  const id = `llg-${++_logoMarkId}`;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={style} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A693CC" />
          <stop offset="1" stopColor="#8AAF98" />
        </linearGradient>
      </defs>
      <path d="M100,28 C140,28 172,60 172,100 C172,144 136,172 100,172 C60,172 32,138 32,100 C32,66 58,44 88,47 C113,49.5 128,72 121,96 C116,113 98,120 88,110" fill="none" stroke={`url(#${id})`} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const BlobBg = ({ color, style }: { color: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 500 450" style={{ position: 'absolute', pointerEvents: 'none', ...style }} aria-hidden="true">
    <path d="M420,60 C480,120 500,220 470,310 C440,400 360,450 260,440 C160,430 80,370 50,280 C20,190 40,90 110,45 C180,0 360,0 420,60 Z" fill={color} />
  </svg>
);

/* ─── Phone mockup frames ────────────────────────────────────────────── */
const Phone = ({ children, tilt = 0 }: { children: React.ReactNode; tilt?: number }) => (
  <div style={{
    width: 230, flexShrink: 0,
    borderRadius: 40,
    background: '#1f1208',
    padding: '8px 7px 12px',
    boxShadow: '0 28px 64px rgba(0,0,0,0.28)',
    transform: tilt ? `rotate(${tilt}deg)` : undefined,
    transition: 'transform 300ms ease',
  }}>
    {/* Pill notch */}
    <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 64, height: 10, background: '#0d0803', borderRadius: 99 }} />
    </div>
    <div style={{ borderRadius: 32, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

/* ── Screen: Morning routine ── */
const RoutineScreen = () => (
  <div style={{ background: 'linear-gradient(160deg,#fff9f0,#fff1e8)', minHeight: 420, padding: '16px 14px' }}>
    <div style={{ fontFamily: T.fonts, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Good morning</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>Lily's routine</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#fff1e8', borderRadius: 99, padding: '4px 9px' }}>
        <StarSVG size={12} color="#f97316" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>🔥 5</span>
      </div>
    </div>
    {[
      { done: true,  icon: '☀️', label: 'Wake up & stretch' },
      { done: true,  icon: '🚿', label: 'Shower' },
      { done: false, icon: '👕', label: 'Get dressed' },
      { done: false, icon: '🪥', label: 'Brush teeth' },
      { done: false, icon: '🎒', label: 'Pack schoolbag' },
      { done: false, icon: '🍳', label: 'Eat breakfast' },
    ].map(({ done, icon, label }) => (
      <div key={label} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: done ? 'rgba(249,115,22,0.08)' : T.white,
        borderRadius: 14, padding: '9px 11px', marginBottom: 7,
        border: done ? `1.5px solid rgba(249,115,22,0.18)` : `1.5px solid rgba(180,120,80,0.10)`,
        opacity: done ? 0.7 : 1,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 8, flexShrink: 0,
          background: done ? '#f97316' : 'rgba(180,120,80,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {done ? <span style={{ fontSize: 11 }}>✓</span> : null}
        </div>
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: done ? 600 : 500, color: done ? T.inkMute : T.ink, textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
      </div>
    ))}
    <div style={{ marginTop: 10, background: '#fff1e8', borderRadius: 14, padding: '8px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>4 tasks left · You've got this! ⭐</div>
    </div>
  </div>
);

/* ── Screen: Mood tracker ── */
const MoodScreen = () => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const moods = ['😄', '🙂', '😐', '😊', '😢', null, null];
  const colors = ['#22c55e', '#84cc16', '#eab308', '#22c55e', '#3b82f6', null, null];
  return (
    <div style={{ background: 'linear-gradient(160deg,#eef2ff,#f0f4ff)', minHeight: 420, padding: '16px 14px', fontFamily: T.fonts }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.indigo, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>This week</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#1e1b4b', marginBottom: 16 }}>Lily's moods</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>{d}</div>
            <div style={{
              width: '100%', aspectRatio: '1', borderRadius: 12,
              background: colors[i] ? `${colors[i]}20` : 'rgba(99,102,241,0.08)',
              border: `1.5px solid ${colors[i] ? `${colors[i]}40` : 'rgba(99,102,241,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>{moods[i] ?? ''}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.white, borderRadius: 18, padding: '12px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMute, marginBottom: 8 }}>How are you feeling today?</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {['😄','🙂','😐','😕','😢','😡'].map((e, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: 12,
              background: i === 0 ? '#dcfce7' : 'rgba(180,120,80,0.06)',
              border: i === 0 ? '2px solid #22c55e' : '1.5px solid rgba(180,120,80,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>{e}</div>
          ))}
        </div>
      </div>
      <div style={{ background: '#eef2ff', borderRadius: 14, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>✦ Mostly positive this week — great pattern!</div>
      </div>
    </div>
  );
};

/* ── Screen: Affirmation card ── */
const AffirmationScreen = () => (
  <div style={{ background: 'linear-gradient(160deg,#ecfdf5,#d1fae5)', minHeight: 420, padding: '20px 16px', fontFamily: T.fonts, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>🐸</div>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 16 }}>Today's affirmation</div>
    <div style={{
      background: T.white, borderRadius: 22, padding: '22px 18px',
      boxShadow: '0 4px 20px rgba(4,120,87,0.12)',
      border: '1.5px solid rgba(4,120,87,0.10)', marginBottom: 16,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>
        "I can do hard&nbsp;things."
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === 1 ? '#047857' : 'rgba(4,120,87,0.20)' }} />
      ))}
    </div>
    <div style={{ marginTop: 24, fontSize: 12, fontWeight: 600, color: '#047857', background: 'rgba(4,120,87,0.08)', borderRadius: 12, padding: '7px 14px' }}>
      ⭐ Routine complete!
    </div>
  </div>
);

/* ── Screen: Achievement / streak ── */
const AchievementScreen = () => (
  <div style={{ background: 'linear-gradient(160deg,#fdf2f8,#fce7f3)', minHeight: 420, padding: '16px 14px', fontFamily: T.fonts }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9d174d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Achievements</div>
    <div style={{ fontSize: 17, fontWeight: 700, color: '#4a0026', marginBottom: 14 }}>Lily's stars</div>
    <div style={{ background: T.white, borderRadius: 18, padding: '14px 12px', marginBottom: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#f97316' }}>🔥 12</div>
      <div style={{ fontSize: 11, color: T.inkMute, marginTop: 2 }}>day streak — keep going!</div>
    </div>
    {[
      { icon: '⭐', name: 'Morning Star',  desc: '7 mornings complete', color: '#fef3c7', border: '#fbbf24' },
      { icon: '🌙', name: 'Night Owl',     desc: '5 evening routines', color: '#ede9fe', border: '#8b5cf6' },
      { icon: '☁️', name: 'Calm Cloud',    desc: '5 calm moods in a row', color: '#dbeafe', border: '#3b82f6' },
      { icon: '🏆', name: 'Gold Finisher', desc: '30-day streak!',      color: '#fef3c7', border: '#f59e0b', locked: true },
    ].map(({ icon, name, desc, color, border, locked }) => (
      <div key={name} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: locked ? 'rgba(180,120,80,0.04)' : color,
        borderRadius: 14, padding: '8px 10px', marginBottom: 6,
        border: `1.5px solid ${locked ? 'rgba(180,120,80,0.10)' : border + '50'}`,
        opacity: locked ? 0.5 : 1,
      }}>
        <div style={{ fontSize: 20 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: locked ? T.inkMute : T.ink }}>{name}</div>
          <div style={{ fontSize: 10, color: T.inkMute }}>{locked ? '🔒 ' : ''}{desc}</div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Section wrapper ────────────────────────────────────────────────── */
const Section = ({ bg, children, style }: { bg?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: bg ?? T.bg, width: '100%', padding: '80px 24px', position: 'relative', overflow: 'hidden', ...style }}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {children}
    </div>
  </div>
);

const FeatureRow = ({
  phone, text, reverse = false,
}: { phone: React.ReactNode; text: React.ReactNode; reverse?: boolean }) => {
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 760 : true);
  useEffect(() => {
    const fn = () => setIsWide(window.innerWidth >= 760);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return (
    <div style={{
      display: 'flex',
      flexDirection: isWide ? (reverse ? 'row-reverse' : 'row') : 'column',
      alignItems: 'center', gap: isWide ? 64 : 40,
    }}>
      <div style={{ flexShrink: 0 }}>{phone}</div>
      <div style={{ flex: 1 }}>{text}</div>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────── */
interface Props { onGetStarted: () => void; }

export const LandingPage = ({ onGetStarted }: Props) => {
  const [scrolled, setScrolled] = useState(false);
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 760 : true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onResize = () => setIsWide(window.innerWidth >= 760);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); };
  }, []);

  const btnPrimary = (large = false): React.CSSProperties => ({
    background: T.indigo, color: T.white, border: 'none',
    borderRadius: 99, padding: large ? '18px 40px' : '13px 28px',
    fontSize: large ? 18 : 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: T.fonts, letterSpacing: '0.01em',
    boxShadow: `0 ${large ? 6 : 4}px 0 rgba(0,0,0,0.12), 0 ${large ? 16 : 10}px ${large ? 36 : 24}px rgba(134,108,179,0.30)`,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all 180ms ease',
  });

  return (
    <div data-testid="landing-page" style={{ fontFamily: T.fonts, background: T.bg, color: T.ink, overflowX: 'hidden' }}>

      {/* ── Floating nav ── */}
      <nav style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 960, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px',
        background: scrolled ? 'rgba(240,244,255,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderRadius: 99, border: scrolled ? `1.5px solid ${T.border}` : '1.5px solid transparent',
        boxShadow: scrolled ? '0 4px 20px rgba(99,102,241,0.10)' : 'none',
        transition: 'all 220ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoMark size={32} />
          <span style={{ fontSize: 17, fontWeight: 700 }}>
            <span style={{ color: T.ink }}>Little</span>
            <span style={{ color: T.indigo }}> Loops</span>
          </span>
        </div>
        <button style={btnPrimary()} onClick={onGetStarted}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}>
          Get started
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════ HERO */}
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        <BlobBg color="rgba(99,102,241,0.10)" style={{ width: 560, top: -60, right: -100, zIndex: 0 }} />
        <BlobBg color="rgba(139,92,246,0.08)" style={{ width: 360, bottom: -60, left: -80, zIndex: 0 }} />
        <StarSVG size={22} color="#818cf8" style={{ position: 'absolute', top: '18%', right: '42%', opacity: 0.55 }} />
        <StarSVG size={14} color="#a78bfa" style={{ position: 'absolute', top: '30%', right: '36%', opacity: 0.45 }} />
        <StarSVG size={18} color="#6366f1" style={{ position: 'absolute', bottom: '22%', left: '30%', opacity: 0.40 }} />

        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: isWide ? 'row' : 'column', alignItems: 'center', gap: isWide ? 60 : 40, position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.indigoLight, border: `1.5px solid rgba(99,102,241,0.20)`, borderRadius: 99, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: T.indigo, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 22 }}>
              <StarSVG size={11} color={T.indigo} />
              Morning &amp; evening routines
            </div>

            <h1 style={{ fontSize: 'clamp(38px, 6.5vw, 68px)', fontWeight: 700, lineHeight: 1.05, margin: '0 0 8px', color: T.ink }}>
              Stop being<br />
              <span style={{ color: T.indigo }}>the alarm clock.</span>
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: T.inkMute, lineHeight: 1.65, maxWidth: 480, margin: '16px 0 36px' }}>
              Little Loops gives every child their own colourful morning and evening checklist — so they know exactly what to do next. Without you having to say it.
            </p>

            <button style={btnPrimary(true)} onClick={onGetStarted}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = '0 8px 0 rgba(0,0,0,0.12), 0 22px 44px rgba(134,108,179,0.40)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ''; b.style.boxShadow = '0 6px 0 rgba(0,0,0,0.12), 0 16px 36px rgba(99,102,241,0.30)'; }}>
              Start your first routine
              <ChevronRight size={20} />
            </button>
            <div style={{ marginTop: 14, fontSize: 13, color: T.inkMute }}>No app store · Works in any browser</div>
          </div>

          {isWide && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <StarSVG size={28} color="#818cf8" style={{ position: 'absolute', top: -24, right: -20, zIndex: 2 }} />
              <StarSVG size={16} color="#a78bfa" style={{ position: 'absolute', bottom: 20, left: -20, zIndex: 2 }} />
              <Phone tilt={2}><RoutineScreen /></Phone>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ PAIN */}
      <Section bg={T.white}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, margin: '0 0 12px' }}>
            It's 7:58am. Sound familiar?
          </h2>
          <p style={{ fontSize: 16, color: T.inkMute, maxWidth: 460, margin: '0 auto' }}>
            If this is your morning, you're not alone — and it's not your fault.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {[
            { bg: T.indigoLight, border: 'rgba(99,102,241,0.18)', quote: '"Put your shoes on." × 4', sub: 'You said it nicely the first time. Less nicely the fourth.' },
            { bg: T.violetLight, border: 'rgba(139,92,246,0.18)', quote: '"Did you brush your teeth?"', sub: 'The eternal question. Answered with a suspicious amount of confidence.' },
            { bg: '#f0f9ff', border: 'rgba(14,165,233,0.18)', quote: '"I forgot my water bottle."', sub: 'Third time this week. Everyone\'s already late.' },
          ].map(({ bg, border, quote, sub }) => (
            <div key={quote} style={{ background: bg, borderRadius: 22, padding: '22px 20px', border: `1.5px solid ${border}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{quote}</div>
              <div style={{ fontSize: 14, color: T.inkMute, lineHeight: 1.6 }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ display: 'inline-block', background: T.indigoLight, borderRadius: 18, padding: '14px 24px', border: `1.5px solid rgba(99,102,241,0.18)` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.indigo }}>There's a better way. And your kids will actually love it.</span>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════ AUTONOMY */}
      <Section bg={T.bg}>
        <BlobBg color="rgba(99,102,241,0.07)" style={{ width: 400, top: -80, right: -80, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FeatureRow
            phone={<Phone><RoutineScreen /></Phone>}
            text={
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.indigo, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>Autonomy</div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 18px' }}>
                  Your kid,<br /><span style={{ color: T.indigo }}>fully in charge.</span>
                </h2>
                <p style={{ fontSize: 16, color: T.inkMute, lineHeight: 1.7, marginBottom: 24, maxWidth: 420 }}>
                  When children have their own checklist, they stop asking you what comes next. They just do it. Little Loops makes the routine theirs — with tasks to tap, stars to earn, and the quiet pride of "I did it myself."
                </p>
                <p style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
                  Most parents notice <strong style={{ color: T.ink }}>fewer arguments within the first week.</strong> Not because their kids changed — but because the dynamic did.
                </p>
                <button style={btnPrimary()} onClick={onGetStarted}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}>
                  Try it now <ChevronRight size={16} />
                </button>
              </div>
            }
          />
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════ MOODS */}
      <Section bg={T.violetLight}>
        <BlobBg color="rgba(139,92,246,0.08)" style={{ width: 380, bottom: -60, left: -80, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FeatureRow
            reverse
            phone={<Phone><MoodScreen /></Phone>}
            text={
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.violet, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>Mood insights</div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 18px' }}>
                  A window into<br /><span style={{ color: T.violet }}>how they're really doing.</span>
                </h2>
                <p style={{ fontSize: 16, color: T.inkMute, lineHeight: 1.7, marginBottom: 20, maxWidth: 420 }}>
                  Every morning and evening, your child picks how they're feeling — happy, okay, sad, frustrated. Over time, you'll see the whole week at a glance.
                </p>
                <p style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.7, marginBottom: 28, maxWidth: 420 }}>
                  <strong style={{ color: T.ink }}>Spot patterns a busy schedule makes easy to miss.</strong> Is she always low on Monday? Does he light up after a weekend? The data is there — quietly, without pressure.
                </p>
                <div style={{ background: T.white, borderRadius: 18, padding: '14px 18px', border: `1.5px solid rgba(139,92,246,0.18)`, maxWidth: 380 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.violet, marginBottom: 4 }}>Catch a hard week early.</div>
                  <div style={{ fontSize: 13, color: T.inkMute, lineHeight: 1.6 }}>Before it becomes a harder conversation — you'll already know something's off. That's priceless.</div>
                </div>
              </div>
            }
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════ AFFIRMATIONS */}
      <Section bg={T.indigoLight}>
        <BlobBg color="rgba(99,102,241,0.08)" style={{ width: 360, top: -40, right: -60, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FeatureRow
            phone={<Phone><AffirmationScreen /></Phone>}
            text={
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.indigo, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>Daily affirmations</div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 18px' }}>
                  Words that shape<br /><span style={{ color: T.indigo }}>who they become.</span>
                </h2>
                <p style={{ fontSize: 16, color: T.inkMute, lineHeight: 1.7, marginBottom: 20, maxWidth: 420 }}>
                  Each completed routine ends with a personal affirmation. <em>"I am brave." "I can do hard things." "I am loved just as I am."</em>
                </p>
                <p style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.7, marginBottom: 20, maxWidth: 420 }}>
                  A few seconds of positive self-talk, delivered consistently, <strong style={{ color: T.ink }}>compounds into real confidence.</strong> Write your own or use the built-in library.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
                  {["I am exactly enough.", "Today is going to be a great day.", "I am brave and kind."].map(a => (
                    <div key={a} style={{ background: T.white, borderRadius: 14, padding: '10px 16px', border: `1.5px solid rgba(99,102,241,0.15)`, fontSize: 14, fontWeight: 600, color: T.ink }}>
                      ✦ {a}
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════ ACHIEVEMENTS */}
      <Section bg={T.bg}>
        <BlobBg color="rgba(167,139,250,0.09)" style={{ width: 360, bottom: -60, right: -60, zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FeatureRow
            reverse
            phone={<Phone><AchievementScreen /></Phone>}
            text={
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.purple, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 }}>Stars &amp; streaks</div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 18px' }}>
                  Motivation that<br /><span style={{ color: T.purple }}>never runs out.</span>
                </h2>
                <p style={{ fontSize: 16, color: T.inkMute, lineHeight: 1.7, marginBottom: 20, maxWidth: 420 }}>
                  Stars for every task. Streaks for every day completed. Badges for reaching milestones — Morning Star, Night Owl, Calm Cloud.
                </p>
                <p style={{ fontSize: 15, color: T.inkMute, lineHeight: 1.7, marginBottom: 20, maxWidth: 420 }}>
                  Little Loops uses the same mechanics as the games your kids already love — <strong style={{ color: T.ink }}>pointed at brushing their teeth instead.</strong>
                </p>
                <div style={{ background: T.white, borderRadius: 18, padding: '14px 18px', border: `1.5px solid rgba(167,139,250,0.20)`, maxWidth: 380 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.purple, marginBottom: 4 }}>The moment it clicks.</div>
                  <div style={{ fontSize: 13, color: T.inkMute, lineHeight: 1.6 }}>When a child says "I don't want to lose my streak" — you've crossed a line from nagging to ownership. That's the goal.</div>
                </div>
              </div>
            }
          />
        </div>
      </Section>

      {/* ══════════════════════════════════════════ HOW IT WORKS */}
      <Section bg={T.bgDeep}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, margin: '0 0 12px' }}>Up and running in 5 minutes</h2>
          <p style={{ fontSize: 16, color: T.inkMute }}>No tutorial needed. Most families have their first routine live before bedtime.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          {[
            { n: '1', title: 'Create your account', body: 'Drop your email and we send a magic sign-in link. No password to forget.', color: T.indigoLight, border: 'rgba(99,102,241,0.18)', accent: T.indigo },
            { n: '2', title: 'Add your children', body: 'Name, age, and a fun animal avatar. Each child gets their own view.', color: T.violetLight, border: 'rgba(139,92,246,0.18)', accent: T.violet },
            { n: '3', title: 'Build the first routine', body: 'Pick tasks from the library, write your own, drag to reorder. It takes two minutes.', color: '#f0f9ff', border: 'rgba(14,165,233,0.18)', accent: T.teal },
          ].map(({ n, title, body, color, border, accent }) => (
            <div key={n} style={{ background: color, borderRadius: 22, padding: '24px 20px', border: `1.5px solid ${border}` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: accent, marginBottom: 10 }}>{n}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, color: T.inkMute, lineHeight: 1.65 }}>{body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════ FINAL CTA */}
      <Section style={{ textAlign: 'center', padding: '100px 24px' }}>
        <BlobBg color="rgba(99,102,241,0.09)" style={{ width: 480, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
          <div style={{ width: 72, height: 72, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark size={72} />
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.15 }}>
            The mornings you've been dreaming of start tonight.
          </h2>
          <p style={{ fontSize: 16, color: T.inkMute, lineHeight: 1.65, marginBottom: 36 }}>
            Set up tonight. Tomorrow morning, hand your child the tablet and watch what happens.
          </p>
          <button style={{ ...btnPrimary(true), margin: '0 auto' }} onClick={onGetStarted}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = 'translateY(-2px)'; b.style.boxShadow = '0 8px 0 rgba(0,0,0,0.12), 0 22px 48px rgba(134,108,179,0.42)'; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.transform = ''; b.style.boxShadow = '0 6px 0 rgba(0,0,0,0.12), 0 16px 36px rgba(99,102,241,0.30)'; }}>
            Create your account
            <ChevronRight size={20} />
          </button>
          <p style={{ marginTop: 14, fontSize: 13, color: T.inkMute }}>Works in any browser · No app download</p>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════ FOOTER */}
      <div style={{ borderTop: `1.5px solid ${T.border}`, padding: '22px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
          <LogoMark size={24} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            <span style={{ color: T.ink }}>Little</span>
            <span style={{ color: T.indigo }}> Loops</span>
          </span>
        </div>
        <p style={{ fontSize: 12, color: T.inkMute, margin: 0 }}>Made with love for families everywhere.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
          <a href="/privacy" style={{ fontSize: 12, color: T.inkMute, textDecoration: 'underline' }}>Privacy</a>
          <a href="/terms" style={{ fontSize: 12, color: T.inkMute, textDecoration: 'underline' }}>Terms</a>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
