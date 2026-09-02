import { useRef, useState } from 'react';

const INTRO_VIDEO = '/ai-town/assets/media/opening.mp4';
const INTRO_POSTER = '/ai-town/assets/media/opening-poster.jpg';
const TRANSITION_SOUND = '/ai-town/assets/audio/sfx/transition.ogg';

export default function GameIntro({ onEnter }: { onEnter: () => Promise<void> }) {
  const [page, setPage] = useState(0);
  const [videoMuted, setVideoMuted] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [enterError, setEnterError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const pages = [
    { eyebrow: '第七码头计划 · 第 17 场公开实验', title: '十二个人醒在一座被封锁的岛上', body: '他们的身份、旧债和秘密都被写进比赛。安全区域会逐步关闭，只有一个人能走到直播结束。' },
    { eyebrow: '实时 AI 生存真人秀', title: '他们会判断，也会记住', body: '每名 AI 都有自己的目标、攻击倾向、结盟偏好和说话方式。一次援手或背叛，会改变此后的关系与选择。' },
    { eyebrow: '你的身份 · 观众阵营发起者', title: '选一个人，把他送进终局', body: '锁定应援角色，选择猎手、后勤或情报路线。用干预点发布 60 秒任务，AI 会按自己的性格回应并执行。' },
  ];
  const current = pages[page];
  const enterGame = () => {
    if (transitioning) return;
    setEnterError('');
    setTransitioning(true);
    videoRef.current?.pause();
    const transition = new Audio(TRANSITION_SOUND);
    transition.volume = 0.48;
    void transition.play().catch(() => undefined);
    window.dispatchEvent(new Event('battle-audio-start'));
    window.setTimeout(async () => {
      try {
        await onEnter();
      } catch (error) {
        setEnterError(error instanceof Error ? error.message : '新赛局初始化失败，请重试。');
        setTransitioning(false);
        void videoRef.current?.play();
      }
    }, 900);
  };
  const toggleVideoSound = () => {
    const nextMuted = !videoMuted;
    setVideoMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = 0.75;
      void videoRef.current.play();
    }
  };
  return <div className={`game-intro ${transitioning ? 'is-transitioning' : ''}`} role="dialog" aria-modal="true" aria-label="游戏背景介绍">
    <video ref={videoRef} className="game-intro-media" src={INTRO_VIDEO} poster={INTRO_POSTER} autoPlay muted={videoMuted} loop playsInline preload="auto" />
    <div className="game-intro-shade" />
    <div className="game-intro-transition" aria-hidden="true"><i /><b /></div>
    {transitioning && <div className="game-intro-entering"><small>LIVE SIGNAL CONNECTING</small><strong>正在生成新赛局</strong><i /></div>}
    <button className="game-intro-sound" onClick={toggleVideoSound}>{videoMuted ? '开启片头声音' : '关闭片头声音'}</button>
    <div className="game-intro-content">
      <div className="game-intro-live"><i /> LIVE SIGNAL 07</div>
      <small>{current.eyebrow}</small>
      <h1>{current.title}</h1>
      <p>{current.body}</p>
      <div className="game-intro-dots" aria-label={`介绍 ${page + 1}/3`}>{pages.map((_, index) => <i key={index} className={index === page ? 'is-active' : ''} />)}</div>
      {enterError && <div className="game-intro-error" role="alert">{enterError}</div>}
      <div className="game-intro-actions">
        <button className="live-hud-button" onClick={enterGame}>跳过片头</button>
        {page < pages.length - 1
          ? <button className="live-hud-button live-hud-primary" onClick={() => setPage((value) => value + 1)}>继续</button>
          : <button className="live-hud-button live-hud-primary" onClick={enterGame}>接入直播信号</button>}
      </div>
    </div>
  </div>;
}
