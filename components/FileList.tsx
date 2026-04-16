'use client';

import { FileItem } from '@/lib/types';
import FileRow from './FileRow';

interface FileListProps {
  items: FileItem[];
  onDownloadOne: (id: string) => void;
  onAddMore: () => void;
}

export default function FileList({ items, onDownloadOne, onAddMore }: FileListProps) {
  if (items.length === 0) return null;

  return (
    <>
      <div className="file-list">
        {items.map((item) => (
          <FileRow key={item.id} item={item} onDownload={onDownloadOne} />
        ))}
      </div>
      <div className="add-more" onClick={onAddMore}>
        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          style={{ marginRight: 5, opacity: 0.5 }}
        >
          <path
            d="M4.5 1v7M1 4.5h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Add more images
      </div>
    </>
  );
}
