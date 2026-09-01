export type CameraPoint = { x: number; y: number };

export function dampCameraPosition(
  current: CameraPoint,
  target: CameraPoint,
  delta: number,
  response = 10,
): CameraPoint {
  const alpha = 1 - Math.exp(-Math.min(Math.max(delta, 0), 4) / response);
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
}
