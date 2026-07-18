import { useEffect, useRef } from 'react';
import type { GameSnapshot } from '../../shared/protocol';
import { BilliardsRenderer, type CameraMode, type SceneInteraction } from '../game/BilliardsRenderer';

interface GameCanvasProps {
  snapshot: GameSnapshot | null;
  interaction: SceneInteraction;
  onAim: (angle: number) => void;
  onPlaceCue: (position: { x: number; z: number }) => void;
  onCallPocket: (pocket: number) => void;
  onInteraction: () => void;
}

export function GameCanvas({ snapshot, interaction, onAim, onPlaceCue, onCallPocket, onInteraction }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BilliardsRenderer | null>(null);
  const callbacksRef = useRef({ onAim, onPlaceCue, onCallPocket, onInteraction });
  callbacksRef.current = { onAim, onPlaceCue, onCallPocket, onInteraction };

  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new BilliardsRenderer(containerRef.current, {
      onAim: (angle) => callbacksRef.current.onAim(angle),
      onPlaceCue: (position) => callbacksRef.current.onPlaceCue(position),
      onCallPocket: (pocket) => callbacksRef.current.onCallPocket(pocket),
      onInteraction: () => callbacksRef.current.onInteraction(),
    });
    rendererRef.current = renderer;
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => rendererRef.current?.setSnapshot(snapshot), [snapshot]);
  useEffect(() => rendererRef.current?.setInteraction(interaction), [interaction]);

  return (
    <div
      ref={containerRef}
      className="game-canvas-host"
      data-camera-mode={interaction.cameraMode satisfies CameraMode}
      data-can-aim={interaction.canAim}
      data-can-place={interaction.canPlace}
    />
  );
}
