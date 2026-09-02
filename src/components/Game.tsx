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
import DecisionDriver from './DecisionDriver.tsx';
import LiveBattleHud from './LiveBattleHud.tsx';
import BattleCharacterDrawer from './BattleCharacterDrawer.tsx';
import BattleReplayControls from './BattleReplayControls.tsx';
import { selectDirectorShot } from '../lib/battleDirector.ts';
import { replayFrameAt, replayStartTime } from '../lib/battleReplay.ts';
import BattleStoryCard from './BattleStoryCard.tsx';
import BattleDialogueBox from './BattleDialogueBox.tsx';
import SupportFactionPanel from './SupportFactionPanel.tsx';
import GameLoadingScreen from './GameLoadingScreen.tsx';
import { useBattleAudio } from '../hooks/useBattleAudio.ts';

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
  const [focusAreaId, setFocusAreaId] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [launchModal, setLaunchModal] = useState<'mine' | 'reset'>();
  const [replayActive, setReplayActive] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayTime, setReplayTime] = useState<number>();
  const [directorCaption, setDirectorCaption] = useState('直播准备 · 等待现场');
  const directorSwitchRef = useRef({ at: 0, eventId: -1 });
  const [gameWrapperRef, { width, height }] = useElementSize();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);
  const { audioEnabled, toggleAudio } = useBattleAudio(game);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cameraMode !== 'auto' || !game) return;
    const now = Date.now();
    const shot = selectDirectorShot(
      [...game.world.players.values()]
        .filter((player) => player.battle)
        .map((player) => ({ id: player.id, alive: !player.battle!.eliminated, heat: player.battle!.heat ?? 0, hpRatio: player.battle!.hp / player.battle!.maxHp, moving: player.speed > 0 })),
      game.world.battle?.feed ?? [],
      now,
    );
    const isNewUrgentEvent = shot.urgent && shot.eventId !== undefined && shot.eventId !== directorSwitchRef.current.eventId;
    const cadenceElapsed = now - directorSwitchRef.current.at >= 8000;
    if (shot.targetId && (!focusPlayerId || isNewUrgentEvent || cadenceElapsed)) {
      setFocusPlayerId(shot.targetId as GameId<'players'>);
      setDirectorCaption(shot.caption);
      directorSwitchRef.current = { at: now, eventId: shot.eventId ?? directorSwitchRef.current.eventId };
    }
    setFocusAreaId(undefined);
  }, [cameraMode, game, focusPlayerId]);

  useEffect(() => {
    if (!replayActive || !game) return;
    const end = Date.now();
    const timer = window.setInterval(() => {
      setReplayTime((previous) => Math.min(end, (previous ?? game.world.battle?.started ?? end) + 500 * replaySpeed));
    }, 500);
    return () => window.clearInterval(timer);
  }, [replayActive, replaySpeed, game]);

  if (!worldId || !engineId || !game) {
    return <GameLoadingScreen stage={!worldId ? '正在连接直播服务器' : !engineId ? '正在唤醒比赛引擎' : '正在同步 12 名 AI 状态'} />;
  }

  const followPlayer = (playerId: GameId<'players'>, openDrawer = true) => {
    setFocusPlayerId(playerId);
    setFocusAreaId(undefined);
    setSelectedElement({ kind: 'player', id: playerId });
    setCameraMode('locked');
    setViewMode('live');
    setDrawerOpen(openDrawer);
  };

  const focusArea = (areaId: string) => {
    setFocusAreaId(areaId);
    setFocusPlayerId(undefined);
    setSelectedElement(undefined);
    setCameraMode('locked');
    setDrawerOpen(false);
    setViewMode('live');
  };

  const handleSelection = (element: { kind: 'player'; id: GameId<'players'> } | undefined) => {
    setSelectedElement(element);
    if (element) followPlayer(element.id);
  };
  const handleMatchReset = () => {
    setViewMode('live');
    setCameraMode('auto');
    setFocusPlayerId(undefined);
    setFocusAreaId(undefined);
    setSelectedElement(undefined);
    setDrawerOpen(false);
    setReplayActive(false);
    setReplayTime(undefined);
    setDirectorCaption('直播准备 · 等待现场');
    directorSwitchRef.current = { at: 0, eventId: -1 };
  };
  const replayFrame = replayActive ? replayFrameAt(game.world.battle, replayTime) : undefined;
  const availableReplayStart = replayStartTime(game.world.battle);
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
                replayMode={replayActive}
                replayFrame={replayFrame}
                selectedPlayerId={focusPlayerId}
                focusAreaId={focusAreaId}
                onFocusArea={focusArea}
                setSelectedElement={handleSelection}
              />
            </ConvexProvider>
          </Stage>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.32)_100%)]" />
        {!replayActive && <BattleBroadcastToasts feed={game.world.battle?.feed} />}
        <DecisionDriver worldId={worldId} game={game} enabled={!replayActive} />
        {viewMode === 'live' ? <>
          <LiveBattleHud
            game={game}
            focusPlayerId={focusPlayerId}
            focusAreaId={focusAreaId}
            cameraMode={cameraMode}
            directorCaption={directorCaption}
            replayFrame={replayFrame}
            replayTime={replayActive ? replayTime : undefined}
            onOpenOverview={() => setViewMode('overview')}
            onOpenDetails={() => setDrawerOpen(true)}
            onOpenMine={() => { setLaunchModal('mine'); setViewMode('overview'); }}
            onOpenSupport={() => setSupportOpen(true)}
            onResumeDirector={() => { setCameraMode('auto'); setFocusAreaId(undefined); setDrawerOpen(false); }}
            onRestart={() => { setLaunchModal('reset'); setViewMode('overview'); }}
            onToggleReplay={() => { setReplayTime((time) => availableReplayStart === undefined ? time : Math.max(time ?? availableReplayStart, availableReplayStart)); setReplayActive((active) => !active); }}
            replayActive={replayActive}
            audioEnabled={audioEnabled}
            onToggleAudio={toggleAudio}
          />
          {!replayActive && <BattleStoryCard game={game} />}
          {!replayActive && <BattleDialogueBox game={game} focusPlayerId={focusPlayerId} focusAreaId={focusAreaId} />}
          {replayActive && <BattleReplayControls
            battle={game.world.battle}
            active={replayActive}
            speed={replaySpeed}
            currentTime={replayTime}
              onToggle={() => { setReplayTime((time) => availableReplayStart === undefined ? time : Math.max(time ?? availableReplayStart, availableReplayStart)); setReplayActive((active) => !active); }}
            onSpeed={setReplaySpeed}
            onJump={(time) => { setReplayTime(time); setReplayActive(true); }}
          />}
          {drawerOpen && <BattleCharacterDrawer game={game} playerId={focusPlayerId} replayFrame={replayFrame} replayTime={replayActive ? replayTime : undefined} onClose={() => setDrawerOpen(false)} />}
          {supportOpen && <SupportFactionPanel worldId={worldId} game={game} onClose={() => setSupportOpen(false)} onFollow={(playerId) => { followPlayer(playerId, false); setSupportOpen(false); }} />}
        </> : <div className="pointer-events-none absolute inset-3 z-10 flex flex-col" ref={scrollViewRef}>
          <BattleRoyalePanel
            worldId={worldId}
            game={game}
            selectedPlayerId={selectedElement?.id}
            setSelectedElement={handleSelection}
            onBackToLive={() => setViewMode('live')}
            onMatchReset={handleMatchReset}
            onFollowPlayer={followPlayer}
            onFocusArea={focusArea}
            launchModal={launchModal}
            onLaunchModalHandled={() => setLaunchModal(undefined)}
          />
        </div>}
      </div>
    </>
  );
}
