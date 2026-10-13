export const BACKUP_RELATIVE_PATH = 'KhataBook/json/KhataBook_Backup.json';
export const DIRECTORY_DOCUMENTS = 'DOCUMENTS';

export interface AutoSaveResult {
  success: boolean;
  isNative: boolean;
  storagePath: string;
  timestamp: string;
  error?: string;
}

/**
 * Access the native Capacitor bridge safely on Android devices
 */
const getCapacitor = (): any => {
  if (typeof window !== 'undefined') {
    return (window as any).Capacitor;
  }
  return undefined;
};

export const isNativePlatform = (): boolean => {
  const cap = getCapacitor();
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
};

const getFilesystemPlugin = (): any => {
  const cap = getCapacitor();
  return cap?.Plugins?.Filesystem;
};

/**
 * Automatically saves the complete Khata Book JSON backup into the Android phone's
 * public Documents storage directory: Documents/KhataBook/json/KhataBook_Backup.json
 * 
 * This folder is visible in Google Files (Files by Google), survives app uninstall,
 * and updates automatically after every customer, bill, and payment action!
 */
export async function autoSaveBackupToDevice(jsonString: string): Promise<AutoSaveResult> {
  const timestamp = new Date().toISOString();

  // Always keep the freshest backup in localStorage for instant web retrieval
  try {
    localStorage.setItem('kb_auto_backup_latest', jsonString);
    localStorage.setItem('kb_auto_backup_time', timestamp);
  } catch (e) {
    console.warn('LocalStorage auto-save warning:', e);
  }

  const isNative = isNativePlatform();
  const fsPlugin = getFilesystemPlugin();

  if (isNative && fsPlugin && typeof fsPlugin.writeFile === 'function') {
    try {
      // Write directly to Android public Documents folder:
      // Path on Android: /storage/emulated/0/Documents/KhataBook/json/KhataBook_Backup.json
      const result = await fsPlugin.writeFile({
        path: BACKUP_RELATIVE_PATH,
        data: jsonString,
        directory: DIRECTORY_DOCUMENTS,
        recursive: true,
      });

      return {
        success: true,
        isNative: true,
        storagePath: result?.uri || `Documents/${BACKUP_RELATIVE_PATH}`,
        timestamp,
      };
    } catch (err: any) {
      console.error('Android Filesystem autoSave error:', err);
      return {
        success: false,
        isNative: true,
        storagePath: `Documents/${BACKUP_RELATIVE_PATH}`,
        timestamp,
        error: err?.message || 'Storage write failed',
      };
    }
  }

  // Browser / Laptop fallback
  return {
    success: true,
    isNative: false,
    storagePath: 'Browser LocalStorage / Downloads',
    timestamp,
  };
}

/**
 * Attempts to read the backup JSON file from the phone's Documents directory
 * Useful after reinstalling APK to recover all customer records without data loss!
 */
export async function readBackupFromDevice(): Promise<string | null> {
  const isNative = isNativePlatform();
  const fsPlugin = getFilesystemPlugin();

  if (isNative && fsPlugin && typeof fsPlugin.readFile === 'function') {
    try {
      const res = await fsPlugin.readFile({
        path: BACKUP_RELATIVE_PATH,
        directory: DIRECTORY_DOCUMENTS,
      });
      if (res && res.data) {
        return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      }
    } catch (err) {
      console.warn('Could not read existing device backup file from Documents:', err);
    }
  }

  // Fallback to local storage
  return localStorage.getItem('kb_auto_backup_latest');
}
