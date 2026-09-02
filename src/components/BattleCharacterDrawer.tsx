import { ServerGame } from '../hooks/serverGame';
import { GameId } from '../../convex/aiTown/ids';
import { AREA_SPECIAL_EVENTS, personaForCharacter, storyOptionFor } from '../../data/battleRoyaleConfig';
import { BATTLE_ARENA_ZONES } from '../../data/battleArena';
import BattleVitalBattery from './BattleVitalBattery';
import type { BattleReplayFrame } from '../../convex/aiTown/battleRoyale';

export default function BattleCharacterDrawer({ game, playerId, replayFrame, replayTime, onClose }: {
  game: ServerGame;
  playerId?: GameId<'players'>;
  replayFrame?: BattleReplayFrame;
  replayTime?: number;
  onClose: () => void;
}) {
  const player = playerId ? game.world.players.get(playerId) : undefined;
  if (!player?.battle) return null;
  const historicalPlayer = replayFrame?.players.find((entry) => entry.id === player.id);
  const stats = historicalPlayer ? { ...player.battle, ...historicalPlayer } : player.battle;
  const name = game.playerDescriptions.get(player.id)?.name ?? player.id;
  const replayRelationships = new Map(replayFrame?.relationships.map((entry) => [entry.id, entry]));
  const relationships = (game.world.battle?.relationshipEdges ?? [])
    .map((edge) => ({ ...edge, ...(replayRelationships.get(edge.id) ?? {}) }))
    .filter((edge) => !edge.hidden && (edge.a === stats.characterId || edge.b === stats.characterId));
  const areaStories = AREA_SPECIAL_EVENTS.filter((event) => event.areaId === stats.areaId).map((event) => ({ event, count: game.world.battle?.areaEventCounts?.find((entry) => entry.id === event.id)?.count ?? 0 }));
  const area = BATTLE_ARENA_ZONES.find((zone) => zone.id === stats.areaId);
  const areaLock = (game.world.battle?.areaLocks ?? []).find((lock) => lock.areaId === stats.areaId && lock.until > Date.now());
  const recentActions = (game.world.battle?.actionLog ?? []).filter((entry) => entry.playerId === player.id && (!replayTime || entry.ts <= replayTime)).slice(-3).reverse();
  const recentDialogue = (game.world.battle?.dialogueLog ?? []).filter((entry) => (!replayTime || entry.ts <= replayTime) && (entry.speakerId === player.id || entry.listenerId === player.id)).slice(0, 6);
  const auditedAction = recentActions[0];
  const persona = personaForCharacter(stats.characterId);
  return (
    <aside className="character-drawer pointer-events-auto" aria-label={`${name}角色详情`}>
      <div className="character-drawer-header">
        <div className="drawer-identity"><Portrait characterId={stats.characterId} /><div><div className="drawer-kicker">{replayTime ? '回放角色档案' : '直播角色档案'}</div><h2>{name}</h2></div></div>
        <button className="live-hud-button" onClick={onClose}>关闭</button>
      </div>
      <div className="drawer-stat-grid">
        <div><small>生命</small><strong className="flex items-center gap-2"><BattleVitalBattery value={stats.hp} max={stats.maxHp} compact />{Math.ceil(stats.hp)}/{stats.maxHp}</strong></div>
        <Stat label="体力" value={Math.ceil(stats.stamina ?? 0)} />
        <Stat label="武器" value={displayWeapon(stats.weapon)} />
        <Stat label="物资" value={stats.coins} />
      </div>
      <DrawerSection title="当前状态"><p>{replayTime ? '回放时刻状态' : player.activity?.description ?? '正在观察战场'}</p><p>区域：{stats.areaId ?? 'A01'} · 击杀：{stats.kills} · 压力：{Math.ceil(stats.stress ?? 0)}/{stats.stressThreshold ?? '--'}</p><p>饱食：{Math.ceil(stats.satiety ?? 0)} · 区域停留：{Math.ceil(stats.zoneTime ?? 0)}/{stats.maxZoneTime ?? '--'}</p></DrawerSection>
      <DrawerSection title={`角色卡 · ${persona.title}`}><p>{persona.archetype}</p><p>{persona.goal}</p><p>战斗：{persona.combatStyle}</p><p>说话：{persona.speechStyle}</p><div className="drawer-persona-bias"><span>攻击 {Math.round(persona.attackBias * 100)}%</span><span>结盟 {Math.round(persona.allianceBias * 100)}%</span><span>撤退 {Math.round(persona.retreatBias * 100)}%</span></div></DrawerSection>
      <DrawerSection title="区域规则"><p>{area?.label ?? stats.areaId} · 地标障碍 {area?.obstacles.length ?? 0} 处</p><p className={areaLock ? 'drawer-warning' : undefined}>{areaLock ? `剧情封锁中，还剩 ${Math.ceil((areaLock.until - Date.now()) / 1000)} 秒` : '区域移动正常'}</p></DrawerSection>
      <DrawerSection title="背包"><p>{stats.inventory?.length ? stats.inventory.join('、') : '暂无额外物资'} · 医疗包 {stats.medkits}</p></DrawerSection>
      <DrawerSection title="决策审计">
        <p>{auditedAction ? `${auditedAction.source === 'model' ? '模型' : '规则'} · ${displayAction(auditedAction.action)}${storyChoiceLabel(auditedAction.storyEventId, auditedAction.storyApproach)} · ${auditedAction.accepted ? '已执行' : '已拒绝'}` : '等待本轮决策'}</p>
        {auditedAction?.reason && <p className={auditedAction.accepted ? undefined : 'drawer-warning'}>{auditedAction.accepted ? auditedAction.reason : `回退：${auditedAction.reason}`}</p>}
      </DrawerSection>
      <DrawerSection title="行动日志">
        {recentActions.length ? recentActions.map((entry) => <p key={entry.id}>{entry.source === 'model' ? '模型' : '规则'} · {displayAction(entry.action)}{storyChoiceLabel(entry.storyEventId, entry.storyApproach)} · {entry.accepted ? '已执行' : `拒绝：${entry.reason ?? '未知原因'}`}</p>) : <p>暂无已记录行动</p>}
      </DrawerSection>
      <DrawerSection title="最近交谈">
        {recentDialogue.length ? recentDialogue.map((entry) => {
          const speaker = game.playerDescriptions.get(entry.speakerId as GameId<'players'>)?.name ?? entry.speakerId;
          const listener = entry.listenerId ? game.playerDescriptions.get(entry.listenerId as GameId<'players'>)?.name ?? entry.listenerId : undefined;
          return <p key={entry.id}><strong>{speaker}</strong>{listener ? ` 对 ${listener}` : ''}：{entry.text}</p>;
        }) : <p>暂无交谈。角色相遇后可能发起结盟或交易。</p>}
      </DrawerSection>
      <DrawerSection title="公开关系">
        {relationships.length ? relationships.map((edge) => <p key={edge.id}>{relationshipLabel(edge.type)} · 强度 {edge.strength}{edge.lastReason ? ` · ${edge.lastReason}` : ''}</p>) : <p>暂无公开关系</p>}
      </DrawerSection>
      <DrawerSection title="线索与任务"><p>真相线索 {replayFrame?.truthClues.length ?? game.world.battle?.truthClues?.length ?? 0}/3</p></DrawerSection>
      <DrawerSection title="区域剧情">{areaStories.length ? areaStories.map(({ event, count }) => <p key={event.id}>{event.title} · {count}/{event.maxTriggers} 次</p>) : <p>当前区域暂无特殊剧情</p>}</DrawerSection>
    </aside>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="drawer-section"><h3>{title}</h3>{children}</section>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function displayWeapon(weapon: string) { return ({ Fists: '拳头', Pistol: '手枪', Shotgun: '霰弹枪', Rifle: '步枪', Sniper: '狙击枪' } as Record<string, string>)[weapon] ?? weapon; }
function displayAction(action: string) { return ({ move: '移动', search: '搜索', buy: '购买', trade: '交易', ally: '结盟', attack: '攻击', flee: '撤离', heal: '治疗', investigate: '调查' } as Record<string, string>)[action] ?? action; }
function storyApproachLabel(approach: string) { return ({ cautious: '谨慎勘察', bold: '强行突破', social: '交涉取证' } as Record<string, string>)[approach] ?? approach; }
function storyChoiceLabel(eventId?: string, approach?: string) {
  if (eventId) return `（${storyOptionFor(eventId, approach).label}）`;
  return approach ? `（${storyApproachLabel(approach)}）` : '';
}
function relationshipLabel(type: string) { return ({ family: '亲属', ex: '旧识', rival: '宿敌', mentor: '师徒', friend: '同伴' } as Record<string, string>)[type] ?? type; }
function Portrait({ characterId }: { characterId?: string }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  return <span className="contestant-portrait contestant-portrait-large" style={{ backgroundPosition: `${((index % 4) / 3) * 100}% ${(Math.floor(index / 4) / 2) * 100}%` }} />;
}
