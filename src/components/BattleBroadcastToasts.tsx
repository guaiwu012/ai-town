import type { BattleEvent } from '../../convex/aiTown/battleRoyale';

type BattleBroadcastToastsProps = {
  feed?: BattleEvent[];
};

export default function BattleBroadcastToasts({ feed = [] }: BattleBroadcastToastsProps) {
  const visibleFeed = feed.slice(0, 4);
  if (visibleFeed.length === 0) {
    return null;
  }
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-2">
      {visibleFeed.map((event, index) => (
        <div
          key={event.id}
          className={`arena-toast w-full px-4 py-2 transition ${
            index === 0 ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-78'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="arena-feed-tag shrink-0">
              {event.kind}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm leading-tight">{event.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
