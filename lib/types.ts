export type FileStatus = 'pending' | 'processing' | 'done' | 'error';

export interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  origSize: number;
  compSize: number | null;
  blob: Blob | null;
  thumbUrl: string;
  srcExt: string;
  outExt: string;
  converting: boolean;
  targetFmt: string | null;
  savings: number | null;
  progress: number;
}

export type OutputFormat = 'original' | 'webp' | 'jpeg' | 'png' | 'avif';

export const FORMAT_NOTES: Record<string, string> = {
  webp: '<strong>WebP</strong> -- best compression for web. Typically 25-35% smaller than JPEG at equivalent visual quality. Supported by all modern browsers.',
  jpeg: '<strong>JPEG</strong> -- universal standard for photos. Best for images without transparency that need maximum compatibility.',
  png: '<strong>PNG</strong> -- lossless with full transparency. Best for logos and UI assets. Files will be larger than WebP or JPEG.',
  avif: '<strong>AVIF</strong> -- next-gen format with excellent compression. Verify your target environment supports it before using for delivery.',
};
