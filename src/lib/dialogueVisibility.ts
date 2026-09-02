export type DialogueCameraPlayer = { id: string; x: number; y: number; areaId?: string };

export function isConversationVisible(
  speakers: DialogueCameraPlayer[],
  focusPlayer?: DialogueCameraPlayer,
  focusAreaId?: string,
  range = 8,
) {
  if (focusAreaId) return speakers.some((speaker) => speaker.areaId === focusAreaId);
  if (!focusPlayer) return false;
  return speakers.some((speaker) => Math.hypot(speaker.x - focusPlayer.x, speaker.y - focusPlayer.y) <= range);
}
