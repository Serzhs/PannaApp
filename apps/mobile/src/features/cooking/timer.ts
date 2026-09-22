import * as Notifications from 'expo-notifications';

let handlerSet = false;

/** Without a handler a notification that fires while the app is open shows nothing. */
function ensureHandler(): void {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        // The platform's own sound, governed by the phone's settings: the app plays nothing itself.
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });
}

/** Asks once; a refusal is remembered by the OS and answered without a prompt after. */
export async function notificationsAllowed(): Promise<boolean> {
  ensureHandler();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Schedules the step's end and answers with the id, or null when the phone will not show it. */
export async function scheduleTimerEnd(
  title: string,
  body: string,
  seconds: number,
): Promise<string | null> {
  if (!(await notificationsAllowed())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}

export async function cancelTimerEnd(notificationId: string | null): Promise<void> {
  if (notificationId === null) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or already gone: either way there is nothing left to cancel.
  }
}
