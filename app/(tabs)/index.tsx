import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Keyboard, Platform, Alert, Animated, Easing, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Prompt } from '../../src/components/Prompt';
import { EntryInput } from '../../src/components/EntryInput';
import { SaveConfirmation } from '../../src/components/SaveConfirmation';
import { useDailyGoal } from '../../src/hooks/useDailyGoal';
import { useStreak } from '../../src/hooks/useStreak';
import { createEntry } from '../../src/db/entries';
import { categorize } from '../../src/types/entry';
import { PROMPT_TEXT } from '../../src/constants/prompts';
import { useTheme } from '../../src/theme/ThemeContext';
import { useSettings } from '../../src/settings/SettingsContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';


export default function WriteScreen() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { hasWrittenToday, recheckGoal } = useDailyGoal();
  const { streak, recheckStreak } = useStreak();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Welcome animation
  const hasAnimated = useRef(false);
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const promptTranslateY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [animationDone, setAnimationDone] = useState(false);

  // Keyboard-driven bottom padding: accounts for tab bar sitting below this view
  const TAB_BAR_HEIGHT = 49;
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardPadding, {
          toValue: e.endCoordinates.height - TAB_BAR_HEIGHT - insets.bottom,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardPadding, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => { show.remove(); hide.remove(); };
  }, [insets.bottom]);

  // Top padding = safe area inset so the prompt sits comfortably below the notch.
  // The Modal overlay uses the same value to position its duplicate Prompt identically.
  const topPadding = insets.top;

  const centerOffset = useMemo(() => {
    const { height } = Dimensions.get('window');
    // Move prompt from its resting position (below header) to screen center.
    // 60 ≈ half the Prompt component height (paddingTop 48 + one line of text).
    return (height / 2) - topPadding - 60;
  }, [topPadding]);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    promptTranslateY.setValue(centerOffset);

    const easing = Easing.inOut(Easing.quad);

    Animated.sequence([
      // 1. Fade in prompt at center of screen
      Animated.timing(promptOpacity, {
        toValue: 1,
        duration: 600,
        easing,
        useNativeDriver: true,
      }),
      // 2. Hold in stillness
      Animated.delay(2200),
      // 3. Slide prompt up to its resting position
      Animated.timing(promptTranslateY, {
        toValue: 0,
        duration: 900,
        easing,
        useNativeDriver: true,
      }),
      // 4. Dissolve overlay + fade in content together
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 800,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 800,
          easing,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setAnimationDone(true);
    });
  }, []);

  const canSave = text.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const category = categorize(text);
      await createEntry(db, text.trim(), category, PROMPT_TEXT);
      setText('');
      Keyboard.dismiss();
      setShowSaved(true);
      await recheckGoal();
      await recheckStreak();
      try {
        const { rescheduleNotifications } = await import('../../src/notifications/scheduler');
        await rescheduleNotifications({
          enabled: settings.remindersEnabled,
          times: settings.reminderTimes.slice(0, settings.reminderCount),
          jitter: settings.jitterEnabled,
          suppressToday: settings.suppressAfterWrite,
        });
      } catch {
        // Notifications not available in Expo Go
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [canSave, text, db, recheckGoal, recheckStreak, settings]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: spacing.lg,
    },
    doneText: {
      ...typography.caption,
      color: colors.success,
    },
    saveButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: 8,
      marginLeft: 'auto',
    },
    saveButtonDisabled: {
      backgroundColor: colors.surfaceMuted,
    },
    saveText: {
      ...typography.label,
      color: colors.white,
    },
    saveTextDisabled: {
      color: colors.textMuted,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
    },
  }), [colors]);

  return (
    <>
      <Animated.View style={[styles.container, { paddingBottom: keyboardPadding }]}>
        {/* Inline prompt — always rendered, visible under the Modal overlay */}
        <View style={{ height: topPadding }} />
        <Prompt text={PROMPT_TEXT} />
        <Animated.View
          style={{ flex: 1, opacity: contentOpacity }}
          pointerEvents={animationDone ? 'auto' : 'none'}
        >
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            <EntryInput value={text} onChangeText={setText} />
          </Pressable>
        </Animated.View>
        <Animated.View
          style={[styles.bottomBar, { opacity: contentOpacity }]}
          pointerEvents={animationDone ? 'auto' : 'none'}
        >
          {hasWrittenToday && (
            <Text style={styles.doneText}>
              {settings.showStreak
                ? `You've written today (for ${streak} day${streak !== 1 ? 's' : ''})`
                : "You've written today"}
            </Text>
          )}
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              Save
            </Text>
          </Pressable>
        </Animated.View>
        <SaveConfirmation visible={showSaved} onDone={() => setShowSaved(false)} />
      </Animated.View>

      {/* Full-screen opaque overlay with its own Prompt, positioned to match the
          inline Prompt exactly. Covers header + tabs + content. When it dissolves,
          the identical inline Prompt is revealed seamlessly underneath. */}
      {!animationDone && (
        <Modal visible transparent animationType="none">
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
            pointerEvents="none"
          >
            <View style={{ height: topPadding }} />
            <Animated.View style={{
              opacity: promptOpacity,
              transform: [{ translateY: promptTranslateY }],
            }}>
              <Prompt text={PROMPT_TEXT} />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}
