# Dwell - Daily Writing Habit App

## Tech Stack
- React Native + Expo (managed workflow, **SDK 54**)
- Expo Router v6 (file-based routing, three tabs: Write, Log, Settings)
- expo-sqlite for local storage (entries)
- @react-native-async-storage/async-storage for user settings
- expo-notifications for local scheduled reminders (not available in Expo Go)
- @react-native-community/datetimepicker for time picker in Settings
- TypeScript 5.9, React 19.1, React Native 0.81

## Key Versions
- Do NOT add react-native-reanimated — v4 needs react-native-worklets (crashes in Expo Go) and v3 doesn't compile natively on RN 0.81. Use the built-in `Animated` API.
- Do NOT use expo-symbols — use plain Text for tab icons.
- Notification code must be wrapped in try/catch since it's unsupported in Expo Go.

## Project Structure
- `app/` — Expo Router screens
  - `app/(tabs)/index.tsx` — Write screen (default tab, named `index` not `write`)
  - `app/(tabs)/log/` — Log tab with nested stack (index, [date])
  - `app/(tabs)/settings.tsx` — Settings screen (appearance, reminders, timing)
  - `app/entry/[id].tsx` — View/edit single entry
- `src/` — Non-route code
  - `src/components/` — UI components (Prompt, EntryInput, EntryCard, DayGroup, CategoryBadge, SaveConfirmation)
  - `src/db/` — SQLite schema, CRUD operations, provider
  - `src/notifications/` — Scheduler, permissions, handler (all guarded for Expo Go)
  - `src/settings/` — AppSettings interface, AsyncStorage persistence, SettingsContext/useSettings()
  - `src/hooks/` — useEntries, useDailyGoal, useNotificationSetup
  - `src/theme/` — colors (light + dark palettes), typography, spacing, ThemeContext/useTheme()
  - `src/constants/` — prompts, config
  - `src/types/` — Entry interface, categorize() helper

## Data Model
- Single `entries` table with soft deletes (`deleted_at`), client-generated UUIDs, UTC timestamps
- Entries auto-categorized: < 250 chars = "observation", >= 250 = "reflection"

## Running
- `npx expo start` then scan QR with Expo Go on iPhone (SDK 54 from App Store)
- Do NOT run on web — expo-sqlite doesn't support it
- Use `--clear` flag after dependency changes to flush Metro cache

## Building for iPhone
- Native install via free Apple ID (Personal Team) + Xcode: plug in phone, `npm run ios:device` → `scripts/ios-device.sh` (prebuild, pod install, Release xcodebuild, devicectl install; runs without Metro). `expo run:ios` fails on Xcode 27 (can't find Simulator), hence the script
- `plugins/withPodsMinDeploymentTarget.js` raises pods below iOS 15.1 — Xcode 27 rejects older deployment targets
- `ios.appleTeamId` in app.json is the free Personal Team; change it when moving to a paid team
- Free-team builds expire after 7 days — re-run `npm run ios:device` to refresh. Data (SQLite + AsyncStorage) survives reinstalls; only deleting the app wipes it
- `ios/` and `android/` are generated (CNG) and gitignored — change native config via `app.json`/config plugins, never by editing `ios/`
- `plugins/withoutPushEntitlement.js` strips `aps-environment` (added by expo-notifications); free teams can't sign it and the app only uses local notifications
- Bundle ID `com.aadeleon.dwell` — keep it stable so builds install over each other
- Later (paid account): `eas build -p ios --profile production --auto-submit` → TestFlight. Export a backup from Settings > Data before switching, since the signing team changes

## Notifications
- Reminders are one-shot DATE triggers for the next `NOTIFICATION_WINDOW_DAYS` (12) days, not DAILY triggers — iOS caps pending notifications at 64 (12 × max 5 = 60)
- `useNotificationSetup` reschedules on launch, on settings changes, and whenever the app returns to foreground (rolls the window forward). If the app isn't opened for 12 days, reminders stop
- "Suppress after writing" skips all of today's reminders when an entry exists for today; `rescheduleNotifications` calls are serialized to avoid duplicates

## Settings & Theme
- Settings persist via AsyncStorage (`src/settings/settingsStorage.ts`)
- `SettingsProvider` > `ThemeProvider` > `DatabaseProvider` nesting in root layout
- All components use `useTheme()` hook for colors — no static `colors` imports in components
- Styles use `useMemo(() => StyleSheet.create(...), [colors])` inside components
- Dark mode: manual light/dark or auto (6am–7pm = light, 60s poll)
- Notifications accept `NotificationOptions` object (enabled, times, jitter, suppressToday)
- Use `npx expo install` (not `npm install`) for packages that need native modules (e.g. AsyncStorage, datetimepicker)
- Tab icons use plain Unicode text glyphs — avoid emoji characters that render with color/3D texture

## Welcome Animation
- Write tab opens with a welcome animation: prompt fades in centered, holds ~2.2s, slides up to resting position, then overlay dissolves revealing the full UI
- Implemented via a full-screen opaque `Modal` overlay containing a duplicate `<Prompt>` positioned to match the inline layout (`headerHeight` spacer = `insets.top + 44`). When the overlay dissolves, the identical inline Prompt is revealed seamlessly underneath.
- `useRef` guard (`hasAnimated`) prevents replay on tab switches; animation replays on fresh app open
- Do NOT use `navigation.setOptions` to hide/show header or tab bar — it causes layout jumps and chrome that "pops" in. The Modal overlay approach avoids manipulating navigation chrome entirely.

## Conventions
- Use `npm install --legacy-peer-deps` if npm reports peer dependency conflicts
- Animations use React Native's built-in `Animated` API, not reanimated
- Log screen refreshes on focus via `useFocusEffect`
- Save action dismisses keyboard and shows animated confirmation
