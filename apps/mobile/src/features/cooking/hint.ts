import Storage from 'expo-sqlite/kv-store';

/** Device-local, like cooking progress (0028): the hint is about this phone's screen. */
const KEY = 'panna.knuckleHintSeen';

export function knuckleHintSeen(): boolean {
  return Storage.getItemSync(KEY) !== null;
}

/** Set only when Got it is pressed: leaving without reading it means it was not read. */
export function markKnuckleHintSeen(): void {
  Storage.setItemSync(KEY, new Date().toISOString());
}

export function resetKnuckleHint(): void {
  Storage.removeItemSync(KEY);
}
