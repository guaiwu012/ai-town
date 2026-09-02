import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { BATTLE_CONFIG, personaForCharacter } from '../../data/battleRoyaleConfig';
import { ServerGame } from '../hooks/serverGame';
import { SupportDoctrine, SupportOrderKind, supportDoctrines, supportLevel, supportOrderKinds, supportOrderProgress, supportTasks } from '../lib/supportFaction';

type SupportSave = {
  characterId?: string;
  reputation: number;
  claimed: Record<string, string[]>;
  doctrines: Record<string, SupportDoctrine>;
  settledOrders: string[];
};

const STORAGE_KEY = 'ai-battle-support-v1';

function loadSave(): SupportSave {
  try {
    return { reputation: 0, claimed: {}, doctrines: {}, settledOrders: [], ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return { reputation: 0, claimed: {}, doctrines: {}, settledOrders: [] };
  }
}

export default function SupportFactionPanel({ worldId, game, onClose, onFollow }: {
  worldId: Id<'worlds'>;
  game: ServerGame;
  onClose: () => void;
  onFollow: (playerId: GameId<'players'>) => void;
}) {
  const sendInput = useMutation(api.aiTown.main.sendInput);
  const [save, setSave] = useState(loadSave);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [orderKind, setOrderKind] = useState<SupportOrderKind>('hunt');
  const [orderTargetId, setOrderTargetId] = useState<string>('');
  const [stake, setStake] = useState(3);
  const battle = game.world.battle;
  const matchKey = String(battle?.seed ?? battle?.started ?? 'match');
  const players = useMemo(() => [...game.world.players.values()].filter((player) => player.battle), [game]);
  const target = players.find((player) => player.battle?.characterId === save.characterId);
  const otherAlive = players.filter((player) => !player.battle?.eliminated && player.id !== target?.id);
  const claimed = save.claimed[matchKey] ?? [];
  const doctrine = save.doctrines[matchKey];
  const orders = battle?.supportOrders ?? [];
  const latestOrder = target ? orders.find((order) => order.playerId === target.id) : undefined;
  const activeOrder = latestOrder && ['active', 'countered'].includes(latestOrder.status) ? latestOrder : undefined;
  const orderProgress = activeOrder ? supportOrderProgress(activeOrder, target) : undefined;
  const cooldownUntil = latestOrder ? latestOrder.createdAt + 60000 : 0;
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const tasks = target?.battle ? supportTasks(target.battle, {
    aliveCount: players.filter((player) => !player.battle?.eliminated).length,
    storyTriggers: battle?.storyTriggers ?? [],
  }) : [];
  const level = supportLevel(save.reputation);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!orderTargetId && otherAlive[0]) setOrderTargetId(otherAlive[0].id);
  }, [orderTargetId, otherAlive]);

  useEffect(() => {
    const terminal = orders.filter((order) => order.playerId === target?.id && ['success', 'failed', 'rejected'].includes(order.status));
    const fresh = terminal.filter((order) => !save.settledOrders.includes(`${matchKey}:${order.id}`));
    if (!fresh.length) return;
    const reputation = fresh.reduce((total, order) => total + (order.status === 'success' ? 20 + order.stake * 5 : 0), save.reputation);
    updateSave({ ...save, reputation, settledOrders: [...save.settledOrders, ...fresh.map((order) => `${matchKey}:${order.id}`)].slice(-120) });
  }, [orders, target?.id, matchKey]);

  const updateSave = (next: SupportSave) => {
    setSave(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const join = (characterId: string) => {
    updateSave({ ...save, characterId, reputation: save.characterId ? save.reputation : save.reputation + 30 });
    setNotice(save.characterId ? '应援角色已更换。' : '加入成功，获得 30 点创始应援声望。');
  };
  const selectDoctrine = (next: SupportDoctrine) => {
    if (orders.some((order) => order.playerId === target?.id)) return;
    updateSave({ ...save, doctrines: { ...save.doctrines, [matchKey]: next } });
    setNotice(`本局已接入${supportDoctrines.find((item) => item.id === next)?.name}。`);
  };
  const issueOrder = async () => {
    if (!target || !doctrine || pending || cooldownSeconds > 0) return;
    setPending(true);
    setNotice('正在等待角色回应…');
    try {
      await sendInput({ worldId, name: 'submitSupportOrder', args: {
        playerId: target.id,
        kind: orderKind,
        doctrine,
        stake,
        ...((orderKind === 'hunt' || orderKind === 'ally') ? { targetPlayerId: orderTargetId as GameId<'players'> } : {}),
      } });
      setNotice('指令已送达，角色回应会在下方显示。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '任务发布失败。');
    } finally {
      setPending(false);
    }
  };
  const acceptCounter = async () => {
    if (!activeOrder || activeOrder.status !== 'countered' || pending) return;
    setPending(true);
    try {
      await sendInput({ worldId, name: 'acceptSupportCounter', args: { orderId: activeOrder.id } });
      setNotice('加码成功，角色开始执行任务。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '加码失败。');
    } finally {
      setPending(false);
    }
  };
  const claim = (taskId: string, reward: number) => {
    if (claimed.includes(taskId)) return;
    updateSave({ ...save, reputation: save.reputation + reward, claimed: { ...save.claimed, [matchKey]: [...claimed, taskId] } });
    setNotice(`任务结算，阵营声望 +${reward}。`);
  };

  return <div className="support-overlay pointer-events-auto" role="dialog" aria-modal="true" aria-label="角色应援与阵营经营">
    <section className="support-panel">
      <header className="support-header">
        <div><small>观众阵营</small><h2>应援作战室</h2><p>选择一个角色，以干预点发布任务；角色会按自己的性格回应并执行。</p></div>
        <button className="live-hud-button" onClick={onClose}>关闭</button>
      </header>
      {!target ? <>
        <div className="support-section-title"><b>选择你的应援角色</b><span>首次加入赠送 30 声望</span></div>
        <div className="support-roster">
          {BATTLE_CONFIG.characters.map((character) => {
            const player = players.find((candidate) => candidate.battle?.characterId === character.id);
            const persona = personaForCharacter(character.id);
            return <button key={character.id} disabled={!player || player.battle?.eliminated} onClick={() => join(character.id)}>
              <Portrait characterId={character.id} />
              <span><b>{character.name}</b><small>{character.codename} · {persona.title}</small><em>{player?.battle?.eliminated ? '本局已淘汰' : persona.archetype}</em></span>
            </button>;
          })}
        </div>
      </> : <>
        <div className="support-hero">
          <Portrait characterId={target.battle?.characterId} large />
          <div><small>正在应援 · {level.name}</small><h3>{game.playerDescriptions.get(target.id)?.name ?? target.id}</h3><p>{personaForCharacter(target.battle?.characterId).title} · {personaForCharacter(target.battle?.characterId).goal}</p></div>
          <div className="support-reputation"><strong>{save.reputation}</strong><span>阵营声望</span></div>
        </div>
        <div className="support-actions">
          <button className="live-hud-button" onClick={() => onFollow(target.id)}>跟随直播镜头</button>
          <button className="live-hud-button" onClick={() => updateSave({ ...save, characterId: undefined })}>更换应援角色</button>
          <span className="support-points">可用干预点 <b>{battle?.interventionPoints ?? 0}</b></span>
        </div>
        <div className="support-progress"><span style={{ width: `${level.next ? Math.min(100, save.reputation / level.next * 100) : 100}%` }} /></div>

        <div className="support-section-title"><b>1. 选择本局阵营路线</b><span>{doctrine ? '首次发布任务后锁定' : '路线影响接受率与任务奖励'}</span></div>
        <div className="support-doctrine-grid">
          {supportDoctrines.map((item) => <button key={item.id} className={doctrine === item.id ? 'is-active' : ''} disabled={Boolean(doctrine && doctrine !== item.id && orders.some((order) => order.playerId === target.id))} onClick={() => selectDoctrine(item.id)}>
            <b>{item.name}</b><span>{item.description}</span>
          </button>)}
        </div>

        <div className="support-section-title"><b>2. 发布 60 秒任务</b><span>{cooldownSeconds > 0 ? `指令冷却 ${cooldownSeconds}s` : 'AI 可能接受、拒绝或提出加码'}</span></div>
        <div className="support-order-console">
          <div className="support-order-kinds">
            {supportOrderKinds.map((item) => <button key={item.id} className={orderKind === item.id ? 'is-active' : ''} onClick={() => setOrderKind(item.id)}><b>{item.name}</b><small>{item.description}</small></button>)}
          </div>
          {(orderKind === 'hunt' || orderKind === 'ally') && <label>任务目标<select value={orderTargetId} onChange={(event) => setOrderTargetId(event.target.value)}>{otherAlive.map((player) => <option key={player.id} value={player.id}>{game.playerDescriptions.get(player.id)?.name ?? player.id}</option>)}</select></label>}
          <div className="support-stake"><span>投入点数</span>{[1, 3, 5].map((value) => <button key={value} className={stake === value ? 'is-active' : ''} onClick={() => setStake(value)}>{value} 点</button>)}</div>
          <button className="live-hud-button live-hud-primary support-issue" disabled={!doctrine || pending || cooldownSeconds > 0 || Boolean(target.battle?.eliminated) || (battle?.interventionPoints ?? 0) < stake} onClick={issueOrder}>
            {pending ? '等待回应…' : !doctrine ? '先选择阵营路线' : cooldownSeconds > 0 ? `冷却 ${cooldownSeconds}s` : `发布任务 · ${stake} 点`}
          </button>
        </div>

        {latestOrder && <section className={`support-order-status is-${latestOrder.status}`}>
          <div><small>角色回应</small><blockquote>“{latestOrder.response}”</blockquote></div>
          <div className="support-order-state"><b>{statusName(latestOrder.status)}</b><span>{activeOrder ? `${Math.max(0, Math.ceil((activeOrder.expiresAt - now) / 1000))}s` : latestOrder.result}</span></div>
          {activeOrder && <div className="support-order-meter"><span style={{ width: `${(orderProgress?.value ?? 0) * 100}%` }} /><em>{orderProgress?.label}</em></div>}
          {latestOrder.status === 'countered' && <button className="live-hud-button live-hud-primary" disabled={pending || (battle?.interventionPoints ?? 0) < 1} onClick={acceptCounter}>接受加码 · 1 点</button>}
        </section>}

        <div className="support-section-title"><b>长期阵营任务</b><span>{level.next ? `距下一等级 ${Math.max(0, level.next - save.reputation)} 声望` : '已达最高等级'}</span></div>
        <div className="support-task-list">{tasks.map((task) => {
          const isClaimed = claimed.includes(task.id);
          return <article key={task.id} className={task.complete ? 'is-complete' : ''}><div><b>{task.title}</b><p>{task.description}</p></div><button className="live-hud-button" disabled={!task.complete || isClaimed} onClick={() => claim(task.id, task.reward)}>{isClaimed ? '已领取' : task.complete ? `领取 +${task.reward}` : `+${task.reward}`}</button></article>;
        })}</div>
        <div className="support-persona-grid">
          <div><small>交战倾向</small><b>{percent(personaForCharacter(target.battle?.characterId).attackBias)}</b></div>
          <div><small>结盟倾向</small><b>{percent(personaForCharacter(target.battle?.characterId).allianceBias)}</b></div>
          <div><small>撤退倾向</small><b>{percent(personaForCharacter(target.battle?.characterId).retreatBias)}</b></div>
        </div>
      </>}
      {notice && <div className="support-notice">{notice}</div>}
    </section>
  </div>;
}

function statusName(status: string) { return ({ active: '执行中', countered: '等待加码', rejected: '已拒绝', success: '任务成功', failed: '任务失败' } as Record<string, string>)[status] ?? status; }
function percent(value: number) { return `${Math.round(value * 100)}%`; }
function Portrait({ characterId, large = false }: { characterId?: string; large?: boolean }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  return <span className={`contestant-portrait ${large ? 'contestant-portrait-large' : ''}`} style={{ backgroundPosition: `${((index % 4) / 3) * 100}% ${(Math.floor(index / 4) / 2) * 100}%` }} />;
}
