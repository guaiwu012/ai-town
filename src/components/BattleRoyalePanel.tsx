import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { ServerGame } from '../hooks/serverGame';
import { SelectElement } from './Player';
import { BATTLE_CONFIG } from '../../data/battleRoyaleConfig';

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
  onEditDeepSeekConfig: () => void;
};

export default function BattleRoyalePanel({
  worldId,
  game,
  selectedPlayerId,
  setSelectedElement,
  onEditDeepSeekConfig,
}: BattleRoyalePanelProps) {
  const sendInput = useMutation(api.aiTown.main.sendInput);
  const resetBattleMutation = useMutation(api.world.resetBattle);
  const [tipCoins, setTipCoins] = useState(0);
  const [mineOpen, setMineOpen] = useState(false);
  const [mineBoard, setMineBoard] = useState(() => createMineBoard());
  const [mineStatus, setMineStatus] = useState<MineStatus>('ready');
  const [flagMode, setFlagMode] = useState(false);
  const [pending, setPending] = useState(false);

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
  const aliveCount = players.filter((player) => !player.battle?.eliminated).length;

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

  const cashOutMineGame = () => {
    setTipCoins(liveMineReward);
    setMineOpen(false);
  };

  const tipSelected = async () => {
    if (!selected || selected.battle?.eliminated || tipCoins <= 0) {
      return;
    }
    setPending(true);
    try {
      await sendInput({
        worldId,
        name: 'tipAgent',
        args: {
          playerId: selected.id,
          score: tipCoins,
        },
      });
      setTipCoins(0);
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
      await sendInput({
        worldId,
        name: 'resetBattle',
        args: {},
      });
      setTipCoins(0);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="flex min-h-full min-w-0 flex-col gap-4">
      <header className="arena-panel p-3">
        <div className="arena-kicker">Live battle control</div>
        <h2 className="arena-heading mt-1 font-display text-4xl leading-none">AI Battleground</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Alive" value={aliveCount} />
          <Stat label="Agents" value={players.length} />
          <Stat label="Tip Ready" value={tipCoins} />
        </div>
        <div className="arena-map-frame mt-3">
          <img src="/ai-town/assets/reference/battle-arena-map.png" alt="AI battle royale area map" />
          <span className="arena-map-chip" style={{ left: '8%', top: '18%' }}>A12 OBSERVATORY</span>
          <span className="arena-map-chip" style={{ left: '39%', top: '46%' }}>A08 MARKET</span>
          <span className="arena-map-chip" style={{ right: '6%', top: '56%' }}>A04 PIT</span>
          <span className="arena-map-chip" style={{ left: '37%', bottom: '8%' }}>A03 ARCHIVE</span>
          <span className="arena-map-chip" style={{ right: '7%', bottom: '12%' }}>A05 ACADEMY</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="arena-stat">
            <div className="arena-stat-label">Schema</div>
            <div className="mt-1 text-sm text-[#e2b85e]">12 agents / 13 zones</div>
          </div>
          <div className="arena-stat">
            <div className="arena-stat-label">Relations</div>
            <div className="mt-1 text-sm text-[#6fe1c2]">4 seed links</div>
          </div>
        </div>
        <button
          className="arena-action mt-3 h-9 w-full text-sm disabled:opacity-40"
          onClick={resetMatch}
          disabled={pending}
        >
          Restart Match
        </button>
        <button
          className="arena-action mt-2 h-9 w-full text-sm"
          onClick={onEditDeepSeekConfig}
        >
          DS API
        </button>
      </header>

      <div className="arena-panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="arena-panel-title">Contestants</h3>
          <span className="text-xs text-[#87a0b2]">select to follow</span>
        </div>
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
                onClick={() => setSelectedElement({ kind: 'player', id: player.id })}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-base text-[#f0dfc7]">{name}</span>
                  <span className="text-xs text-[#87a0b2]">
                    {stats.eliminated ? 'OUT' : `${Math.ceil(stats.hp)} HP`}
                  </span>
                </div>
                <div className="arena-progress mt-1">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#b4c3cc]">
                  <span>{stats.weapon}</span>
                  <span>{stats.coins} coins</span>
                  <span>{stats.kills} K</span>
                  <span>{stats.medkits} kits</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6fe1c2]">
                  <span>Heat {stats.heat ?? 0}</span>
                  <span>{stats.areaId ?? 'A01'}</span>
                  <span>Stamina {Math.ceil(stats.stamina ?? 0)}</span>
                  <span>Bag {(stats.inventory ?? []).length}/{BATTLE_CONFIG.match.maxInventorySlots}</span>
                </div>
                {player.activity && player.activity.until > Date.now() && (
                    <div className="mt-1 truncate text-xs text-[#e2b85e]">
                    {player.activity.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="arena-panel p-3">
        <h3 className="arena-panel-title">Intervention Deck</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Bank" value={tipCoins} />
          <Stat label="Board" value={`${MINE_ROWS}x${MINE_COLS}`} />
        </div>
        <button
          className="arena-action arena-action-primary mt-3 h-14 w-full text-xl disabled:opacity-50"
          onClick={openMineGame}
          disabled={pending}
        >
          PLAY MINESWEEPER
        </button>
        <button
          className="arena-action mt-2 h-12 w-full text-lg disabled:opacity-40"
          onClick={tipSelected}
          disabled={pending || !selected || tipCoins <= 0 || selected.battle?.eliminated}
        >
          Tip {selected ? game.playerDescriptions.get(selected.id)?.name : 'agent'}
        </button>
      </div>

      {mineOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020914]/85 p-4 backdrop-blur-md">
          <div className="arena-console max-h-[calc(100vh-2rem)] w-full max-w-[480px] overflow-y-auto p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="arena-kicker text-xs">
                  audience sweep
                </div>
                <h3 className="arena-heading text-4xl leading-none">Minesweeper</h3>
              </div>
              <button
                className="arena-action h-9 px-3 text-sm"
                onClick={() => setMineOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
              <Stat
                label="Safe"
                value={`${mineStats.safeRevealed}/${MINE_ROWS * MINE_COLS - MINE_COUNT}`}
              />
              <Stat label="Flags" value={`${mineStats.flags}/${MINE_COUNT}`} />
              <Stat label="Mines" value={MINE_COUNT} />
              <Stat label="Reward" value={liveMineReward} />
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
                {flagMode ? 'FLAG MODE ON' : 'REVEAL MODE'}
              </button>
              <button
                className="arena-action h-10 flex-1 text-sm"
                onClick={openMineGame}
              >
                New Board
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
                'Reveal safe cells for coins. Toggle flag mode or right-click to mark mines.'}
              {mineStatus === 'won' && 'Board cleared. Cash out the full reward for your agent.'}
              {mineStatus === 'lost' && 'Mine hit. You keep a reduced reward from revealed safe cells.'}
            </div>

            <button
              className="arena-action arena-action-primary mt-3 h-12 w-full text-lg disabled:opacity-40"
              onClick={cashOutMineGame}
              disabled={liveMineReward <= 0}
            >
              Cash Out {liveMineReward} Coins
            </button>
          </div>
        </div>,
          document.body,
        )}
    </section>
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
