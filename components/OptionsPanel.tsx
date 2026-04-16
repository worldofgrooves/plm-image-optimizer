'use client';

import { OutputFormat, FORMAT_NOTES } from '@/lib/types';

interface OptionsPanelProps {
  convertOn: boolean;
  targetFmt: OutputFormat;
  locked: boolean;
  onToggleConvert: () => void;
  onSelectFormat: (fmt: OutputFormat) => void;
}

const FORMATS: { key: OutputFormat; label: string }[] = [
  { key: 'webp', label: 'WebP' },
  { key: 'jpeg', label: 'JPEG' },
  { key: 'png', label: 'PNG' },
  { key: 'avif', label: 'AVIF' },
];

export default function OptionsPanel({
  convertOn,
  targetFmt,
  locked,
  onToggleConvert,
  onSelectFormat,
}: OptionsPanelProps) {
  return (
    <div
      className="options-card"
      style={locked ? { pointerEvents: 'none', opacity: 0.45 } : undefined}
    >
      <label
        className={`toggle-row${convertOn ? ' on' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          onToggleConvert();
        }}
      >
        <span className="toggle-track" />
        <span className="toggle-label">
          <span>Convert format</span>
          <small>Change file type during compression</small>
        </span>
      </label>

      <div
        className="opt-divider"
        style={{ display: convertOn ? 'block' : 'none' }}
      />

      <div className={`fmt-picker${convertOn ? ' on' : ''}`}>
        <span className="fmt-picker-label">Output as</span>
        {FORMATS.map((f) => (
          <div
            key={f.key}
            className={`fpill${targetFmt === f.key ? ' sel' : ''}`}
            onClick={() => onSelectFormat(f.key)}
          >
            {f.label}
          </div>
        ))}
      </div>

      {convertOn && (
        <div className="conv-note-wrap on">
          <div
            className="conv-note"
            dangerouslySetInnerHTML={{
              __html: FORMAT_NOTES[targetFmt] || '',
            }}
          />
        </div>
      )}
    </div>
  );
}
