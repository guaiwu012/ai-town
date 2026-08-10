import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';
import { SelectElement } from './Player';
import { BATTLE_CONFIG, INTERVENTION_OPERATIONS } from '../../data/battleRoyaleConfig';

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
  setSelectedElement: SelectElement;
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
  setSelectedElement,
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
  const interventionTarget = targetPlayerId ? game.world.players.get(targetPlayerId as GameId<'players'>) : selected;
  const aliveCount = players.filter((player) => !player.battle?.eliminated).length;
  const battle = game.world.battle;
  const heat = battle?.popularity ?? 0;
  const heatGrade = heat >= 700 ? 'S' : heat >= 500 ? 'A' : heat >= 300 ? 'B' : 'C';
  const hotPlayer = players.reduce(
    (current, player) => (player.battle?.heat ?? 0) > (current?.battle?.heat ?? 0) ? player : current,
    players[0],
  );
  const openAreas = battle?.openAreas ?? BATTLE_CONFIG.areas.map((area) => area.id);
  const activeAreaLocks = (battle?.areaLocks ?? []).filter((lock) => lock.until > Date.now());
  const activeTask = battle?.hiddenMissions?.[0];
  const eventFeed = (battle?.feed ?? []).slice(0, 6);
  const zoneCountdownSeconds = Math.max(0, Math.ceil(((battle?.zoneClosesAt ?? Date.now()) - Date.now()) / 1000));

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
          targetPlayerId: operation.target === 'player' || operation.target === 'pair' || opId === 'TRU_01' ? interventionTarget?.id : undefined,
          secondPlayerId: operation.target === 'pair' ? secondTargetPlayerId as GameId<'players'> | undefined : undefined,
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
    <section className="overview-console pointer-events-auto grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_350px] grid-rows-[minmax(0,1fr)_148px] gap-2 p-2">
      <div className="overview-map arena-panel relative min-h-0 p-2">
        <div className="overview-map-heading absolute left-5 top-4 z-10">
          <div className="flex items-center gap-2"><div className="arena-kicker">战略总览</div><button className="live-hud-button" onClick={onBackToLive}>返回直播跟随</button><button className="live-hud-button live-hud-danger" onClick={() => setResetConfirmOpen(true)}>新开一局</button></div>
          <h2 className="arena-heading mt-1 font-display text-4xl leading-none">AI 大逃杀</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-slate-300">
            <span>第 {battle?.day ?? 1} 天</span>
            <span>{battle?.timeOfDay === 'night' ? '夜间' : '白天'}</span>
            <span>{displayPhase(battle?.phase)}</span>
            <span>{openAreas.length} 个区域开放</span>
            <span>禁区收缩 {formatCountdown(zoneCountdownSeconds)}</span>
          </div>
        </div>
        <div className="overview-map-frame">
          <img src="/ai-town/assets/reference/battle-arena-map.png" alt="AI 大逃杀战场总览地图" />
          {BATTLE_CONFIG.areas.filter((area) => area.id !== 'S01').map((area) => {
            const occupants = players.filter((player) => player.battle?.areaId === area.id);
            const resource = battle?.areaResources?.find((entry) => entry.areaId === area.id);
            const areaLock = activeAreaLocks.find((lock) => lock.areaId === area.id);
            return (
              <div
                key={area.id}
                className={`overview-area-marker ${openAreas.includes(area.id) ? '' : 'is-closed'}`}
                style={mapPositionForArea(area.id)}
              >
                <div className="overview-area-actions">
                  <button className={`overview-area-label ${targetAreaId === area.id ? 'is-targeted' : ''}`} onClick={() => setTargetAreaId(area.id)}>{displayAreaName(area.id)}</button>
                  <button className="overview-area-watch" aria-label={`切入${displayAreaName(area.id)}直播镜头`} title={`切入${displayAreaName(area.id)}直播镜头`} onClick={() => onFocusArea(area.id)}>◎</button>
                </div>
                <div className="overview-area-resource">资源 {resource?.remaining ?? '--'}/{resource?.max ?? '--'}</div>
                {areaLock && <div className="overview-area-lock">笼门封锁 {Math.ceil((areaLock.until - Date.now()) / 1000)} 秒</div>}
                <div className="overview-area-agents">
                  {occupants.map((player) => {
                    const stats = player.battle!;
                    const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
                    return (
                      <button
                        key={player.id}
                        className={`overview-agent-dot ${selected?.id === player.id ? 'is-selected' : ''} ${stats.eliminated ? 'is-out' : ''}`}
                        title={`${name} · ${displayWeapon(stats.weapon)} · ${Math.ceil(stats.hp)} 生命`}
                        onClick={() => { setTargetPlayerId(player.id); onFollowPlayer(player.id); }}
                      >
                        <span>{area.owner === stats.characterId ? '◆' : '●'}</span>
                        <small>{name}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {battle?.interventionEffect && battle.interventionEffect.until > Date.now() && (
            <div className={`overview-intervention-effect is-${battle.interventionEffect.kind.split(':').pop()}`} style={mapPositionForArea(battle.interventionEffect.areaId ?? 'A01')}>
              <span>{interventionEffectIcon(battle.interventionEffect.kind)}</span>
              <small>{interventionEffectLabel(battle.interventionEffect.kind)}</small>
            </div>
          )}
          <div className="overview-zone-warning" style={{ left: '74%', top: '73%' }}>禁区收缩 {formatCountdown(zoneCountdownSeconds)}</div>
          <div className="overview-map-legend">
            <span><i className="legend-dot legend-dot-live" /> AI 直播中</span>
            <span><i className="legend-dot legend-dot-hot" /> 高热度</span>
            <span><i className="legend-dot legend-dot-closed" /> 已封锁</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="存活人数" value={aliveCount} />
          <Stat label="AI 总数" value={players.length} />
          <Stat label="可用干预点" value={`${battle?.interventionPoints ?? 0}/${battle?.interventionPointsMax ?? 30}`} />
        </div>
      </div>

      <aside className="overview-rail min-h-0 space-y-2 overflow-y-auto pr-0.5">
        <div className="arena-panel p-3">
          <div className="arena-panel-title">直播热度</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <strong className="overview-heat-number">{heat}</strong>
            <span className="overview-heat-grade">{heatGrade} <span>→</span> {Math.min(999, heat + 65)}</span>
          </div>
          <div className="overview-heat-bar mt-2"><div style={{ width: `${Math.min(100, heat / 8)}%` }} /></div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>连击倍率</span><span>×{battle?.comboMultiplier ?? 1} · {battle?.comboCount ?? 0} 连击</span></div>
        </div>

        <div className="arena-panel p-3">
          <div className="arena-panel-title">热度趋势</div>
          <div className="overview-trend mt-2" aria-label="直播热度趋势">
            {[28, 34, 31, 42, 46, 44, 58, 62, 59, 72, 78, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-slate-500"><span>过去 5 分钟</span><span>当前</span></div>
        </div>

        <div className="arena-panel p-3">
          <div className="arena-panel-title">干预点数</div>
          <div className="overview-bolts mt-2">{[0, 1, 2, 3, 4].map((bolt) => <span key={bolt} className={bolt < Math.min(5, battle?.interventionPoints ?? 0) ? 'is-on' : ''}>ϟ</span>)}</div>
          <div className="mt-1 text-right text-2xl text-amber-200">{battle?.interventionPoints ?? 0} / {battle?.interventionPointsMax ?? 30}</div>
          <button className="arena-action arena-action-primary mt-2 h-10 w-full text-xs" onClick={openMineGame} disabled={pending}>扫雷补充干预点</button>
          <div className="mt-2 text-xs text-cyan-100">{battle?.decisionDriverStatus ?? '规则 AI 接管'} · 模型决策 {battle?.decisionCount ?? 0}/{battle?.decisionMax ?? 240}</div>
        </div>

        <div className="arena-panel p-3">
          <div className="flex items-center justify-between"><div className="arena-panel-title">任务</div><span className="overview-alert">!</span></div>
          <div className="mt-2 text-sm text-amber-100">主线：达到 S 级直播热度</div>
          <div className="mt-1 text-xs text-slate-300">当前：{heatGrade} 级 · {heat} / 500</div>
          <div className="mt-3 border-t border-slate-600/60 pt-2 text-xs text-slate-300">隐藏任务：{activeTask ? `「${activeTask.title}」${activeTask.description}` : '等待生成'}</div>
          <div className="mt-1 text-xs text-emerald-300">状态：{activeTask?.status ?? '进行中'} · 真相线索 {battle?.truthClues?.length ?? 0}/3</div>
        </div>

        <div className="arena-panel p-3">
          <div className="arena-panel-title">主办方干预</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <label className="text-slate-300">角色目标
              <select className="mt-1 w-full border border-slate-500 bg-[#0b2032] p-1 text-xs text-slate-100" value={interventionTarget?.id ?? ''} onChange={(event) => setTargetPlayerId(event.target.value || undefined)}>
                {players.filter((player) => !player.battle?.eliminated).map((player) => <option key={player.id} value={player.id}>{game.playerDescriptions.get(player.id)?.name}</option>)}
              </select>
            </label>
            <label className="text-slate-300">第二角色
              <select className="mt-1 w-full border border-slate-500 bg-[#0b2032] p-1 text-xs text-slate-100" value={secondTargetPlayerId ?? ''} onChange={(event) => setSecondTargetPlayerId(event.target.value || undefined)}>
                <option value="">选择结盟对象</option>
                {players.filter((player) => !player.battle?.eliminated && player.id !== interventionTarget?.id).map((player) => <option key={player.id} value={player.id}>{game.playerDescriptions.get(player.id)?.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 text-xs text-cyan-200">地图目标：{displayAreaName(targetAreaId)}（点击地图区域名称切换）</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {INTERVENTION_OPERATIONS.filter((operation) => operation.id !== 'TRU_01').map((operation) => {
              const needsPair = operation.target === 'pair';
              return <button key={operation.id} className="arena-action h-10 text-xs disabled:opacity-40" disabled={pending || (battle?.interventionPoints ?? 0) < operation.cost || (needsPair && !secondTargetPlayerId)} onClick={() => intervene(operation.id)}>{operation.name} · {operation.cost}点</button>;
            })}
          </div>
          {interventionTarget?.battle?.characterId === 'C12' && <button className="arena-action arena-action-primary mt-2 h-10 w-full text-xs disabled:opacity-40" disabled={pending || (battle?.interventionPoints ?? 0) < 5} onClick={() => intervene('TRU_01')}>开启真相之间 · 5点</button>}
        </div>

        <div className="arena-panel p-3">
          <div className="mb-2 flex items-center justify-between"><h3 className="arena-panel-title">参赛 AI</h3><span className="text-[10px] uppercase tracking-wider text-slate-500">点击追随镜头</span></div>
          <div className="space-y-2">
          {players.map((player) => {
            const stats = player.battle!;
            const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
            const selectedRow = selected?.id === player.id;
            return (
              <button
                key={player.id}
                className="arena-agent-row w-full p-2 text-left transition"
                data-selected={selectedRow}
                onClick={() => { setTargetPlayerId(player.id); onFollowPlayer(player.id); }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-base text-[#f0dfc7]">{name}</span>
                  <span className="text-xs text-[#87a0b2]">
                    {stats.eliminated ? '已淘汰' : `${Math.ceil(stats.hp)} 生命`}
                  </span>
                </div>
                <div className="arena-progress mt-1">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#b4c3cc]">
                  <span>{displayWeapon(stats.weapon)}</span>
                  <span>{stats.coins} 物资</span>
                  <span>{stats.kills} 击杀</span>
                  <span>{stats.medkits} 医疗包</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6fe1c2]">
                  <span>热度 {stats.heat ?? 0}</span>
                  <span>{stats.areaId ?? 'A01'}</span>
                  <span>体力 {Math.ceil(stats.stamina ?? 0)}</span>
                  <span>背包 {(stats.inventory ?? []).length}/{BATTLE_CONFIG.match.maxInventorySlots}</span>
                </div>
                {player.activity && player.activity.until > Date.now() && (
                    <div className="mt-1 truncate text-xs text-[#e2b85e]">
                    {player.activity.description}
                  </div>
                )}
                {stats.lastDecisionStatus && (
                  <div className="mt-1 border-t border-slate-700/70 pt-1 text-[10px] text-cyan-200">
                    决策：{stats.lastDecisionStatus}{stats.lastDecisionAction ? ` · ${displayDecisionAction(stats.lastDecisionAction)}` : ''}{stats.lastDecisionReason ? ` · ${stats.lastDecisionReason}` : ''}{stats.lastDecisionFallback ? ` · ${stats.lastDecisionFallback}` : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        </div>

      <div className="arena-panel p-3">
        <h3 className="arena-panel-title">观众干预台</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <Stat label="可用干预点" value={`${battle?.interventionPoints ?? 0}/${battle?.interventionPointsMax ?? 30}`} />
          <Stat label="扫雷棋盘" value={`${MINE_ROWS}×${MINE_COLS}`} />
        </div>
        <button
          className="arena-action arena-action-primary mt-3 h-14 w-full text-xl disabled:opacity-50"
          onClick={openMineGame}
          disabled={pending}
        >
          开始扫雷
        </button>
        <div className="mt-2 text-center text-xs text-slate-300">扫雷得分会直接兑换为主办方干预点</div>
      </div>
      </aside>

      <div className="overview-feed arena-panel min-h-0 overflow-hidden p-3">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="arena-panel-title">公屏播报</h3>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">实时事件流</span>
        </div>
        <div className="grid gap-0.5">
          {eventFeed.length === 0 && <div className="py-2 text-xs text-slate-500">等待第一条直播事件...</div>}
          {eventFeed.map((event) => (
            <div key={event.id} className="arena-feed-row flex items-center gap-3 truncate py-1 text-xs">
              <span className="arena-feed-tag shrink-0">[{displayEventKind(event.kind)}]</span>
              <span className="truncate text-slate-200">{displayEventText(event.text)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

      {mineOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020914]/85 p-4 backdrop-blur-md">
          <div className="arena-console max-h-[calc(100vh-2rem)] w-full max-w-[480px] overflow-y-auto p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="arena-kicker text-xs">
                  观众挑战
                </div>
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
                  flagMode
                    ? 'arena-action-primary'
                    : 'arena-action'
                }`}
                onClick={() => setFlagMode((value) => !value)}
                disabled={mineStatus !== 'playing'}
              >
                {flagMode ? '标记模式：开' : '翻开模式'}
              </button>
              <button
                className="arena-action h-10 flex-1 text-sm"
                onClick={openMineGame}
              >
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
              onClick={cashOutMineGame}
              disabled={liveMineReward <= 0}
            >
              结算 {Math.max(1, Math.floor(liveMineReward / 25))} 点干预点
            </button>
          </div>
        </div>,
          document.body,
        )}
      {resetConfirmOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020914]/85 p-4 backdrop-blur-md">
          <div className="reset-dialog arena-console w-full max-w-md p-5 text-white">
            <div className="arena-kicker">主办方确认</div>
            <h3 className="arena-heading mt-1 text-3xl">开始新一局？</h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">这会重置 12 名 AI、区域资源、关系、剧情、热度、干预点、模型决策计数和当前回合进度。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="live-hud-button" onClick={() => setResetConfirmOpen(false)} disabled={pending}>取消</button>
              <button className="live-hud-button live-hud-danger" onClick={async () => { await resetMatch(); setResetConfirmOpen(false); onMatchReset(); }} disabled={pending}>{pending ? '重置中…' : '确认新开局'}</button>
            </div>
          </div>
        </div>, document.body)}
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
    A01: { left: '17%', top: '19%' },
    A02: { left: '8%', top: '49%' },
    A03: { left: '36%', top: '86%' },
    A04: { left: '70%', top: '45%' },
    A05: { left: '79%', top: '79%' },
    A06: { left: '79%', top: '16%' },
    A07: { left: '77%', top: '39%' },
    A08: { left: '47%', top: '45%' },
    A09: { left: '26%', top: '58%' },
    A10: { left: '52%', top: '18%' },
    A11: { left: '60%', top: '77%' },
    A12: { left: '21%', top: '8%' },
  };
  return positions[areaId] ?? { left: '50%', top: '50%' };
}

function displayAreaName(areaId: string) {
  const names: Record<string, string> = {
    A01: '堡垒废墟', A02: '演播塔', A03: '智库书库', A04: '格斗笼',
    A05: '学园废墟', A06: '战地医院', A07: '训练场', A08: '暗巷市场',
    A09: '武器库', A10: '密林深处', A11: '法庭遗址', A12: '观测站废墟', S01: '真相之间',
  };
  return names[areaId] ?? areaId;
}

function displayWeapon(weapon: string) {
  return ({ Fists: '拳头', Pistol: '手枪', Shotgun: '霰弹枪', Rifle: '步枪', Sniper: '狙击枪' } as Record<string, string>)[weapon] ?? weapon;
}

function displayPhase(phase?: string) {
  return ({ early: '前期阶段', mid: '中期阶段', late: '决胜阶段' } as Record<string, string>)[phase ?? 'early'] ?? '战斗阶段';
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function displayEventKind(kind: string) {
  return ({ system: '系统', attack: '战斗', eliminate: '淘汰', zone: '禁区', loot: '搜索', buy: '交易', trade: '交易', heal: '治疗', move: '移动', ally: '结盟', alliance: '结盟', betrayal: '背叛', audience: '观众', winner: '胜利', intervention: '主办方', story: '剧情', areaStory: '区域剧情', globalStory: '全局事件', clue: '线索', mission: '任务', truth: '真相', heat: '热度', decision: '决策', reaction: '反应', investigate: '调查', resource: '资源', item: '物品' } as Record<string, string>)[kind] ?? kind;
}

function displayDecisionAction(action: string) {
  return ({ move: '移动', search: '搜索', buy: '购买', trade: '交易', ally: '结盟', attack: '攻击', flee: '撤离', heal: '治疗', investigate: '调查' } as Record<string, string>)[action] ?? action;
}

function interventionEffectIcon(kind: string) {
  if (kind.includes('SUP')) return '▣';
  if (kind.includes('ENV') || kind.includes('damage')) return '✦';
  if (kind.includes('INF') || kind.includes('clue')) return '◈';
  if (kind.includes('RUL') || kind.includes('alliance')) return '⟐';
  return '◆';
}

function interventionEffectLabel(kind: string) {
  if (kind.includes('SUP')) return '补给投放';
  if (kind.includes('ENV')) return '环境干预';
  if (kind.includes('INF')) return '情报干预';
  if (kind.includes('RUL')) return '规则干预';
  if (kind.includes('story')) return '区域剧情';
  return '主办方干预';
}

function displayEventText(text: string) {
  return text
    .replace('Battle royale lobby opened. Agents are dropping into AI Town.', '大逃杀大厅已开启，AI 正在进入战场。')
    .replace('Match restarted. Everyone is back in the arena.', '比赛已重启，所有 AI 返回战场。')
    .replace(' is the last agent standing.', ' 成为最后的幸存者。')
    .replace('daylight', '白昼').replace('nightfall', '夜幕降临')
    .replace(' reached the arena.', ' 抵达战场。')
    .replace(' is now a permanent red zone. Agents must rotate.', ' 已成为永久危险区，AI 必须转移。')
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
