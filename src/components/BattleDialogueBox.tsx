import { useEffect, useMemo, useState } from 'react';
import type { ServerGame } from '../hooks/serverGame';
import type { GameId } from '../../convex/aiTown/ids';

export default function BattleDialogueBox({ game }: { game: ServerGame }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const exchange = useMemo(() => {
    const latest = game.world.battle?.dialogueLog?.[0];
    if (!latest || now - latest.ts > 9000) return [];
    return (game.world.battle?.dialogueLog ?? [])
      .filter((entry) => Math.abs(entry.ts - latest.ts) < 1500 && (
        entry.speakerId === latest.speakerId ||
        entry.speakerId === latest.listenerId ||
        entry.listenerId === latest.speakerId
      ))
      .slice(0, 2)
      .reverse();
  }, [game.world.battle?.dialogueLog, now]);

  if (!exchange.length) return null;
  const kind = exchange[0].kind === 'alliance' ? '结盟协商' : '物资交易';
  return (
    <section className="battle-dialogue-box pointer-events-none" aria-live="polite">
      <div className="battle-dialogue-header"><span>现场交谈</span><strong>{kind}</strong></div>
      <div className="battle-dialogue-lines">
        {exchange.map((entry) => {
          const playerId = entry.speakerId as GameId<'players'>;
          const player = game.world.players.get(playerId);
          const name = game.playerDescriptions.get(playerId)?.name ?? entry.speakerId;
          return <div className="battle-dialogue-line" key={entry.id}>
            <Portrait characterId={player?.battle?.characterId} />
            <div><strong>{name}</strong><p>“{entry.text}”</p></div>
          </div>;
        })}
      </div>
    </section>
  );
}

function Portrait({ characterId }: { characterId?: string }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  return <span className="contestant-portrait battle-dialogue-portrait" style={{ backgroundPosition: `${((index % 4) / 3) * 100}% ${(Math.floor(index / 4) / 2) * 100}%` }} />;
}
