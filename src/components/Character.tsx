import { BaseTexture, ISpritesheetData, Rectangle, Spritesheet, Texture } from 'pixi.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedSprite, Container, Graphics, Sprite, Text, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';

const BATTLE_SPRITE_ATLAS = '/ai-town/assets/battle/contestant-sprites-v1.png';
const BATTLE_SPRITE_CELL = { width: 362, height: 363 };
const battleSpriteTextures = new Map<string, Texture>();

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
        <Text x={-22} y={-58} scale={{ x: -0.72, y: 0.72 }} text={'💭'} anchor={{ x: 0.5, y: 0.5 }} />
      )}
      {isSpeaking && (
        <Text x={22} y={-58} scale={0.72} text={'💬'} anchor={{ x: 0.5, y: 0.5 }} />
      )}
      {isViewer && <ViewerIndicator />}
      {hpRatio !== undefined && <HealthBar ratio={hpRatio} />}
      {battleCharacterId
        ? <BattleCharacterSprite characterId={battleCharacterId} eliminated={isEliminated} isMoving={isMoving} direction={direction} />
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
          y={-12}
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
          y={-68}
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
      g.drawRoundedRect(-16, -52, 32, 5, 2);
      g.endFill();
      g.beginFill(clamped > 0.45 ? 0x6ee7a8 : clamped > 0.2 ? 0xffdf5d : 0xff5f5f, 1);
      g.drawRoundedRect(-15, -51, 30 * clamped, 3, 1);
      g.endFill();
    },
    [ratio],
  );

  return <Graphics draw={draw} />;
}

function battleSpriteTexture(characterId: string) {
  const cached = battleSpriteTextures.get(characterId);
  if (cached) return cached;
  const index = Math.max(0, Number(characterId.slice(1)) - 1) % 12;
  const baseTexture = BaseTexture.from(BATTLE_SPRITE_ATLAS);
  const col = index % 4;
  const row = Math.floor(index / 4);
  const texture = new Texture(baseTexture, new Rectangle(
    col * BATTLE_SPRITE_CELL.width,
    row * BATTLE_SPRITE_CELL.height,
    BATTLE_SPRITE_CELL.width,
    BATTLE_SPRITE_CELL.height,
  ));
  battleSpriteTextures.set(characterId, texture);
  return texture;
}

function BattleCharacterSprite({ characterId, eliminated, isMoving, direction }: { characterId: string; eliminated: boolean; isMoving: boolean; direction: string }) {
  const bodyRef = useRef<PIXI.Container | null>(null);
  const phaseRef = useRef(Math.max(0, Number(characterId.slice(1)) - 1) * 0.67);
  useTick((delta) => {
    const body = bodyRef.current;
    if (!body) return;
    phaseRef.current += delta * (isMoving ? 0.22 : 0.035);
    body.y = -3 + Math.sin(phaseRef.current) * (isMoving ? 1.35 : 0.2);
    body.rotation = eliminated ? -0.12 : Math.sin(phaseRef.current * 0.5) * (isMoving ? 0.018 : 0.004);
  });
  const flip = direction === 'left' ? -1 : 1;
  return <>
    <Graphics draw={(g) => {
      g.clear();
      g.beginFill(0x02070c, eliminated ? 0.35 : 0.62);
      g.drawEllipse(0, 5, 16, 6);
      g.endFill();
      if (isMoving && !eliminated) {
        g.lineStyle(1.3, 0x72e4d1, 0.58);
        g.drawEllipse(0, 5, 19, 8);
      }
    }} />
    <Container ref={bodyRef} scale={{ x: flip, y: 1 }}>
      <Sprite
        texture={battleSpriteTexture(characterId)}
        width={58}
        height={58}
        anchor={{ x: 0.5, y: 0.84 }}
        alpha={eliminated ? 0.34 : 1}
        tint={eliminated ? 0x8c8991 : 0xffffff}
      />
    </Container>
    <Text x={0} y={12} scale={0.27} text={characterId} anchor={{ x: 0.5, y: 0.5 }} style={new PIXI.TextStyle({ fill: eliminated ? '#a79da8' : '#d9fff1', fontFamily: 'VCR OSD Mono', fontSize: 12, stroke: '#071019', strokeThickness: 4 })} />
  </>;
}

function ViewerIndicator() {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.lineStyle(2, 0xffd166, 0.94);
    g.drawEllipse(0, 5, 21, 10);
    g.beginFill(0xffd166, 0.95);
    g.moveTo(-4, -55);
    g.lineTo(4, -55);
    g.lineTo(0, -48);
    g.closePath();
    g.endFill();
  }, []);

  return <Graphics draw={draw} />;
}
