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
    <section className="flex min-h-full min-w-0 flex-col gap-5 text-white">
      <header>
        <div className="text-sm uppercase tracking-wide text-amber-200">Live battle demo</div>
        <h2 className="font-display text-4xl leading-none text-amber-100">AI Battleground</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Alive" value={aliveCount} />
          <Stat label="Agents" value={players.length} />
          <Stat label="Tip Ready" value={tipCoins} />
        </div>
        <div className="mt-2 border border-brown-500 bg-brown-900/70 p-2 text-xs text-brown-100">
          <div className="flex justify-between gap-2">
            <span>Match schema</span>
            <span className="text-amber-200">12 contestants / 13 areas</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span>Configured relations</span>
            <span className="text-sky-200">4 seed links</span>
          </div>
        </div>
        <details className="mt-2 border border-brown-500 bg-brown-900/70 p-2 text-xs text-brown-100">
          <summary className="cursor-pointer text-amber-200">Arena layout reference</summary>
          <img
            className="mt-2 w-full border border-brown-500 bg-black/30"
            src="/ai-town/assets/reference/battle-map-layout.png"
            alt="Configured battle royale area layout"
          />
        </details>
        <button
          className="mt-3 h-9 w-full border border-amber-300/70 bg-brown-700 text-sm text-amber-100 disabled:opacity-40"
          onClick={resetMatch}
          disabled={pending}
        >
          Restart Match
        </button>
        <button
          className="mt-2 h-9 w-full border border-clay-300/70 bg-clay-700 text-sm text-clay-100"
          onClick={onEditDeepSeekConfig}
        >
          DS API
        </button>
      </header>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-3xl text-amber-100">Squads</h3>
          <span className="text-xs text-brown-200">click an agent</span>
        </div>
        <div className="space-y-2">
          {players.map((player) => {
            const stats = player.battle!;
            const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
            const selectedRow = selected?.id === player.id;
            return (
              <button
                key={player.id}
                className={`w-full border border-brown-500 bg-brown-900/70 p-2 text-left transition ${
                  selectedRow ? 'outline outline-2 outline-amber-300' : 'hover:bg-brown-700'
                }`}
                onClick={() => setSelectedElement({ kind: 'player', id: player.id })}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-lg text-amber-50">{name}</span>
                  <span className="text-xs text-brown-100">
                    {stats.eliminated ? 'OUT' : `${Math.ceil(stats.hp)} HP`}
                  </span>
                </div>
                <div className="mt-1 h-2 bg-brown-700">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brown-100">
                  <span>{stats.weapon}</span>
                  <span>{stats.coins} coins</span>
                  <span>{stats.kills} K</span>
                  <span>{stats.medkits} kits</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-sky-200">
                  <span>Heat {stats.heat ?? 0}</span>
                  <span>{stats.areaId ?? 'A01'}</span>
                  <span>Stamina {Math.ceil(stats.stamina ?? 0)}</span>
                  <span>Bag {(stats.inventory ?? []).length}/{BATTLE_CONFIG.match.maxInventorySlots}</span>
                </div>
                {player.activity && player.activity.until > Date.now() && (
                  <div className="mt-1 truncate text-xs text-amber-200">
                    {player.activity.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-brown-500 bg-brown-900/70 p-3">
        <h3 className="font-display text-3xl text-amber-100">Audience Game</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Bank" value={tipCoins} />
          <Stat label="Board" value={`${MINE_ROWS}x${MINE_COLS}`} />
        </div>
        <button
          className="mt-3 h-14 w-full border-2 border-amber-300 bg-amber-500 text-xl text-brown-900 disabled:opacity-50"
          onClick={openMineGame}
          disabled={pending}
        >
          PLAY MINESWEEPER
        </button>
        <button
          className="mt-2 h-12 w-full border border-emerald-300 bg-emerald-500 text-lg text-brown-900 disabled:opacity-40"
          onClick={tipSelected}
          disabled={pending || !selected || tipCoins <= 0 || selected.battle?.eliminated}
        >
          Tip {selected ? game.playerDescriptions.get(selected.id)?.name : 'agent'}
        </button>
      </div>

      {mineOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/80 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-[480px] overflow-y-auto border-2 border-amber-300 bg-brown-900 p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-amber-200">
                  audience sweep
                </div>
                <h3 className="font-display text-4xl leading-none text-amber-100">Minesweeper</h3>
              </div>
              <button
                className="h-9 border border-brown-500 px-3 text-sm text-brown-100 hover:bg-brown-800"
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
                    ? 'border-amber-300 bg-amber-500 text-brown-900'
                    : 'border-brown-500 bg-brown-800 text-brown-100'
                }`}
                onClick={() => setFlagMode((value) => !value)}
                disabled={mineStatus !== 'playing'}
              >
                {flagMode ? 'FLAG MODE ON' : 'REVEAL MODE'}
              </button>
              <button
                className="h-10 flex-1 border border-brown-500 bg-brown-800 text-sm text-brown-100 hover:bg-brown-700"
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
                        : 'border-clay-500 bg-clay-700 text-amber-100'
                      : cell.flagged
                        ? 'border-amber-300 bg-amber-500 text-brown-900'
                        : 'border-brown-500 bg-brown-700 text-brown-100 hover:bg-brown-500'
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

            <div className="mt-3 min-h-[28px] text-sm text-brown-100">
              {mineStatus === 'playing' &&
                'Reveal safe cells for coins. Toggle flag mode or right-click to mark mines.'}
              {mineStatus === 'won' && 'Board cleared. Cash out the full reward for your agent.'}
              {mineStatus === 'lost' && 'Mine hit. You keep a reduced reward from revealed safe cells.'}
            </div>

            <button
              className="mt-3 h-12 w-full border border-emerald-300 bg-emerald-500 text-lg text-brown-900 disabled:opacity-40"
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
    <div className="border border-brown-500 bg-brown-900/70 px-2 py-2">
      <div className="text-[10px] uppercase text-brown-200">{label}</div>
      <div className="text-lg text-amber-100">{value}</div>
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
