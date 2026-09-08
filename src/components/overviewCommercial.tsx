import { useEffect, useRef, type ReactNode } from 'react';
import type { GameId } from '../../convex/aiTown/ids';
import { AgentMarkerIcon, HeatTrend } from './battleUi';

export type AreaOccupant = {
  id: GameId<'players'>;
  name: string;
  hp: number;
  maxHp: number;
  heat: number;
  eliminated: boolean;
};

export type AreaOverview = {
  id: string;
  name: string;
  resourceRemaining?: number;
  resourceMax?: number;
  locked: boolean;
  lockSeconds?: number;
  open: boolean;
  occupants: AreaOccupant[];
  aliveCount: number;
  highRiskCount: number;
  peakHeat: number;
};

type AreaStatusMarkerProps = {
  area: AreaOverview;
  targeted: boolean;
  expanded: boolean;
  popoverPlacement?: 'left' | 'right';
  onSelectArea: () => void;
  onFocusArea: () => void;
  onToggleOccupants: () => void;
  onCloseOccupants: () => void;
  onFollowPlayer: (playerId: GameId<'players'>) => void;
};

export function AreaStatusMarker({
  area,
  targeted,
  expanded,
  popoverPlacement = 'right',
  onSelectArea,
  onFocusArea,
  onToggleOccupants,
  onCloseOccupants,
  onFollowPlayer,
}: AreaStatusMarkerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onCloseOccupants();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseOccupants();
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    rootRef.current?.querySelector<HTMLButtonElement>('.area-occupant-row')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded, onCloseOccupants]);

  return (
    <div
      ref={rootRef}
      className={`area-status-marker ${area.open ? '' : 'is-closed'} ${area.peakHeat >= 120 ? 'is-hot' : ''} ${targeted ? 'is-targeted' : ''}`}
    >
      <div className="area-status-main">
        <button className="area-status-name" onClick={onSelectArea}>
          <span>{area.name}</span>
          <small>{area.open ? '开放' : '已封锁'}</small>
        </button>
        <button
          className="area-camera-button"
          aria-label={`切入${area.name}直播镜头`}
          onClick={onFocusArea}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        </button>
      </div>
      <div className="area-resource-line">
        <span>
          资源 {area.resourceRemaining ?? '--'}/{area.resourceMax ?? '--'}
        </span>
        {area.locked && <strong>封锁 {area.lockSeconds ?? 0}s</strong>}
      </div>
      {area.occupants.length > 0 && (
        <button
          ref={triggerRef}
          className="area-squad-badge"
          aria-expanded={expanded}
          aria-controls={`area-occupants-${area.id}`}
          onClick={onToggleOccupants}
        >
          <AgentMarkerIcon owner={area.highRiskCount > 0} />
          <span>{area.aliveCount} AI</span>
          {area.highRiskCount > 0 && <strong>{area.highRiskCount} 高危</strong>}
        </button>
      )}
      {expanded && (
        <div
          id={`area-occupants-${area.id}`}
          className={`area-occupant-popover is-${popoverPlacement}`}
          role="dialog"
          aria-label={`${area.name}参赛角色`}
        >
          <header>
            <div>
              <small>区域角色</small>
              <strong>{area.name}</strong>
            </div>
            <span>{area.occupants.length} 名</span>
          </header>
          <div className="area-occupant-list">
            {area.occupants.map((occupant) => (
              <button
                key={occupant.id}
                className="area-occupant-row"
                onClick={() => onFollowPlayer(occupant.id)}
              >
                <AgentMarkerIcon owner={occupant.heat >= 120} />
                <span>
                  <strong>{occupant.name}</strong>
                  <small>{occupant.eliminated ? '已淘汰' : `热度 ${occupant.heat}`}</small>
                </span>
                <em>
                  {occupant.eliminated ? 'OUT' : `${Math.ceil(occupant.hp)}/${occupant.maxHp}`}
                </em>
              </button>
            ))}
          </div>
          <footer>选择角色后直接进入直播跟随</footer>
        </div>
      )}
    </div>
  );
}

type OverviewSummaryProps = {
  heat: number;
  heatGrade: string;
  aliveCount: number;
  totalCount: number;
  comboMultiplier: number;
  comboCount: number;
  interventionPoints: number;
  interventionPointsMax: number;
  feed: Parameters<typeof HeatTrend>[0]['feed'];
};

export function OverviewSummary(props: OverviewSummaryProps) {
  return (
    <section className="overview-summary" aria-label="赛事关键数据">
      <div className="summary-heat-card">
        <div>
          <span>直播热度</span>
          <strong>{props.heat}</strong>
        </div>
        <em>{props.heatGrade} 级</em>
        <div className="summary-heat-bar">
          <i style={{ width: `${Math.min(100, props.heat / 8)}%` }} />
        </div>
      </div>
      <div className="summary-stat-grid">
        <SummaryStat label="存活" value={`${props.aliveCount}/${props.totalCount}`} />
        <SummaryStat label="连击" value={`×${props.comboMultiplier} · ${props.comboCount}`} />
        <SummaryStat
          label="干预点"
          value={`${props.interventionPoints}/${props.interventionPointsMax}`}
        />
      </div>
      <div className="summary-trend">
        <div className="arena-panel-title">近 5 分钟热度</div>
        <HeatTrend feed={props.feed} current={props.heat} />
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export type OverviewTab = 'intervention' | 'tasks' | 'players';

export function OverviewTabs({
  active,
  onChange,
  children,
}: {
  active: OverviewTab;
  onChange: (tab: OverviewTab) => void;
  children: ReactNode;
}) {
  const tabs: Array<[OverviewTab, string]> = [
    ['intervention', '干预'],
    ['tasks', '任务'],
    ['players', '选手'],
  ];
  return (
    <section className="overview-tab-shell">
      <div className="overview-tab-list" role="tablist" aria-label="战略控制台">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            className={active === id ? 'is-active' : ''}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overview-tab-panel" role="tabpanel">
        {children}
      </div>
    </section>
  );
}
