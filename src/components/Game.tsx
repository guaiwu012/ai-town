import { useEffect, useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';
import BattleRoyalePanel from './BattleRoyalePanel.tsx';
import BattleBroadcastToasts from './BattleBroadcastToasts.tsx';
import DeepSeekConfigGate, {
  DeepSeekConfig,
  readDeepSeekConfig,
} from './DeepSeekConfigGate.tsx';
import DecisionDriver from './DecisionDriver.tsx';
import LiveBattleHud from './LiveBattleHud.tsx';
import BattleCharacterDrawer from './BattleCharacterDrawer.tsx';
import BattleReplayControls from './BattleReplayControls.tsx';
import { selectDirectorTarget } from '../lib/battleDirector.ts';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [viewMode, setViewMode] = useState<'live' | 'overview'>('live');
  const [cameraMode, setCameraMode] = useState<'auto' | 'locked'>('auto');
  const [focusPlayerId, setFocusPlayerId] = useState<GameId<'players'>>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [launchModal, setLaunchModal] = useState<'mine' | 'reset'>();
  const [replayActive, setReplayActive] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayTime, setReplayTime] = useState<number>();
  const [deepSeekConfig, setDeepSeekConfig] = useState<DeepSeekConfig | undefined>(() =>
    readDeepSeekConfig(),
  );
  const [showDeepSeekConfig, setShowDeepSeekConfig] = useState(() => !readDeepSeekConfig());
  const [gameWrapperRef, { width, height }] = useElementSize();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cameraMode !== 'auto' || !game) return;
    const target = selectDirectorTarget(
      [...game.world.players.values()]
        .filter((player) => player.battle)
        .map((player) => ({ id: player.id, alive: !player.battle!.eliminated, heat: player.battle!.heat ?? 0 })),
      game.world.battle?.feed ?? [],
    );
    if (target) setFocusPlayerId(target as GameId<'players'>);
  }, [cameraMode, game]);

  useEffect(() => {
    if (!replayActive || !game) return;
    const end = Date.now();
    const timer = window.setInterval(() => {
      setReplayTime((previous) => Math.min(end, (previous ?? game.world.battle?.started ?? end) + 500 * replaySpeed));
    }, 500);
    return () => window.clearInterval(timer);
  }, [replayActive, replaySpeed, game]);

  if (!worldId || !engineId || !game) {
    return null;
  }

  const followPlayer = (playerId: GameId<'players'>, openDrawer = true) => {
    setFocusPlayerId(playerId);
    setSelectedElement({ kind: 'player', id: playerId });
    setCameraMode('locked');
    setViewMode('live');
    setDrawerOpen(openDrawer);
  };

  const handleSelection = (element: { kind: 'player'; id: GameId<'players'> } | undefined) => {
    setSelectedElement(element);
    if (element) followPlayer(element.id);
  };
  const handleMatchReset = () => {
    setViewMode('live');
    setCameraMode('auto');
    setFocusPlayerId(undefined);
    setSelectedElement(undefined);
    setDrawerOpen(false);
    setReplayActive(false);
    setReplayTime(undefined);
  };
  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}
      <div className="relative h-screen w-screen overflow-hidden bg-brown-900" ref={gameWrapperRef}>
        <div className="absolute inset-0">
          <Stage width={width} height={height} options={{ backgroundColor: 0x203d3b }}>
            {/* Re-propagate context because contexts are not shared between renderers.
https://github.com/michalochman/react-pixi-fiber/issues/145#issuecomment-531549215 */}
            <ConvexProvider client={convex}>
              <PixiGame
                game={game}
                worldId={worldId}
                engineId={engineId}
                width={width}
                height={height}
                historicalTime={replayActive ? replayTime : historicalTime}
                selectedPlayerId={focusPlayerId}
                setSelectedElement={handleSelection}
              />
            </ConvexProvider>
          </Stage>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.32)_100%)]" />
        <BattleBroadcastToasts feed={game.world.battle?.feed} />
        <DecisionDriver worldId={worldId} game={game} config={deepSeekConfig} />
        {viewMode === 'live' ? <>
          <LiveBattleHud
            game={game}
            focusPlayerId={focusPlayerId}
            cameraMode={cameraMode}
            onOpenOverview={() => setViewMode('overview')}
            onOpenDetails={() => setDrawerOpen(true)}
            onOpenMine={() => { setLaunchModal('mine'); setViewMode('overview'); }}
            onResumeDirector={() => { setCameraMode('auto'); setDrawerOpen(false); }}
            onRestart={() => { setLaunchModal('reset'); setViewMode('overview'); }}
            onToggleReplay={() => { setReplayTime((time) => time ?? game.world.battle?.started); setReplayActive((active) => !active); }}
            replayActive={replayActive}
          />
          <BattleReplayControls
            battle={game.world.battle}
            active={replayActive}
            speed={replaySpeed}
            onToggle={() => { setReplayTime((time) => time ?? game.world.battle?.started); setReplayActive((active) => !active); }}
            onSpeed={setReplaySpeed}
            onJump={(time) => { setReplayTime(time); setReplayActive(true); }}
          />
          {drawerOpen && <BattleCharacterDrawer game={game} playerId={focusPlayerId} onClose={() => setDrawerOpen(false)} />}
        </> : <div className="pointer-events-none absolute inset-3 z-10 flex flex-col" ref={scrollViewRef}>
          <BattleRoyalePanel
            worldId={worldId}
            game={game}
            selectedPlayerId={selectedElement?.id}
            setSelectedElement={handleSelection}
            onEditDeepSeekConfig={() => setShowDeepSeekConfig(true)}
            onBackToLive={() => setViewMode('live')}
            onMatchReset={handleMatchReset}
            onFollowPlayer={followPlayer}
            launchModal={launchModal}
            onLaunchModalHandled={() => setLaunchModal(undefined)}
          />
        </div>}
        {showDeepSeekConfig && (
          <DeepSeekConfigGate
            initialConfig={deepSeekConfig}
            onSave={(config) => {
              setDeepSeekConfig(config);
              setShowDeepSeekConfig(false);
            }}
          />
        )}
      </div>
    </>
  );
}
