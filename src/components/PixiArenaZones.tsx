import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena';
import { ServerGame } from '../hooks/serverGame';

export function PixiArenaZones({ game }: { game: ServerGame }) {
  const map = game.worldMap;
  const battle = game.world.battle;
  const open = battle?.openAreas ?? BATTLE_ARENA_ZONES.map((zone) => zone.id);
  const resources = battle?.areaResources ?? [];
  const draw = (graphics: PixiGraphics) => {
    graphics.clear();
    for (const zone of BATTLE_ARENA_ZONES) {
      const isOpen = open.includes(zone.id);
      const x = zone.anchor.x * map.width * map.tileDim;
      const y = zone.anchor.y * map.height * map.tileDim;
      graphics.lineStyle(2, isOpen ? zone.color : 0xdb5555, isOpen ? 0.38 : 0.56);
      graphics.beginFill(isOpen ? zone.color : 0x7d1f2d, isOpen ? 0.06 : 0.18);
      const points = zone.polygon.map((point) => ({ x: point.x * map.width * map.tileDim, y: point.y * map.height * map.tileDim }));
      graphics.drawPolygon(points.flatMap((point) => [point.x, point.y]));
      graphics.endFill();
      for (const obstacle of zone.obstacles) {
        graphics.beginFill(0x05090d, isOpen ? 0.42 : 0.6);
        graphics.drawRect(
          obstacle.x * map.width * map.tileDim,
          obstacle.y * map.height * map.tileDim,
          obstacle.width * map.width * map.tileDim,
          obstacle.height * map.height * map.tileDim,
        );
        graphics.endFill();
      }
    }
  };
  return <Container>
    <Graphics draw={draw} />
    {BATTLE_ARENA_ZONES.map((zone) => {
      const resource = resources.find((entry) => entry.areaId === zone.id);
      const isOpen = open.includes(zone.id);
      return <Text key={zone.id} x={zone.anchor.x * map.width * map.tileDim} y={zone.anchor.y * map.height * map.tileDim} anchor={{ x: 0.5, y: 0.5 }} alpha={isOpen ? 0.88 : 0.55} text={`${zone.label}\n${isOpen ? `资源 ${resource?.remaining ?? '--'}` : '封锁'}`} scale={0.55} style={new TextStyle({ align: 'center', fill: isOpen ? '#d5efe5' : '#ff998c', fontFamily: 'VCR OSD Mono', fontSize: 14, stroke: '#06101d', strokeThickness: 4 })} />;
    })}
  </Container>;
}
