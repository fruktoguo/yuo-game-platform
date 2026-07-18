import { Palette, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { normalizePlayerColor } from '../../shared/colors';

interface SettingsDialogProps {
  color: string;
  onClose: () => void;
  onSave: (color: string, done: (ok: boolean) => void) => void;
}

export function SettingsDialog({ color, onClose, onSave }: SettingsDialogProps) {
  const [value, setValue] = useState(color);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const submit = () => {
    const normalized = normalizePlayerColor(value);
    if (!normalized) {
      setError('颜色过暗，请选择与世界背景对比更明显的颜色');
      return;
    }
    setSaving(true);
    setError('');
    onSave(normalized, (ok) => {
      setSaving(false);
      if (ok) onClose();
    });
  };
  const previewColor = /^#[0-9a-f]{6}$/iu.test(value) ? value : color;
  return (
    <div className="modal-layer settings-layer" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div><Palette aria-hidden="true" /><h2 id="settings-title">颜色设置</h2></div>
          <button type="button" aria-label="关闭设置" title="关闭" onClick={onClose}><X /></button>
        </header>
        <div className="settings-body">
          <label htmlFor="player-color">细胞颜色</label>
          <div className="color-picker-row">
            <input id="player-color" type="color" value={previewColor} onChange={(event) => { setValue(event.target.value); setError(''); }} />
            <input aria-label="颜色代码" value={value} maxLength={7} spellCheck={false} onChange={(event) => { setValue(event.target.value); setError(''); }} />
            <i style={{ background: previewColor }} aria-hidden="true" />
          </div>
          <p className="settings-error" role="status">{error}</p>
        </div>
        <footer><button type="button" disabled={saving} onClick={submit}><Save />{saving ? '保存中' : '保存颜色'}</button></footer>
      </section>
    </div>
  );
}
