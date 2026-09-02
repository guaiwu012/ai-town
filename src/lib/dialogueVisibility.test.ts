import { isConversationVisible } from './dialogueVisibility';

describe('conversation camera visibility', () => {
  const speakers = [
    { id: 'p:1', x: 10, y: 10, areaId: 'A01' },
    { id: 'p:2', x: 11, y: 10, areaId: 'A01' },
  ];

  test('shows a conversation when either speaker is inside the followed camera range', () => {
    expect(isConversationVisible(speakers, { id: 'p:3', x: 16, y: 10, areaId: 'A01' })).toBe(true);
  });

  test('hides an off-camera conversation', () => {
    expect(isConversationVisible(speakers, { id: 'p:3', x: 30, y: 30, areaId: 'A08' })).toBe(false);
  });

  test('shows conversations inside a manually focused area', () => {
    expect(isConversationVisible(speakers, undefined, 'A01')).toBe(true);
    expect(isConversationVisible(speakers, undefined, 'A09')).toBe(false);
  });
});
