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
      const progress = Math.min(1, Math.max(0, age / BULLET_MS));
      const from = {
        x: event.from.x * tileDim + tileDim / 2,
        y: event.from.y * tileDim + tileDim / 2,
      };
      const to = {
        x: event.to.x * tileDim + tileDim / 2,
        y: event.to.y * tileDim + tileDim / 2,
      };
      const bullet = {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      };
      const effectAlpha = Math.max(0, 1 - age / EFFECT_MS);
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

      if (projectile && age < 170) {
        const muzzleAlpha = 1 - age / 170;
        g.beginFill(0xfff5bf, muzzleAlpha);
        g.drawCircle(from.x, fromY, 9 + muzzleAlpha * 5);
        g.endFill();
        g.lineStyle(4, 0xffc44d, muzzleAlpha);
        g.moveTo(from.x - 18, fromY); g.lineTo(from.x + 18, fromY);
        g.moveTo(from.x, fromY - 18); g.lineTo(from.x, fromY + 18);
      }

      if (projectile && progress < 1) {
        const tailProgress = Math.max(0, progress - 0.3);
        const tailX = from.x + dx * tailProgress;
        const tailY = fromY + dy * tailProgress;
        g.lineStyle(9, 0xff8a32, effectAlpha * 0.28);
        g.moveTo(tailX, tailY); g.lineTo(bullet.x, bullet.y - 10);
        g.lineStyle(4, 0xffd35a, effectAlpha * 0.95);
        g.moveTo(tailX, tailY); g.lineTo(bullet.x, bullet.y - 10);
        g.lineStyle(2, 0xffffff, effectAlpha);
        g.moveTo(tailX, tailY); g.lineTo(bullet.x, bullet.y - 10);
        const tipX = bullet.x;
        const tipY = bullet.y - 10;
        g.beginFill(0xffffff, effectAlpha);
        g.drawPolygon([
          tipX + nx * 12, tipY + ny * 12,
          tipX - nx * 8 + px * 3, tipY - ny * 8 + py * 3,
          tipX - nx * 8 - px * 3, tipY - ny * 8 - py * 3,
        ]);
        g.endFill();
      }

      const impactAge = projectile ? age - BULLET_MS : age;
      if (impactAge >= 0 && impactAge < 900) {
        const impactAlpha = 1 - impactAge / 900;
        const radius = 8 + impactAge * 0.035;
        const hitColor = event.kind === 'eliminate' ? 0xff4545 : 0xffc24d;
        g.beginFill(0xffffff, impactAlpha * 0.9);
        g.drawCircle(to.x, toY, Math.max(2, 8 - impactAge * 0.015));
        g.endFill();
        g.lineStyle(5, hitColor, impactAlpha);
        g.drawCircle(to.x, toY, radius);
        g.lineStyle(2, 0xfff0a6, impactAlpha * 0.8);
        g.drawCircle(to.x, toY, radius * 1.55);
        for (let ray = 0; ray < 8; ray++) {
          const angle = ray * Math.PI / 4;
          g.moveTo(to.x + Math.cos(angle) * 7, toY + Math.sin(angle) * 7);
          g.lineTo(to.x + Math.cos(angle) * (radius + 13), toY + Math.sin(angle) * (radius + 13));
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
