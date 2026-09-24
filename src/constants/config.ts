/** Character threshold: entries >= this length are "reflection", shorter are "observation" */
export const REFLECTION_THRESHOLD = 250;

/** Hours at which daily notifications fire (local time) */
export const NOTIFICATION_HOURS = [9, 13, 19];

/** Notification content */
export const NOTIFICATION_TITLE = 'Dwell';
export const NOTIFICATION_BODY = 'A moment to notice.';

/**
 * Days of reminders scheduled ahead as one-shot notifications. iOS keeps at
 * most 64 pending; 12 days × 5 reminders max = 60. The window rolls forward
 * whenever the app opens.
 */
export const NOTIFICATION_WINDOW_DAYS = 12;
