import { Container, Graphics, Text } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import { useEffect, useMemo, useState } from 'react';
import type { ServerGame } from '../hooks/serverGame';
import type { BattleDialogue } from '../../convex/aiTown/battleRoyale';
import type { GameId } from '../../convex/aiTown/ids';

const speechStyle = new TextStyle({
  fill: 0xf2fbff,
  fontFamily: 'sans-serif',
  fontSize: 12,
  fontWeight: '600',
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 142,
  lineHeight: 16,
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
      if (now - entry.ts > 6000 || latestBySpeaker.has(entry.speakerId)) continue;
      latestBySpeaker.set(entry.speakerId, entry);
    }
    return [...latestBySpeaker.values()].slice(0, 5);
  }, [game.world.battle?.dialogueLog, now]);

  if (!enabled) return null;
  const tileDim = game.worldMap.tileDim;
  return (
    <Container>
      {visible.map((entry) => {
        const player = game.world.players.get(entry.speakerId as GameId<'players'>);
        if (!player) return null;
        const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
        const text = `${name}：${entry.text}`;
        const height = text.length > 19 ? 52 : 38;
        return (
          <Container
            key={entry.id}
            x={player.position.x * tileDim + tileDim / 2}
            y={player.position.y * tileDim - 50}
          >
            <Graphics
              draw={(graphics) => {
                graphics.clear();
                graphics.lineStyle(2, entry.kind === 'alliance' ? 0x70e6ca : 0xf2c861, 0.95);
                graphics.beginFill(0x07131f, 0.94);
                graphics.drawRoundedRect(-80, -height, 160, height, 5);
                graphics.endFill();
                graphics.beginFill(0x07131f, 0.94);
                graphics.drawPolygon([-7, 0, 7, 0, 0, 9]);
                graphics.endFill();
              }}
            />
            <Text text={text} anchor={0.5} x={0} y={-height / 2} style={speechStyle} />
          </Container>
        );
      })}
    </Container>
  );
}
