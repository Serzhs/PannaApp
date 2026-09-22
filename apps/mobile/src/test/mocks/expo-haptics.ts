export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;
export const ImpactFeedbackStyle = { Light: 'light', Medium: 'medium', Heavy: 'heavy' } as const;
export const notificationAsync = jest.fn(() => Promise.resolve());
export const impactAsync = jest.fn(() => Promise.resolve());
