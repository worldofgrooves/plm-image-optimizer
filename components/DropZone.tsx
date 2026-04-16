'use client';

import { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

export default function DropZone({ onFiles }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const imgs = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imgs.length) onFiles(imgs);
    },
    [onFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const imgs = Array.from(e.target.files || []).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imgs.length) onFiles(imgs);
      e.target.value = '';
    },
    [onFiles]
  );

  return (
    <div
      className={`input-card${over ? ' over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        const target = e.currentTarget;
        if (!target.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={handleDrop}
    >
      <svg className="drop-icon" viewBox="0 0 38 38" fill="none">
        <rect
          x="2"
          y="2"
          width="34"
          height="34"
          rx="6"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="13" cy="13.5" r="2.5" fill="currentColor" opacity=".55" />
        <path
          d="M2 27L11.5 17 18 23.5l6-6L36 30"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="drop-h">Drop your images here</p>
      <p className="drop-p">
        or{' '}
        <b
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          browse files
        </b>{' '}
        &mdash; unlimited files, up to 75 MB each
      </p>
      <div className="drop-fmts">
        <span className="ftag">PNG</span>
        <span className="ftag">JPEG</span>
        <span className="ftag">WebP</span>
        <span className="ftag">GIF</span>
        <span className="ftag">BMP</span>
        <span className="ftag">AVIF</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        id="fileInput"
        accept="image/*"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
