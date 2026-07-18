import { Eraser, Pencil, Save, Trash2, X } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import {
  CUSTOM_PATTERN_GRID_SIZE,
  MAX_CUSTOM_PATTERN_CELLS,
  MAX_CUSTOM_PATTERNS,
} from '../../shared/constants';
import { customPatternCost, type CustomPatternData } from '../../shared/patterns';

interface PatternDesignerProps {
  savedCount: number;
  onClose: () => void;
  onSave: (pattern: CustomPatternData) => boolean;
}

type EditorMode = 'draw' | 'erase';

export function PatternDesigner({ savedCount, onClose, onSave }: PatternDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Set<string>>(new Set());
  const drawingRef = useRef(false);
  const [cells, setCells] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<EditorMode>('draw');
  const [name, setName] = useState('我的图案');
  const [error, setError] = useState('');
  cellsRef.current = cells;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = () => drawEditor(canvas, cellsRef.current);
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    redraw();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawEditor(canvas, cells);
  }, [cells]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const updateFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const coordinate = editorCoordinate(event.currentTarget, event.clientX, event.clientY);
    if (!coordinate) return;
    const key = `${coordinate.x}:${coordinate.y}`;
    const current = cellsRef.current;
    if (mode === 'draw' && current.has(key)) return;
    if (mode === 'erase' && !current.has(key)) return;
    if (mode === 'draw' && current.size >= MAX_CUSTOM_PATTERN_CELLS) {
      setError(`单个图案最多 ${MAX_CUSTOM_PATTERN_CELLS} 个活细胞`);
      return;
    }
    const next = new Set(current);
    if (mode === 'draw') next.add(key);
    else next.delete(key);
    cellsRef.current = next;
    setCells(next);
    setError('');
  };

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    updateFromPointer(event);
  };

  const submit = () => {
    const normalizedName = name.normalize('NFKC').trim();
    if (Array.from(normalizedName).length < 1 || Array.from(normalizedName).length > 16) {
      setError('名称需为 1 至 16 个字符');
      return;
    }
    if (cells.size === 0) {
      setError('请先绘制至少一个活细胞');
      return;
    }
    if (savedCount >= MAX_CUSTOM_PATTERNS) {
      setError(`最多保存 ${MAX_CUSTOM_PATTERNS} 个自定义图案`);
      return;
    }
    const pattern = normalizePattern(normalizedName, cells);
    if (!onSave(pattern)) {
      setError('图案保存失败，请检查浏览器存储空间');
      return;
    }
    onClose();
  };

  return (
    <div className="modal-layer pattern-designer-layer" role="presentation">
      <section className="pattern-designer" role="dialog" aria-modal="true" aria-labelledby="pattern-designer-title">
        <header>
          <div><span>自定义生命图案</span><h2 id="pattern-designer-title">图案设计器</h2></div>
          <button type="button" aria-label="关闭图案设计器" title="关闭" onClick={onClose}><X /></button>
        </header>
        <div className="designer-body">
          <div className="designer-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="pattern-designer-canvas"
              aria-label="图案绘制网格"
              onPointerDown={pointerDown}
              onPointerMove={(event) => drawingRef.current && updateFromPointer(event)}
              onPointerUp={() => { drawingRef.current = false; }}
              onPointerCancel={() => { drawingRef.current = false; }}
            />
          </div>
          <aside className="designer-controls">
            <label htmlFor="custom-pattern-name">图案名称</label>
            <input id="custom-pattern-name" value={name} maxLength={16} onChange={(event) => setName(event.target.value)} />
            <div className="designer-metrics">
              <span><small>活细胞</small><strong>{cells.size} / {MAX_CUSTOM_PATTERN_CELLS}</strong></span>
              <span><small>投放能量</small><strong>{cells.size ? customPatternCost(cells.size) : 0}</strong></span>
            </div>
            <div className="designer-tool-row" role="group" aria-label="绘制工具">
              <button type="button" className={mode === 'draw' ? 'is-active' : ''} title="绘制" aria-label="绘制" onClick={() => setMode('draw')}><Pencil /></button>
              <button type="button" className={mode === 'erase' ? 'is-active' : ''} title="擦除" aria-label="擦除" onClick={() => setMode('erase')}><Eraser /></button>
              <button type="button" title="清空" aria-label="清空图案" onClick={() => { const empty = new Set<string>(); cellsRef.current = empty; setCells(empty); setError(''); }}><Trash2 /></button>
            </div>
            <p className="designer-error" role="status">{error}</p>
            <button type="button" className="designer-save" onClick={submit}><Save />保存到图案列表</button>
          </aside>
        </div>
      </section>
    </div>
  );
}

function editorCoordinate(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - bounds.left) / bounds.width * CUSTOM_PATTERN_GRID_SIZE);
  const y = Math.floor((clientY - bounds.top) / bounds.height * CUSTOM_PATTERN_GRID_SIZE);
  if (x < 0 || x >= CUSTOM_PATTERN_GRID_SIZE || y < 0 || y >= CUSTOM_PATTERN_GRID_SIZE) return null;
  return { x, y };
}

function normalizePattern(name: string, keys: Set<string>): CustomPatternData {
  const coordinates = [...keys].map((key) => {
    const [x, y] = key.split(':').map(Number);
    return { x, y };
  });
  const minX = Math.min(...coordinates.map((cell) => cell.x));
  const maxX = Math.max(...coordinates.map((cell) => cell.x));
  const minY = Math.min(...coordinates.map((cell) => cell.y));
  const maxY = Math.max(...coordinates.map((cell) => cell.y));
  const centerX = Math.floor((minX + maxX) / 2);
  const centerY = Math.floor((minY + maxY) / 2);
  return {
    name,
    cells: coordinates
      .map((cell) => ({ x: cell.x - centerX, y: cell.y - centerY }))
      .sort((left, right) => left.y - right.y || left.x - right.x),
  };
}

function drawEditor(canvas: HTMLCanvasElement, cells: Set<string>): void {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.max(1, Math.round(Math.min(bounds.width, bounds.height) * ratio));
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  const cellSize = size / CUSTOM_PATTERN_GRID_SIZE;
  context.fillStyle = '#081315';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#55d8b4';
  for (const key of cells) {
    const [x, y] = key.split(':').map(Number);
    context.fillRect(x * cellSize + 1, y * cellSize + 1, Math.max(1, cellSize - 2), Math.max(1, cellSize - 2));
  }
  context.strokeStyle = 'rgba(158, 190, 183, 0.12)';
  context.lineWidth = 1;
  context.beginPath();
  for (let index = 0; index <= CUSTOM_PATTERN_GRID_SIZE; index += 1) {
    const coordinate = Math.round(index * cellSize) + 0.5;
    context.moveTo(coordinate, 0);
    context.lineTo(coordinate, size);
    context.moveTo(0, coordinate);
    context.lineTo(size, coordinate);
  }
  context.stroke();
  const center = Math.floor(CUSTOM_PATTERN_GRID_SIZE / 2);
  context.strokeStyle = 'rgba(242, 191, 88, 0.8)';
  context.lineWidth = Math.max(1, ratio);
  context.strokeRect(center * cellSize + 1, center * cellSize + 1, cellSize - 2, cellSize - 2);
}
