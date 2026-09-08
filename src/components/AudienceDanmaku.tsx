import { useEffect, useRef, useState } from 'react';
import type { BattleEvent } from '../../convex/aiTown/battleRoyale';

type AudienceDanmakuProps = {
  enabled: boolean;
  feed?: BattleEvent[];
};

type DanmakuItem = {
  id: string;
  lane: number;
  persona: string;
  text: string;
  tone: 'hot' | 'smart' | 'fun' | 'chaos';
  duration: number;
};

const PERSONALITIES = [
  { persona: '暴躁老哥', tone: 'hot' as const },
  { persona: '战术课代表', tone: 'smart' as const },
  { persona: '吃瓜一号', tone: 'fun' as const },
  { persona: '混沌乐子人', tone: 'chaos' as const },
];

const IDLE_LINES = [
  '咋不打？',
  '我要看到血流成河！',
  '这波都在等对面先露头',
  '导播快切有人的地方！',
  '空气突然安静，肯定有人憋大招',
  '先别急，我闻到埋伏的味道了',
];

const EVENT_LINES: Record<string, string[]> = {
  attack: ['打起来打起来！', '这波换血谁赚了？', '别拉扯了，正面刚！', '这个枪线有点凶啊'],
  eliminate: ['淘汰了！这下真见血了', '好快的收割，没给机会', '盒饭领得猝不及防', '刚才那波可以进集锦'],
  zone: ['圈又缩了，跑慢的要遭重', '毒圈才是真正的猎人', '还不转移？要被关门了', '这下必须打遭遇战'],
  loot: ['搜半天，最好来个狠货', '这资源点有东西的', '先发育也行，后面别怂', '装备起来就该主动找人了'],
  buy: ['钞能力也是实力', '这钱花得值不值？', '装备差距要拉开了'],
  heal: ['先打药，活着才有输出', '残血敢停下来打药，心真大', '续上了，下一波还能打'],
  move: ['这是转点还是逃跑？', '这路线像是要绕后', '走快点，观众都替你急'],
  ally: ['塑料盟友预定', '结盟？我赌三分钟后背刺', '先抱团，最后再算账'],
  alliance: ['塑料盟友预定', '结盟？我赌三分钟后背刺', '先抱团，最后再算账'],
  tip: ['榜一大哥出手了', '有应援就是不一样', '观众开始改写战局了'],
  winner: ['冠军诞生！', '活到最后的才是真狠人', '这一局可以，马上再开！'],
};

export default function AudienceDanmaku({ enabled, feed = [] }: AudienceDanmakuProps) {
  const [items, setItems] = useState<DanmakuItem[]>([]);
  const sequenceRef = useRef(0);
  const latestEventIdRef = useRef<number>();

  useEffect(() => {
    if (!enabled) setItems([]);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const latest = feed[0];
    if (!latest || latest.id === latestEventIdRef.current) return;
    latestEventIdRef.current = latest.id;
    const lines = EVENT_LINES[latest.kind] ?? ['这波信息量有点大', '前排围观，继续继续', '局势开始有意思了'];
    const seed = Math.abs(latest.id);
    addItem(lines[seed % lines.length], seed);
  }, [enabled, feed]);

  useEffect(() => {
    if (!enabled) return;
    const pushIdleLine = () => {
      const seed = sequenceRef.current + Date.now();
      addItem(IDLE_LINES[Math.abs(seed) % IDLE_LINES.length], seed);
    };
    const first = window.setTimeout(pushIdleLine, 1800);
    const timer = window.setInterval(pushIdleLine, 6800);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [enabled]);

  const addItem = (text: string, seed: number) => {
    const sequence = ++sequenceRef.current;
    const personality = PERSONALITIES[Math.abs(seed + sequence) % PERSONALITIES.length];
    const item: DanmakuItem = {
      id: `${Date.now()}-${sequence}`,
      lane: Math.abs(seed + sequence) % 5,
      persona: personality.persona,
      text,
      tone: personality.tone,
      duration: 9 + (Math.abs(seed) % 4),
    };
    setItems((current) => [...current.slice(-5), item]);
    window.setTimeout(() => setItems((current) => current.filter((entry) => entry.id !== item.id)), (item.duration + 1) * 1000);
  };

  if (!enabled) return null;

  return (
    <div className="audience-danmaku-layer" aria-live="polite" aria-label="AI 观众弹幕">
      {items.map((item) => (
        <div
          key={item.id}
          className={`audience-danmaku is-${item.tone}`}
          style={{ '--danmaku-lane': item.lane, '--danmaku-duration': `${item.duration}s` } as React.CSSProperties}
        >
          <span className="audience-danmaku-persona">{item.persona}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
