# AI Battleground Engineering Plan

This plan maps the reference repository's configuration tables to the local Convex + Pixi runtime.

## Reference mapping

| Reference table | Local runtime owner | Current status |
| --- | --- | --- |
| Character runtime attributes | `data/battleRoyaleConfig.ts` + `battleStats` | Implemented: HP, stamina, satiety, zone time, stress, heat |
| Relationship graph | `BATTLE_CONFIG.relationships` + alliance target selection | Implemented: four fixed seed links, hidden mentor link |
| Area definition and adjacency | `BATTLE_CONFIG.areas` and `adjacency` | Implemented as authoritative IDs; map geometry remains the existing Pixi map |
| Area resource pools and item definitions | `BATTLE_CONFIG.areaItems` + loot runtime | Implemented: searches emit configured item IDs and fill inventory |
| Global game config | `BATTLE_CONFIG.match`, `runtime`, `zone`, `weapons` | Implemented: no battle constants in UI or engine loops |
| Dynamic restricted zone | `tickMatchRules` and `world.battle.openAreas` | Implemented: phase, day/night, scheduled area closure, public broadcast |
| Log event routing | `world.battle.feed` and `BattleBroadcastToasts` | Implemented: public top-of-screen feed; event kinds remain extensible |
| Audience intervention | existing minesweeper + `tipAgent` | Existing flow preserved; score converts to agent coins |

## Development tasks

### P0: demo foundation

- Keep all contestant, area, weapon, item and timing values in the config module.
- Validate IDs at startup and fail loudly for missing profiles or unknown item pools.
- Add a deterministic seeded relationship generator for non-seed links.
- Add Convex migration coverage for old worlds that only have the original battle fields.
- Verify reset is idempotent and always produces the configured contestant count.

### P1: agent simulation

- Split battle decisions into perception, utility scoring and action execution.
- Add explicit states: search, trade, talk, ally, flee, buy, attack, heal and investigate.
- Make area adjacency constrain movement and use area buffs in action scoring.
- Add relationship strength changes for alliance, trade, hit, betrayal and elimination.
- Add structured trade offers instead of the current direct coin transfer.

### P1: viewer systems

- Add heat score deltas and the `1 + heat / 500` score multiplier to the event scorer.
- Add intervention points, cooldowns and an audit log for viewer actions.
- Add map-level event markers and per-agent history beside the current public feed.

### P2: content and production

- Replace placeholder character sprites with a complete 12-character sprite set.
- Replace the generic tile map with the 13-area battle map while preserving the current camera and hit effects.
- Add rare item spawning, special area stories, the Truth Chamber unlock and elite encounters.
- Add replay fixtures for a fixed seed so combat, alliances and zone closure are reproducible in CI.

## Acceptance criteria

- `npm run build` passes.
- A reset creates exactly `BATTLE_CONFIG.match.agentCount` agents with unique names.
- Every agent has a profile, area ID, heat score, inventory and derived runtime values.
- Combat uses weapon range/power from the configuration and emits public attack/hit/elimination events.
- Search emits an item from the configured area pool and does not exceed inventory capacity.
- The reference map image is available in the build as a temporary art reference.
- The DS key remains browser-local and is never stored in Convex or committed to the repository.
