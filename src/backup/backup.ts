import type { SQLiteDatabase } from 'expo-sqlite';
import type { Entry } from '../types/entry';
import type { AppSettings } from '../settings/settingsStorage';
import { exportAllEntries, importEntries } from '../db/entries';
import { todayLocal } from '../hooks/useDailyGoal';

interface Backup {
  app: 'dwell';
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  entries: Entry[];
}

/** Write all entries and settings to a JSON file and open the share sheet. */
export async function exportBackup(db: SQLiteDatabase, settings: AppSettings): Promise<void> {
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const backup: Backup = {
    app: 'dwell',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    entries: await exportAllEntries(db),
  };

  const file = new File(Paths.cache, `dwell-backup-${todayLocal()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save Dwell backup',
  });
}

/** Let the user pick a backup file. Returns null if they cancel. */
export async function pickBackup(): Promise<Backup | null> {
  const DocumentPicker = await import('expo-document-picker');
  const { File } = await import('expo-file-system');

  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const parsed = JSON.parse(await new File(result.assets[0].uri).text());
  if (parsed?.app !== 'dwell' || !Array.isArray(parsed.entries)) {
    throw new Error('Not a Dwell backup file');
  }
  return parsed as Backup;
}

/** Merge a backup's entries into the database. Returns the count written. */
export async function restoreEntries(db: SQLiteDatabase, backup: Backup): Promise<number> {
  return importEntries(db, backup.entries);
}
