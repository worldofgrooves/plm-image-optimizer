'use client';

import { FileItem } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

interface FileRowProps {
  item: FileItem;
  onDownload: (id: string) => void;
}

function fmtB(b: number | null): string {
  if (!b) return '\u2014';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function badgeClass(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'png') return 'fbadge png';
  if (e === 'jpg' || e === 'jpeg') return 'fbadge jpg';
  if (e === 'webp') return 'fbadge webp';
  if (e === 'gif') return 'fbadge gif';
  if (e === 'avif') return 'fbadge avif';
  return 'fbadge';
}

export default function FileRow({ item, onDownload }: FileRowProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const prevProgressRef = useRef(0);

  useEffect(() => {
    if (item.status === 'processing') {
      const from = prevProgressRef.current;
      const to = item.progress;
      const duration = 300;
      const start = Date.now();

      const animate = () => {
        const elapsed = Date.now() - start;
        const t = Math.min(1, elapsed / duration);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const current = from + (to - from) * eased;
        setDisplayProgress(current);
        if (t < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          prevProgressRef.current = to;
        }
      };
      animRef.current = requestAnimationFrame(animate);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    } else if (item.status === 'done' || item.status === 'error') {
      prevProgressRef.current = 0;
      setDisplayProgress(0);
    }
  }, [item.progress, item.status]);

  const savingsText = () => {
    if (item.status === 'pending') return 'Queued';
    if (item.status === 'processing')
      return item.converting ? 'Converting\u2026' : 'Optimizing\u2026';
    if (item.status === 'error') return 'Error';
    if (item.savings === null) return '\u2014';
    return item.savings > 0 ? `\u2212${item.savings}%` : 'Optimal';
  };

  const savingsClass = () => {
    if (item.status === 'pending') return 'row-sav dim';
    if (item.status === 'processing') return 'row-sav proc';
    if (item.status === 'error') return 'row-sav';
    if (item.savings === null) return 'row-sav';
    return item.savings >= 15 ? 'row-sav good' : 'row-sav ok';
  };

  const actionContent = () => {
    if (item.status === 'pending')
      return (
        <svg
          className="pend-ic"
          width="14"
          height="14"
          viewBox="0 0 14 14"
        >
          <circle
            cx="7"
            cy="7"
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="3 2"
          />
        </svg>
      );
    if (item.status === 'processing')
      return <div className="spinner" />;
    if (item.status === 'error')
      return (
        <svg
          className="err-ic"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <circle
            cx="7"
            cy="7"
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 4.5v3M7 9v.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    return (
      <button
        className="dl-btn"
        title="Download"
        onClick={(e) => {
          e.stopPropagation();
          onDownload(item.id);
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
        >
          <path
            d="M5.5 1v6.5M3.5 5l2 2 2-2M1 10h9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  };

  return (
    <div className={`file-row state-${item.status}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="row-thumb"
        src={item.thumbUrl || ''}
        alt=""
      />
      <div style={{ minWidth: 0 }}>
        <div className="row-name" title={item.file.name}>
          {item.file.name}
        </div>
        <div className="row-meta">
          <span className={badgeClass(item.srcExt)}>
            {item.srcExt.toUpperCase()}
          </span>
          {item.converting && (
            <>
              <span className="conv-arrow">&rarr;</span>
              <span className={`${badgeClass(item.outExt)} target`}>
                {item.outExt.toUpperCase()}
              </span>
            </>
          )}
          <span>{fmtB(item.origSize)}</span>
          {item.compSize !== null && (
            <span>&rarr; {fmtB(item.compSize)}</span>
          )}
        </div>
        {item.status === 'processing' && (
          <div className="prog-wrap">
            <div
              className="prog-bar"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        )}
      </div>
      <div className={savingsClass()}>{savingsText()}</div>
      <div className="row-act">{actionContent()}</div>
    </div>
  );
}
