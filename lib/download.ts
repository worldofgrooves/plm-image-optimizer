import JSZip from 'jszip';

export interface DownloadItem {
  filename: string;
  blob: Blob;
}

export async function downloadZip(items: DownloadItem[], zipName: string = 'plume-optimized.zip'): Promise<void> {
  const zip = new JSZip();
  items.forEach((item) => {
    zip.file(item.filename, item.blob);
  });
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = zipName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 12000);
}

export function downloadSingle(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 6000);
}
