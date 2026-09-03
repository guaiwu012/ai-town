import { Container, Graphics, Text } from '@pixi/react';
import { useEffect, useMemo, useState } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { ServerGame } from '../hooks/serverGame';

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
