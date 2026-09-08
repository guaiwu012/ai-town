import { Container, Graphics, Text } from '@pixi/react';
import { useEffect, useMemo, useState } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { ServerGame } from '../hooks/serverGame';
import { itemVisual } from '../../data/referenceExecution';
import { battleAreaSpawnPoints } from '../../data/battleArena';

const BULLET_MS = 520;
const EFFECT_MS = 1650;
const LABEL_MS = 2200;

export function PixiBattleEffects({ game }: { game: ServerGame }) {
  const [now, setNow] = useState(Date.now());
  const tileDim = game.worldMap.tileDim;
  const events = game.world.battle?.feed ?? [];

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, []);

  const activeShots = useMemo(
    () =>
      events.filter(
        (event) =>
          (event.kind === 'attack' || event.kind === 'eliminate') &&
          event.from &&
          event.to &&
          now - event.ts < LABEL_MS,
      ),
    [events, now],
  );

  const draw = (g: PixiGraphics) => {
    g.clear();
    for (const player of game.world.players.values()) {
      if (!player.battle || player.battle.eliminated) continue;
      const effects = (player.battle.itemEffects ?? []).filter(effect => effect.until === undefined || effect.until > now);
      const x = player.position.x * tileDim + tileDim / 2; const y = player.position.y * tileDim;
      effects.slice(0, 4).forEach((effect, index) => { g.lineStyle(1.5, itemVisual(effect.key).color, 0.35 + Math.sin(now / 250 + index) * 0.15); g.drawCircle(x, y, 10 + index * 3); });
      if ((player.battle.smokeUntil ?? 0) > now) { g.beginFill(0xaabbcc, 0.3); g.drawCircle(x, y, 22); g.endFill(); }
      if ((player.battle.stunnedUntil ?? 0) > now) { g.lineStyle(2, 0xffdc55, 0.9); g.drawEllipse(x, y - 15, 12, 4); }
    }
    for (const event of events) {
      const age = now - event.ts;
      if (!event.effectKey || !event.to || age < 0 || age >= EFFECT_MS) continue;
      const visual = itemVisual(event.effectKey);
      const progress = age / EFFECT_MS;
      const alpha = 1 - progress;
      const x = event.to.x * tileDim + tileDim / 2;
      const y = event.to.y * tileDim;
      g.lineStyle(3, visual.color, alpha);
      if (visual.shape === 'cross') {
        for (let i = 0; i < 3; i++) {
          const px = x + (i - 1) * 12; const py = y - progress * 30 - i * 7;
          g.moveTo(px - 4, py); g.lineTo(px + 4, py); g.moveTo(px, py - 4); g.lineTo(px, py + 4);
        }
      } else if (visual.shape === 'smoke') {
        g.beginFill(visual.color, alpha * 0.4);
        for (let i = 0; i < 5; i++) g.drawCircle(x + Math.cos(i * 1.26) * progress * 24, y + Math.sin(i * 1.26) * progress * 16, 8 + progress * 20);
        g.endFill();
      } else {
        const radius = 5 + progress * 32;
        g.drawCircle(x, y, radius);
        if (visual.shape === 'rays') for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; g.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius); g.lineTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8)); }
      }
    }
    for (const event of activeShots) {
      if (!event.from || !event.to) {
        continue;
      }
      const age = now - event.ts;
      const from = {
        x: event.from.x * tileDim + tileDim / 2,
        y: event.from.y * tileDim + tileDim / 2,
      };
      const to = {
        x: event.to.x * tileDim + tileDim / 2,
        y: event.to.y * tileDim + tileDim / 2,
      };
      const projectile = event.weapon !== 'Fists';
      const fromY = from.y - 10;
      const toY = to.y - 10;
      const dx = to.x - from.x;
      const dy = toY - fromY;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / length;
      const ny = dy / length;
      const px = -ny;
      const py = nx;
      const burst = projectile ? Math.max(1, Math.min(4, event.burst ?? 1)) : 1;

      for (let shot = 0; shot < burst; shot += 1) {
        const shotAge = age - shot * 95;
        if (shotAge < 0) continue;
        const progress = Math.min(1, Math.max(0, shotAge / BULLET_MS));
        const spread = (shot - (burst - 1) / 2) * 2.2;
        const bulletX = from.x + dx * progress + px * spread;
        const bulletY = fromY + dy * progress + py * spread;
        const shotAlpha = Math.max(0, 1 - shotAge / EFFECT_MS);

        if (projectile && shotAge < 150) {
          const muzzleAlpha = 1 - shotAge / 150;
          g.beginFill(0xfff5bf, muzzleAlpha);
          g.drawCircle(from.x, fromY, 8 + muzzleAlpha * 5);
          g.endFill();
          g.lineStyle(3, 0xffc44d, muzzleAlpha);
          g.moveTo(from.x - 16, fromY); g.lineTo(from.x + 16, fromY);
          g.moveTo(from.x, fromY - 16); g.lineTo(from.x, fromY + 16);
        }

        if (projectile && progress < 1) {
          const tailProgress = Math.max(0, progress - 0.28);
          const tailX = from.x + dx * tailProgress + px * spread;
          const tailY = fromY + dy * tailProgress + py * spread;
          g.lineStyle(8, 0xff8a32, shotAlpha * 0.25);
          g.moveTo(tailX, tailY); g.lineTo(bulletX, bulletY);
          g.lineStyle(4, 0xffd35a, shotAlpha * 0.95);
          g.moveTo(tailX, tailY); g.lineTo(bulletX, bulletY);
          g.lineStyle(1.8, 0xffffff, shotAlpha);
          g.moveTo(tailX, tailY); g.lineTo(bulletX, bulletY);
          g.beginFill(0xffffff, shotAlpha);
          g.drawPolygon([
            bulletX + nx * 11, bulletY + ny * 11,
            bulletX - nx * 7 + px * 3, bulletY - ny * 7 + py * 3,
            bulletX - nx * 7 - px * 3, bulletY - ny * 7 - py * 3,
          ]);
          g.endFill();
        }

        const impactAge = projectile ? shotAge - BULLET_MS : shotAge;
        if (impactAge >= 0 && impactAge < 900) {
          const impactAlpha = 1 - impactAge / 900;
          const radius = 7 + impactAge * 0.03 + shot * 2;
          const impactX = to.x + px * spread;
          const impactY = toY + py * spread;
          const hitColor = event.kind === 'eliminate' ? 0xff4545 : 0xffc24d;
          g.beginFill(0xffffff, impactAlpha * 0.9);
          g.drawCircle(impactX, impactY, Math.max(2, 7 - impactAge * 0.014));
          g.endFill();
          g.lineStyle(4, hitColor, impactAlpha);
          g.drawCircle(impactX, impactY, radius);
          g.lineStyle(2, 0xfff0a6, impactAlpha * 0.75);
          g.drawCircle(impactX, impactY, radius * 1.45);
          for (let ray = 0; ray < 6; ray++) {
            const angle = ray * Math.PI / 3;
            g.moveTo(impactX + Math.cos(angle) * 6, impactY + Math.sin(angle) * 6);
            g.lineTo(impactX + Math.cos(angle) * (radius + 10), impactY + Math.sin(angle) * (radius + 10));
          }
        }
      }
    }
  };

  return (
    <Container>
      <Graphics draw={draw} />
      {events.filter(event => event.effectKey && event.to && now >= event.ts && now - event.ts < LABEL_MS).map(event => <Text key={`item-${event.id}`} x={event.to!.x * tileDim + tileDim / 2} y={event.to!.y * tileDim - 20 - (now - event.ts) / 100} text={`${event.itemName ?? ''} · ${itemVisual(event.effectKey!).label}`} anchor={0.5} alpha={1 - (now - event.ts) / LABEL_MS} style={new TextStyle({ fill: itemVisual(event.effectKey!).color, fontSize: 12, stroke: '#182033', strokeThickness: 3 })} />)}
      {events.filter(event => event.mapText && event.areaId && now >= event.ts && now - event.ts < LABEL_MS && !event.effectKey).slice(0, 4).map(event => {
        const actor = [...game.world.players.values()].find(player => player.id === event.actor);
        const position = actor?.position ?? battleAreaSpawnPoints(event.areaId!, game.worldMap.width, game.worldMap.height)[0];
        if (!position) return null;
        return <Text key={`map-${event.id}`} x={position.x * tileDim} y={position.y * tileDim - 35} text={event.mapText} anchor={0.5} alpha={1 - (now - event.ts) / LABEL_MS} style={new TextStyle({ fill: '#ffffff', fontSize: 11, stroke: '#182033', strokeThickness: 3 })} />;
      })}
      {activeShots.map((event) => {
        if (!event.to) {
          return null;
        }
        const age = now - event.ts;
        const progress = Math.min(1, Math.max(0, age / LABEL_MS));
        const alpha = Math.max(0, 1 - progress);
        return (
          <Text
            key={event.id}
            x={event.to.x * tileDim + tileDim / 2}
            y={event.to.y * tileDim - 18 - progress * 16}
            text={event.kind === 'eliminate' ? 'K.O.' : `-${event.damage ?? 'HIT'}`}
            anchor={{ x: 0.5, y: 0.5 }}
            alpha={alpha}
            scale={0.65}
            style={
              new TextStyle({
                fill: event.kind === 'eliminate' ? '#ffdf5d' : '#ff6b6b',
                fontFamily: 'VCR OSD Mono',
                fontSize: 18,
                stroke: '#231423',
                strokeThickness: 4,
              })
            }
          />
        );
      })}
    </Container>
  );
}
