/** The store is native; tests get a map with the same sync surface. */
const map = new Map<string, string>();

const Storage = {
  getItemSync: (key: string): string | null => map.get(key) ?? null,
  setItemSync: (key: string, value: string): void => {
    map.set(key, value);
  },
  removeItemSync: (key: string): boolean => map.delete(key),
  getAllKeysSync: (): string[] => [...map.keys()],
  getItem: (key: string): Promise<string | null> => Promise.resolve(map.get(key) ?? null),
  setItem: (key: string, value: string): Promise<void> => {
    map.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    map.delete(key);
    return Promise.resolve();
  },
};

export default Storage;
