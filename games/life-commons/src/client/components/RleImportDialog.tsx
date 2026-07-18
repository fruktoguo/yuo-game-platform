import { FileCode2, Save, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_CUSTOM_PATTERNS } from '../../shared/constants';
import { customPatternCost, type CustomPatternData } from '../../shared/patterns';
import { parseRlePattern, type ParsedRlePattern } from '../../shared/rle';

interface RleImportDialogProps {
  savedCount: number;
  onClose: () => void;
  onSave: (pattern: CustomPatternData) => boolean;
}

export function RleImportDialog({ savedCount, onClose, onSave }: RleImportDialogProps) {
  const [name, setName] = useState('RLE 图案');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const parsed = useMemo(() => tryParse(code, name), [code, name]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const submit = () => {
    if (savedCount >= MAX_CUSTOM_PATTERNS) {
      setError(`最多保存 ${MAX_CUSTOM_PATTERNS} 个自定义图案`);
      return;
    }
    try {
      const pattern = parseRlePattern(code, name);
      if (!onSave({ name: pattern.name, cells: pattern.cells })) {
        setError('图案保存失败，请检查浏览器存储空间');
        return;
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'RLE 代码无效');
    }
  };
  return (
    <div className="modal-layer rle-import-layer" role="presentation">
      <section className="rle-import-dialog" role="dialog" aria-modal="true" aria-labelledby="rle-import-title">
        <header>
          <div><FileCode2 aria-hidden="true" /><h2 id="rle-import-title">导入 RLE 图案</h2></div>
          <button type="button" aria-label="关闭 RLE 导入" title="关闭" onClick={onClose}><X /></button>
        </header>
        <div className="rle-import-body">
          <div className="rle-fields">
            <label htmlFor="rle-pattern-name">图案名称</label>
            <input id="rle-pattern-name" value={name} maxLength={16} onChange={(event) => { setName(event.target.value); setError(''); }} />
            <label htmlFor="rle-code">RLE 代码</label>
            <textarea id="rle-code" aria-label="RLE 代码" autoFocus spellCheck={false} value={code} onChange={(event) => { setCode(event.target.value); setError(''); }} />
          </div>
          <aside className="rle-preview-panel">
            <RlePreview pattern={parsed} />
            <div className="rle-metrics">
              <span><small>尺寸</small><strong>{parsed ? `${parsed.width} × ${parsed.height}` : '—'}</strong></span>
              <span><small>活细胞</small><strong>{parsed?.cells.length ?? '—'}</strong></span>
              <span><small>投放能量</small><strong>{parsed ? customPatternCost(parsed.cells.length) : '—'}</strong></span>
              <span><small>规则</small><strong>{parsed?.rule ?? 'B3/S23'}</strong></span>
            </div>
            <p className="rle-error" role="status">{error}</p>
          </aside>
        </div>
        <footer><button type="button" onClick={submit}><Save />导入到图案列表</button></footer>
      </section>
    </div>
  );
}

function RlePreview({ pattern }: { pattern: ParsedRlePattern | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    context.fillStyle = '#081315';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!pattern) return;
    const minX = Math.min(...pattern.cells.map((cell) => cell.x));
    const maxX = Math.max(...pattern.cells.map((cell) => cell.x));
    const minY = Math.min(...pattern.cells.map((cell) => cell.y));
    const maxY = Math.max(...pattern.cells.map((cell) => cell.y));
    const columns = maxX - minX + 1;
    const rows = maxY - minY + 1;
    const cellSize = Math.max(1, Math.min((canvas.width - 20 * ratio) / columns, (canvas.height - 20 * ratio) / rows));
    const offsetX = (canvas.width - columns * cellSize) / 2;
    const offsetY = (canvas.height - rows * cellSize) / 2;
    context.fillStyle = '#58d8b4';
    for (const cell of pattern.cells) context.fillRect(offsetX + (cell.x - minX) * cellSize, offsetY + (cell.y - minY) * cellSize, Math.max(1, cellSize - 1), Math.max(1, cellSize - 1));
  }, [pattern]);
  return <canvas ref={canvasRef} className="rle-preview" aria-label="RLE 图案预览" />;
}

function tryParse(code: string, name: string): ParsedRlePattern | null {
  if (!code.trim()) return null;
  try { return parseRlePattern(code, name); } catch { return null; }
}
