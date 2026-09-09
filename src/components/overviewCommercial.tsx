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

const TERRAIN_BOUNDARY_PATHS: Record<string, string> = {
  A12: 'M70 190 Q88 158 124 153 L171 158 Q205 167 224 200 L232 239 211 275 177 299 124 306 81 286 58 250 61 216 Z',
  A01: 'M331 48 L412 22 488 37 531 67 570 83 597 122 621 151 607 182 632 205 604 238 576 272 526 286 482 315 424 298 376 310 337 280 298 264 280 226 292 194 273 165 293 130 286 98 Z',
  A10: 'M709 69 L768 36 831 29 890 12 953 28 1004 38 1049 67 1102 84 1137 120 1125 151 1143 177 1116 204 1085 221 1062 253 1006 253 969 276 916 262 872 280 823 261 772 265 742 236 699 226 681 193 652 172 667 137 657 108 Z',
  A06: 'M1144 157 L1192 132 1249 139 1297 119 1349 144 1397 155 1424 184 1450 217 1438 252 1450 282 1418 306 1388 336 1340 328 1297 350 1251 332 1205 341 1175 310 1129 304 1110 274 1087 247 1104 214 1098 184 Z',
  A07: 'M1268 323 L1320 302 1372 313 1427 292 1485 310 1537 329 1562 359 1601 380 1606 421 1634 451 1606 482 1587 514 1540 518 1502 544 1454 529 1403 548 1360 525 1310 522 1285 489 1247 469 1241 433 1212 404 1228 368 1228 342 Z',
  A04: 'M1372 494 L1428 478 1481 492 1533 482 1578 513 1605 542 1603 577 1631 612 1620 654 1633 687 1604 720 1576 752 1530 749 1492 776 1449 758 1405 771 1369 742 1329 727 1318 687 1294 655 1306 616 1291 580 1320 546 1331 516 Z',
  A05: 'M1105 595 L1152 578 1194 597 1236 580 1274 608 1311 621 1319 657 1348 685 1335 722 1345 757 1317 785 1300 827 1257 833 1224 865 1179 853 1138 879 1102 852 1061 847 1043 808 1017 782 1024 741 1006 706 1031 671 1041 631 1075 618 Z',
  A11: 'M809 621 L852 594 900 603 945 583 984 611 1029 620 1040 658 1069 687 1055 726 1071 762 1038 790 1022 829 981 838 949 872 902 859 860 887 823 858 780 852 761 812 731 786 740 744 718 710 744 675 759 641 Z',
  A03: 'M500 583 L544 555 592 563 633 542 672 567 718 577 732 614 765 642 753 684 770 718 743 750 730 791 688 801 659 840 613 831 575 857 536 833 490 830 471 793 440 764 450 724 428 688 452 653 462 611 Z',
  A02: 'M227 594 L273 570 319 579 359 558 400 578 443 588 456 624 484 652 475 691 489 724 464 756 451 797 410 809 378 842 334 831 294 855 258 829 215 823 199 786 173 757 182 717 163 683 187 649 193 614 Z',
  A09: 'M231 350 L274 326 321 335 364 317 404 338 447 349 458 382 487 410 476 448 488 480 461 507 447 541 406 545 374 570 331 556 293 573 259 548 218 541 204 507 181 480 192 445 177 412 201 385 205 365 Z',
  A08: 'M635 287 L697 259 753 271 810 246 866 265 928 252 970 280 1026 286 1050 322 1092 345 1089 383 1119 418 1103 456 1111 491 1074 519 1050 553 1000 552 959 583 908 570 860 596 810 580 757 592 721 559 670 551 649 514 604 495 600 455 570 426 588 387 571 351 607 321 Z',
};

export function OverviewTerrainBoundaries({
  areas,
  targetedAreaId,
}: {
  areas: AreaOverview[];
  targetedAreaId?: string;
}) {
  return (
    <svg
      className="overview-terrain-boundaries"
      viewBox="0 0 1672 941"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {areas.map((area) => {
        const path = TERRAIN_BOUNDARY_PATHS[area.id];
        if (!path) return null;
        const state = !area.open ? 'is-closed' : area.locked ? 'is-locking' : 'is-open';
        return (
          <path
            key={area.id}
            d={path}
            className={`${state} ${targetedAreaId === area.id ? 'is-targeted' : ''}`}
          />
        );
      })}
    </svg>
  );
}

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
          {area.open
            ? `资源 ${area.resourceRemaining ?? '--'}/${area.resourceMax ?? '--'}`
            : '已封锁'}
        </span>
        {area.locked && <strong>{area.lockSeconds ?? 0}s</strong>}
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
