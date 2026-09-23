import { knuckleHintSeen, markKnuckleHintSeen, resetKnuckleHint } from './hint';

describe('the knuckle hint flag', () => {
  it('starts unseen, is set by Got it, and is cleared from settings', () => {
    resetKnuckleHint();
    expect(knuckleHintSeen()).toBe(false);
    markKnuckleHintSeen();
    expect(knuckleHintSeen()).toBe(true);
    resetKnuckleHint();
    expect(knuckleHintSeen()).toBe(false);
  });
});
