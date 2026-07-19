import type { SVGProps } from 'react';
import iconSpriteUrl from './assets/game-icons.svg?url';
import type { FoundryIconId } from '../shared/catalog';

interface GameIconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  icon: FoundryIconId;
  label?: string;
}

export function GameIcon({ icon, label, ...props }: GameIconProps) {
  return (
    <svg {...props} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined}>
      {label && <title>{label}</title>}
      <use href={`${iconSpriteUrl}#gi-${icon}`} />
    </svg>
  );
}
