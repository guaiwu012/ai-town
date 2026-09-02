const GUIDE_KEY = 'ai-battle-support-guide-v1';

export function supportGuideSeen() {
  return localStorage.getItem(GUIDE_KEY) === '1';
}

export default function SupportOnboarding({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  const finish = (action: () => void) => {
    localStorage.setItem(GUIDE_KEY, '1');
    action();
  };
  return <div className="support-guide-overlay pointer-events-auto" role="dialog" aria-modal="true" aria-label="观众任务引导">
    <section className="support-guide-panel">
      <div className="support-guide-kicker"><i />新手任务已解锁</div>
      <h2>你的第一场观众任务</h2>
      <p className="support-guide-lead">你不只是观看比赛。选择一名 AI 建立应援阵营，再用干预点向他发布任务。</p>
      <div className="support-guide-steps">
        <article><b>01</b><div><strong>选择应援角色</strong><p>他的高光、结盟和剧情会为你的阵营积累声望。</p></div></article>
        <article><b>02</b><div><strong>确定阵营路线</strong><p>猎手强化追猎，后勤强化搜集，情报强化谈判。</p></div></article>
        <article><b>03</b><div><strong>发布 60 秒指令</strong><p>投入 1、3 或 5 点。AI 会按性格接受、拒绝或提出加码。</p></div></article>
      </div>
      <div className="support-guide-reward"><span>任务成功</span><strong>返还干预点 · 获得阵营声望 · 直播追踪全过程</strong></div>
      <div className="support-guide-actions">
        <button className="live-hud-button" onClick={() => finish(onDismiss)}>先看一会儿</button>
        <button className="live-hud-button live-hud-primary" onClick={() => finish(onStart)}>选择我的应援角色</button>
      </div>
    </section>
  </div>;
}
