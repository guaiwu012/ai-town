import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServerGame } from './serverGame';

const AUDIO_KEY = 'ai-battle-audio-enabled-v1';
const MUSIC_URL = '/ai-town/assets/audio/music/dark-sector.mp3';
const EFFECT_URLS = {
  shotSmall: '/ai-town/assets/audio/sfx/shot-small.ogg',
  shotHeavy: '/ai-town/assets/audio/sfx/shot-heavy.ogg',
  impact: '/ai-town/assets/audio/sfx/impact.ogg',
  eliminate: '/ai-town/assets/audio/sfx/eliminate.ogg',
  zone: '/ai-town/assets/audio/sfx/zone.ogg',
  victory: '/ai-town/assets/audio/sfx/victory.mp3',
  ui: '/ai-town/assets/audio/sfx/ui-hover.mp3',
} as const;

export function useBattleAudio(game?: ServerGame) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(AUDIO_KEY) !== '0');
  const startedRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement>();
  const lastEventIdRef = useRef<number>();

  const startMusic = useCallback(async () => {
    if (!enabled) return;
    const music = musicRef.current ?? new Audio(MUSIC_URL);
    musicRef.current = music;
    music.loop = true;
    music.volume = 0.22;
    startedRef.current = true;
    try {
      await music.play();
    } catch {
      startedRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    const start = () => void startMusic();
    const startFromInteraction = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('.game-intro')) return;
      void startMusic();
    };
    window.addEventListener('battle-audio-start', start);
    window.addEventListener('pointerdown', startFromInteraction, { once: true });
    return () => {
      window.removeEventListener('battle-audio-start', start);
      window.removeEventListener('pointerdown', startFromInteraction);
      musicRef.current?.pause();
    };
  }, [startMusic]);

  useEffect(() => {
    localStorage.setItem(AUDIO_KEY, enabled ? '1' : '0');
    if (!enabled) {
      musicRef.current?.pause();
    } else if (startedRef.current) {
      void startMusic();
    }
  }, [enabled, startMusic]);

  const latestEvent = game?.world.battle?.feed?.[0];
  useEffect(() => {
    if (!enabled || !startedRef.current || !latestEvent || latestEvent.id === lastEventIdRef.current || Date.now() - latestEvent.ts > 3000) return;
    lastEventIdRef.current = latestEvent.id;
    const urls = effectUrlsForEvent(latestEvent.kind, latestEvent.weapon);
    urls.forEach(({ url, volume }, index) => {
      window.setTimeout(() => {
        const effect = new Audio(url);
        effect.volume = volume;
        void effect.play().catch(() => undefined);
      }, index * 65);
    });
  }, [enabled, latestEvent?.id, latestEvent?.kind, latestEvent?.ts, latestEvent?.weapon]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm') setEnabled((value) => !value);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((value) => {
      if (!value) {
        startedRef.current = true;
      }
      return !value;
    });
  }, [startMusic]);

  return { audioEnabled: enabled, toggleAudio: toggle };
}

function effectUrlsForEvent(kind: string, weapon?: string) {
  if (kind === 'attack') {
    return [
      { url: weapon === 'Rifle' || weapon === 'Sniper' || weapon === 'Shotgun' ? EFFECT_URLS.shotHeavy : EFFECT_URLS.shotSmall, volume: 0.36 },
      { url: EFFECT_URLS.impact, volume: 0.24 },
    ];
  }
  if (kind === 'eliminate') return [{ url: EFFECT_URLS.eliminate, volume: 0.42 }];
  if (kind === 'zone' || kind === 'intervention') return [{ url: EFFECT_URLS.zone, volume: 0.28 }];
  if (kind === 'winner') return [{ url: EFFECT_URLS.victory, volume: 0.5 }];
  if (kind === 'buy' || kind === 'loot' || kind === 'ally') return [{ url: EFFECT_URLS.ui, volume: 0.18 }];
  return [];
}
