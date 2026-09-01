import * as PIXI from 'pixi.js';
import { useApp, useTick } from '@pixi/react';
import { Player, SelectElement } from './Player.tsx';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { PixiStaticMap } from './PixiStaticMap.tsx';
import PixiViewport from './PixiViewport.tsx';
import { Viewport } from 'pixi-viewport';
import { Id } from '../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { useSendInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';
import { DebugPath } from './DebugPath.tsx';
import { PositionIndicator } from './PositionIndicator.tsx';
import { SHOW_DEBUG_UI } from './Game.tsx';
import { ServerGame } from '../hooks/serverGame.ts';
import { PixiBattleEffects } from './PixiBattleEffects.tsx';
import { PixiArenaZones } from './PixiArenaZones.tsx';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena.ts';
import { GameId } from '../../convex/aiTown/ids.ts';
import type { BattleReplayFrame } from '../../convex/aiTown/battleRoyale.ts';
import PixiBattleSpeech from './PixiBattleSpeech.tsx';
import { Player as ServerPlayer } from '../../convex/aiTown/player.ts';
import { Location, locationFields, playerLocation } from '../../convex/aiTown/location.ts';
import { useHistoricalValue } from '../hooks/useHistoricalValue.ts';
import { dampCameraPosition } from '../lib/cameraMotion.ts';

export const PixiGame = (props: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  historicalTime: number | undefined;
  replayMode?: boolean;
  replayFrame?: BattleReplayFrame;
  width: number;
  height: number;
  selectedPlayerId?: GameId<'players'>;
  focusAreaId?: string;
  onFocusArea?: (areaId: string) => void;
  setSelectedElement: SelectElement;
}) => {
  // PIXI setup.
  const pixiApp = useApp();
  const viewportRef = useRef<Viewport | undefined>();

  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId: props.worldId }) ?? null;
  const humanPlayerId = [...props.game.world.players.values()].find(
    (p) => p.human === humanTokenIdentifier,
  )?.id;

  const moveTo = useSendInput(props.engineId, 'moveTo');

  // Interaction for clicking on the world to navigate.
  const dragStart = useRef<{ screenX: number; screenY: number } | null>(null);
  const onMapPointerDown = (e: any) => {
    // https://pixijs.download/dev/docs/PIXI.FederatedPointerEvent.html
    dragStart.current = { screenX: e.screenX, screenY: e.screenY };
  };

  const [lastDestination, setLastDestination] = useState<{
    x: number;
    y: number;
    t: number;
  } | null>(null);
  const onMapPointerUp = async (e: any) => {
    if (dragStart.current) {
      const { screenX, screenY } = dragStart.current;
      dragStart.current = null;
      const [dx, dy] = [screenX - e.screenX, screenY - e.screenY];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        console.log(`Skipping navigation on drag event (${dist}px)`);
        return;
      }
    }
    if (!humanPlayerId) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const gameSpacePx = viewport.toWorld(e.screenX, e.screenY);
    const tileDim = props.game.worldMap.tileDim;
    const gameSpaceTiles = {
      x: gameSpacePx.x / tileDim,
      y: gameSpacePx.y / tileDim,
    };
    setLastDestination({ t: Date.now(), ...gameSpaceTiles });
    const roundedTiles = {
      x: Math.floor(gameSpaceTiles.x),
      y: Math.floor(gameSpaceTiles.y),
    };
    console.log(`Moving to ${JSON.stringify(roundedTiles)}`);
    await toastOnError(moveTo({ playerId: humanPlayerId, destination: roundedTiles }));
  };
  const { width, height, tileDim } = props.game.worldMap;
  const players = [...props.game.world.players.values()];

  // Zoom on the user’s avatar when it is created
  useEffect(() => {
    if (!viewportRef.current || humanPlayerId === undefined) return;

    const humanPlayer = props.game.world.players.get(humanPlayerId)!;
    viewportRef.current.animate({
      position: new PIXI.Point(humanPlayer.position.x * tileDim, humanPlayer.position.y * tileDim),
      scale: 1.5,
    });
  }, [humanPlayerId]);

  const selectedPlayer = props.selectedPlayerId
    ? props.game.world.players.get(props.selectedPlayerId)
    : undefined;
  const replayPlayer = props.replayFrame?.players.find(
    (player) => player.id === props.selectedPlayerId,
  );
  const focusedArea = props.focusAreaId
    ? BATTLE_ARENA_ZONES.find((area) => area.id === props.focusAreaId)
    : undefined;

  return (
    <PixiViewport
      app={pixiApp}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={width * tileDim}
      worldHeight={height * tileDim}
      viewportRef={viewportRef}
    >
      <PixiStaticMap
        map={props.game.worldMap}
        showLegacyAnimations={false}
        onpointerup={onMapPointerUp}
        onpointerdown={onMapPointerDown}
      />
      <PixiArenaZones
        game={props.game}
        replayFrame={props.replayFrame}
        replayTime={props.replayMode ? props.historicalTime : undefined}
        focusedAreaId={props.focusAreaId}
        onFocusArea={props.onFocusArea}
      />
      <SmoothCameraFollow
        key={props.selectedPlayerId ?? props.focusAreaId ?? 'free-camera'}
        viewportRef={viewportRef}
        player={selectedPlayer}
        locationBuffer={selectedPlayer ? props.game.world.historicalLocations?.get(selectedPlayer.id) : undefined}
        replayPlayer={replayPlayer}
        focusedArea={focusedArea}
        historicalTime={props.historicalTime}
        replayMode={props.replayMode}
        tileDim={tileDim}
        mapWidth={width}
        mapHeight={height}
      />
      {players.map(
        (p) =>
          // Only show the path for the human player in non-debug mode.
          (SHOW_DEBUG_UI || p.id === humanPlayerId) && (
            <DebugPath key={`path-${p.id}`} player={p} tileDim={tileDim} />
          ),
      )}
      {lastDestination && <PositionIndicator destination={lastDestination} tileDim={tileDim} />}
      {players.map((p) => (
        <Player
          key={`player-${p.id}`}
          game={props.game}
          player={p}
          isViewer={p.id === props.selectedPlayerId}
          onClick={props.setSelectedElement}
          historicalTime={props.historicalTime}
          replayMode={props.replayMode}
          replayFrame={props.replayFrame?.players.find((frame) => frame.id === p.id)}
        />
      ))}
      <PixiBattleSpeech game={props.game} enabled={!props.replayMode} />
      {!props.replayMode && <PixiBattleEffects game={props.game} />}
    </PixiViewport>
  );
};

