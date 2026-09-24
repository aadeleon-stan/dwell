import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { hasEntryForDate } from '../db/entries';

export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useDailyGoal() {
  const db = useSQLiteContext();
  const [hasWrittenToday, setHasWrittenToday] = useState(false);

  const check = useCallback(async () => {
    const result = await hasEntryForDate(db, todayLocal());
    setHasWrittenToday(result);
  }, [db]);

  useEffect(() => {
    check();
  }, [check]);

  return { hasWrittenToday, recheckGoal: check };
}
