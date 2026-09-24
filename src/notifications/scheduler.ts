import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_TITLE, NOTIFICATION_BODY, NOTIFICATION_WINDOW_DAYS } from '../constants/config';

export interface NotificationOptions {
  enabled: boolean;
  times: string[]; // HH:MM strings
  jitter: boolean;
  suppressToday: boolean;
}

/**
 * Cancel all pending notifications and schedule one-shot reminders for the
 * next NOTIFICATION_WINDOW_DAYS days. One-shot triggers (rather than DAILY)
 * let today be skipped without affecting later days, and give each day its
 * own jitter.
 */
export function rescheduleNotifications(options: NotificationOptions): Promise<void> {
  // Run one reschedule at a time — two overlapping cancel-then-schedule
  // passes would leave duplicate reminders.
  const run = queue.then(() => reschedule(options));
  queue = run.catch(() => {});
  return run;
}

let queue: Promise<void> = Promise.resolve();

async function reschedule(options: NotificationOptions) {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!options.enabled) return;

  const now = new Date();
  const earliest = now.getTime() + 60_000; // skip anything within the next minute

  for (let day = options.suppressToday ? 1 : 0; day < NOTIFICATION_WINDOW_DAYS; day++) {
    for (const time of options.times) {
      const [hourStr, minuteStr] = time.split(':');
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day,
        parseInt(hourStr, 10), parseInt(minuteStr, 10));

      if (options.jitter) {
        // Shift by a random ±5 minutes, re-rolled for every reminder
        const jitterMinutes = Math.floor(Math.random() * 11) - 5;
        date.setMinutes(date.getMinutes() + jitterMinutes);
      }

      if (date.getTime() < earliest) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIFICATION_TITLE,
          body: NOTIFICATION_BODY,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    }
  }
}