function SmoothCameraFollow({
  viewportRef,
  player,
  locationBuffer,
  replayPlayer,
  focusedArea,
  historicalTime,
  replayMode = false,
  tileDim,
  mapWidth,
  mapHeight,
}: {
  viewportRef: MutableRefObject<Viewport | undefined>;
  player?: ServerPlayer;
  locationBuffer?: ArrayBuffer;
  replayPlayer?: BattleReplayFrame['players'][number];
  focusedArea?: (typeof BATTLE_ARENA_ZONES)[number];
  historicalTime?: number;
  replayMode?: boolean;
  tileDim: number;
  mapWidth: number;
  mapHeight: number;
}) {
  const historicalLocation = useHistoricalValue<Location>(
    locationFields,
    historicalTime,
    player ? playerLocation(player) : undefined,
    locationBuffer,
    replayMode,
  );
  const position = replayPlayer
    ? { x: replayPlayer.x, y: replayPlayer.y }
    : historicalLocation ?? (focusedArea
      ? { x: focusedArea.anchor.x * mapWidth, y: focusedArea.anchor.y * mapHeight }
      : undefined);
  const targetRef = useRef<PIXI.Point>();
  targetRef.current = position
    ? new PIXI.Point(position.x * tileDim + tileDim / 2, position.y * tileDim + tileDim / 2)
    : undefined;

  useTick((delta) => {
    const viewport = viewportRef.current;
    const target = targetRef.current;
    if (!viewport || !target) return;

    const center = viewport.center;
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    if (dx * dx + dy * dy < 0.04) return;

    // Frame-rate independent damping keeps following smooth even though Convex
    // publishes positions less frequently than Pixi renders frames.
    const next = dampCameraPosition(center, target, delta);
    viewport.moveCenter(next.x, next.y);
  });

  return null;
}

export default PixiGame;
