import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena';
import { ServerGame } from '../hooks/serverGame';

export function PixiArenaZones({ game }: { game: ServerGame }) {
  const map = game.worldMap;
  const battle = game.world.battle;
  const open = battle?.openAreas ?? BATTLE_ARENA_ZONES.map((zone) => zone.id);
  const draw = (graphics: PixiGraphics) => {
    graphics.clear();
    for (const zone of BATTLE_ARENA_ZONES) {
      const isOpen = open.includes(zone.id);
      const x = zone.anchor.x * map.width * map.tileDim;
      const y = zone.anchor.y * map.height * map.tileDim;
      graphics.lineStyle(2, isOpen ? zone.color : 0xdb5555, isOpen ? 0.18 : 0.62);
      graphics.beginFill(isOpen ? zone.color : 0x7d1f2d, isOpen ? 0.025 : 0.2);
      const points = zone.polygon.map((point) => ({ x: point.x * map.width * map.tileDim, y: point.y * map.height * map.tileDim }));
      graphics.drawPolygon(points.flatMap((point) => [point.x, point.y]));
      graphics.endFill();
    }
  };
  return <Container>
    <Graphics draw={draw} />
    {BATTLE_ARENA_ZONES.map((zone) => {
      const isOpen = open.includes(zone.id);
      return <Text key={zone.id} x={zone.anchor.x * map.width * map.tileDim} y={zone.anchor.y * map.height * map.tileDim} anchor={{ x: 0.5, y: 0.5 }} alpha={isOpen ? 0.82 : 0.62} text={`${zone.label}${isOpen ? '' : '\n封锁'}`} scale={0.52} style={new TextStyle({ align: 'center', fill: isOpen ? '#d5efe5' : '#ff998c', fontFamily: 'VCR OSD Mono', fontSize: 14, stroke: '#06101d', strokeThickness: 5 })} />;
    })}
  </Container>;
}
