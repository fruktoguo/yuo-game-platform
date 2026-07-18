import { useEffect, useRef } from 'react';
import type { GameEvent, GameSnapshot } from '../../shared/protocol';
import { BilliardsRenderer, type CameraMode, type SceneInteraction } from '../game/BilliardsRenderer';

export interface ShotVisual {
  id: number;
  angle: number;
  power: number;
}

interface GameCanvasProps {
  snapshot: GameSnapshot | null;
  event: GameEvent | null;
  shotVisual: ShotVisual | null;
  interaction: SceneInteraction;
  onAim: (angle: number) => void;
  onPowerChange: (power: number) => void;
  onPlaceCue: (position: { x: number; z: number }) => void;
  onCallPocket: (pocket: number) => void;
  onInteraction: () => void;
}

export function GameCanvas({ snapshot, event, shotVisual, interaction, onAim, onPowerChange, onPlaceCue, onCallPocket, onInteraction }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BilliardsRenderer | null>(null);
  const callbacksRef = useRef({ onAim, onPowerChange, onPlaceCue, onCallPocket, onInteraction });
  callbacksRef.current = { onAim, onPowerChange, onPlaceCue, onCallPocket, onInteraction };

  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new BilliardsRenderer(containerRef.current, {
      onAim: (angle) => callbacksRef.current.onAim(angle),
      onPowerChange: (power) => callbacksRef.current.onPowerChange(power),
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
  useEffect(() => rendererRef.current?.handleEvent(event), [event]);
  useEffect(() => {
    if (shotVisual) rendererRef.current?.triggerShot(shotVisual.angle, shotVisual.power);
  }, [shotVisual]);

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
