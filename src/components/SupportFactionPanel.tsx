import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';
import { BATTLE_CONFIG, personaForCharacter } from '../../data/battleRoyaleConfig';
import { ServerGame } from '../hooks/serverGame';
import { supportLevel, supportTasks } from '../lib/supportFaction';

type SupportSave = {
  characterId?: string;
  reputation: number;
  claimed: Record<string, string[]>;
};

const STORAGE_KEY = 'ai-battle-support-v1';

function loadSave(): SupportSave {
  try {
    return { reputation: 0, claimed: {}, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return { reputation: 0, claimed: {} };
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
  const battle = game.world.battle;
  const matchKey = String(battle?.seed ?? battle?.started ?? 'match');
  const players = useMemo(() => [...game.world.players.values()].filter((player) => player.battle), [game]);
  const target = players.find((player) => player.battle?.characterId === save.characterId);
  const claimed = save.claimed[matchKey] ?? [];
  const tasks = target?.battle ? supportTasks(
    target.battle,
    {
      aliveCount: players.filter((player) => !player.battle?.eliminated).length,
      storyTriggers: battle?.storyTriggers ?? [],
    },
  ) : [];
  const level = supportLevel(save.reputation);
  const cooldownUntil = battle?.operationCooldowns?.find((entry) => entry.id === 'FAN_01')?.until ?? 0;
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateSave = (next: SupportSave) => {
    setSave(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const join = (characterId: string) => {
    updateSave({ ...save, characterId, reputation: save.characterId ? save.reputation : save.reputation + 30 });
    setNotice(save.characterId ? '应援阵营已更换，本局任务进度保留。' : '加入成功，获得 30 点创始应援声望。');
  };
  const claim = (taskId: string, reward: number) => {
    if (claimed.includes(taskId)) return;
    updateSave({
      ...save,
      reputation: save.reputation + reward,
      claimed: { ...save.claimed, [matchKey]: [...claimed, taskId] },
    });
    setNotice(`任务结算，阵营声望 +${reward}。`);
  };
  const deploySupport = async () => {
    if (!target || level.level < 2 || pending) return;
    setPending(true);
    setNotice('');
    try {
      await sendInput({ worldId, name: 'intervene', args: { opId: 'FAN_01', targetPlayerId: target.id } });
      setNotice('应援空投已进入战场，镜头正在追踪投放目标。');
      onFollow(target.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '投放失败，请检查干预点或冷却。');
    } finally {
      setPending(false);
    }
  };

  return <div className="support-overlay pointer-events-auto" role="dialog" aria-modal="true" aria-label="角色应援与阵营经营">
    <section className="support-panel">
      <header className="support-header">
        <div><small>观众阵营</small><h2>角色应援</h2><p>选定一名参赛者，追随其故事并用干预点改变战局。</p></div>
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
          <button className="live-hud-button live-hud-primary" disabled={pending || cooldownSeconds > 0 || level.level < 2 || Boolean(target.battle?.eliminated)} onClick={deploySupport}>
            {target.battle?.eliminated ? '角色已淘汰' : level.level < 2 ? '核心应援解锁空投' : cooldownSeconds > 0 ? `空投冷却 ${cooldownSeconds}s` : pending ? '投放中…' : '应援空投 · 2 干预点'}
          </button>
        </div>
        <div className="support-progress"><span style={{ width: `${level.next ? Math.min(100, save.reputation / level.next * 100) : 100}%` }} /></div>
        <div className="support-section-title"><b>本局应援任务</b><span>{level.next ? `距下一等级 ${Math.max(0, level.next - save.reputation)} 声望` : '已达最高等级'}</span></div>
        <div className="support-task-list">
          {tasks.map((task) => {
            const isClaimed = claimed.includes(task.id);
            return <article key={task.id} className={task.complete ? 'is-complete' : ''}>
              <div><b>{task.title}</b><p>{task.description}</p></div>
              <button className="live-hud-button" disabled={!task.complete || isClaimed} onClick={() => claim(task.id, task.reward)}>{isClaimed ? '已领取' : task.complete ? `领取 +${task.reward}` : `+${task.reward}`}</button>
            </article>;
          })}
        </div>
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

function percent(value: number) { return `${Math.round(value * 100)}%`; }
function Portrait({ characterId, large = false }: { characterId?: string; large?: boolean }) {
  const index = Math.max(0, Number(characterId?.slice(1) ?? '1') - 1);
  return <span className={`contestant-portrait ${large ? 'contestant-portrait-large' : ''}`} style={{ backgroundPosition: `${((index % 4) / 3) * 100}% ${(Math.floor(index / 4) / 2) * 100}%` }} />;
}
