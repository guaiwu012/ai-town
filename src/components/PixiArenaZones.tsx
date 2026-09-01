import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena';
import { ServerGame } from '../hooks/serverGame';
import { useEffect, useState } from 'react';

export function PixiArenaZones({ game }: { game: ServerGame }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, []);
  const map = game.worldMap;
  const battle = game.world.battle;
  const open = battle?.openAreas ?? BATTLE_ARENA_ZONES.map((zone) => zone.id);
  const draw = (graphics: PixiGraphics) => {
    graphics.clear();
    for (const zone of BATTLE_ARENA_ZONES) {
      const isOpen = open.includes(zone.id);
      const lock = battle?.areaLocks?.find((entry) => entry.areaId === zone.id && entry.until > now);
      const isDanger = !isOpen || !!lock;
      const x = zone.anchor.x * map.width * map.tileDim;
      const y = zone.anchor.y * map.height * map.tileDim;
      const points = zone.polygon.map((point) => ({ x: point.x * map.width * map.tileDim, y: point.y * map.height * map.tileDim }));
      const pulse = 0.5 + Math.sin(now / 180) * 0.22;
      graphics.lineStyle(isDanger ? 4 : 2, isDanger ? 0xff4f58 : zone.color, isDanger ? 0.72 + pulse * 0.2 : 0.18);
      graphics.beginFill(isDanger ? 0x7d101d : zone.color, isDanger ? (!isOpen ? 0.42 : 0.28 + pulse * 0.08) : 0.025);
      graphics.drawPolygon(points.flatMap((point) => [point.x, point.y]));
      graphics.endFill();
      if (isDanger) {
        graphics.lineStyle(2, 0xffc0a8, pulse);
        graphics.drawCircle(x, y, 30 + pulse * 10);
        graphics.lineStyle(7, 0xff3e48, 0.78);
        graphics.moveTo(x - 18, y - 18); graphics.lineTo(x + 18, y + 18);
        graphics.moveTo(x + 18, y - 18); graphics.lineTo(x - 18, y + 18);
        for (let ring = 1; ring <= 2; ring += 1) {
          graphics.lineStyle(1, 0xff6a62, Math.max(0.08, pulse - ring * 0.18));
          graphics.drawPolygon(points.flatMap((point) => [x + (point.x - x) * (1 - ring * 0.035), y + (point.y - y) * (1 - ring * 0.035)]));
        }
      }
    }
  };
  return <Container>
    <Graphics draw={draw} />
    {BATTLE_ARENA_ZONES.map((zone) => {
      const isOpen = open.includes(zone.id);
      const lock = battle?.areaLocks?.find((entry) => entry.areaId === zone.id && entry.until > now);
      const dangerText = !isOpen ? '永久禁区' : lock ? `剧情封锁 ${Math.ceil((lock.until - now) / 1000)}秒` : '';
      return <Text key={zone.id} x={zone.anchor.x * map.width * map.tileDim} y={zone.anchor.y * map.height * map.tileDim + (dangerText ? 32 : 0)} anchor={{ x: 0.5, y: 0.5 }} alpha={isOpen && !lock ? 0.82 : 0.98} text={`${zone.label}${dangerText ? `\n${dangerText}` : ''}`} scale={dangerText ? 0.64 : 0.52} style={new TextStyle({ align: 'center', fill: isOpen && !lock ? '#d5efe5' : '#fff0d1', fontFamily: 'VCR OSD Mono', fontSize: 14, fontWeight: dangerText ? '700' : '400', stroke: dangerText ? '#6b0712' : '#06101d', strokeThickness: dangerText ? 7 : 5 })} />;
    })}
  </Container>;
}
