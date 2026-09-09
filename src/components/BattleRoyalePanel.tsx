import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';
import type { SelectElement } from './Player';
import {
  BATTLE_CONFIG,
  INTERVENTION_OPERATIONS,
  POPULARITY_PROGRESSION,
  popularityRatingFor,
} from '../../data/battleRoyaleConfig';
import {
  AccessibleDialog,
  EventIcon,
  FEED_CATEGORIES,
  InterventionIcon,
  categoryForEvent,
  type FeedCategory,
} from './battleUi';
import {
  AreaStatusMarker,
  OverviewSummary,
  OverviewTerrainBoundaries,
  OverviewTabs,
  type AreaOverview,
  type OverviewTab,
} from './overviewCommercial';

const MINE_ROWS = 8;
const MINE_COLS = 8;
const MINE_COUNT = 10;

type MineCell = {
  id: number;
  row: number;
  col: number;
  mined: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

type MineStatus = 'ready' | 'playing' | 'won' | 'lost';

type BattleRoyalePanelProps = {
  worldId: Id<'worlds'>;
  game: ServerGame;
  selectedPlayerId?: GameId<'players'>;
  setSelectedElement?: SelectElement;
  onBackToLive: () => void;
  onMatchReset: () => void;
  onFollowPlayer: (playerId: GameId<'players'>) => void;
  onFocusArea: (areaId: string) => void;
  launchModal?: 'mine' | 'reset';
  onLaunchModalHandled: () => void;
};

export default function BattleRoyalePanel({
  worldId,
  game,
  selectedPlayerId,
  setSelectedElement: _setSelectedElement,
  onBackToLive,
  onMatchReset,
  onFollowPlayer,
  onFocusArea,
  launchModal,
  onLaunchModalHandled,
}: BattleRoyalePanelProps) {
  const sendInput = useMutation(api.aiTown.main.sendInput);
  const resetBattleMutation = useMutation(api.world.resetBattle);
  const [mineOpen, setMineOpen] = useState(false);
  const [mineBoard, setMineBoard] = useState(() => createMineBoard());
  const [mineStatus, setMineStatus] = useState<MineStatus>('ready');
  const [flagMode, setFlagMode] = useState(false);
  const [pending, setPending] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [targetAreaId, setTargetAreaId] = useState('A01');
  const [targetPlayerId, setTargetPlayerId] = useState<string | undefined>();
  const [secondTargetPlayerId, setSecondTargetPlayerId] = useState<string | undefined>();
  const [tasksOpen, setTasksOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<FeedCategory | 'all'>('all');
  const [expandedAreaId, setExpandedAreaId] = useState<string>();
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('intervention');
  const [showAllInterventions, setShowAllInterventions] = useState(false);

  useEffect(() => {
    if (!launchModal) return;
    if (launchModal === 'mine') openMineGame();
    if (launchModal === 'reset') setResetConfirmOpen(true);
    onLaunchModalHandled();
  }, [launchModal]);

  const players = useMemo(
    () =>
      [...game.world.players.values()]
        .filter((player) => player.battle)
        .sort((a, b) => {
          const alive = Number(!b.battle?.eliminated) - Number(!a.battle?.eliminated);
          if (alive !== 0) {
            return alive;
          }
          return (b.battle?.kills ?? 0) - (a.battle?.kills ?? 0);
        }),
    [game],
  );
  const selected = selectedPlayerId
    ? game.world.players.get(selectedPlayerId)
    : players.find((player) => !player.battle?.eliminated);
  const interventionTarget = targetPlayerId
    ? game.world.players.get(targetPlayerId as GameId<'players'>)
    : selected;
  const aliveCount = players.filter((player) => !player.battle?.eliminated).length;
  const battle = game.world.battle;
  const heat = battle?.popularity ?? 0;
  const heatGrade = popularityRatingFor(heat, battle?.interventionSpentTotal ?? 0);
  const openAreas = battle?.openAreas ?? BATTLE_CONFIG.areas.map((area) => area.id);
  const activeAreaLocks = (battle?.areaLocks ?? []).filter((lock) => lock.until > Date.now());
  const activeTask = battle?.hiddenMissions?.[0];
  const fullEventFeed = battle?.feed ?? [];
  const interventionOperations = INTERVENTION_OPERATIONS.filter(
    (operation) => operation.id !== 'TRU_01',
  );
  const visibleInterventionOperations = showAllInterventions
    ? interventionOperations
    : interventionOperations.slice(0, 4);
  const filteredEventFeed = fullEventFeed.filter(
    (event) => logFilter === 'all' || categoryForEvent(event.kind) === logFilter,
  );
  const zoneCountdownSeconds = Math.max(
    0,
    Math.ceil(((battle?.zoneClosesAt ?? Date.now()) - Date.now()) / 1000),
  );
  const areaOverviews = useMemo<AreaOverview[]>(
    () =>
      BATTLE_CONFIG.areas
        .filter((area) => area.id !== 'S01')
        .map((area) => {
          const resource = battle?.areaResources?.find((entry) => entry.areaId === area.id);
          const areaLock = activeAreaLocks.find((lock) => lock.areaId === area.id);
          const occupants = players
            .filter((player) => player.battle?.areaId === area.id)
            .map((player) => ({
              id: player.id,
              name: game.playerDescriptions.get(player.id)?.name ?? player.id,
              hp: player.battle!.hp,
              maxHp: player.battle!.maxHp,
              heat: player.battle!.heat ?? 0,
              eliminated: Boolean(player.battle!.eliminated),
            }))
            .sort(
              (a, b) =>
                Number(a.eliminated) - Number(b.eliminated) || b.heat - a.heat || b.hp - a.hp,
            );
          return {
            id: area.id,
            name: displayAreaName(area.id),
            resourceRemaining: resource?.remaining,
            resourceMax: resource?.max,
            locked: Boolean(areaLock),
            lockSeconds: areaLock
              ? Math.max(0, Math.ceil((areaLock.until - Date.now()) / 1000))
              : undefined,
            open: openAreas.includes(area.id),
            occupants,
            aliveCount: occupants.filter((occupant) => !occupant.eliminated).length,
            highRiskCount: occupants.filter(
              (occupant) => !occupant.eliminated && occupant.heat >= 120,
            ).length,
            peakHeat: Math.max(0, ...occupants.map((occupant) => occupant.heat)),
          };
        }),
    [activeAreaLocks, battle?.areaResources, game.playerDescriptions, openAreas, players],
  );
  const closeAreaPopover = useCallback(() => setExpandedAreaId(undefined), []);

  const mineStats = useMemo(() => getMineStats(mineBoard), [mineBoard]);
  const liveMineReward = getMineReward(mineStats, mineStatus);

  const openMineGame = () => {
    if (pending) {
      return;
    }
    setMineBoard(createMineBoard());
    setMineStatus('playing');
    setFlagMode(false);
    setMineOpen(true);
  };

  const handleMineCell = (cellId: number, shouldFlag = flagMode) => {
    if (mineStatus !== 'playing') {
      return;
    }
    setMineBoard((board) => {
      const hasStarted = board.some((item) => item.revealed || item.flagged);
      const activeBoard = !shouldFlag && !hasStarted ? createMineBoard(cellId) : board;
      const cell = activeBoard[cellId];
      if (!cell || cell.revealed) {
        return activeBoard;
      }
      if (shouldFlag) {
        return activeBoard.map((item) =>
          item.id === cellId ? { ...item, flagged: !item.flagged } : item,
        );
      }
      if (cell.flagged) {
        return activeBoard;
      }
      if (cell.mined) {
        setMineStatus('lost');
        return activeBoard.map((item) => (item.mined ? { ...item, revealed: true } : item));
      }
      const nextBoard = revealSafeCells(activeBoard, cellId);
      if (getMineStats(nextBoard).safeRevealed >= MINE_ROWS * MINE_COLS - MINE_COUNT) {
        setMineStatus('won');
        return nextBoard.map((item) => (item.mined ? { ...item, flagged: true } : item));
      }
      return nextBoard;
    });
  };

  const cashOutMineGame = async () => {
    setPending(true);
    try {
      await sendInput({
        worldId,
        name: 'earnIntervention',
        args: {
          score: liveMineReward,
        },
      });
      setMineOpen(false);
    } finally {
      setPending(false);
    }
  };

  const intervene = async (opId: string) => {
    if (pending) return;
    const operation = INTERVENTION_OPERATIONS.find((item) => item.id === opId);
    if (!operation) return;
    setPending(true);
    try {
      await sendInput({
        worldId,
        name: 'intervene',
        args: {
          opId,
          targetPlayerId:
            operation.target === 'player' || operation.target === 'pair' || opId === 'TRU_01'
              ? interventionTarget?.id
              : undefined,
          secondPlayerId:
            operation.target === 'pair'
              ? (secondTargetPlayerId as GameId<'players'> | undefined)
              : undefined,
          targetAreaId: operation.target === 'area' ? targetAreaId : undefined,
        },
      });
    } finally {
      setPending(false);
    }
  };

  const resetMatch = async () => {
    setPending(true);
    try {
      await resetBattleMutation({
        worldId,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <section className="overview-console commercial-overview pointer-events-auto grid min-h-0 min-w-0 flex-1 gap-2 p-2">
        <header className="overview-match-bar arena-panel">
          <div className="overview-match-identity">
            <span className="arena-kicker">战略总览</span>
            <h2 className="arena-heading">AI 大逃杀</h2>
          </div>
          <div className="overview-match-status" aria-label="当前赛事状态">
            <span>第 {battle?.day ?? 1} 天</span>
            <span>{battle?.timeOfDay === 'night' ? '夜间' : '白天'}</span>
            <span>{displayPhase(battle?.phase)}</span>
            <span>{openAreas.length} 区开放</span>
            <strong>禁区 {formatCountdown(zoneCountdownSeconds)}</strong>
          </div>
          <div className="overview-match-actions">
            <button className="live-hud-button" onClick={() => setLogsOpen(true)}>
              战报
            </button>
            <button
              className="live-hud-button overview-intervention-entry"
              onClick={() => setOverviewTab('intervention')}
            >
              主办方干预
            </button>
            <button className="live-hud-button" onClick={onBackToLive}>
              返回直播
            </button>
            <button
              className="live-hud-button live-hud-danger"
              onClick={() => setResetConfirmOpen(true)}
            >
              新开一局
            </button>
          </div>
        </header>

        <div className="overview-map arena-panel relative min-h-0 p-2">
          <div className="overview-map-frame commercial-map-frame">
            <img src="/ai-town/assets/reference/battle-arena-map.png" alt="AI 大逃杀战场总览地图" />
            <OverviewTerrainBoundaries areas={areaOverviews} targetedAreaId={targetAreaId} />
            {areaOverviews.map((area) => (
              <div
                key={area.id}
                className="overview-area-marker"
                style={mapPositionForArea(area.id)}
              >
                <AreaStatusMarker
                  area={area}
                  targeted={targetAreaId === area.id}
                  expanded={expandedAreaId === area.id}
                  popoverPlacement={isRightSideArea(area.id) ? 'left' : 'right'}
                  onSelectArea={() => setTargetAreaId(area.id)}
                  onFocusArea={() => onFocusArea(area.id)}
                  onToggleOccupants={() =>
                    setExpandedAreaId((current) => (current === area.id ? undefined : area.id))
                  }
                  onCloseOccupants={closeAreaPopover}
                  onFollowPlayer={(playerId) => {
                    setTargetPlayerId(playerId);
                    setExpandedAreaId(undefined);
                    onFollowPlayer(playerId);
                  }}
                />
              </div>
            ))}
            {battle?.interventionEffect && battle.interventionEffect.until > Date.now() && (
              <div
                className={`overview-intervention-effect is-${battle.interventionEffect.kind.split(':').pop()}`}
                style={mapPositionForArea(battle.interventionEffect.areaId ?? 'A01')}
              >
                <span>
                  <InterventionIcon kind={battle.interventionEffect.kind} />
                </span>
                <small>{interventionEffectLabel(battle.interventionEffect.kind)}</small>
              </div>
            )}
            <div className="overview-zone-warning" style={{ left: '74%', top: '73%' }}>
              禁区收缩 {formatCountdown(zoneCountdownSeconds)}
            </div>
            <div className="overview-map-legend">
              <span>
                <i className="legend-dot legend-dot-live" /> AI 直播中
              </span>
              <span>
                <i className="legend-dot legend-dot-hot" /> 高热度
              </span>
              <span>
                <i className="legend-dot legend-dot-closed" /> 已封锁
              </span>
            </div>
          </div>
        </div>

        <aside className="overview-rail commercial-overview-rail min-h-0">
          <OverviewSummary
            heat={heat}
            heatGrade={heatGrade}
            aliveCount={aliveCount}
            totalCount={players.length}
            comboMultiplier={battle?.comboMultiplier ?? 1}
            comboCount={battle?.comboCount ?? 0}
            interventionPoints={battle?.interventionPoints ?? 0}
            interventionPointsMax={battle?.interventionPointsMax ?? 30}
            feed={fullEventFeed}
          />
          <OverviewTabs active={overviewTab} onChange={setOverviewTab}>
            {overviewTab === 'intervention' && (
              <div className="overview-tab-stack">
                <div className="tab-section-heading">
                  <div>
                    <span>主办方干预</span>
                    <small>选择目标后执行事件</small>
                  </div>
                  <strong>{battle?.interventionPoints ?? 0} 点</strong>
                </div>
                <div
                  className="overview-batteries"
                  aria-label={`干预点 ${battle?.interventionPoints ?? 0} / ${battle?.interventionPointsMax ?? 30}`}
                >
                  {[0, 1, 2, 3, 4].map((slot) => (
                    <img
                      key={slot}
                      src={batteryAsset(slot, battle?.interventionPoints ?? 0)}
                      alt=""
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <button
                  className="arena-action arena-action-primary w-full"
                  onClick={openMineGame}
                  disabled={pending}
                >
                  扫雷补充干预点
                </button>
                <div className="driver-status">
                  {battle?.decisionDriverStatus ?? '规则 AI 接管'} · 模型决策{' '}
                  {battle?.decisionCount ?? 0}/{battle?.decisionMax ?? 240}
                </div>
                <div className="intervention-map-hint">
                  <strong>先点地图选区域</strong>
                  <span>再选择角色并执行干预</span>
                </div>
                <div className="intervention-target-grid">
                  <label>
                    角色目标
                    <select
                      value={interventionTarget?.id ?? ''}
                      onChange={(event) => setTargetPlayerId(event.target.value || undefined)}
                    >
                      {players
                        .filter((player) => !player.battle?.eliminated)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {game.playerDescriptions.get(player.id)?.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {showAllInterventions && (
                    <label>
                      第二角色
                      <select
                        value={secondTargetPlayerId ?? ''}
                        onChange={(event) =>
                          setSecondTargetPlayerId(event.target.value || undefined)
                        }
                      >
                        <option value="">选择结盟对象</option>
                        {players
                          .filter(
                            (player) =>
                              !player.battle?.eliminated && player.id !== interventionTarget?.id,
                          )
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {game.playerDescriptions.get(player.id)?.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
                <div className="target-area-readout">
                  角色目标{' '}
                  <strong>
                    {game.playerDescriptions.get(interventionTarget?.id as GameId<'players'>)
                      ?.name ?? '未选择'}
                  </strong>
                  <span>·</span>
                  地图目标 <strong>{displayAreaName(targetAreaId)}</strong>
                </div>
                <div className="intervention-operation-grid">
                  {visibleInterventionOperations.map((operation) => {
                    const needsPair = operation.target === 'pair';
                    return (
                      <button
                        key={operation.id}
                        className="arena-action disabled:opacity-40"
                        disabled={
                          pending ||
                          (battle?.interventionPoints ?? 0) < operation.cost ||
                          (needsPair && !secondTargetPlayerId)
                        }
                        onClick={() => void intervene(operation.id)}
                      >
                        {operation.name} · {operation.cost}点
                      </button>
                    );
                  })}
                </div>
                <button
                  className="console-text-button intervention-more-toggle"
                  onClick={() => setShowAllInterventions((current) => !current)}
                  aria-expanded={showAllInterventions}
                >
                  {showAllInterventions
                    ? '收起高级干预'
                    : `展开全部干预（${interventionOperations.length} 项）`}
                </button>
                {interventionTarget?.battle?.characterId === 'C12' && (
                  <button
                    className="arena-action arena-action-primary w-full disabled:opacity-40"
                    disabled={pending || (battle?.interventionPoints ?? 0) < 5}
                    onClick={() => void intervene('TRU_01')}
                  >
                    开启真相之间 · 5点
                  </button>
                )}
              </div>
            )}
            {overviewTab === 'tasks' && (
              <div className="overview-tab-stack task-overview-panel">
                <div className="task-summary-card is-primary">
                  <span>主线任务</span>
                  <strong>达到 S 级直播热度</strong>
                  <p>
                    当前 {heatGrade} 级 · 热度 {heat}/{POPULARITY_PROGRESSION.sHeat} · 已投入{' '}
                    {battle?.interventionSpentTotal ?? 0}/
                    {POPULARITY_PROGRESSION.sInterventionSpent} 点
                  </p>
                  <div className="task-progress">
                    <i
                      style={{
                        width: `${Math.min(100, (heat / POPULARITY_PROGRESSION.sHeat) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="task-summary-card">
                  <span>隐藏任务</span>
                  <strong>{activeTask?.title ?? '等待生成'}</strong>
                  <p>{activeTask?.description ?? '比赛开始后将生成隐藏任务。'}</p>
                </div>
                <div className="task-summary-card">
                  <span>真相线索</span>
                  <strong>{battle?.truthClues?.length ?? 0}/3</strong>
                  <p>揭开主办方隐藏的比赛真相</p>
                </div>
                <button
                  className="arena-action arena-action-primary w-full"
                  onClick={() => setTasksOpen(true)}
                >
                  打开完整任务清单
                </button>
              </div>
            )}
            {overviewTab === 'players' && (
              <div className="overview-player-list">
                {players.map((player) => {
                  const stats = player.battle!;
                  const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
                  const selectedRow = selected?.id === player.id;
                  return (
                    <button
                      key={player.id}
                      className="commercial-player-row"
                      data-selected={selectedRow}
                      onClick={() => {
                        setTargetPlayerId(player.id);
                        onFollowPlayer(player.id);
                      }}
                    >
                      <div>
                        <strong>{name}</strong>
                        <span>{stats.eliminated ? '已淘汰' : `${Math.ceil(stats.hp)} 生命`}</span>
                      </div>
                      <em>
                        热度 {stats.heat ?? 0} · {stats.areaId ?? 'A01'}
                      </em>
                    </button>
                  );
                })}
              </div>
            )}
          </OverviewTabs>
        </aside>
      </section>

      <AccessibleDialog
        open={tasksOpen}
        onClose={() => setTasksOpen(false)}
        title="任务清单"
        eyebrow="CTRL::TASKS"
        size="tasks"
      >
        <div className="task-dialog-list">
          <article className="task-card">
            <span>主线任务</span>
            <h3>达到 S 级直播热度</h3>
            <p>
              当前 {heatGrade} 级 · 热度 {heat} / {POPULARITY_PROGRESSION.sHeat} · 干预投入{' '}
              {battle?.interventionSpentTotal ?? 0} / {POPULARITY_PROGRESSION.sInterventionSpent}
            </p>
            <div className="task-progress">
              <i
                style={{ width: `${Math.min(100, (heat / POPULARITY_PROGRESSION.sHeat) * 100)}%` }}
              />
            </div>
          </article>
          <article className="task-card">
            <span>隐藏任务</span>
            <h3>{activeTask?.title ?? '等待生成'}</h3>
            <p>{activeTask?.description ?? '比赛开始后将生成隐藏任务。'}</p>
            <strong>{activeTask?.status ?? '进行中'}</strong>
          </article>
          <article className="task-card">
            <span>真相线索</span>
            <h3>揭开主办方的秘密</h3>
            <p>已收集 {battle?.truthClues?.length ?? 0} / 3 条线索</p>
          </article>
        </div>
        <footer className="dialog-status">
          TASK PROGRESS · 已完成 {battle?.completedMissionIds?.length ?? 0} · 干预点余额{' '}
          {battle?.interventionPoints ?? 0}
        </footer>
      </AccessibleDialog>

      <AccessibleDialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        title="全局日志"
        eyebrow="CTRL::LOGS"
        size="logs"
      >
        <div className="log-filters" aria-label="日志类型筛选">
          <button
            className={logFilter === 'all' ? 'is-selected' : ''}
            onClick={() => setLogFilter('all')}
          >
            全部
          </button>
          {(
            Object.entries(FEED_CATEGORIES) as [
              FeedCategory,
              (typeof FEED_CATEGORIES)[FeedCategory],
            ][]
          ).map(([key, category]) => (
            <button
              key={key}
              className={logFilter === key ? 'is-selected' : ''}
              onClick={() => setLogFilter(key)}
            >
              <img src={category.icon} alt="" aria-hidden="true" />
              {category.label}
            </button>
          ))}
        </div>
        <div className="global-log-list" aria-live="polite">
          {filteredEventFeed.length === 0 && <p className="empty-log">暂无该类型事件</p>}
          {filteredEventFeed.map((event) => (
            <div className="global-log-row" key={event.id}>
              <EventIcon kind={event.kind} />
              <time>{new Date(event.ts).toLocaleTimeString('zh-CN', { hour12: false })}</time>
              <strong style={{ color: FEED_CATEGORIES[categoryForEvent(event.kind)].color }}>
                [{FEED_CATEGORIES[categoryForEvent(event.kind)].label}]
              </strong>
              <span>{displayEventText(event.text)}</span>
            </div>
          ))}
        </div>
      </AccessibleDialog>

      {mineOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020914]/85 p-4 backdrop-blur-md">
            <div className="arena-console max-h-[calc(100vh-2rem)] w-full max-w-[480px] overflow-y-auto p-4 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="arena-kicker text-xs">观众挑战</div>
                  <h3 className="arena-heading text-4xl leading-none">扫雷挑战</h3>
                </div>
                <button
                  className="arena-action h-9 px-3 text-sm"
                  onClick={() => setMineOpen(false)}
                >
                  关闭
                </button>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                <Stat
                  label="安全格"
                  value={`${mineStats.safeRevealed}/${MINE_ROWS * MINE_COLS - MINE_COUNT}`}
                />
                <Stat label="标记" value={`${mineStats.flags}/${MINE_COUNT}`} />
                <Stat label="地雷" value={MINE_COUNT} />
                <Stat label="奖励" value={liveMineReward} />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className={`h-10 flex-1 border text-sm ${
                    flagMode ? 'arena-action-primary' : 'arena-action'
                  }`}
                  onClick={() => setFlagMode((value) => !value)}
                  disabled={mineStatus !== 'playing'}
                >
                  {flagMode ? '标记模式：开' : '翻开模式'}
                </button>
                <button className="arena-action h-10 flex-1 text-sm" onClick={openMineGame}>
                  新棋盘
                </button>
              </div>

              <div className="mt-3 grid grid-cols-8 gap-1">
                {mineBoard.map((cell) => (
                  <button
                    key={cell.id}
                    className={`aspect-square border text-base leading-none ${
                      cell.revealed
                        ? cell.mined
                          ? 'border-red-300 bg-red-500 text-white'
                          : 'border-cyan-300/60 bg-[#193653] text-cyan-100'
                        : cell.flagged
                          ? 'border-amber-200 bg-amber-400 text-[#071321]'
                          : 'border-slate-500/70 bg-[#10253b] text-slate-100 hover:bg-[#1d3b58]'
                    }`}
                    onClick={() => handleMineCell(cell.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      handleMineCell(cell.id, true);
                    }}
                    disabled={mineStatus !== 'playing' && !cell.revealed}
                  >
                    {getMineCellLabel(cell)}
                  </button>
                ))}
              </div>

              <div className="mt-3 min-h-[28px] text-sm text-slate-200">
                {mineStatus === 'playing' &&
                  '翻开安全格补充干预点。可切换标记模式，或右键标记地雷。'}
                {mineStatus === 'won' && '棋盘已清空，可以领取全部奖励并打赏 AI。'}
                {mineStatus === 'lost' && '踩到地雷，仍可领取已翻开安全格对应的部分奖励。'}
              </div>

              <button
                className="arena-action arena-action-primary mt-3 h-12 w-full text-lg disabled:opacity-40"
                onClick={() => void cashOutMineGame()}
                disabled={liveMineReward <= 0}
              >
                结算 {Math.max(1, Math.floor(liveMineReward / 25))} 点干预点
              </button>
            </div>
          </div>,
          document.body,
        )}
      {resetConfirmOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020914]/85 p-4 backdrop-blur-md">
            <div className="reset-dialog arena-console w-full max-w-md p-5 text-white">
              <div className="arena-kicker">主办方确认</div>
              <h3 className="arena-heading mt-1 text-3xl">开始新一局？</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                这会重置 12 名 AI、区域资源、关系、剧情、热度、干预点、模型决策计数和当前回合进度。
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="live-hud-button"
                  onClick={() => setResetConfirmOpen(false)}
                  disabled={pending}
                >
                  取消
                </button>
                <button
                  className="live-hud-button live-hud-danger"
                  onClick={() => {
                    void resetMatch().then(() => {
                      setResetConfirmOpen(false);
                      onMatchReset();
                    });
                  }}
                  disabled={pending}
                >
                  {pending ? '重置中…' : '确认新开局'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="arena-stat">
      <div className="arena-stat-label">{label}</div>
      <div className="arena-stat-value mt-1">{value}</div>
    </div>
  );
}

function mapPositionForArea(areaId: string) {
  const positions: Record<string, { left: string; top: string }> = {
    A01: { left: '27%', top: '18%' },
    A02: { left: '20%', top: '77%' },
    A03: { left: '39%', top: '76%' },
    A04: { left: '89%', top: '66%' },
    A05: { left: '73%', top: '80%' },
    A06: { left: '75%', top: '22%' },
    A07: { left: '84%', top: '42%' },
    A08: { left: '50%', top: '43%' },
    A09: { left: '22%', top: '46%' },
    A10: { left: '54%', top: '15%' },
    A11: { left: '56%', top: '79%' },
    A12: { left: '10%', top: '24%' },
  };
  return positions[areaId] ?? { left: '50%', top: '50%' };
}

function isRightSideArea(areaId: string) {
  return ['A04', 'A05', 'A06', 'A07', 'A11'].includes(areaId);
}

function displayAreaName(areaId: string) {
  const names: Record<string, string> = {
    A01: '堡垒废墟',
    A02: '演播塔',
    A03: '智库书库',
    A04: '格斗笼',
    A05: '学园废墟',
    A06: '战地医院',
    A07: '训练场',
    A08: '暗巷市场',
    A09: '武器库',
    A10: '密林深处',
    A11: '法庭遗址',
    A12: '观测站废墟',
    S01: '真相之间',
  };
  return names[areaId] ?? areaId;
}

function displayPhase(phase?: string) {
  return (
    ({ early: '前期阶段', mid: '中期阶段', late: '决胜阶段' } as Record<string, string>)[
      phase ?? 'early'
    ] ?? '战斗阶段'
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function interventionEffectLabel(kind: string) {
  if (kind.includes('SUP')) return '补给投放';
  if (kind.includes('ENV')) return '环境干预';
  if (kind.includes('INF')) return '情报干预';
  if (kind.includes('RUL')) return '规则干预';
  if (kind.includes('story')) return '区域剧情';
  return '主办方干预';
}

function batteryAsset(slot: number, points: number) {
  const filled = Math.ceil(Math.min(30, points) / 6);
  if (slot >= filled) return '/ai-town/assets/battle/ui/battery-red.png';
  return points <= 12
    ? '/ai-town/assets/battle/ui/battery-yellow.png'
    : '/ai-town/assets/battle/ui/battery-green.png';
}

function displayEventText(text: string) {
  return text
    .replace(
      'Battle royale lobby opened. Agents are dropping into AI Town.',
      '大逃杀大厅已开启，AI 正在进入战场。',
    )
    .replace('Match restarted. Everyone is back in the arena.', '比赛已重启，所有 AI 返回战场。')
    .replace(' is the last agent standing.', ' 成为最后的幸存者。')
    .replace('daylight', '白昼')
    .replace('nightfall', '夜幕降临')
    .replace(' reached the arena.', ' 抵达战场。')
    .replace(
      ' is now a permanent red zone. Agents must rotate.',
      ' 已成为永久危险区，AI 必须转移。',
    )
    .replace(' patched up with a medkit.', ' 使用医疗包恢复了状态。')
    .replace(' retreated to reset the fight.', ' 暂时撤退，重新调整战斗。')
    .replace(' found a medkit.', ' 搜索到医疗包。')
    .replace(' found a ', ' 搜索到 ')
    .replace(' bought a ', ' 购买了 ')
    .replace(' bought armor plating.', ' 购买了装甲板。');
}

function createMineBoard(safeCellId?: number) {
  const excludedIds =
    safeCellId === undefined
      ? new Set<number>()
      : new Set(
          Array.from({ length: MINE_ROWS * MINE_COLS }, (_, id) => id).filter((id) => {
            const row = Math.floor(id / MINE_COLS);
            const col = id % MINE_COLS;
            const safeRow = Math.floor(safeCellId / MINE_COLS);
            const safeCol = safeCellId % MINE_COLS;
            return Math.abs(row - safeRow) <= 1 && Math.abs(col - safeCol) <= 1;
          }),
        );
  const mineIds = new Set<number>();
  while (mineIds.size < MINE_COUNT) {
    const id = Math.floor(Math.random() * MINE_ROWS * MINE_COLS);
    if (!excludedIds.has(id)) {
      mineIds.add(id);
    }
  }
  return Array.from({ length: MINE_ROWS * MINE_COLS }, (_, id): MineCell => {
    const row = Math.floor(id / MINE_COLS);
    const col = id % MINE_COLS;
    return {
      id,
      row,
      col,
      mined: mineIds.has(id),
      adjacent: 0,
      revealed: false,
      flagged: false,
    };
  }).map((cell, _, board) => ({
    ...cell,
    adjacent: getNeighbors(board, cell.id).filter((neighbor) => neighbor.mined).length,
  }));
}

function getNeighbors(board: MineCell[], cellId: number) {
  const cell = board[cellId];
  if (!cell) {
    return [];
  }
  return board.filter(
    (candidate) =>
      Math.abs(candidate.row - cell.row) <= 1 &&
      Math.abs(candidate.col - cell.col) <= 1 &&
      candidate.id !== cell.id,
  );
}

function revealSafeCells(board: MineCell[], startId: number) {
  const nextBoard = board.map((cell) => ({ ...cell }));
  const queue = [startId];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    const cell = nextBoard[id];
    if (!cell || visited.has(id) || cell.flagged || cell.mined) {
      continue;
    }
    visited.add(id);
    cell.revealed = true;
    if (cell.adjacent === 0) {
      getNeighbors(nextBoard, id).forEach((neighbor) => {
        if (!neighbor.revealed && !neighbor.mined) {
          queue.push(neighbor.id);
        }
      });
    }
  }
  return nextBoard;
}

function getMineStats(board: MineCell[]) {
  return board.reduce(
    (stats, cell) => ({
      safeRevealed: stats.safeRevealed + Number(cell.revealed && !cell.mined),
      flags: stats.flags + Number(cell.flagged),
      correctFlags: stats.correctFlags + Number(cell.flagged && cell.mined),
    }),
    { safeRevealed: 0, flags: 0, correctFlags: 0 },
  );
}

function getMineReward(stats: ReturnType<typeof getMineStats>, status: MineStatus) {
  const baseReward = stats.safeRevealed * 3 + stats.correctFlags * 8;
  if (status === 'won') {
    return baseReward + 80;
  }
  if (status === 'lost') {
    return Math.floor(baseReward * 0.4);
  }
  return baseReward;
}

function getMineCellLabel(cell: MineCell) {
  if (cell.flagged && !cell.revealed) {
    return '!';
  }
  if (!cell.revealed) {
    return '';
  }
  if (cell.mined) {
    return '*';
  }
  return cell.adjacent > 0 ? cell.adjacent : '';
}
