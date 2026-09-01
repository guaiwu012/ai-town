import { describe, expect, it } from '@jest/globals';
import { dampCameraPosition } from './cameraMotion';

describe('camera damping', () => {
  it('approaches its target without overshooting', () => {
    const next = dampCameraPosition({ x: 10, y: 20 }, { x: 110, y: -80 }, 1);
    expect(next.x).toBeGreaterThan(10);
    expect(next.x).toBeLessThan(110);
    expect(next.y).toBeLessThan(20);
    expect(next.y).toBeGreaterThan(-80);
  });

  it('is stable across equivalent frame durations', () => {
    let sixtyFps = { x: 0, y: 0 };
    let thirtyFps = { x: 0, y: 0 };
    for (let frame = 0; frame < 60; frame += 1) {
      sixtyFps = dampCameraPosition(sixtyFps, { x: 100, y: 50 }, 1);
    }
    for (let frame = 0; frame < 30; frame += 1) {
      thirtyFps = dampCameraPosition(thirtyFps, { x: 100, y: 50 }, 2);
    }
    expect(thirtyFps.x).toBeCloseTo(sixtyFps.x, 8);
    expect(thirtyFps.y).toBeCloseTo(sixtyFps.y, 8);
  });
});
