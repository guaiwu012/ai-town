export default function GameLoadingScreen({ stage }: { stage: string }) {
  return <div className="game-loading" role="status" aria-live="polite">
    <div className="game-loading-grid" />
    <div className="game-loading-copy">
      <small>第七码头 · 直播信号接入中</small>
      <h1>AI 大逃杀</h1>
      <div className="game-loading-track"><span /></div>
      <p>{stage}</p>
    </div>
  </div>;
}
