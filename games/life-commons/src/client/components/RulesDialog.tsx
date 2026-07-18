import { BookOpen, X } from 'lucide-react';
import { useEffect } from 'react';
import { MAX_CUSTOM_PATTERN_CELLS, MAX_ENERGY, MAX_ERASER_SIZE, SECTOR_COUNT, SECTOR_FULL_OCCUPANCY_CELLS, SECTOR_VICTORY_COUNT } from '../../shared/constants';

interface RulesDialogProps {
  onClose: () => void;
}

export function RulesDialog({ onClose }: RulesDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-layer rules-layer" role="presentation">
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <header>
          <div><BookOpen aria-hidden="true" /><span>生命战争规则</span></div>
          <button type="button" aria-label="关闭规则" title="关闭" onClick={onClose}><X /></button>
        </header>
        <div className="rules-body">
          <h2 id="rules-title">生命战争</h2>
          <div className="rule-grid">
            <article><b>01</b><div><strong>标准生命规则</strong><p>死亡格恰有 3 个邻居时出生；活细胞有 2 或 3 个邻居时存活，其余情况死亡。</p></div></article>
            <article><b>02</b><div><strong>战场与灰色外围</strong><p>中央 256×256 战场划分为 {SECTOR_COUNT} 个区域，外侧灰色区域允许投放与演化，但永不参与占领和胜利统计。</p></div></article>
            <article><b>03</b><div><strong>能量</strong><p>能量上限为 {MAX_ENERGY}，自然恢复速度固定为每分钟 10 点；投放图案会消耗对应能量。</p></div></article>
            <article><b>04</b><div><strong>橡皮擦</strong><p>尺寸可在 1 至 {MAX_ERASER_SIZE} 间调整，只能清除自己的细胞；每清除 1 格恢复 1 点能量。</p></div></article>
            <article><b>05</b><div><strong>自定义与 RLE</strong><p>可绘制或导入 B3/S23 RLE 图案，每个图案最多包含 {MAX_CUSTOM_PATTERN_CELLS} 个活细胞，投放由服务器完整校验。</p></div></article>
            <article><b>06</b><div><strong>胜利条件</strong><p>率先占据 {SECTOR_VICTORY_COUNT} / {SECTOR_COUNT} 个中央区域的玩家获胜并结算赛季，灰色外围不计入区域总数。</p></div></article>
            <article><b>07</b><div><strong>完全占据</strong><p>区域主导者拥有至少 {SECTOR_FULL_OCCUPANCY_CELLS} 格（15%）即完全占据；其他玩家的图案不得有任何像素触及该区域。</p></div></article>
            <article><b>08</b><div><strong>归属与颜色</strong><p>新生细胞优先继承多数父细胞归属；玩家可设置高对比颜色，自己的全部细胞会显示高亮轮廓与边界。</p></div></article>
          </div>
        </div>
        <footer><button type="button" onClick={onClose}>进入世界</button></footer>
      </section>
    </div>
  );
}
