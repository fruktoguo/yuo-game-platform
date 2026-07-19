import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const revision = '82d948812bfe3f269ef8f731dcdb07b08160edc4';
const repository = 'https://raw.githubusercontent.com/game-icons/icons';
const sources = [
  ['ore', 'faithtoken', 'ore.svg'],
  ['minerals', 'faithtoken', 'minerals.svg'],
  ['coal', 'delapouite', 'coal-pile.svg'],
  ['stone', 'delapouite', 'stone-pile.svg'],
  ['water', 'sbed', 'water-drop.svg'],
  ['oil', 'skoll', 'oil-drum.svg'],
  ['uranium', 'lorc', 'radioactive.svg'],
  ['drop', 'lorc', 'drop.svg'],
  ['fuel', 'delapouite', 'fuel-tank.svg'],
  ['plate', 'delapouite', 'metal-plate.svg'],
  ['brick', 'delapouite', 'brick-pile.svg'],
  ['metal', 'lorc', 'metal-bar.svg'],
  ['molecule', 'lorc', 'molecule.svg'],
  ['powder', 'lorc', 'powder.svg'],
  ['battery', 'sbed', 'battery-pack.svg'],
  ['concrete', 'delapouite', 'concrete-bag.svg'],
  ['nuclear', 'sbed', 'nuclear.svg'],
  ['gear', 'lorc', 'gears.svg'],
  ['wire', 'delapouite', 'wire-coil.svg'],
  ['circuit', 'lorc', 'circuitry.svg'],
  ['processor', 'lorc', 'processor.svg'],
  ['pipe', 'delapouite', 'pipes.svg'],
  ['engine', 'delapouite', 'turbine.svg'],
  ['robot-frame', 'delapouite', 'robot-grab.svg'],
  ['cube', 'delapouite', 'cube.svg'],
  ['rocket-thruster', 'delapouite', 'rocket-thruster.svg'],
  ['radar', 'delapouite', 'radar-cross-section.svg'],
  ['rocket', 'lorc', 'rocket.svg'],
  ['satellite', 'lorc', 'satellite.svg'],
  ['belt', 'lucasms', 'belt.svg'],
  ['splitter', 'delapouite', 'split-arrows.svg'],
  ['inserter', 'delapouite', 'factory-arm.svg'],
  ['rail', 'delapouite', 'railway.svg'],
  ['wagon', 'delapouite', 'coal-wagon.svg'],
  ['robot', 'lorc', 'robot-golem.svg'],
  ['module', 'delapouite', 'electrical-socket.svg'],
  ['speed', 'delapouite', 'speedometer.svg'],
  ['efficiency', 'delapouite', 'power-generator.svg'],
  ['productivity', 'delapouite', 'factory.svg'],
  ['science', 'lorc', 'test-tubes.svg'],
  ['drill', 'delapouite', 'drill.svg'],
  ['furnace', 'delapouite', 'furnace.svg'],
  ['pump', 'delapouite', 'oil-pump.svg'],
  ['refinery', 'delapouite', 'oil-rig.svg'],
  ['chemical-plant', 'lorc', 'chemical-tank.svg'],
  ['factory', 'delapouite', 'factory.svg'],
  ['lab', 'caro-asercion', 'test-tube-rack.svg'],
  ['warehouse', 'delapouite', 'warehouse.svg'],
  ['power', 'delapouite', 'power-generator.svg'],
  ['solar', 'skoll', 'solar-power.svg'],
  ['nuclear-plant', 'delapouite', 'nuclear-plant.svg'],
  ['roboport', 'delapouite', 'robot-antennas.svg'],
  ['beacon', 'lorc', 'radar-sweep.svg'],
];

const symbols = await Promise.all(sources.map(async ([id, author, file]) => {
  const url = `${repository}/${revision}/${author}/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载图标失败：${url} (${response.status})`);
  const source = await response.text();
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1];
  const body = source.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1];
  if (!viewBox || !body) throw new Error(`无法解析图标：${url}`);
  const foreground = body
    .replace(/<path[^>]*d="M0 0h512v512H0z"[^>]*\/>/g, '')
    .replace(/fill="#fff(?:fff)?"/gi, 'fill="currentColor"')
    .replace(/\s+/g, ' ')
    .trim();
  return `  <symbol id="gi-${id}" viewBox="${viewBox}"><g fill="currentColor">${foreground}</g></symbol>`;
}));

const output = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg">',
  '  <!-- Game-icons.net, CC BY 3.0。完整署名见 THIRD_PARTY_ASSETS.md。 -->',
  ...symbols,
  '</svg>',
  '',
].join('\n');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'src/client/assets/game-icons.svg');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, 'utf8');
console.log(`已生成 ${sources.length} 个图标：${outputPath}`);
