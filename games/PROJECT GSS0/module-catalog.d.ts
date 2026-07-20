export type GSS0ModuleId =
  | "spark" | "frost" | "prism" | "nova" | "tesla" | "laser" | "missile" | "mine"
  | "blade" | "pulse" | "venom" | "echo" | "rail" | "ricochet" | "cluster" | "fan"
  | "gravity" | "shield" | "phase" | "repulse" | "armor" | "thorns" | "stabilizer"
  | "magnet" | "haste" | "chronos" | "tractor" | "fortune" | "guidance" | "feast"
  | "salvage" | "regen" | "bloom" | "amplifier" | "needle" | "mortar" | "sweep"
  | "sniper" | "flak" | "fork" | "anchor" | "saw" | "flare" | "scatter" | "lance"
  | "execute" | "crossfire" | "phasebolt" | "ram" | "buffer" | "decoy" | "emergency"
  | "collector" | "beacon" | "momentum" | "progressor" | "nursery" | "cache";

export type GSS0ModuleCategory = "输出" | "防御" | "辅助" | "恢复";
export type GSS0ModuleShape = "triangle" | "diamond" | "hex" | "star" | "ring" | "capsule" | "square" | "circle";

export interface GSS0ModuleCatalogEntry {
  readonly id: GSS0ModuleId;
  readonly name: string;
  readonly category: GSS0ModuleCategory;
  readonly color: string;
  readonly shape: GSS0ModuleShape;
  readonly cooldown: string;
  readonly activeCooldown?: true;
  readonly desc: string;
}

declare global {
  var GSS0ModuleCatalog: readonly GSS0ModuleCatalogEntry[];
}
