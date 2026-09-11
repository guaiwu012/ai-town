import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServerGame } from './serverGame';
import type { BattleEvent } from '../../convex/aiTown/battleRoyale';
import { BATTLE_CONFIG } from '../../data/battleRoyaleConfig';

const AUDIO_KEY = 'ai-battle-audio-enabled-v1';
const MUSIC_URL = '/ai-town/assets/audio/music/dark-sector.mp3';
const EFFECT_URLS = {
  shotSmall: '/ai-town/assets/audio/sfx/shot-small.ogg',
  shotHeavy: '/ai-town/assets/audio/sfx/shot-heavy.ogg',
  impact: '/ai-town/assets/audio/sfx/impact.ogg',
  eliminate: '/ai-town/assets/audio/sfx/eliminate-soft.mp3',
  zone: '/ai-town/assets/audio/sfx/zone.ogg',
  victory: '/ai-town/assets/audio/sfx/victory.mp3',
  ui: '/ai-town/assets/audio/sfx/ui-hover.mp3',
} as const;

const BULLET_TRAVEL_MS = 520;

type BattleAudioFocus = {
  focusPlayerId?: string;
  focusAreaId?: string;
  active?: boolean;
};

type BattleAudioCue = { url: string; volume: number; delay: number };

export function battleEventMatchesCamera(
  event: Pick<BattleEvent, 'kind' | 'actor' | 'target' | 'areaId'>,
  focus: BattleAudioFocus,
) {
  if (focus.active === false) return false;
  if (event.kind !== 'attack' && event.kind !== 'eliminate') return true;
  if (focus.focusPlayerId) {
    return event.actor === focus.focusPlayerId || event.target === focus.focusPlayerId;
  }
  if (focus.focusAreaId) return event.areaId === focus.focusAreaId;
  return false;
}

export function useBattleAudio(game?: ServerGame, focus: BattleAudioFocus = {}) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(AUDIO_KEY) !== '0');
  const startedRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement>();
  const playedEventIdsRef = useRef(new Set<number>());
  const effectTimersRef = useRef(new Set<number>());
  const matchStartedRef = useRef<number>();

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

  const events = game?.world.battle?.feed;
  useEffect(() => {
    if (!enabled || !startedRef.current || !events?.length || focus.active === false) return;
    const matchStarted = game?.world.battle?.started;
    if (matchStartedRef.current !== matchStarted) {
      matchStartedRef.current = matchStarted;
      playedEventIdsRef.current.clear();
      for (const timer of effectTimersRef.current) window.clearTimeout(timer);
      effectTimersRef.current.clear();
    }
    const now = Date.now();
    const recentIds = new Set(events.filter((event) => now - event.ts <= 5000).map((event) => event.id));
    for (const id of playedEventIdsRef.current) {
      if (!recentIds.has(id)) playedEventIdsRef.current.delete(id);
    }
    const recentEvents = events
      .filter((event) => now - event.ts <= 3000)
      .filter((event) => !playedEventIdsRef.current.has(event.id))
      .filter((event) => battleEventMatchesCamera(event, focus))
      .sort((first, second) => first.ts - second.ts || first.id - second.id);
    for (const event of recentEvents) {
      const cues = effectUrlsForEvent(event.kind, event.weapon);
      if (!cues.length) continue;
      playedEventIdsRef.current.add(event.id);
      cues.forEach(({ url, volume, delay }) => {
        const timer = window.setTimeout(() => {
          effectTimersRef.current.delete(timer);
          if (document.visibilityState !== 'visible') return;
          const effect = new Audio(url);
          effect.volume = volume;
          void effect.play().catch(() => undefined);
        }, Math.max(0, event.ts + delay - Date.now()));
        effectTimersRef.current.add(timer);
      });
    }
  }, [enabled, events, focus.active, focus.focusAreaId, focus.focusPlayerId, game?.world.battle?.started]);

  useEffect(() => () => {
    for (const timer of effectTimersRef.current) window.clearTimeout(timer);
    effectTimersRef.current.clear();
  }, [enabled, focus.active, focus.focusAreaId, focus.focusPlayerId]);

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

export function effectUrlsForEvent(kind: string, weapon?: string): BattleAudioCue[] {
  if (kind === 'attack') {
    const weaponConfig = BATTLE_CONFIG.weapons[weapon as keyof typeof BATTLE_CONFIG.weapons];
    const isRanged = (weaponConfig?.range ?? BATTLE_CONFIG.weapons.Fists.range) > BATTLE_CONFIG.weapons.Fists.range;
    if (!isRanged) return [{ url: EFFECT_URLS.impact, volume: 0.24, delay: 0 }];
    const isHeavy = (weaponConfig?.power ?? 0) >= BATTLE_CONFIG.weapons.Shotgun.power;
    return [
      { url: isHeavy ? EFFECT_URLS.shotHeavy : EFFECT_URLS.shotSmall, volume: 0.36, delay: 0 },
      { url: EFFECT_URLS.impact, volume: 0.24, delay: BULLET_TRAVEL_MS },
    ];
  }
  if (kind === 'eliminate') return [{ url: EFFECT_URLS.eliminate, volume: 0.46, delay: BULLET_TRAVEL_MS }];
  if (kind === 'zone' || kind === 'intervention') return [{ url: EFFECT_URLS.zone, volume: 0.28, delay: 0 }];
  if (kind === 'winner') return [{ url: EFFECT_URLS.victory, volume: 0.5, delay: 0 }];
  if (kind === 'buy' || kind === 'loot' || kind === 'ally') return [{ url: EFFECT_URLS.ui, volume: 0.18, delay: 0 }];
  return [];
}
