import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { BattleEvent } from '../../convex/aiTown/battleRoyale';

export type FeedCategory =
  'relationship' | 'betrayal' | 'battle' | 'forbidden' | 'system' | 'organizer';

export const FEED_CATEGORIES: Record<FeedCategory, { label: string; icon: string; color: string }> =
  {
    relationship: {
      label: '关系',
      icon: '/ai-town/assets/battle/ui/log-icons/relationship.svg',
      color: '#4ca8ff',
    },
    betrayal: {
      label: '背叛',
      icon: '/ai-town/assets/battle/ui/log-icons/betrayal.svg',
      color: '#9d66ff',
    },
    battle: {
      label: '战斗',
      icon: '/ai-town/assets/battle/ui/log-icons/battle.svg',
      color: '#ff3f68',
    },
    forbidden: {
      label: '禁区',
      icon: '/ai-town/assets/battle/ui/log-icons/forbidden.svg',
      color: '#ffad32',
    },
    system: {
      label: '系统',
      icon: '/ai-town/assets/battle/ui/log-icons/system.svg',
      color: '#ffd400',
    },
    organizer: {
      label: '主办方',
      icon: '/ai-town/assets/battle/ui/log-icons/organizer.svg',
      color: '#18d894',
    },
  };

export function categoryForEvent(kind: string): FeedCategory {
  if (['ally', 'alliance', 'reaction'].includes(kind)) return 'relationship';
  if (kind === 'betrayal') return 'betrayal';
  if (['attack', 'eliminate', 'winner'].includes(kind)) return 'battle';
  if (kind === 'zone') return 'forbidden';
  if (['intervention', 'audience', 'tip'].includes(kind)) return 'organizer';
  return 'system';
}

export function EventIcon({ kind, decorative = true }: { kind: string; decorative?: boolean }) {
  const category = FEED_CATEGORIES[categoryForEvent(kind)];
  return (
    <img
      className="event-icon"
      src={category.icon}
      alt={decorative ? '' : category.label}
      aria-hidden={decorative || undefined}
    />
  );
}

export function HeatTrend({ feed, current }: { feed: BattleEvent[]; current: number }) {
  const points = deriveHeatTrend(feed, current);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const coords = points
    .map(
      (point, index) =>
        `${(index / (points.length - 1)) * 100},${92 - ((point - min) / range) * 78}`,
    )
    .join(' ');
  const area = `0,100 ${coords} 100,100`;
  return (
    <div className="overview-trend" role="img" aria-label={`直播热度趋势，当前 ${current}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={area} className="heat-trend-area" />
        <polyline points={coords} className="heat-trend-line" />
        <circle
          cx="100"
          cy={92 - ((points.at(-1)! - min) / range) * 78}
          r="2.2"
          className="heat-trend-dot"
        />
      </svg>
    </div>
  );
}

export function deriveHeatTrend(feed: BattleEvent[], current: number) {
  const chronological = [...feed].sort((a, b) => a.ts - b.ts).slice(-11);
  const weights: Record<FeedCategory, number> = {
    relationship: 8,
    betrayal: 28,
    battle: 24,
    forbidden: 5,
    system: 3,
    organizer: 12,
  };
  let value = Math.max(
    0,
    current - chronological.reduce((sum, event) => sum + weights[categoryForEvent(event.kind)], 0),
  );
  const values = [value];
  chronological.forEach((event) => {
    value += weights[categoryForEvent(event.kind)];
    values.push(Math.min(current, value));
  });
  while (values.length < 12) values.unshift(values[0] ?? current);
  values[values.length - 1] = current;
  return values;
}

type AccessibleDialogProps = {
  open: boolean;
  title: string;
  eyebrow: string;
  size: 'tasks' | 'logs';
  onClose: () => void;
  children: ReactNode;
};

export function AccessibleDialog({
  open,
  title,
  eyebrow,
  size,
  onClose,
  children,
}: AccessibleDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => !node.hasAttribute('disabled'));
    window.setTimeout(() => focusable()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="battle-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`battle-dialog battle-dialog-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="battle-dialog-header">
          <div>
            <small>{eyebrow}</small>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button close-button"
            onClick={onClose}
            aria-label={`关闭${title}`}
          >
            <CloseIcon />
          </button>
        </header>
        <div className="battle-dialog-content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function AgentMarkerIcon({ owner = false }: { owner?: boolean }) {
  return (
    <svg className="agent-marker-icon" viewBox="0 0 24 24" aria-hidden="true">
      {owner ? <path d="M12 2 21 12 12 22 3 12Z" /> : <circle cx="12" cy="12" r="7" />}
    </svg>
  );
}

export function InterventionIcon({ kind }: { kind: string }) {
  if (kind.includes('SUP'))
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h16v12H4zM8 4h8v4H8zM12 9v8M8 13h8" />
      </svg>
    );
  if (kind.includes('ENV') || kind.includes('damage'))
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m13 2-9 12h7l-1 8 10-13h-7z" />
      </svg>
    );
  if (kind.includes('INF') || kind.includes('clue')) return <EyeIcon />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 21 12 12 22 3 12Z" />
    </svg>
  );
}
