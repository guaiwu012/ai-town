import * as PIXI from 'pixi.js';
import { useApp, useTick } from '@pixi/react';
import { Player, SelectElement } from './Player.tsx';
import { MutableRefObject, useRef } from 'react';
import { PixiStaticMap } from './PixiStaticMap.tsx';
import PixiViewport from './PixiViewport.tsx';
import { Viewport } from 'pixi-viewport';
import { DebugPath } from './DebugPath.tsx';
import { SHOW_DEBUG_UI } from './Game.tsx';
import { ServerGame } from '../hooks/serverGame.ts';
import { PixiBattleEffects } from './PixiBattleEffects.tsx';
import { PixiArenaZones } from './PixiArenaZones.tsx';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena.ts';
import { GameId } from '../../convex/aiTown/ids.ts';
import type { BattleReplayFrame } from '../../convex/aiTown/battleRoyale.ts';
import { Player as ServerPlayer } from '../../convex/aiTown/player.ts';
import { Location, locationFields, playerLocation } from '../../convex/aiTown/location.ts';
import { useHistoricalValue } from '../hooks/useHistoricalValue.ts';
import { dampCameraPosition } from '../lib/cameraMotion.ts';

export const PixiGame = (props: {
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

  const { width, height, tileDim } = props.game.worldMap;
  const players = [...props.game.world.players.values()];

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
        screenHeight={props.height}
      />
      {players.map(
        (p) =>
          // Only show the path for the human player in non-debug mode.
          SHOW_DEBUG_UI && (
            <DebugPath key={`path-${p.id}`} player={p} tileDim={tileDim} />
          ),
      )}
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
  screenHeight,
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
  screenHeight: number;
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
    // The broadcast chrome occupies the top of the screen while the lower
    // centre remains unobstructed. Keep followed contestants in that visual
    // centre instead of the geometric centre of the whole viewport.
    const followsPlayer = Boolean(player || replayPlayer);
    const screenOffsetY = followsPlayer ? screenHeight * 0.16 : 0;
    const cameraTarget = new PIXI.Point(
      target.x,
      target.y - screenOffsetY / Math.max(viewport.scale.y, 0.01),
    );
    const dx = cameraTarget.x - center.x;
    const dy = cameraTarget.y - center.y;
    if (dx * dx + dy * dy < 0.04) return;

    // Frame-rate independent damping keeps following smooth even though Convex
    // publishes positions less frequently than Pixi renders frames.
    const next = dampCameraPosition(center, cameraTarget, delta);
    viewport.moveCenter(next.x, next.y);
  });

  return null;
}

export default PixiGame;
