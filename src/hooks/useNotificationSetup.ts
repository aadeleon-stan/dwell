import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSettings } from '../settings/SettingsContext';
import { hasEntryForDate } from '../db/entries';
import { todayLocal } from './useDailyGoal';

export function useNotificationSetup() {
  const db = useSQLiteContext();
  const { settings, loaded } = useSettings();

  useEffect(() => {
    if (!loaded) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const schedule = async () => {
      try {
        const { requestNotificationPermissions } = await import('../notifications/permissions');
        const { rescheduleNotifications } = await import('../notifications/scheduler');

        const granted = await requestNotificationPermissions();
        if (!granted || cancelled) return;

        const suppressToday =
          settings.suppressAfterWrite && (await hasEntryForDate(db, todayLocal()));
        await rescheduleNotifications({
          enabled: settings.remindersEnabled,
          times: settings.reminderTimes.slice(0, settings.reminderCount),
          jitter: settings.jitterEnabled,
          suppressToday,
        });
      } catch {
        // Notifications not available (e.g. Expo Go) — silently skip
      }
    };

    (async () => {
      try {
        const { setupNotificationHandler } = await import('../notifications/handler');
        if (!cancelled) cleanup = setupNotificationHandler();
      } catch {
        // Notifications not available (e.g. Expo Go) — silently skip
      }
      await schedule();
    })();

    // Roll the scheduling window forward and pick up a new day's state
    // whenever the app returns to the foreground.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });

    return () => {
      cancelled = true;
      appStateSub.remove();
      cleanup?.();
    };
  }, [
    db,
    loaded,
    settings.remindersEnabled,
    settings.reminderCount,
    settings.reminderTimes,
    settings.jitterEnabled,
    settings.suppressAfterWrite,
  ]);
}
