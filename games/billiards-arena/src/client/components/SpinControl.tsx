import { RotateCcw } from 'lucide-react';
import { useRef } from 'react';

interface SpinControlProps {
  x: number;
  y: number;
  disabled?: boolean;
  onChange: (x: number, y: number) => void;
}

export function SpinControl({ x, y, disabled, onChange }: SpinControlProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  const update = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    let nextX = ((clientX - rect.left) / rect.width - 0.5) * 2;
    let nextY = -((clientY - rect.top) / rect.height - 0.5) * 2;
    const length = Math.hypot(nextX, nextY);
    if (length > 1) {
      nextX /= length;
      nextY /= length;
    }
    onChange(nextX, nextY);
  };

  return (
    <div className={`spin-control-wrap ${disabled ? 'is-disabled' : ''}`}>
      <div
        ref={surfaceRef}
        className="spin-control"
        role="application"
        aria-label="母球击点"
        aria-roledescription="二维击点选择器"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          update(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
          event.preventDefault();
          const step = event.shiftKey ? 0.02 : 0.08;
          const nextX = x + (event.code === 'ArrowLeft' ? -step : event.code === 'ArrowRight' ? step : 0);
          const nextY = y + (event.code === 'ArrowDown' ? -step : event.code === 'ArrowUp' ? step : 0);
          const length = Math.max(1, Math.hypot(nextX, nextY));
          onChange(nextX / length, nextY / length);
        }}
      >
        <span className="spin-depth-ring" />
        <span className="spin-axis spin-axis-x" />
        <span className="spin-axis spin-axis-y" />
        <span className="spin-highlight" />
        <span className="spin-point" style={{ left: `${50 + x * 38}%`, top: `${50 - y * 38}%` }} />
      </div>
      <button className="micro-icon" title="重置击点" aria-label="重置击点" disabled={disabled} onClick={() => onChange(0, 0)}>
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
