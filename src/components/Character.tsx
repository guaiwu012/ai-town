import { BaseTexture, ISpritesheetData, Rectangle, Spritesheet, Texture } from 'pixi.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedSprite, Container, Graphics, Sprite, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';

export const Character = ({
  textureUrl,
  spritesheetData,
  x,
  y,
  orientation,
  isMoving = false,
  isThinking = false,
  isSpeaking = false,
  emoji = '',
  isViewer = false,
  hpRatio,
  isEliminated = false,
  battleCharacterId,
  speed = 0.1,
  onClick,
}: {
  // Path to the texture packed image.
  textureUrl: string;
  // The data for the spritesheet.
  spritesheetData: ISpritesheetData;
  // The pose of the NPC.
  x: number;
  y: number;
  orientation: number;
  isMoving?: boolean;
  // Shows a thought bubble if true.
  isThinking?: boolean;
  // Shows a speech bubble if true.
  isSpeaking?: boolean;
  emoji?: string;
  // Highlights the player.
  isViewer?: boolean;
  hpRatio?: number;
  isEliminated?: boolean;
  battleCharacterId?: string;
  // The speed of the animation. Can be tuned depending on the side and speed of the NPC.
  speed?: number;
  onClick: () => void;
}) => {
  const [spriteSheet, setSpriteSheet] = useState<Spritesheet>();
  useEffect(() => {
    const parseSheet = async () => {
      const sheet = new Spritesheet(
        BaseTexture.from(textureUrl, {
          scaleMode: PIXI.SCALE_MODES.NEAREST,
        }),
        spritesheetData,
      );
      await sheet.parse();
      setSpriteSheet(sheet);
    };
    void parseSheet();
  }, []);

  // The first "left" is "right" but reflected.
  const roundedOrientation = Math.floor(orientation / 90);
  const direction = ['right', 'down', 'left', 'up'][roundedOrientation];

  // Prevents the animation from stopping when the texture changes
  // (see https://github.com/pixijs/pixi-react/issues/359)
  const ref = useRef<PIXI.AnimatedSprite | null>(null);
  useEffect(() => {
    if (isMoving) {
      ref.current?.play();
    }
  }, [direction, isMoving]);

  if (!spriteSheet) return null;

  let blockOffset = { x: 0, y: 0 };
  switch (roundedOrientation) {
    case 2:
      blockOffset = { x: -20, y: 0 };
      break;
    case 0:
      blockOffset = { x: 20, y: 0 };
      break;
    case 3:
      blockOffset = { x: 0, y: -20 };
      break;
    case 1:
      blockOffset = { x: 0, y: 20 };
      break;
  }

  return (
    <Container x={x} y={y} interactive={true} pointerdown={onClick} cursor="pointer">
      {isThinking && (
        // TODO: We'll eventually have separate assets for thinking and speech animations.
        <Text x={-20} y={-10} scale={{ x: -0.8, y: 0.8 }} text={'💭'} anchor={{ x: 0.5, y: 0.5 }} />
      )}
      {isSpeaking && (
        // TODO: We'll eventually have separate assets for thinking and speech animations.
        <Text x={18} y={-10} scale={0.8} text={'💬'} anchor={{ x: 0.5, y: 0.5 }} />
      )}
      {isViewer && <ViewerIndicator />}
      {hpRatio !== undefined && <HealthBar ratio={hpRatio} />}
      {battleCharacterId
        ? <BattleIdentityMarker characterId={battleCharacterId} eliminated={isEliminated} isMoving={isMoving} />
        : <AnimatedSprite
            ref={ref}
            isPlaying={isMoving}
            textures={spriteSheet.animations[direction]}
            animationSpeed={speed}
            anchor={{ x: 0.5, y: 0.5 }}
            alpha={isEliminated ? 0.38 : 1}
          />}
      {isEliminated && (
        <Text
          x={0}
          y={0}
          scale={0.62}
          text="KO"
          anchor={{ x: 0.5, y: 0.5 }}
          style={
            new PIXI.TextStyle({
              fill: '#ffdf5d',
              fontFamily: 'VCR OSD Mono',
              fontSize: 18,
              stroke: '#231423',
              strokeThickness: 4,
            })
          }
        />
      )}
      {emoji && (
        <Text
          x={0}
          y={-38}
          scale={0.5}
          text={emoji}
          anchor={{ x: 0.5, y: 0.5 }}
          style={
            new PIXI.TextStyle({
              fill: '#fff7c2',
              fontFamily: 'VCR OSD Mono',
              fontSize: 18,
              stroke: '#231423',
              strokeThickness: 4,
            })
          }
        />
      )}
    </Container>
  );
};

function HealthBar({ ratio }: { ratio: number }) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      g.clear();
      g.beginFill(0x231423, 0.9);
      g.drawRect(-14, -28, 28, 5);
      g.endFill();
      g.beginFill(clamped > 0.45 ? 0x6ee7a8 : clamped > 0.2 ? 0xffdf5d : 0xff5f5f, 1);
      g.drawRect(-13, -27, 26 * clamped, 3);
      g.endFill();
    },
    [ratio],
  );

  return <Graphics draw={draw} />;
}

function BattleIdentityMarker({ characterId, eliminated, isMoving }: { characterId: string; eliminated: boolean; isMoving: boolean }) {
  const index = Math.max(0, Number(characterId.slice(1)) - 1) % 12;
  const baseTexture = BaseTexture.from('/ai-town/assets/battle/contestant-portraits.png');
  const col = index % 4;
  const row = Math.floor(index / 4);
  const portrait = new Texture(baseTexture, new Rectangle(col * 362, row * 362, 362, 362));
  return <>
    <Graphics draw={(g) => { g.clear(); g.beginFill(eliminated ? 0x442c42 : 0x0c1d2b, 0.98); g.lineStyle(isMoving ? 2.5 : 1.5, eliminated ? 0x92566b : isMoving ? 0x8ffff0 : 0x70e6ca, 0.98); g.drawCircle(0, 0, 15); g.endFill(); }} />
    <Sprite texture={portrait} x={0} y={0} width={27} height={27} anchor={{ x: 0.5, y: 0.5 }} alpha={eliminated ? 0.38 : 1} />
    <Text x={0} y={-22} scale={0.3} text={characterId} anchor={{ x: 0.5, y: 0.5 }} style={new PIXI.TextStyle({ fill: '#d9fff1', fontFamily: 'VCR OSD Mono', fontSize: 12, stroke: '#071019', strokeThickness: 3 })} />
  </>;
}

function ViewerIndicator() {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.beginFill(0xffff0b, 0.5);
    g.drawRoundedRect(-10, 10, 20, 10, 100);
    g.endFill();
  }, []);

  return <Graphics draw={draw} />;
}
