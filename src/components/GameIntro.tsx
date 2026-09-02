import { useState } from 'react';

const INTRO_VIDEO = import.meta.env.VITE_INTRO_VIDEO_URL as string | undefined;

export default function GameIntro({ onEnter }: { onEnter: () => void }) {
  const [page, setPage] = useState(0);
  const pages = [
    { eyebrow: '第七码头计划 · 第 17 场公开实验', title: '十二个人醒在一座被封锁的岛上', body: '他们的身份、旧债和秘密都被写进比赛。安全区域会逐步关闭，只有一个人能走到直播结束。' },
    { eyebrow: '实时 AI 生存真人秀', title: '他们会判断，也会记住', body: '每名 AI 都有自己的目标、攻击倾向、结盟偏好和说话方式。一次援手或背叛，会改变此后的关系与选择。' },
    { eyebrow: '你的身份 · 观众阵营发起者', title: '选一个人，把他送进终局', body: '锁定应援角色，追随其剧情与高光。完成阵营任务获得声望，再用干预点把空投送进真实战场。' },
  ];
  const current = pages[page];
  return <div className="game-intro" role="dialog" aria-modal="true" aria-label="游戏背景介绍">
    {INTRO_VIDEO ? <video className="game-intro-media" src={INTRO_VIDEO} autoPlay muted loop playsInline /> : <img className="game-intro-media" src="/ai-town/assets/battle/arena-live-map.png" alt="俯瞰第七码头战场" />}
    <div className="game-intro-shade" />
    <div className="game-intro-content">
      <div className="game-intro-live"><i /> LIVE SIGNAL 07</div>
      <small>{current.eyebrow}</small>
      <h1>{current.title}</h1>
      <p>{current.body}</p>
      <div className="game-intro-dots" aria-label={`介绍 ${page + 1}/3`}>{pages.map((_, index) => <i key={index} className={index === page ? 'is-active' : ''} />)}</div>
      <div className="game-intro-actions">
        <button className="live-hud-button" onClick={onEnter}>跳过介绍</button>
        {page < pages.length - 1
          ? <button className="live-hud-button live-hud-primary" onClick={() => setPage((value) => value + 1)}>继续</button>
          : <button className="live-hud-button live-hud-primary" onClick={onEnter}>进入直播</button>}
      </div>
    </div>
  </div>;
}
