const EVENT_ICON_ROOT = '/ai-town/assets/reference/ui/events';

const EVENT_ICON_BY_KIND: Record<string, string> = {
  attack: 'battle',
  eliminate: 'battle',
  winner: 'battle',
  ally: 'relationship',
  alliance: 'relationship',
  relation: 'relationship',
  reunion: 'relationship',
  dialogue: 'relationship',
  trade: 'relationship',
  betrayal: 'betrayal',
  zone: 'forbidden',
  intervention: 'organizer',
  reaction: 'organizer',
  tip: 'organizer',
};

export default function BattleEventIcon({ kind, className = '' }: { kind: string; className?: string }) {
  const icon = EVENT_ICON_BY_KIND[kind] ?? 'system';
  return <img className={`battle-event-icon ${className}`} src={`${EVENT_ICON_ROOT}/${icon}.svg`} alt="" aria-hidden="true" />;
}
