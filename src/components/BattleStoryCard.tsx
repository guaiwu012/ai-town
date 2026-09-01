import { useEffect, useState } from 'react';
import type { ServerGame } from '../hooks/serverGame';
import type { GameId } from '../../convex/aiTown/ids';

export default function BattleStoryCard({ game }: { game: ServerGame }) {
  const story = game.world.battle?.storyLog?.[0];
  const [open, setOpen] = useState(true);
  const [seenId, setSeenId] = useState<number>();

  useEffect(() => {
    if (story && story.id !== seenId) {
      setSeenId(story.id);
      setOpen(true);
    }
  }, [story, seenId]);

  useEffect(() => {
    if (!story || !open) return;
    const timer = window.setTimeout(() => setOpen(false), 7_500);
    return () => window.clearTimeout(timer);
  }, [story?.id, open]);

  if (!story) return null;
  const actor = game.playerDescriptions.get(story.actorId as GameId<'players'>)?.name ?? story.actorId;
  return (
    <aside className={`story-card pointer-events-auto ${open ? 'is-open' : 'is-collapsed'}`}>
      <button className="story-card-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>区域剧情</span><strong>{story.title}</strong><i>{open ? '收起' : '展开'}</i>
      </button>
      {open && <div className="story-card-body">
        <div className="story-card-location">{story.areaId} · {actor}</div>
        <p className="story-card-scene">{story.scene}</p>
        <div className="story-card-choice"><small>角色选择</small><p>{story.choice}</p></div>
        <div className={`story-card-check ${story.success ? 'is-success' : 'is-failure'}`}>
          <div><small>{story.check}</small><strong>D20 {story.roll} + {story.bonus}</strong></div>
          <span>{story.roll + story.bonus} / {story.difficulty}</span>
          <b>{story.success ? '成功' : '失败'}</b>
        </div>
        <p className="story-card-outcome">{story.outcome}</p>
      </div>}
    </aside>
  );
}
