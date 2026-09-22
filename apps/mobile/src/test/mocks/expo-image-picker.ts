/** The picker is native; tests hand it what a person would have picked. */
export const launchImageLibraryAsync = jest.fn(() =>
  Promise.resolve({ canceled: true, assets: null }),
);
export const requestMediaLibraryPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true, status: 'granted' }),
);
