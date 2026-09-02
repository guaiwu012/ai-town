import { Container, Graphics, Text } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import { useEffect, useMemo, useState } from 'react';
import type { ServerGame } from '../hooks/serverGame';
import type { BattleDialogue } from '../../convex/aiTown/battleRoyale';
import type { GameId } from '../../convex/aiTown/ids';

const speechStyle = new TextStyle({
  fill: 0x08131f,
  fontFamily: 'sans-serif',
  fontSize: 18,
  fontWeight: '700',
  align: 'center',
});

export default function PixiBattleSpeech({
  game,
  enabled = true,
}: {
  game: ServerGame;
  enabled?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const visible = useMemo(() => {
    const latestBySpeaker = new Map<string, BattleDialogue>();
    for (const entry of game.world.battle?.dialogueLog ?? []) {
      if (now - entry.ts > 4000 || latestBySpeaker.has(entry.speakerId)) continue;
      latestBySpeaker.set(entry.speakerId, entry);
    }
    return [...latestBySpeaker.values()].slice(0, 2);
  }, [game.world.battle?.dialogueLog, now]);

  if (!enabled) return null;
  const tileDim = game.worldMap.tileDim;
  return (
    <Container>
      {visible.map((entry) => {
        const player = game.world.players.get(entry.speakerId as GameId<'players'>);
        if (!player) return null;
        return (
          <Container
            key={entry.id}
            x={player.position.x * tileDim + tileDim / 2}
            y={player.position.y * tileDim - 42}
          >
            <Graphics
              draw={(graphics) => {
                graphics.clear();
                graphics.lineStyle(2, 0x07131f, 0.9);
                const friendly = ['alliance', 'rapport', 'truce'].includes(entry.kind);
                const hostile = ['combat', 'warning'].includes(entry.kind);
                const color = hostile ? 0xff7667 : friendly ? 0x70e6ca : 0xf2c861;
                graphics.beginFill(color, 0.96);
                graphics.drawCircle(0, -16, 14);
                graphics.endFill();
                graphics.beginFill(color, 0.96);
                graphics.drawPolygon([-5, -5, 5, -5, 0, 3]);
                graphics.endFill();
              }}
            />
            <Text text="…" anchor={0.5} x={0} y={-19} style={speechStyle} />
          </Container>
        );
      })}
    </Container>
  );
}
