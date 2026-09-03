import { Character } from './Character.tsx';
import { orientationDegrees } from '../../convex/util/geometry.ts';
import { characters } from '../../data/characters.ts';
import { toast } from 'react-toastify';
import { Player as ServerPlayer } from '../../convex/aiTown/player.ts';
import { GameId } from '../../convex/aiTown/ids.ts';
import { Id } from '../../convex/_generated/dataModel';
import { Location, locationFields, playerLocation } from '../../convex/aiTown/location.ts';
import { useHistoricalValue } from '../hooks/useHistoricalValue.ts';
import { PlayerDescription } from '../../convex/aiTown/playerDescription.ts';
import { WorldMap } from '../../convex/aiTown/worldMap.ts';
import { ServerGame } from '../hooks/serverGame.ts';
import type { BattleReplayPlayerFrame } from '../../convex/aiTown/battleRoyale.ts';

export type SelectElement = (element?: { kind: 'player'; id: GameId<'players'> }) => void;

const logged = new Set<string>();

export const Player = ({
  game,
  isViewer,
  player,
  onClick,
  historicalTime,
  replayMode = false,
  replayFrame,
}: {
  game: ServerGame;
  isViewer: boolean;
  player: ServerPlayer;

  onClick: SelectElement;
  historicalTime?: number;
  replayMode?: boolean;
  replayFrame?: BattleReplayPlayerFrame;
}) => {
  const playerCharacter = game.playerDescriptions.get(player.id)?.character;
  if (!playerCharacter) {
    throw new Error(`Player ${player.id} has no character`);
  }
  const character = characters.find((c) => c.name === playerCharacter);

  const locationBuffer = game.world.historicalLocations?.get(player.id);
  const historicalLocation = useHistoricalValue<Location>(
    locationFields,
    historicalTime,
    playerLocation(player),
    locationBuffer,
    replayMode,
  );
  if (!character) {
    if (!logged.has(playerCharacter)) {
      logged.add(playerCharacter);
      toast.error(`Unknown character ${playerCharacter}`);
    }
    return null;
  }

  const displayedLocation = replayFrame ?? historicalLocation;
  if (!displayedLocation) {
    return null;
  }

  const activeActivity =
    player.activity && player.activity.until > (historicalTime ?? Date.now())
      ? player.activity
      : undefined;
  const actuallyMoving = displayedLocation.speed > 0;
  const activityEmoji = activeActivity?.emoji === 'MOVE'
    ? ''
    : ['ROUTE', 'TARGET', 'LOOT', 'FIRE', 'HIT'].includes(activeActivity?.emoji ?? '') ? '' : activeActivity?.emoji;
  const showTargetIndicator = activeActivity?.emoji === 'TARGET';
  const actionLabel = battleActionLabel(activeActivity?.emoji, activeActivity?.description, actuallyMoving);
  const isSpeaking =
    activeActivity?.emoji === 'TALK' ||
    activeActivity?.emoji === 'ALLY' ||
    !![...game.world.conversations.values()].find((c) => c.isTyping?.playerId === player.id);
  const isThinking =
    !isSpeaking &&
    !![...game.world.agents.values()].find(
      (a) => a.playerId === player.id && !!a.inProgressOperation,
    );
  const tileDim = game.worldMap.tileDim;
  const displayedBattle = replayFrame
    ? { ...player.battle, ...replayFrame }
    : player.battle;
  const historicalFacing = { dx: displayedLocation.dx, dy: displayedLocation.dy };
  return (
    <>
      <Character
        x={displayedLocation.x * tileDim + tileDim / 2}
        y={displayedLocation.y * tileDim + tileDim / 2}
        orientation={orientationDegrees(historicalFacing)}
        isMoving={displayedLocation.speed > 0}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        emoji={activityEmoji}
        showTargetIndicator={showTargetIndicator}
        actionLabel={actionLabel}
        isFiring={activeActivity?.emoji === 'FIRE'}
        isHit={activeActivity?.emoji === 'HIT'}
        isViewer={isViewer}
        hpRatio={displayedBattle ? displayedBattle.hp / displayedBattle.maxHp : undefined}
        isEliminated={displayedBattle?.eliminated}
        battleCharacterId={displayedBattle?.characterId}
        displayName={game.playerDescriptions.get(player.id)?.name}
        textureUrl={character.textureUrl}
        spritesheetData={character.spritesheetData}
        speed={character.speed}
        onClick={() => {
          onClick({ kind: 'player', id: player.id });
        }}
      />
    </>
  );
};

function battleActionLabel(emoji?: string, description?: string, actuallyMoving = false) {
  if (emoji === 'TARGET') return description?.includes('悬赏') ? '悬赏追击' : '追击目标';
  if (emoji === 'MOVE' && actuallyMoving) return description?.includes('撤离') ? '撤离' : 'MOVE';
  if (emoji === 'ROUTE') return '规划路线';
  if (emoji === 'LOOT') return '搜索补给';
  return undefined;
}
