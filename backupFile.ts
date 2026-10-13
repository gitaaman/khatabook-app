/**
 * Utility to download complete Khata Book JSON backup file directly in the browser/webview
 */
export function downloadBackupFile(jsonData: string, filename?: string): void {
  const defaultFilename = `KhataBook_Backup_${new Date().toISOString().split('T')[0]}.json`;
  const finalFilename = filename || defaultFilename;

  const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
