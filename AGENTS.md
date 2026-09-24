# Expo SDK 54

This project uses Expo SDK 54. Read the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

Key constraints:
- SDK 54 = React 19.1 + React Native 0.81
- Do NOT upgrade to SDK 55+ — Expo Go on App Store only supports up to SDK 54
- Do NOT add react-native-reanimated or react-native-worklets — use built-in Animated API
- Notification APIs are unavailable in Expo Go — always wrap in try/catch
