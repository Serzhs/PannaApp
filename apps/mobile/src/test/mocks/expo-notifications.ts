/** Notifications are native; tests see what would have been scheduled. */
export const SchedulableTriggerInputTypes = {
  TIME_INTERVAL: 'timeInterval',
  DATE: 'date',
} as const;
export const setNotificationHandler = jest.fn();
export const getPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true, canAskAgain: true, status: 'granted' }),
);
export const requestPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true, canAskAgain: true, status: 'granted' }),
);
let next = 0;
export const scheduleNotificationAsync = jest.fn(() =>
  Promise.resolve(`notification-${String(++next)}`),
);
export const cancelScheduledNotificationAsync = jest.fn(() => Promise.resolve());
