import { useEffect, useMemo, useState } from 'react';
import type { ServerGame } from '../hooks/serverGame';
import type { GameId } from '../../convex/aiTown/ids';
import { isConversationVisible } from '../lib/dialogueVisibility';

export default function BattleDialogueBox({ game, focusPlayerId, focusAreaId }: { game: ServerGame; focusPlayerId?: GameId<'players'>; focusAreaId?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const exchange = useMemo(() => {
    const latest = game.world.battle?.dialogueLog?.[0];
    if (!latest || !latest.listenerId || latest.kind === 'support' || now - latest.ts > 5500) return [];
    const currentExchange = (game.world.battle?.dialogueLog ?? [])
      .filter((entry) => Math.abs(entry.ts - latest.ts) < 1500 && (
        entry.speakerId === latest.speakerId ||
        entry.speakerId === latest.listenerId ||
        entry.listenerId === latest.speakerId
      ))
      .slice(0, 2)
      .reverse();
    const focusedPlayer = focusPlayerId ? game.world.players.get(focusPlayerId) : undefined;
    const visibleInCamera = isConversationVisible(
      currentExchange.flatMap((entry) => {
        const speaker = game.world.players.get(entry.speakerId as GameId<'players'>);
        return speaker ? [{ id: speaker.id, x: speaker.position.x, y: speaker.position.y, areaId: speaker.battle?.areaId }] : [];
      }),
      focusedPlayer ? { id: focusedPlayer.id, x: focusedPlayer.position.x, y: focusedPlayer.position.y, areaId: focusedPlayer.battle?.areaId } : undefined,
      focusAreaId,
    );
    return visibleInCamera ? currentExchange : [];
  }, [focusAreaId, focusPlayerId, game, game.world.battle?.dialogueLog, now]);

  if (!exchange.length) return null;
  const kind = dialogueKind(exchange[0].kind);
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

function dialogueKind(kind: string) {
  return ({
    alliance: '结盟协商', trade: '物资交易', combat: '交锋喊话', warning: '近距警告',
    probe: '关系试探', truce: '停火交涉', rapport: '同伴交流', support: '应援反馈',
  } as Record<string, string>)[kind] ?? '现场交谈';
}

function Portrait({ characterId }: { characterId?: string }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  return <span className="contestant-portrait battle-dialogue-portrait" style={{ backgroundPosition: `${((index % 4) / 3) * 100}% ${(Math.floor(index / 4) / 2) * 100}%` }} />;
}
