import { useEffect, useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { GameId } from '../../convex/aiTown/ids.ts';
import BattleRoyalePanel from './BattleRoyalePanel.tsx';
import BattleBroadcastToasts from './BattleBroadcastToasts.tsx';
import DecisionDriver from './DecisionDriver.tsx';
import LiveBattleHud from './LiveBattleHud.tsx';
import BattleCharacterDrawer from './BattleCharacterDrawer.tsx';
import BattleReplayControls from './BattleReplayControls.tsx';
import { selectDirectorShot } from '../lib/battleDirector.ts';
import { replayFrameAt, replayStartTime } from '../lib/battleReplay.ts';
import BattleDialogueBox from './BattleDialogueBox.tsx';
import SupportFactionPanel, { supportCharacterForMatch } from './SupportFactionPanel.tsx';
import GameLoadingScreen from './GameLoadingScreen.tsx';
import { useBattleAudio } from '../hooks/useBattleAudio.ts';
import AudienceDanmaku from './AudienceDanmaku.tsx';
import PopularityRankUp from './PopularityRankUp.tsx';
import SupportDefeatModal from './SupportDefeatModal.tsx';
import { useLocalBattleGame } from '../hooks/useLocalBattleGame.ts';
import BattleMatchReport from './BattleMatchReport.tsx';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;
const DANMAKU_PREFERENCE_KEY = 'ai-town-audience-danmaku-enabled';
const SUPPORT_FAILURE_DISMISSED_KEY = 'ai-town-support-failure-dismissed';

export default function Game({ active = true }: { active?: boolean }) {
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const { game, dispatch, reset } = useLocalBattleGame(simulationEnabled);
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
  const [supportSession, setSupportSession] = useState<{ matchKey: string; characterId?: string }>();
  const [dismissedSupportFailure, setDismissedSupportFailure] = useState<string>();
  const [supportRestartPending, setSupportRestartPending] = useState(false);
  const [supportRestartError, setSupportRestartError] = useState('');
  const [reportDismissedMatchKey, setReportDismissedMatchKey] = useState<string>();
  const [reportRestartPending, setReportRestartPending] = useState(false);
  const [reportRestartError, setReportRestartError] = useState('');
  const [launchModal, setLaunchModal] = useState<'mine' | 'reset'>();
  const [replayActive, setReplayActive] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayTime, setReplayTime] = useState<number>();
  const [directorCaption, setDirectorCaption] = useState('直播准备 · 等待现场');
  const [danmakuEnabled, setDanmakuEnabled] = useState(() => window.localStorage.getItem(DANMAKU_PREFERENCE_KEY) !== 'false');
  const directorSwitchRef = useRef({ at: 0, eventId: -1 });
  const [gameWrapperRef, { width, height }] = useElementSize();

  const { audioEnabled, toggleAudio } = useBattleAudio(game, {
    focusPlayerId,
    focusAreaId,
    active: viewMode === 'live' && !replayActive,
  });
  const battleMatchKey = game?.world.battle
    ? String(game.world.battle.seed ?? game.world.battle.started ?? 'match')
    : undefined;
  const supportSelectionReady = Boolean(battleMatchKey && supportSession?.matchKey === battleMatchKey);
  const supportCharacterId = supportSelectionReady ? supportSession?.characterId : undefined;
  const supportedPlayer = supportCharacterId && game
    ? [...game.world.players.values()].find((player) => player.battle?.characterId === supportCharacterId)
    : undefined;
  const supportFailed = Boolean(
    supportSelectionReady &&
    supportedPlayer?.battle?.eliminated &&
    dismissedSupportFailure !== battleMatchKey,
  );

  useEffect(() => {
    if (!battleMatchKey) return;
    const characterId = supportCharacterForMatch(battleMatchKey);
    setSupportSession({ matchKey: battleMatchKey, characterId });
    setDismissedSupportFailure(
      window.localStorage.getItem(SUPPORT_FAILURE_DISMISSED_KEY) === battleMatchKey
        ? battleMatchKey
        : undefined,
    );
    setSupportRestartError('');
    setReportDismissedMatchKey(undefined);
    setReportRestartError('');
    if (!characterId) {
      setViewMode('live');
      setSupportOpen(true);
    }
  }, [battleMatchKey]);

  useEffect(() => {
    setSimulationEnabled(active && Boolean(supportCharacterId));
  }, [active, supportCharacterId]);

  const toggleDanmaku = () => {
    setDanmakuEnabled((enabled) => {
      const next = !enabled;
      window.localStorage.setItem(DANMAKU_PREFERENCE_KEY, String(next));
      return next;
    });
  };

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

  if (!game) {
    return <GameLoadingScreen stage="正在启动本地比赛引擎" />;
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
  const restartAfterSupportDefeat = async () => {
    if (!battleMatchKey || supportRestartPending) return;
    setSupportRestartPending(true);
    setSupportRestartError('');
    try {
      await reset();
      window.localStorage.setItem(SUPPORT_FAILURE_DISMISSED_KEY, battleMatchKey);
      setDismissedSupportFailure(battleMatchKey);
      setSupportOpen(false);
      handleMatchReset();
    } catch (error) {
      setSupportRestartError(error instanceof Error ? error.message : '重新开局失败，请稍后再试。');
    } finally {
      setSupportRestartPending(false);
    }
  };
  const restartAfterReport = async () => {
    if (!battleMatchKey || reportRestartPending) return;
    setReportRestartPending(true);
    setReportRestartError('');
    try {
      await reset();
      setReportDismissedMatchKey(battleMatchKey);
      handleMatchReset();
    } catch (error) {
      setReportRestartError(error instanceof Error ? error.message : '重新开局失败，请稍后再试。');
    } finally {
      setReportRestartPending(false);
    }
  };
  const replayFrame = replayActive ? replayFrameAt(game.world.battle, replayTime) : undefined;
  const availableReplayStart = replayStartTime(game.world.battle);
  const matchReportOpen = game.world.battle?.phase === 'settlement' && reportDismissedMatchKey !== battleMatchKey;
  return (
    <>
      <div className="relative h-screen w-screen overflow-hidden bg-brown-900" ref={gameWrapperRef}>
        <div className="absolute inset-0">
          <Stage width={width} height={height} options={{ backgroundColor: 0x203d3b }}>
            <PixiGame
                game={game}
                width={width}
                height={height}
                historicalTime={replayActive ? replayTime : Date.now()}
                replayMode={replayActive}
                replayFrame={replayFrame}
                selectedPlayerId={focusPlayerId}
                focusAreaId={focusAreaId}
                onFocusArea={focusArea}
                setSelectedElement={handleSelection}
            />
          </Stage>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.32)_100%)]" />
        {viewMode === 'live' && !replayActive && <BattleBroadcastToasts feed={game.world.battle?.feed} />}
        {viewMode === 'live' && !replayActive && <AudienceDanmaku enabled={danmakuEnabled} feed={game.world.battle?.feed} />}
        <DecisionDriver game={game} dispatch={dispatch} enabled={simulationEnabled && !replayActive} />
        <PopularityRankUp
          popularity={game.world.battle?.popularity ?? 0}
          rank={game.world.battle?.popularityRating ?? 'C'}
        />
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
            danmakuEnabled={danmakuEnabled}
            onToggleDanmaku={toggleDanmaku}
          />
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
          {supportOpen && <SupportFactionPanel
            game={game}
            dispatch={dispatch}
            selectionRequired={!supportCharacterId}
            onClose={() => setSupportOpen(false)}
            onFollow={(playerId) => { followPlayer(playerId, false); setSupportOpen(false); }}
            onSelected={(characterId) => {
              setSupportSession({ matchKey: battleMatchKey!, characterId });
              setSupportOpen(false);
              const player = [...game.world.players.values()].find((candidate) => candidate.battle?.characterId === characterId);
              if (player) followPlayer(player.id, false);
            }}
          />}
        </> : <div className="pointer-events-none absolute inset-3 z-10 flex flex-col" ref={scrollViewRef}>
          <BattleRoyalePanel
            game={game}
            dispatch={dispatch}
            selectedPlayerId={selectedElement?.id}
            setSelectedElement={handleSelection}
            onBackToLive={() => setViewMode('live')}
            onMatchReset={handleMatchReset}
            onFocusArea={focusArea}
            launchModal={launchModal}
            onLaunchModalHandled={() => setLaunchModal(undefined)}
          />
        </div>}
        {supportFailed && !matchReportOpen && supportedPlayer?.battle?.characterId && <SupportDefeatModal
          characterId={supportedPlayer.battle.characterId}
          characterName={game.playerDescriptions.get(supportedPlayer.id)?.name ?? supportedPlayer.id}
          game={game}
          playerId={supportedPlayer.id}
          pending={supportRestartPending}
          error={supportRestartError}
          onContinue={() => {
            if (battleMatchKey) window.localStorage.setItem(SUPPORT_FAILURE_DISMISSED_KEY, battleMatchKey);
            setDismissedSupportFailure(battleMatchKey);
          }}
          onRestart={() => void restartAfterSupportDefeat()}
        />}
        {matchReportOpen && <BattleMatchReport
          game={game}
          pending={reportRestartPending}
          error={reportRestartError}
          onOverview={() => {
            setReportDismissedMatchKey(battleMatchKey);
            setViewMode('overview');
          }}
          onRestart={() => void restartAfterReport()}
        />}
      </div>
    </>
  );
}
