import { useEffect, useRef } from 'react';

export default function SupportDefeatModal({
  characterId,
  characterName,
  pending,
  error,
  onRestart,
  onContinue,
}: {
  characterId: string;
  characterName: string;
  pending: boolean;
  error?: string;
  onRestart: () => void;
  onContinue: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => continueRef.current?.focus(), []);

  return <div className="support-defeat-overlay pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="support-defeat-title">
    <section className="support-defeat-panel">
      <div className="support-defeat-signal"><i /> SUPPORT SIGNAL LOST</div>
      <Portrait characterId={characterId} />
      <div className="support-defeat-kicker">本局应援失败</div>
      <h2 id="support-defeat-title">{characterName} 已被淘汰</h2>
      <p>你的本局应援目标已经离场。可以立即重置比赛并重新选择角色，也可以留在直播间观看最终胜者。</p>
      {error && <div className="support-defeat-error" role="alert">{error}</div>}
      <div className="support-defeat-actions">
        <button ref={continueRef} className="live-hud-button" disabled={pending} onClick={onContinue}>继续观看</button>
        <button className="live-hud-button live-hud-danger" disabled={pending} onClick={onRestart}>{pending ? '正在重新开局…' : '重新开局'}</button>
      </div>
    </section>
  </div>;
}

function Portrait({ characterId }: { characterId: string }) {
  const index = Math.max(0, Number(characterId.slice(1)) - 1);
  const col = index % 4;
  const row = Math.floor(index / 4);
  return <span className="contestant-portrait support-defeat-portrait" aria-hidden="true" style={{ backgroundPosition: `${(col / 3) * 100}% ${(row / 2) * 100}%` }} />;
}
