'use client';

import { useState, useCallback, useRef } from 'react';
import { FileItem, OutputFormat } from '@/lib/types';
import { createQueue } from '@/lib/queue';
import { downloadZip, downloadSingle } from '@/lib/download';
import OptionsPanel from '@/components/OptionsPanel';
import DropZone from '@/components/DropZone';
import SummaryBar from '@/components/SummaryBar';
import FileList from '@/components/FileList';

const queue = createQueue(3);
let nextId = 0;

const EXT_MAP: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
};

function getExt(filename: string): string {
  const parts = filename.split('.');
  const ext = (parts.pop() || 'jpg').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target?.result as string);
    r.readAsDataURL(file);
  });
}

export default function Home() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [convertOn, setConvertOn] = useState(false);
  const [targetFmt, setTargetFmt] = useState<OutputFormat>('webp');
  const [locked, setLocked] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<FileItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const processFile = useCallback(
    async (item: FileItem) => {
      updateItem(item.id, { status: 'processing', progress: 0 });

      // Animate progress to ~55% during upload
      const progressInterval = setInterval(() => {
        setItems((prev) => {
          const current = prev.find((i) => i.id === item.id);
          if (current && current.status === 'processing' && current.progress < 55) {
            return prev.map((i) =>
              i.id === item.id ? { ...i, progress: Math.min(55, i.progress + 3) } : i
            );
          }
          return prev;
        });
      }, 50);

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append(
          'format',
          item.converting && item.targetFmt ? item.targetFmt : 'original'
        );

        const response = await fetch('/api/optimize', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        // Animate to 100%
        updateItem(item.id, { progress: 100 });

        const blob = await response.blob();
        const originalSize = parseInt(
          response.headers.get('X-Original-Size') || '0'
        );
        const compressedSize = parseInt(
          response.headers.get('X-Compressed-Size') || '0'
        );
        const savingsPct = parseInt(
          response.headers.get('X-Savings-Pct') || '0'
        );
        const outputFormat = response.headers.get('X-Output-Format') || item.outExt;

        await new Promise((r) => setTimeout(r, 200));

        updateItem(item.id, {
          status: 'done',
          compSize: compressedSize || blob.size,
          blob,
          savings: savingsPct,
          outExt: outputFormat === 'jpeg' ? 'jpg' : outputFormat,
          progress: 100,
        });
      } catch (err) {
        clearInterval(progressInterval);
        console.error('Compression error:', err);
        updateItem(item.id, { status: 'error', progress: 0 });
      }
    },
    [updateItem]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      // Check file sizes
      const oversized = files.filter((f) => f.size > 75 * 1024 * 1024);
      if (oversized.length > 0) {
        showToast(`${oversized.length} file(s) exceed 75 MB limit`);
      }

      const valid = files.filter((f) => f.size <= 75 * 1024 * 1024);
      if (!valid.length) return;

      setLocked(true);

      const newItems: FileItem[] = await Promise.all(
        valid.map(async (file) => {
          const srcExt = getExt(file.name);
          let outExt = srcExt;
          if (convertOn) {
            outExt = targetFmt === 'jpeg' ? 'jpg' : targetFmt;
          }
          const thumbUrl = await readFileAsDataURL(file);
          const id = String(nextId++);
          return {
            id,
            file,
            status: 'pending' as const,
            origSize: file.size,
            compSize: null,
            blob: null,
            thumbUrl,
            srcExt,
            outExt,
            converting: convertOn,
            targetFmt: convertOn ? targetFmt : null,
            savings: null,
            progress: 0,
          };
        })
      );

      setItems((prev) => [...prev, ...newItems]);

      // Queue all new items for processing
      newItems.forEach((item) => {
        queue.add(() => processFile(item));
      });
    },
    [convertOn, targetFmt, processFile, showToast]
  );

  const handleDownloadOne = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item?.blob) return;
      const filename =
        item.file.name.replace(/\.[^.]+$/, '') + '.' + item.outExt;
      downloadSingle(item.blob, filename);
    },
    [items]
  );

  const handleDownloadAll = useCallback(async () => {
    const done = items.filter((i) => i.status === 'done' && i.blob);
    if (!done.length) return;

    if (done.length === 1) {
      handleDownloadOne(done[0].id);
      return;
    }

    setZipping(true);
    try {
      await downloadZip(
        done.map((i) => ({
          filename: i.file.name.replace(/\.[^.]+$/, '') + '.' + i.outExt,
          blob: i.blob!,
        }))
      );
      showToast(`${done.length} images ready`);
    } catch {
      showToast('Zip failed -- try downloading individually');
    }
    setZipping(false);
  }, [items, handleDownloadOne, showToast]);

  const handleClear = useCallback(() => {
    setItems([]);
    setLocked(false);
  }, []);

  const hasResults = items.length > 0;

  return (
    <>
      <div className="bg-glow" />

      <header>
        <div className="logo">
          <div className="logo-dot" />
          Image Optimizer
        </div>
        <div className="badge">Plume Internal</div>
      </header>

      <main>
        <div className="hero">
          <h1>
            Compress &amp; convert
            <br />
            <span className="accent">without limits.</span>
          </h1>
          <p>
            Maximum compression, zero friction. No logins, no caps, no
            per-conversion limits. Server-side processing powered by Sharp.
          </p>
        </div>

        <OptionsPanel
          convertOn={convertOn}
          targetFmt={targetFmt}
          locked={locked}
          onToggleConvert={() => setConvertOn((p) => !p)}
          onSelectFormat={(fmt) => setTargetFmt(fmt)}
        />

        <DropZone onFiles={handleFiles} />

        {hasResults && (
          <div className="results on">
            <SummaryBar
              items={items}
              onDownloadAll={handleDownloadAll}
              onClear={handleClear}
              zipping={zipping}
            />
            <FileList
              items={items}
              onDownloadOne={handleDownloadOne}
              onAddMore={() => {
                const input = document.getElementById('fileInput') as HTMLInputElement;
                input?.click();
              }}
            />
          </div>
        )}
      </main>

      <footer>
        Plume Creative<span>·</span>Internal tooling<span>·</span>Not indexed
      </footer>

      <div className={`toast${toast ? ' show' : ''}`}>
        {toast}
      </div>
    </>
  );
}
