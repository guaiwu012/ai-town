import { Container, Graphics, Text } from '@pixi/react';
import { useEffect, useMemo, useState } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { ServerGame } from '../hooks/serverGame';

const BULLET_MS = 1100;
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
      const alpha = Math.max(0, 1 - age / LABEL_MS);

      g.lineStyle(2, 0xfff1a8, alpha * 0.75);
      g.moveTo(from.x, from.y - 10);
      g.lineTo(bullet.x, bullet.y - 10);
      g.beginFill(event.kind === 'eliminate' ? 0xff4f4f : 0xfff1a8, alpha);
      g.drawCircle(bullet.x, bullet.y - 10, 4 + 2 * Math.sin(progress * Math.PI));
      g.endFill();

      if (progress >= 0.85) {
        g.lineStyle(3, 0xff4f4f, alpha);
        g.drawCircle(to.x, to.y - 14, 10 + 10 * (progress - 0.85));
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
