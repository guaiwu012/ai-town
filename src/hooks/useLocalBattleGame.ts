import { useCallback, useEffect, useRef, useState } from 'react';
import { hydrateLocalBattle } from '../localBattle/createLocalBattle';
import type { LocalBattleAction, WorkerRequest, WorkerResponse } from '../localBattle/protocol';
import type { ServerGame } from './serverGame';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';

type PendingRequest = { resolve: (value: unknown) => void; reject: (reason: Error) => void };

export function useLocalBattleGame(running = true) {
  const convex = useConvex();
  const workerRef = useRef<Worker>();
  const runningRef = useRef(running);
  runningRef.current = running;
  const pendingRef = useRef(new Map<string, PendingRequest>());
  const [game, setGame] = useState<ServerGame>();

  useEffect(() => {
    const worker = new Worker(new URL('../workers/battle.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === 'snapshot') {
        setGame(hydrateLocalBattle(message.snapshot));
        return;
      }
      const pending = pendingRef.current.get(message.requestId);
      if (!pending) return;
      pendingRef.current.delete(message.requestId);
      if (message.error) pending.reject(new Error(message.error));
      else pending.resolve(message.value);
    };
    const updateVisibility = () => worker.postMessage({
      type: 'visibility',
      visible: runningRef.current && document.visibilityState === 'visible',
    } satisfies WorkerRequest);
    document.addEventListener('visibilitychange', updateVisibility);
    let disposed = false;
    void Promise.race([
      convex.query(api.aiTown.cloudDecision.runtimeConfig, {}).catch(() => undefined),
      new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 1200)),
    ])
      .then((config) => {
        if (disposed) return;
        worker.postMessage({ type: 'init', config } satisfies WorkerRequest);
        updateVisibility();
      });
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      disposed = true;
      worker.terminate();
      workerRef.current = undefined;
      for (const pending of pendingRef.current.values()) pending.reject(new Error('比赛页面已关闭'));
      pendingRef.current.clear();
    };
  }, [convex]);

  useEffect(() => {
    workerRef.current?.postMessage({
      type: 'visibility',
      visible: running && document.visibilityState === 'visible',
    } satisfies WorkerRequest);
  }, [running]);

  const dispatch = useCallback((name: LocalBattleAction, args: Record<string, unknown> = {}) => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('本地比赛引擎尚未启动'));
    const requestId = crypto.randomUUID();
    return new Promise<unknown>((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject });
      worker.postMessage({ type: 'action', requestId, name, args } satisfies WorkerRequest);
    });
  }, []);

  return { game, dispatch, reset: () => dispatch('resetBattle') };
}
