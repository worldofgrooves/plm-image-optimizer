'use client';

import { FileItem } from '@/lib/types';

interface SummaryBarProps {
  items: FileItem[];
  onDownloadAll: () => void;
  onClear: () => void;
  zipping: boolean;
}

function fmtB(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

export default function SummaryBar({ items, onDownloadAll, onClear, zipping }: SummaryBarProps) {
  const done = items.filter((i) => i.status === 'done');
  const proc = items.filter((i) => i.status === 'processing').length;
  const pend = items.filter((i) => i.status === 'pending').length;
  const totO = items.reduce((a, i) => a + i.origSize, 0);
  const totC = done.reduce((a, i) => a + (i.compSize || 0), 0);
  const pct = totO > 0 && totC > 0 ? Math.round((1 - totC / totO) * 100) : 0;
  const anyConverting = items.some((i) => i.converting);

  let headline = 'Ready';
  let sub = '';
  const btnDisabled = done.length === 0 || proc > 0 || pend > 0;

  if (proc > 0 || pend > 0) {
    headline = `Processing ${done.length} of ${items.length}\u2026`;
    sub = `${pend} queued \u00B7 ${proc} active`;
  } else if (done.length > 0) {
    headline =
      pct > 0
        ? `Saved ${pct}% \u00B7 ${done.length} ${done.length === 1 ? 'image' : 'images'}${anyConverting ? ' converted' : ''}`
        : `${done.length} ${done.length === 1 ? 'image' : 'images'} optimized`;
    sub = `${fmtB(totO)} \u2192 ${fmtB(totC)} \u00B7 ${fmtB(totO - totC)} freed`;
  }

  return (
    <div className="summary">
      <div className="sum-text">
        <div className="sum-headline">{headline}</div>
        <div className="sum-sub">{sub}</div>
      </div>
      <div className="sum-actions">
        <button
          className="extract-btn"
          disabled={btnDisabled || zipping}
          onClick={onDownloadAll}
        >
          {zipping ? (
            'Zipping\u2026'
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1v7M3.5 5.5L6 8l2.5-2.5M1 11h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Download All
            </>
          )}
        </button>
        <button className="clear-btn" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
