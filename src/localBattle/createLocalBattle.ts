import * as map from '../../data/gentle';
import { Descriptions } from '../../data/characters';
import { BATTLE_CONFIG, profileForIndex } from '../../data/battleRoyaleConfig';
import { battleAreaSpawnPoints } from '../../data/battleArena';
import { Player } from '../../convex/aiTown/player';
import { PlayerDescription } from '../../convex/aiTown/playerDescription';
import { World } from '../../convex/aiTown/world';
import { WorldMap } from '../../convex/aiTown/worldMap';
import { AgentDescription } from '../../convex/aiTown/agentDescription';
import { GameId } from '../../convex/aiTown/ids';
import { defaultBattleState, defaultBattleStats } from '../../convex/aiTown/battleRoyale';
import type { ServerGame } from '../hooks/serverGame';
import type { LocalBattleSnapshot } from './protocol';

export type LocalBattleRuntime = ServerGame & { numPathfinds: number };

export function configureLocalCloudDecisions(game: Pick<LocalBattleRuntime, 'world'>, now: number) {
  if (!game.world.battle) return;
  game.world.battle.platform = 'BROWSER_LOCAL';
  game.world.battle.decisionMax = Number.MAX_SAFE_INTEGER;
  game.world.battle.decisionDriverStatus = 'DeepSeek 正常驾驶 · 本地对局隔离';
  let index = 0;
  for (const player of game.world.players.values()) {
    if (player.battle) player.battle.decisionDueAt = now + 12_000 + index * 4_000;
    index += 1;
  }
}

export function localWorldMap() {
  return new WorldMap({
    width: map.mapwidth,
    height: map.mapheight,
    tileSetUrl: map.tilesetpath,
    tileSetDimX: map.tilesetpxw,
    tileSetDimY: map.tilesetpxh,
    tileDim: map.tiledim,
    bgTiles: map.bgtiles,
    objectTiles: map.objmap,
    animatedSprites: map.animatedsprites,
  });
}

export function createLocalBattle(now = Date.now()): LocalBattleRuntime {
  const worldMap = localWorldMap();
  const players = [];
  const playerDescriptions = new Map<GameId<'players'>, PlayerDescription>();
  for (let index = 0; index < BATTLE_CONFIG.match.agentCount; index += 1) {
    const id = `p:${index}` as GameId<'players'>;
    const profile = profileForIndex(index);
    const spawn = battleAreaSpawnPoints(profile.areaId, worldMap.width, worldMap.height)[0] ?? {
      x: 2 + index,
      y: 2,
    };
    const battle = defaultBattleStats(profile);
    // Stagger the first requests so every contestant receives regular cloud
    // personality decisions without creating a single burst at match start.
    battle.decisionDueAt = now + 12_000 + index * 4_000;
    players.push(new Player({
      id,
      lastInput: now,
      position: spawn,
      facing: { dx: 1, dy: 0 },
      speed: 0,
      battle,
    }));
    const description = Descriptions[index];
    playerDescriptions.set(id, new PlayerDescription({
      playerId: id,
      name: description?.name ?? profile.name,
      character: description?.character ?? 'f1',
      description: description?.identity ?? profile.codename,
    }));
  }
  const battle = defaultBattleState(now);
  battle.platform = 'BROWSER_LOCAL';
  battle.decisionMax = Number.MAX_SAFE_INTEGER;
  const game = {
    world: new World({
      nextId: BATTLE_CONFIG.match.agentCount,
      conversations: [],
      agents: [],
      players: players.map((player) => player.serialize()),
      battle,
    }),
    worldMap,
    playerDescriptions,
    agentDescriptions: new Map<GameId<'agents'>, AgentDescription>(),
    numPathfinds: 0,
  };
  configureLocalCloudDecisions(game, now);
  return game;
}

export function hydrateLocalBattle(snapshot: LocalBattleSnapshot): ServerGame {
  return {
    world: new World(snapshot.world),
    worldMap: localWorldMap(),
    playerDescriptions: new Map(
      snapshot.playerDescriptions.map((item) => {
        const parsed = new PlayerDescription(item);
        return [parsed.playerId, parsed];
      }),
    ),
    agentDescriptions: new Map(),
  };
}

export function serializeLocalBattle(game: LocalBattleRuntime, savedAt = Date.now()): LocalBattleSnapshot {
  const world = game.world.serialize();
  delete world.historicalLocations;
  return {
    world,
    playerDescriptions: [...game.playerDescriptions.values()].map((item) => item.serialize()),
    savedAt,
  };
}
