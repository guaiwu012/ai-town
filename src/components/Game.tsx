import { useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';
import BattleRoyalePanel from './BattleRoyalePanel.tsx';
import BattleBroadcastToasts from './BattleBroadcastToasts.tsx';
import DeepSeekConfigGate, {
  DeepSeekConfig,
  readDeepSeekConfig,
} from './DeepSeekConfigGate.tsx';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [deepSeekConfig, setDeepSeekConfig] = useState<DeepSeekConfig | undefined>(() =>
    readDeepSeekConfig(),
  );
  const [showDeepSeekConfig, setShowDeepSeekConfig] = useState(() => !readDeepSeekConfig());
  const [gameWrapperRef, { width, height }] = useElementSize();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  if (!worldId || !engineId || !game) {
    return null;
  }
  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}
      <div className="relative h-screen w-screen overflow-hidden bg-brown-900" ref={gameWrapperRef}>
        <div className="absolute inset-0">
          <Stage width={width} height={height} options={{ backgroundColor: 0x203d3b }}>
            {/* Re-propagate context because contexts are not shared between renderers.
https://github.com/michalochman/react-pixi-fiber/issues/145#issuecomment-531549215 */}
            <ConvexProvider client={convex}>
              <PixiGame
                game={game}
                worldId={worldId}
                engineId={engineId}
                width={width}
                height={height}
                historicalTime={historicalTime}
                selectedPlayerId={selectedElement?.id}
                setSelectedElement={setSelectedElement}
              />
            </ConvexProvider>
          </Stage>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.32)_100%)]" />
        <BattleBroadcastToasts feed={game.world.battle?.feed} />
        <div
          className="arena-console absolute right-4 top-4 bottom-4 z-10 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto overflow-x-hidden px-4 py-4 backdrop-blur-sm"
          ref={scrollViewRef}
        >
          <BattleRoyalePanel
            worldId={worldId}
            game={game}
            selectedPlayerId={selectedElement?.id}
            setSelectedElement={setSelectedElement}
            onEditDeepSeekConfig={() => setShowDeepSeekConfig(true)}
          />
        </div>
        {showDeepSeekConfig && (
          <DeepSeekConfigGate
            initialConfig={deepSeekConfig}
            onSave={(config) => {
              setDeepSeekConfig(config);
              setShowDeepSeekConfig(false);
            }}
          />
        )}
      </div>
    </>
  );
}
