import { ServerGame } from '../hooks/serverGame';
import { GameId } from '../../convex/aiTown/ids';
import { AREA_SPECIAL_EVENTS } from '../../data/battleRoyaleConfig';

export default function BattleCharacterDrawer({ game, playerId, onClose }: {
  game: ServerGame;
  playerId?: GameId<'players'>;
  onClose: () => void;
}) {
  const player = playerId ? game.world.players.get(playerId) : undefined;
  if (!player?.battle) return null;
  const stats = player.battle;
  const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
  const relationships = (game.world.battle?.relationshipEdges ?? []).filter((edge) => !edge.hidden && (edge.a === stats.characterId || edge.b === stats.characterId));
  const areaStories = AREA_SPECIAL_EVENTS.filter((event) => event.areaId === stats.areaId).map((event) => ({ event, count: game.world.battle?.areaEventCounts?.find((entry) => entry.id === event.id)?.count ?? 0 }));
  return (
    <aside className="character-drawer pointer-events-auto" aria-label={`${name}角色详情`}>
      <div className="character-drawer-header">
        <div className="drawer-identity"><Portrait characterId={stats.characterId} /><div><div className="drawer-kicker">直播角色档案</div><h2>{name}</h2></div></div>
        <button className="live-hud-button" onClick={onClose}>关闭</button>
      </div>
      <div className="drawer-stat-grid">
        <Stat label="生命" value={`${Math.ceil(stats.hp)}/${stats.maxHp}`} />
        <Stat label="体力" value={Math.ceil(stats.stamina ?? 0)} />
        <Stat label="武器" value={displayWeapon(stats.weapon)} />
        <Stat label="物资" value={stats.coins} />
      </div>
      <DrawerSection title="当前状态"><p>{player.activity?.description ?? '正在观察战场'}</p><p>区域：{stats.areaId ?? 'A01'} · 击杀：{stats.kills} · 压力：{stats.stress ?? 0}</p></DrawerSection>
      <DrawerSection title="背包"><p>{stats.inventory?.length ? stats.inventory.join('、') : '暂无额外物资'} · 医疗包 {stats.medkits}</p></DrawerSection>
      <DrawerSection title="决策审计">
        <p>{stats.lastDecisionStatus ?? '等待本轮决策'}{stats.lastDecisionAction ? ` · ${displayAction(stats.lastDecisionAction)}` : ''}</p>
        {stats.lastDecisionReason && <p>{stats.lastDecisionReason}</p>}
        {stats.lastDecisionFallback && <p className="drawer-warning">回退：{stats.lastDecisionFallback}</p>}
      </DrawerSection>
      <DrawerSection title="公开关系">
        {relationships.length ? relationships.map((edge) => <p key={edge.id}>{relationshipLabel(edge.type)} · 强度 {edge.strength}{edge.lastReason ? ` · ${edge.lastReason}` : ''}</p>) : <p>暂无公开关系</p>}
      </DrawerSection>
      <DrawerSection title="线索与任务"><p>真相线索 {game.world.battle?.truthClues?.length ?? 0}/3</p></DrawerSection>
      <DrawerSection title="区域剧情">{areaStories.length ? areaStories.map(({ event, count }) => <p key={event.id}>{event.title} · {count}/{event.maxTriggers} 次</p>) : <p>当前区域暂无特殊剧情</p>}</DrawerSection>
    </aside>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="drawer-section"><h3>{title}</h3>{children}</section>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function displayWeapon(weapon: string) { return ({ Fists: '拳头', Pistol: '手枪', Shotgun: '霰弹枪', Rifle: '步枪', Sniper: '狙击枪' } as Record<string, string>)[weapon] ?? weapon; }
function displayAction(action: string) { return ({ move: '移动', search: '搜索', buy: '购买', trade: '交易', ally: '结盟', attack: '攻击', flee: '撤离', heal: '治疗', investigate: '调查' } as Record<string, string>)[action] ?? action; }
function relationshipLabel(type: string) { return ({ family: '亲属', ex: '旧识', rival: '宿敌', mentor: '师徒', friend: '同伴' } as Record<string, string>)[type] ?? type; }
function Portrait({ characterId }: { characterId?: string }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  return <span className="contestant-portrait contestant-portrait-large" style={{ backgroundPosition: `${((index % 4) / 3) * 100}% ${(Math.floor(index / 4) / 2) * 100}%` }} />;
}
