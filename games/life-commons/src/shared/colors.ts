const PLAYER_COLORS = [
  '#51d6b1', '#f2b84b', '#eb6f92', '#6fa8ff', '#b890f5', '#ff8d5b', '#7bd56c', '#e86ed0',
  '#53c7e8', '#d9d55f', '#ff6b6b', '#72c6a1', '#9f8cff', '#f08aab', '#67b7dc', '#d3a35c',
] as const;

export const WORLD_BACKGROUND_COLOR = '#071012';
const MINIMUM_PLAYER_COLOR_CONTRAST = 3;

export function playerColorForOwner(ownerId: number): string {
  if (ownerId > 0 && ownerId <= PLAYER_COLORS.length) return PLAYER_COLORS[ownerId - 1];
  const hue = Math.abs(ownerId * 137.508 + 154) % 360;
  const lightness = 58 + ownerId % 3 * 4;
  return hslToHex(hue, 68, lightness);
}

export function normalizePlayerColor(value: unknown): string | null {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/iu.test(value)) return null;
  const color = value.toLowerCase();
  return contrastRatio(color, WORLD_BACKGROUND_COLOR) >= MINIMUM_PLAYER_COLOR_CONTRAST ? color : null;
}

export function isPlayerColorAllowed(value: unknown): value is string {
  return normalizePlayerColor(value) !== null;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs(section % 2 - 1));
  const [red, green, blue] = section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
      : section < 3 ? [0, chroma, x]
        : section < 4 ? [0, x, chroma]
          : section < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
