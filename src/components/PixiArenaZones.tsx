import { Container, Graphics, Sprite, Text } from '@pixi/react';
import { BaseTexture, Graphics as PixiGraphics, Rectangle, TextStyle, Texture } from 'pixi.js';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena';
import { ServerGame } from '../hooks/serverGame';
import { useEffect, useState } from 'react';
import type { BattleReplayFrame } from '../../convex/aiTown/battleRoyale';

const LANDMARK_ATLAS = '/ai-town/assets/battle/area-landmarks-v1.png';
const LANDMARK_CELL = 314;
const landmarkTextures = new Map<number, Texture>();

function landmarkTexture(index: number) {
  const cached = landmarkTextures.get(index);
  if (cached) return cached;
  const col = index % 4;
  const row = Math.floor(index / 4);
  const texture = new Texture(BaseTexture.from(LANDMARK_ATLAS), new Rectangle(col * LANDMARK_CELL, row * LANDMARK_CELL, LANDMARK_CELL, LANDMARK_CELL));
  landmarkTextures.set(index, texture);
  return texture;
}

export function PixiArenaZones({ game, replayFrame, replayTime, focusedAreaId, onFocusArea }: { game: ServerGame; replayFrame?: BattleReplayFrame; replayTime?: number; focusedAreaId?: string; onFocusArea?: (areaId: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, []);
  const map = game.worldMap;
  const battle = game.world.battle;
  const displayedNow = replayTime ?? now;
  const open = replayFrame?.openAreas ?? battle?.openAreas ?? BATTLE_ARENA_ZONES.map((zone) => zone.id);
  const draw = (graphics: PixiGraphics) => {
    graphics.clear();
    for (const zone of BATTLE_ARENA_ZONES) {
      const isOpen = open.includes(zone.id);
      const lock = (replayFrame?.areaLocks ?? battle?.areaLocks)?.find((entry) => entry.areaId === zone.id && entry.until > displayedNow);
      const isDanger = !isOpen || !!lock;
      const x = zone.anchor.x * map.width * map.tileDim;
      const y = zone.anchor.y * map.height * map.tileDim;
      const points = zone.polygon.map((point) => ({ x: point.x * map.width * map.tileDim, y: point.y * map.height * map.tileDim }));
      const pulse = 0.5 + Math.sin(now / 180) * 0.22;
      graphics.lineStyle(isDanger ? 3 : 2, isDanger ? 0xff5e66 : zone.color, isDanger ? 0.62 + pulse * 0.18 : 0.18);
      graphics.beginFill(isDanger ? 0x7d101d : zone.color, isDanger ? (!isOpen ? 0.2 : 0.16 + pulse * 0.05) : 0.025);
      graphics.drawPolygon(points.flatMap((point) => [point.x, point.y]));
      graphics.endFill();
      if (isDanger) {
        graphics.lineStyle(2, 0xffc0a8, pulse);
        graphics.drawCircle(x, y, 20 + pulse * 6);
        graphics.lineStyle(4, 0xff4f58, 0.82);
        graphics.moveTo(x - 11, y - 11); graphics.lineTo(x + 11, y + 11);
        graphics.moveTo(x + 11, y - 11); graphics.lineTo(x - 11, y + 11);
        for (let ring = 1; ring <= 2; ring += 1) {
          graphics.lineStyle(1, 0xff6a62, Math.max(0.08, pulse - ring * 0.18));
          graphics.drawPolygon(points.flatMap((point) => [x + (point.x - x) * (1 - ring * 0.035), y + (point.y - y) * (1 - ring * 0.035)]));
        }
      }
      if (focusedAreaId === zone.id) {
        for (const obstacle of zone.obstacles) {
          const obstacleX = obstacle.x * map.width * map.tileDim;
          const obstacleY = obstacle.y * map.height * map.tileDim;
          const obstacleWidth = obstacle.width * map.width * map.tileDim;
          const obstacleHeight = obstacle.height * map.height * map.tileDim;
          graphics.lineStyle(1.5, 0xffd166, 0.8);
          graphics.beginFill(0x071622, 0.66);
          graphics.drawRoundedRect(obstacleX, obstacleY, obstacleWidth, obstacleHeight, 3);
          graphics.endFill();
          graphics.lineStyle(1, 0xffd166, 0.32);
          graphics.moveTo(obstacleX, obstacleY);
          graphics.lineTo(obstacleX + obstacleWidth, obstacleY + obstacleHeight);
          graphics.moveTo(obstacleX + obstacleWidth, obstacleY);
          graphics.lineTo(obstacleX, obstacleY + obstacleHeight);
        }
      }
    }
  };
  return <Container>
    <Graphics draw={draw} />
    {BATTLE_ARENA_ZONES.map((zone, zoneIndex) => {
      const isOpen = open.includes(zone.id);
      const lock = (replayFrame?.areaLocks ?? battle?.areaLocks)?.find((entry) => entry.areaId === zone.id && entry.until > displayedNow);
      const dangerText = !isOpen ? '永久禁区' : lock ? `剧情封锁 ${Math.ceil((lock.until - displayedNow) / 1000)}秒` : '';
      const resource = (replayFrame?.resources ?? battle?.areaResources)?.find((entry) => entry.areaId === zone.id);
      const selected = focusedAreaId === zone.id;
      const emphasized = selected || !isOpen || !!lock;
      const x = zone.anchor.x * map.width * map.tileDim;
      const y = zone.anchor.y * map.height * map.tileDim;
      return <Container key={zone.id} x={x} y={y} eventMode="static" cursor="pointer" pointertap={() => onFocusArea?.(zone.id)}>
        <Graphics draw={(g) => {
          g.clear();
          g.beginFill(isOpen ? 0x071622 : 0x3d0c14, emphasized ? 0.88 : 0.58);
          g.lineStyle(selected ? 3 : 1.5, selected ? 0xffd166 : isOpen ? 0x65d9bd : 0xff6e68, selected ? 1 : 0.78);
          g.drawCircle(0, 0, selected ? 20 : emphasized ? 17 : 12);
          g.endFill();
          if (selected) {
            g.lineStyle(1.5, 0xffd166, 0.72);
            g.drawCircle(0, 0, 26 + Math.sin(now / 180) * 2);
          }
        }} />
        <Sprite texture={landmarkTexture(zoneIndex)} width={selected ? 36 : emphasized ? 30 : 20} height={selected ? 36 : emphasized ? 30 : 20} anchor={{ x: 0.5, y: 0.5 }} alpha={emphasized ? (isOpen ? 1 : 0.78) : 0.58} />
        <Text visible={emphasized} y={dangerText ? 31 : 24} anchor={{ x: 0.5, y: 0.5 }} alpha={isOpen && !lock ? 0.92 : 0.98} text={`${zone.label}${selected && resource ? ` · 资源 ${resource.remaining}/${resource.max}` : ''}${dangerText ? `\n${dangerText}` : ''}`} scale={dangerText ? 0.58 : 0.54} style={new TextStyle({ align: 'center', fill: selected ? '#ffe7a6' : isOpen && !lock ? '#d5efe5' : '#fff0d1', fontFamily: 'VCR OSD Mono', fontSize: 14, fontWeight: '700', stroke: dangerText ? '#6b0712' : '#06101d', strokeThickness: dangerText ? 7 : 5 })} />
      </Container>;
    })}
  </Container>;
}
