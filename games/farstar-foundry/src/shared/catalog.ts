export const RESOURCE_IDS = [
  'ironOre',
  'copperOre',
  'coal',
  'stone',
  'water',
  'crudeOil',
  'uraniumOre',
  'petroleumGas',
  'heavyOil',
  'lightOil',
  'lubricant',
  'sulfuricAcid',
  'ironPlate',
  'copperPlate',
  'brick',
  'steel',
  'plastic',
  'sulfur',
  'battery',
  'solidFuel',
  'concrete',
  'refinedConcrete',
  'uranium238',
  'uranium235',
  'uraniumFuelCell',
  'usedUraniumFuelCell',
  'gear',
  'wire',
  'circuit',
  'advancedCircuit',
  'processingUnit',
  'pipe',
  'engine',
  'electricEngine',
  'flyingRobotFrame',
  'electricFurnace',
  'lowDensityStructure',
  'rocketFuel',
  'rocketControlUnit',
  'transportBelt',
  'undergroundBelt',
  'splitter',
  'fastTransportBelt',
  'fastUndergroundBelt',
  'fastSplitter',
  'expressTransportBelt',
  'expressUndergroundBelt',
  'expressSplitter',
  'inserter',
  'fastInserter',
  'stackInserter',
  'rail',
  'locomotive',
  'cargoWagon',
  'fluidWagon',
  'logisticRobot',
  'constructionRobot',
  'solarPanel',
  'accumulator',
  'radar',
  'speedModule1',
  'speedModule2',
  'speedModule3',
  'efficiencyModule1',
  'efficiencyModule2',
  'efficiencyModule3',
  'productivityModule1',
  'productivityModule2',
  'productivityModule3',
  'automationScience',
  'logisticScience',
  'chemicalScience',
  'productionScience',
  'utilityScience',
  'rocketPart',
  'satellite',
] as const;

export type ResourceId = typeof RESOURCE_IDS[number];
export type ResourceAmounts = Record<ResourceId, number>;
export type ResourceCategory = 'raw' | 'fluid' | 'material' | 'component' | 'logistics' | 'science' | 'project';
export type ResourceTone = 'iron' | 'copper' | 'carbon' | 'stone' | 'fluid' | 'oil' | 'chemical' | 'electronic' | 'logistics' | 'science' | 'uranium' | 'project';

export const TECHNOLOGY_IDS = [
  'automation',
  'logistics',
  'steamPower',
  'steelProcessing',
  'electronics',
  'automationTwo',
  'fluidHandling',
  'railTransport',
  'engineTechnology',
  'oilProcessing',
  'plastics',
  'sulfurProcessing',
  'advancedElectronics',
  'chemicalScience',
  'advancedOilProcessing',
  'batteryTech',
  'advancedMaterialProcessing',
  'solarEnergy',
  'electricEngines',
  'modules',
  'advancedElectronicsTwo',
  'fastLogistics',
  'productionScience',
  'moduleTwo',
  'uraniumProcessing',
  'nuclearPower',
  'kovarexEnrichment',
  'robotics',
  'constructionRobotics',
  'logisticRobotics',
  'utilityScience',
  'expressLogistics',
  'moduleThree',
  'lowDensityStructure',
  'rocketFuelTechnology',
  'rocketControl',
  'rocketSilo',
] as const;

export type TechnologyId = typeof TECHNOLOGY_IDS[number];

export const FOUNDRY_ICON_IDS = [
  'ore', 'minerals', 'coal', 'stone', 'water', 'oil', 'uranium', 'drop', 'fuel',
  'plate', 'brick', 'metal', 'molecule', 'powder', 'battery', 'concrete', 'nuclear',
  'gear', 'wire', 'circuit', 'processor', 'pipe', 'engine', 'robot-frame', 'cube',
  'rocket-thruster', 'radar', 'rocket', 'satellite', 'belt', 'splitter', 'inserter',
  'rail', 'wagon', 'robot', 'module', 'speed', 'efficiency', 'productivity', 'science',
  'drill', 'furnace', 'pump', 'refinery', 'chemical-plant', 'factory', 'lab',
  'warehouse', 'power', 'solar', 'nuclear-plant', 'roboport', 'beacon',
] as const;

export type FoundryIconId = typeof FOUNDRY_ICON_IDS[number];

export interface ResourceDefinition {
  id: ResourceId;
  name: string;
  symbol: string;
  category: ResourceCategory;
  tone: ResourceTone;
  icon: FoundryIconId;
  unlockStage: number;
  unlock: TechnologyId | null;
  capacityMultiplier?: number;
}

export const RESOURCE_DEFINITIONS = [
  { id: 'ironOre', name: '铁矿', symbol: 'Fe', category: 'raw', tone: 'iron', icon: 'ore', unlockStage: 0, unlock: null },
  { id: 'copperOre', name: '铜矿', symbol: 'Cu', category: 'raw', tone: 'copper', icon: 'minerals', unlockStage: 2, unlock: null },
  { id: 'coal', name: '煤炭', symbol: 'C', category: 'raw', tone: 'carbon', icon: 'coal', unlockStage: 1, unlock: null },
  { id: 'stone', name: '岩石', symbol: 'St', category: 'raw', tone: 'stone', icon: 'stone', unlockStage: 0, unlock: null },
  { id: 'water', name: '工业用水', symbol: 'H2O', category: 'raw', tone: 'fluid', icon: 'water', unlockStage: 3, unlock: 'fluidHandling', capacityMultiplier: 4 },
  { id: 'crudeOil', name: '原油', symbol: 'Oil', category: 'raw', tone: 'oil', icon: 'oil', unlockStage: 4, unlock: 'oilProcessing', capacityMultiplier: 4 },
  { id: 'uraniumOre', name: '铀矿', symbol: 'U', category: 'raw', tone: 'uranium', icon: 'uranium', unlockStage: 6, unlock: 'uraniumProcessing' },

  { id: 'petroleumGas', name: '石油气', symbol: 'PG', category: 'fluid', tone: 'oil', icon: 'drop', unlockStage: 4, unlock: 'oilProcessing', capacityMultiplier: 4 },
  { id: 'heavyOil', name: '重油', symbol: 'HO', category: 'fluid', tone: 'oil', icon: 'drop', unlockStage: 5, unlock: 'advancedOilProcessing', capacityMultiplier: 4 },
  { id: 'lightOil', name: '轻油', symbol: 'LO', category: 'fluid', tone: 'oil', icon: 'drop', unlockStage: 5, unlock: 'advancedOilProcessing', capacityMultiplier: 4 },
  { id: 'lubricant', name: '润滑剂', symbol: 'Lub', category: 'fluid', tone: 'chemical', icon: 'drop', unlockStage: 5, unlock: 'advancedOilProcessing', capacityMultiplier: 4 },
  { id: 'sulfuricAcid', name: '硫酸', symbol: 'Acid', category: 'fluid', tone: 'chemical', icon: 'drop', unlockStage: 5, unlock: 'sulfurProcessing', capacityMultiplier: 4 },

  { id: 'ironPlate', name: '铁板', symbol: 'FeP', category: 'material', tone: 'iron', icon: 'plate', unlockStage: 1, unlock: null },
  { id: 'copperPlate', name: '铜板', symbol: 'CuP', category: 'material', tone: 'copper', icon: 'plate', unlockStage: 2, unlock: null },
  { id: 'brick', name: '石砖', symbol: 'Br', category: 'material', tone: 'stone', icon: 'brick', unlockStage: 2, unlock: null },
  { id: 'steel', name: '钢材', symbol: 'Stl', category: 'material', tone: 'iron', icon: 'metal', unlockStage: 3, unlock: 'steelProcessing' },
  { id: 'plastic', name: '塑料', symbol: 'Pl', category: 'material', tone: 'chemical', icon: 'molecule', unlockStage: 4, unlock: 'plastics' },
  { id: 'sulfur', name: '硫磺', symbol: 'S', category: 'material', tone: 'chemical', icon: 'powder', unlockStage: 4, unlock: 'sulfurProcessing' },
  { id: 'battery', name: '电池', symbol: 'Bat', category: 'material', tone: 'electronic', icon: 'battery', unlockStage: 5, unlock: 'batteryTech' },
  { id: 'solidFuel', name: '固体燃料', symbol: 'SF', category: 'material', tone: 'carbon', icon: 'fuel', unlockStage: 5, unlock: 'advancedOilProcessing' },
  { id: 'concrete', name: '混凝土', symbol: 'Con', category: 'material', tone: 'stone', icon: 'concrete', unlockStage: 5, unlock: 'advancedMaterialProcessing' },
  { id: 'refinedConcrete', name: '钢筋混凝土', symbol: 'RCon', category: 'material', tone: 'stone', icon: 'concrete', unlockStage: 6, unlock: 'advancedMaterialProcessing' },
  { id: 'uranium238', name: '铀-238', symbol: 'U238', category: 'material', tone: 'uranium', icon: 'nuclear', unlockStage: 6, unlock: 'uraniumProcessing' },
  { id: 'uranium235', name: '铀-235', symbol: 'U235', category: 'material', tone: 'uranium', icon: 'nuclear', unlockStage: 6, unlock: 'uraniumProcessing' },
  { id: 'uraniumFuelCell', name: '铀燃料棒', symbol: 'UFC', category: 'material', tone: 'uranium', icon: 'battery', unlockStage: 6, unlock: 'nuclearPower' },
  { id: 'usedUraniumFuelCell', name: '乏燃料棒', symbol: 'Spent', category: 'material', tone: 'uranium', icon: 'nuclear', unlockStage: 6, unlock: 'nuclearPower' },

  { id: 'gear', name: '铁齿轮', symbol: 'Gr', category: 'component', tone: 'iron', icon: 'gear', unlockStage: 2, unlock: null },
  { id: 'wire', name: '铜缆', symbol: 'Wr', category: 'component', tone: 'copper', icon: 'wire', unlockStage: 2, unlock: null },
  { id: 'circuit', name: '电子电路', symbol: 'PCB', category: 'component', tone: 'electronic', icon: 'circuit', unlockStage: 2, unlock: null },
  { id: 'advancedCircuit', name: '高级电路', symbol: 'AC', category: 'component', tone: 'electronic', icon: 'circuit', unlockStage: 4, unlock: 'advancedElectronics' },
  { id: 'processingUnit', name: '处理器', symbol: 'CPU', category: 'component', tone: 'electronic', icon: 'processor', unlockStage: 5, unlock: 'advancedElectronicsTwo' },
  { id: 'pipe', name: '工业管道', symbol: 'Pipe', category: 'component', tone: 'iron', icon: 'pipe', unlockStage: 3, unlock: 'fluidHandling' },
  { id: 'engine', name: '内燃机组', symbol: 'Eng', category: 'component', tone: 'iron', icon: 'engine', unlockStage: 4, unlock: 'engineTechnology' },
  { id: 'electricEngine', name: '电动机组', symbol: 'EEng', category: 'component', tone: 'electronic', icon: 'engine', unlockStage: 5, unlock: 'electricEngines' },
  { id: 'flyingRobotFrame', name: '飞行机器人框架', symbol: 'FRF', category: 'component', tone: 'electronic', icon: 'robot-frame', unlockStage: 7, unlock: 'robotics' },
  { id: 'electricFurnace', name: '电炉组件', symbol: 'EF', category: 'component', tone: 'iron', icon: 'furnace', unlockStage: 6, unlock: 'advancedMaterialProcessing' },
  { id: 'lowDensityStructure', name: '轻质结构', symbol: 'LDS', category: 'component', tone: 'project', icon: 'cube', unlockStage: 7, unlock: 'lowDensityStructure' },
  { id: 'rocketFuel', name: '火箭燃料', symbol: 'RF', category: 'component', tone: 'project', icon: 'rocket-thruster', unlockStage: 7, unlock: 'rocketFuelTechnology' },
  { id: 'rocketControlUnit', name: '火箭控制单元', symbol: 'RCU', category: 'component', tone: 'project', icon: 'radar', unlockStage: 7, unlock: 'rocketControl' },

  { id: 'transportBelt', name: '传送带', symbol: 'Belt', category: 'logistics', tone: 'logistics', icon: 'belt', unlockStage: 3, unlock: 'logistics' },
  { id: 'undergroundBelt', name: '地下传送带', symbol: 'UG', category: 'logistics', tone: 'logistics', icon: 'belt', unlockStage: 3, unlock: 'logistics' },
  { id: 'splitter', name: '分流器', symbol: 'Split', category: 'logistics', tone: 'logistics', icon: 'splitter', unlockStage: 3, unlock: 'logistics' },
  { id: 'fastTransportBelt', name: '高速传送带', symbol: 'FB', category: 'logistics', tone: 'logistics', icon: 'belt', unlockStage: 5, unlock: 'fastLogistics' },
  { id: 'fastUndergroundBelt', name: '高速地下带', symbol: 'FUG', category: 'logistics', tone: 'logistics', icon: 'belt', unlockStage: 5, unlock: 'fastLogistics' },
  { id: 'fastSplitter', name: '高速分流器', symbol: 'FS', category: 'logistics', tone: 'logistics', icon: 'splitter', unlockStage: 5, unlock: 'fastLogistics' },
  { id: 'expressTransportBelt', name: '极速传送带', symbol: 'EB', category: 'logistics', tone: 'logistics', icon: 'belt', unlockStage: 7, unlock: 'expressLogistics' },
  { id: 'expressUndergroundBelt', name: '极速地下带', symbol: 'EUG', category: 'logistics', tone: 'logistics', icon: 'belt', unlockStage: 7, unlock: 'expressLogistics' },
  { id: 'expressSplitter', name: '极速分流器', symbol: 'ES', category: 'logistics', tone: 'logistics', icon: 'splitter', unlockStage: 7, unlock: 'expressLogistics' },
  { id: 'inserter', name: '机械臂', symbol: 'Ins', category: 'logistics', tone: 'logistics', icon: 'inserter', unlockStage: 3, unlock: 'logistics' },
  { id: 'fastInserter', name: '高速机械臂', symbol: 'FIns', category: 'logistics', tone: 'logistics', icon: 'inserter', unlockStage: 5, unlock: 'fastLogistics' },
  { id: 'stackInserter', name: '集装机械臂', symbol: 'SIns', category: 'logistics', tone: 'logistics', icon: 'inserter', unlockStage: 7, unlock: 'expressLogistics' },
  { id: 'rail', name: '铁路', symbol: 'Rail', category: 'logistics', tone: 'logistics', icon: 'rail', unlockStage: 4, unlock: 'railTransport' },
  { id: 'locomotive', name: '机车', symbol: 'Loco', category: 'logistics', tone: 'logistics', icon: 'rail', unlockStage: 4, unlock: 'railTransport' },
  { id: 'cargoWagon', name: '货运车厢', symbol: 'Cargo', category: 'logistics', tone: 'logistics', icon: 'wagon', unlockStage: 4, unlock: 'railTransport' },
  { id: 'fluidWagon', name: '液罐车厢', symbol: 'Tank', category: 'logistics', tone: 'logistics', icon: 'wagon', unlockStage: 5, unlock: 'fluidHandling' },
  { id: 'logisticRobot', name: '物流机器人', symbol: 'LR', category: 'logistics', tone: 'electronic', icon: 'robot', unlockStage: 7, unlock: 'logisticRobotics' },
  { id: 'constructionRobot', name: '建设机器人', symbol: 'CR', category: 'logistics', tone: 'electronic', icon: 'robot', unlockStage: 7, unlock: 'constructionRobotics' },
  { id: 'solarPanel', name: '太阳能板', symbol: 'Solar', category: 'logistics', tone: 'electronic', icon: 'solar', unlockStage: 5, unlock: 'solarEnergy' },
  { id: 'accumulator', name: '蓄电池组', symbol: 'Acc', category: 'logistics', tone: 'electronic', icon: 'battery', unlockStage: 5, unlock: 'batteryTech' },
  { id: 'radar', name: '雷达阵列', symbol: 'Radar', category: 'logistics', tone: 'electronic', icon: 'radar', unlockStage: 5, unlock: 'advancedElectronics' },
  { id: 'speedModule1', name: '速度模块 I', symbol: 'S1', category: 'logistics', tone: 'electronic', icon: 'speed', unlockStage: 5, unlock: 'modules' },
  { id: 'speedModule2', name: '速度模块 II', symbol: 'S2', category: 'logistics', tone: 'electronic', icon: 'speed', unlockStage: 6, unlock: 'moduleTwo' },
  { id: 'speedModule3', name: '速度模块 III', symbol: 'S3', category: 'logistics', tone: 'electronic', icon: 'speed', unlockStage: 7, unlock: 'moduleThree' },
  { id: 'efficiencyModule1', name: '节能模块 I', symbol: 'E1', category: 'logistics', tone: 'electronic', icon: 'efficiency', unlockStage: 5, unlock: 'modules' },
  { id: 'efficiencyModule2', name: '节能模块 II', symbol: 'E2', category: 'logistics', tone: 'electronic', icon: 'efficiency', unlockStage: 6, unlock: 'moduleTwo' },
  { id: 'efficiencyModule3', name: '节能模块 III', symbol: 'E3', category: 'logistics', tone: 'electronic', icon: 'efficiency', unlockStage: 7, unlock: 'moduleThree' },
  { id: 'productivityModule1', name: '产能模块 I', symbol: 'P1', category: 'logistics', tone: 'electronic', icon: 'productivity', unlockStage: 5, unlock: 'modules' },
  { id: 'productivityModule2', name: '产能模块 II', symbol: 'P2', category: 'logistics', tone: 'electronic', icon: 'productivity', unlockStage: 6, unlock: 'moduleTwo' },
  { id: 'productivityModule3', name: '产能模块 III', symbol: 'P3', category: 'logistics', tone: 'electronic', icon: 'productivity', unlockStage: 7, unlock: 'moduleThree' },

  { id: 'automationScience', name: '自动化科学包', symbol: 'AS', category: 'science', tone: 'science', icon: 'science', unlockStage: 2, unlock: null, capacityMultiplier: 10 },
  { id: 'logisticScience', name: '物流科学包', symbol: 'LS', category: 'science', tone: 'logistics', icon: 'science', unlockStage: 3, unlock: 'logistics', capacityMultiplier: 10 },
  { id: 'chemicalScience', name: '化工科学包', symbol: 'CS', category: 'science', tone: 'chemical', icon: 'science', unlockStage: 4, unlock: 'chemicalScience', capacityMultiplier: 10 },
  { id: 'productionScience', name: '生产科学包', symbol: 'PS', category: 'science', tone: 'project', icon: 'science', unlockStage: 6, unlock: 'productionScience', capacityMultiplier: 10 },
  { id: 'utilityScience', name: '效用科学包', symbol: 'US', category: 'science', tone: 'electronic', icon: 'science', unlockStage: 7, unlock: 'utilityScience', capacityMultiplier: 10 },

  { id: 'rocketPart', name: '火箭部件', symbol: 'RP', category: 'project', tone: 'project', icon: 'rocket', unlockStage: 8, unlock: 'rocketSilo', capacityMultiplier: 2 },
  { id: 'satellite', name: '轨道卫星', symbol: 'Sat', category: 'project', tone: 'project', icon: 'satellite', unlockStage: 8, unlock: 'rocketSilo', capacityMultiplier: 2 },
] as const satisfies readonly ResourceDefinition[];

export interface TechnologyDefinition {
  id: TechnologyId;
  name: string;
  description: string;
  icon: FoundryIconId;
  cost: Readonly<Partial<ResourceAmounts>>;
  prerequisites: readonly TechnologyId[];
  unlockStage: number;
}

export const TECHNOLOGY_DEFINITIONS = [
  { id: 'automation', name: '自动化', description: '建立基础装配标准，为成规模制造奠定基础。', icon: 'factory', cost: { automationScience: 30 }, prerequisites: [], unlockStage: 2 },
  { id: 'logistics', name: '基础物流', description: '解锁传送带、分流器、机械臂与物流科学包。', icon: 'belt', cost: { automationScience: 40 }, prerequisites: ['automation'], unlockStage: 2 },
  { id: 'steamPower', name: '蒸汽动力', description: '解锁燃煤蒸汽机组，突破坠毁舱供电上限。', icon: 'power', cost: { automationScience: 35 }, prerequisites: ['automation'], unlockStage: 2 },
  { id: 'steelProcessing', name: '钢材加工', description: '解锁钢材冶炼和高强度工业结构。', icon: 'metal', cost: { automationScience: 50 }, prerequisites: ['automation'], unlockStage: 2 },
  { id: 'electronics', name: '工业电子学', description: '提高基础电路加工能力，打开高级电子路线。', icon: 'circuit', cost: { automationScience: 45 }, prerequisites: ['automation'], unlockStage: 2 },
  { id: 'automationTwo', name: '柔性装配', description: '解锁复杂流体与多材料配方所需的装配技术。', icon: 'factory', cost: { automationScience: 90, logisticScience: 70 }, prerequisites: ['logistics', 'electronics'], unlockStage: 3 },
  { id: 'fluidHandling', name: '流体处理', description: '解锁抽水、管道、储罐与液体运输。', icon: 'pipe', cost: { automationScience: 70, logisticScience: 50 }, prerequisites: ['logistics', 'steamPower'], unlockStage: 3 },
  { id: 'railTransport', name: '铁路运输', description: '解锁铁路、机车与大宗物料运输枢纽。', icon: 'rail', cost: { automationScience: 90, logisticScience: 90 }, prerequisites: ['logistics', 'steelProcessing'], unlockStage: 3 },
  { id: 'engineTechnology', name: '发动机技术', description: '解锁内燃机组，为化工和铁路设备供能。', icon: 'engine', cost: { automationScience: 80, logisticScience: 70 }, prerequisites: ['automationTwo', 'steelProcessing'], unlockStage: 3 },
  { id: 'oilProcessing', name: '基础炼油', description: '解锁油田、基础炼油与石油气生产。', icon: 'refinery', cost: { automationScience: 120, logisticScience: 110 }, prerequisites: ['fluidHandling', 'engineTechnology'], unlockStage: 3 },
  { id: 'plastics', name: '高分子材料', description: '将石油气与煤炭加工为电子工业塑料。', icon: 'molecule', cost: { automationScience: 130, logisticScience: 110 }, prerequisites: ['oilProcessing'], unlockStage: 4 },
  { id: 'sulfurProcessing', name: '硫化工', description: '解锁硫磺与硫酸，为电池和铀矿准备原料。', icon: 'chemical-plant', cost: { automationScience: 130, logisticScience: 120 }, prerequisites: ['oilProcessing'], unlockStage: 4 },
  { id: 'advancedElectronics', name: '高级电子学', description: '解锁使用塑料和铜缆的高级电路。', icon: 'circuit', cost: { automationScience: 150, logisticScience: 140 }, prerequisites: ['electronics', 'plastics'], unlockStage: 4 },
  { id: 'chemicalScience', name: '化工科学', description: '建立高级电路、发动机和硫磺组成的化工科研链。', icon: 'science', cost: { automationScience: 180, logisticScience: 180 }, prerequisites: ['advancedElectronics', 'engineTechnology', 'sulfurProcessing'], unlockStage: 4 },
  { id: 'advancedOilProcessing', name: '高级炼油', description: '分离重油、轻油和石油气，并开放裂解与固体燃料。', icon: 'refinery', cost: { automationScience: 180, logisticScience: 180, chemicalScience: 100 }, prerequisites: ['chemicalScience'], unlockStage: 5 },
  { id: 'batteryTech', name: '储能技术', description: '解锁电池、蓄电池组与飞行机器人供能部件。', icon: 'battery', cost: { automationScience: 170, logisticScience: 170, chemicalScience: 110 }, prerequisites: ['sulfurProcessing', 'chemicalScience'], unlockStage: 5 },
  { id: 'advancedMaterialProcessing', name: '高级材料加工', description: '解锁电炉、混凝土和高温电冶金。', icon: 'furnace', cost: { automationScience: 200, logisticScience: 180, chemicalScience: 140 }, prerequisites: ['steelProcessing', 'chemicalScience'], unlockStage: 5 },
  { id: 'solarEnergy', name: '太阳能', description: '解锁太阳能板和稳态光伏电场。', icon: 'solar', cost: { automationScience: 130, logisticScience: 130 }, prerequisites: ['electronics', 'steelProcessing'], unlockStage: 5 },
  { id: 'electricEngines', name: '电动机组', description: '使用润滑剂和电路制造高效电动机组。', icon: 'engine', cost: { automationScience: 220, logisticScience: 200, chemicalScience: 140 }, prerequisites: ['engineTechnology', 'batteryTech', 'advancedOilProcessing'], unlockStage: 5 },
  { id: 'modules', name: '模块化生产', description: '解锁速度、节能和产能模块 I。', icon: 'module', cost: { automationScience: 150, logisticScience: 150, chemicalScience: 100 }, prerequisites: ['advancedElectronics'], unlockStage: 5 },
  { id: 'advancedElectronicsTwo', name: '处理器技术', description: '解锁硫酸蚀刻的高性能处理器。', icon: 'processor', cost: { automationScience: 240, logisticScience: 220, chemicalScience: 180 }, prerequisites: ['advancedElectronics', 'chemicalScience'], unlockStage: 5 },
  { id: 'fastLogistics', name: '高速物流', description: '解锁高速传送带和高速机械臂。', icon: 'belt', cost: { automationScience: 220, logisticScience: 220, chemicalScience: 120 }, prerequisites: ['automationTwo', 'logistics'], unlockStage: 5 },
  { id: 'productionScience', name: '生产科学', description: '用铁路、电炉和产能模块验证大规模工业能力。', icon: 'science', cost: { automationScience: 280, logisticScience: 260, chemicalScience: 220 }, prerequisites: ['advancedMaterialProcessing', 'modules', 'railTransport'], unlockStage: 5 },
  { id: 'moduleTwo', name: '高级模块', description: '解锁速度、节能和产能模块 II。', icon: 'module', cost: { automationScience: 280, logisticScience: 280, chemicalScience: 240, productionScience: 120 }, prerequisites: ['modules', 'advancedElectronicsTwo', 'productionScience'], unlockStage: 6 },
  { id: 'uraniumProcessing', name: '铀处理', description: '解锁酸浸铀矿和同位素离心分离。', icon: 'uranium', cost: { automationScience: 280, logisticScience: 280, chemicalScience: 240 }, prerequisites: ['sulfurProcessing', 'advancedMaterialProcessing'], unlockStage: 6 },
  { id: 'nuclearPower', name: '核能', description: '解锁燃料棒、乏燃料回收和高密度核电。', icon: 'nuclear-plant', cost: { automationScience: 380, logisticScience: 380, chemicalScience: 340, productionScience: 180 }, prerequisites: ['uraniumProcessing', 'productionScience'], unlockStage: 6 },
  { id: 'kovarexEnrichment', name: '同位素增殖', description: '建立闭环浓缩流程，提高铀-235供给稳定性。', icon: 'nuclear', cost: { automationScience: 520, logisticScience: 520, chemicalScience: 480, productionScience: 300 }, prerequisites: ['nuclearPower'], unlockStage: 6 },
  { id: 'robotics', name: '机器人学', description: '解锁飞行机器人框架。', icon: 'robot-frame', cost: { automationScience: 300, logisticScience: 300, chemicalScience: 260, productionScience: 150 }, prerequisites: ['electricEngines', 'advancedElectronicsTwo', 'productionScience'], unlockStage: 6 },
  { id: 'constructionRobotics', name: '建设机器人', description: '让协作组自动完成大规模建设和维护。', icon: 'robot', cost: { automationScience: 340, logisticScience: 340, chemicalScience: 300, productionScience: 200 }, prerequisites: ['robotics'], unlockStage: 7 },
  { id: 'logisticRobotics', name: '物流机器人', description: '建立高吞吐空中物流网络。', icon: 'roboport', cost: { automationScience: 420, logisticScience: 420, chemicalScience: 360, productionScience: 240 }, prerequisites: ['constructionRobotics', 'fastLogistics'], unlockStage: 7 },
  { id: 'utilityScience', name: '效用科学', description: '整合处理器、飞行框架和轻质结构的终局科研链。', icon: 'science', cost: { automationScience: 420, logisticScience: 420, chemicalScience: 380, productionScience: 280 }, prerequisites: ['robotics', 'productionScience', 'advancedElectronicsTwo'], unlockStage: 6 },
  { id: 'expressLogistics', name: '极速物流', description: '解锁极速传送带与集装机械臂。', icon: 'belt', cost: { automationScience: 360, logisticScience: 360, chemicalScience: 320, productionScience: 220, utilityScience: 160 }, prerequisites: ['fastLogistics', 'utilityScience'], unlockStage: 7 },
  { id: 'moduleThree', name: '尖端模块', description: '解锁速度、节能和产能模块 III。', icon: 'module', cost: { automationScience: 480, logisticScience: 480, chemicalScience: 440, productionScience: 320, utilityScience: 240 }, prerequisites: ['moduleTwo', 'utilityScience'], unlockStage: 7 },
  { id: 'lowDensityStructure', name: '轻质结构', description: '解锁火箭壳体需要的低密度高强度结构。', icon: 'cube', cost: { automationScience: 360, logisticScience: 360, chemicalScience: 320, productionScience: 200 }, prerequisites: ['advancedMaterialProcessing', 'productionScience'], unlockStage: 7 },
  { id: 'rocketFuelTechnology', name: '火箭燃料', description: '将固体燃料和轻油升级为高能火箭燃料。', icon: 'rocket-thruster', cost: { automationScience: 360, logisticScience: 360, chemicalScience: 320, productionScience: 200 }, prerequisites: ['advancedOilProcessing', 'productionScience'], unlockStage: 7 },
  { id: 'rocketControl', name: '火箭控制', description: '用处理器和速度模块制造高可靠控制单元。', icon: 'radar', cost: { automationScience: 460, logisticScience: 460, chemicalScience: 420, productionScience: 300, utilityScience: 180 }, prerequisites: ['advancedElectronicsTwo', 'moduleTwo', 'utilityScience'], unlockStage: 7 },
  { id: 'rocketSilo', name: '火箭发射井', description: '解锁火箭部件装配、卫星制造和最终发射。', icon: 'rocket', cost: { automationScience: 800, logisticScience: 800, chemicalScience: 800, productionScience: 600, utilityScience: 600 }, prerequisites: ['lowDensityStructure', 'rocketFuelTechnology', 'rocketControl', 'utilityScience'], unlockStage: 7 },
] as const satisfies readonly TechnologyDefinition[];

export type LineCategory = 'extraction' | 'smelting' | 'processing' | 'assembly' | 'logistics' | 'science' | 'power' | 'infrastructure' | 'project';
export type ProductionPriority = 0 | 1 | 2;

export interface ProductionLineDefinition {
  id: string;
  name: string;
  description: string;
  category: LineCategory;
  icon: FoundryIconId;
  inputs: Partial<ResourceAmounts>;
  outputs: Partial<ResourceAmounts>;
  buildCost: Partial<ResourceAmounts>;
  powerDemand: number;
  powerSupply?: number;
  fuel?: { resourceId: ResourceId; perSecond: number; byproductId?: ResourceId };
  storageBonus?: number;
  throughputBonus?: number;
  productivityBonus?: number;
  powerEfficiencyBonus?: number;
  passive?: boolean;
  unlockStage: number;
  unlock: TechnologyId | null;
  maxCount: number;
}

export const PRODUCTION_LINES = [
  { id: 'ironDrill', name: '铁矿采掘机', description: '持续开采浅层铁矿。', category: 'extraction', icon: 'drill', inputs: {}, outputs: { ironOre: 1.5 }, buildCost: { ironOre: 20, stone: 15 }, powerDemand: 2, unlockStage: 1, unlock: null, maxCount: 120 },
  { id: 'coalDrill', name: '煤层采掘机', description: '为熔炼与蒸汽电网提供煤炭。', category: 'extraction', icon: 'drill', inputs: {}, outputs: { coal: 1.35 }, buildCost: { ironOre: 18, stone: 12 }, powerDemand: 2, unlockStage: 1, unlock: null, maxCount: 120 },
  { id: 'stoneDrill', name: '采石机', description: '开采建筑和耐火材料。', category: 'extraction', icon: 'drill', inputs: {}, outputs: { stone: 1.4 }, buildCost: { ironOre: 16, stone: 12 }, powerDemand: 2, unlockStage: 1, unlock: null, maxCount: 120 },
  { id: 'copperDrill', name: '铜矿采掘机', description: '持续开采电子工业所需铜矿。', category: 'extraction', icon: 'drill', inputs: {}, outputs: { copperOre: 1.4 }, buildCost: { ironPlate: 24, gear: 8, circuit: 4 }, powerDemand: 2.5, unlockStage: 2, unlock: null, maxCount: 120 },
  { id: 'waterPump', name: '离岸泵站', description: '为蒸汽和化工系统抽取工业用水。', category: 'extraction', icon: 'pump', inputs: {}, outputs: { water: 8 }, buildCost: { ironPlate: 28, gear: 10, pipe: 12 }, powerDemand: 1, unlockStage: 3, unlock: 'fluidHandling', maxCount: 40 },
  { id: 'oilPumpjack', name: '油田抽油机', description: '从深层油藏持续抽取原油。', category: 'extraction', icon: 'pump', inputs: {}, outputs: { crudeOil: 4.2 }, buildCost: { steel: 30, gear: 24, circuit: 18, pipe: 20 }, powerDemand: 8, unlockStage: 4, unlock: 'oilProcessing', maxCount: 80 },
  { id: 'uraniumDrill', name: '酸浸铀矿机', description: '消耗硫酸从铀矿带提取矿石。', category: 'extraction', icon: 'drill', inputs: { sulfuricAcid: 0.35 }, outputs: { uraniumOre: 0.7 }, buildCost: { steel: 45, advancedCircuit: 18, pipe: 24 }, powerDemand: 14, unlockStage: 6, unlock: 'uraniumProcessing', maxCount: 40 },

  { id: 'ironFurnace', name: '铁板熔炉', description: '使用煤炭将铁矿冶炼为铁板。', category: 'smelting', icon: 'furnace', inputs: { ironOre: 1, coal: 0.12 }, outputs: { ironPlate: 0.8 }, buildCost: { stone: 25, ironOre: 10 }, powerDemand: 2.5, unlockStage: 1, unlock: null, maxCount: 120 },
  { id: 'copperFurnace', name: '铜板熔炉', description: '使用煤炭将铜矿冶炼为铜板。', category: 'smelting', icon: 'furnace', inputs: { copperOre: 1, coal: 0.12 }, outputs: { copperPlate: 0.8 }, buildCost: { stone: 25, ironPlate: 12 }, powerDemand: 2.5, unlockStage: 2, unlock: null, maxCount: 120 },
  { id: 'brickKiln', name: '石砖窑', description: '烧制工业建筑需要的石砖。', category: 'smelting', icon: 'furnace', inputs: { stone: 1.4, coal: 0.1 }, outputs: { brick: 0.7 }, buildCost: { stone: 30, ironPlate: 8 }, powerDemand: 2, unlockStage: 2, unlock: null, maxCount: 80 },
  { id: 'steelFurnace', name: '钢材熔炉', description: '将大量铁板转化为高强度钢材。', category: 'smelting', icon: 'furnace', inputs: { ironPlate: 2.5, coal: 0.18 }, outputs: { steel: 0.5 }, buildCost: { ironPlate: 70, brick: 45, gear: 15 }, powerDemand: 5, unlockStage: 3, unlock: 'steelProcessing', maxCount: 100 },
  { id: 'electricIronFurnace', name: '电热铁板炉', description: '高速无燃料冶炼铁板。', category: 'smelting', icon: 'furnace', inputs: { ironOre: 1.8 }, outputs: { ironPlate: 1.55 }, buildCost: { electricFurnace: 1, advancedCircuit: 8 }, powerDemand: 11, unlockStage: 6, unlock: 'advancedMaterialProcessing', maxCount: 100 },
  { id: 'electricCopperFurnace', name: '电热铜板炉', description: '高速无燃料冶炼铜板。', category: 'smelting', icon: 'furnace', inputs: { copperOre: 1.8 }, outputs: { copperPlate: 1.55 }, buildCost: { electricFurnace: 1, advancedCircuit: 8 }, powerDemand: 11, unlockStage: 6, unlock: 'advancedMaterialProcessing', maxCount: 100 },
  { id: 'electricSteelFurnace', name: '电热钢材炉', description: '高速将铁板转化为钢材。', category: 'smelting', icon: 'furnace', inputs: { ironPlate: 4 }, outputs: { steel: 0.9 }, buildCost: { electricFurnace: 1, processingUnit: 3 }, powerDemand: 14, unlockStage: 6, unlock: 'advancedMaterialProcessing', maxCount: 80 },

  { id: 'basicOilRefinery', name: '基础炼油厂', description: '将原油初步加工为石油气。', category: 'processing', icon: 'refinery', inputs: { crudeOil: 4 }, outputs: { petroleumGas: 3 }, buildCost: { steel: 55, brick: 40, circuit: 25, pipe: 30 }, powerDemand: 18, unlockStage: 4, unlock: 'oilProcessing', maxCount: 50 },
  { id: 'advancedOilRefinery', name: '高级炼油厂', description: '分离重油、轻油和石油气。', category: 'processing', icon: 'refinery', inputs: { crudeOil: 4.5, water: 2.4 }, outputs: { heavyOil: 1.1, lightOil: 2, petroleumGas: 2.5 }, buildCost: { steel: 85, concrete: 60, advancedCircuit: 30, pipe: 45 }, powerDemand: 24, unlockStage: 5, unlock: 'advancedOilProcessing', maxCount: 60 },
  { id: 'heavyOilCracking', name: '重油裂解厂', description: '把重油裂解为轻油。', category: 'processing', icon: 'chemical-plant', inputs: { heavyOil: 1.2, water: 0.7 }, outputs: { lightOil: 0.95 }, buildCost: { steel: 35, advancedCircuit: 15, pipe: 24 }, powerDemand: 10, unlockStage: 5, unlock: 'advancedOilProcessing', maxCount: 60 },
  { id: 'lightOilCracking', name: '轻油裂解厂', description: '把轻油裂解为石油气。', category: 'processing', icon: 'chemical-plant', inputs: { lightOil: 1.2, water: 0.7 }, outputs: { petroleumGas: 0.95 }, buildCost: { steel: 35, advancedCircuit: 15, pipe: 24 }, powerDemand: 10, unlockStage: 5, unlock: 'advancedOilProcessing', maxCount: 60 },
  { id: 'lubricantPlant', name: '润滑剂厂', description: '精制重油，为电动机和极速物流供料。', category: 'processing', icon: 'chemical-plant', inputs: { heavyOil: 1 }, outputs: { lubricant: 0.8 }, buildCost: { steel: 32, circuit: 20, pipe: 20 }, powerDemand: 8, unlockStage: 5, unlock: 'advancedOilProcessing', maxCount: 40 },
  { id: 'sulfurPlant', name: '硫磺厂', description: '用石油气和水生产硫磺。', category: 'processing', icon: 'chemical-plant', inputs: { petroleumGas: 1.5, water: 1.5 }, outputs: { sulfur: 0.6 }, buildCost: { steel: 30, circuit: 18, pipe: 20 }, powerDemand: 9, unlockStage: 4, unlock: 'sulfurProcessing', maxCount: 60 },
  { id: 'sulfuricAcidPlant', name: '硫酸厂', description: '生产电池和铀矿开采所需硫酸。', category: 'processing', icon: 'chemical-plant', inputs: { sulfur: 0.5, ironPlate: 0.12, water: 2 }, outputs: { sulfuricAcid: 1.6 }, buildCost: { steel: 38, brick: 25, circuit: 20, pipe: 22 }, powerDemand: 10, unlockStage: 5, unlock: 'sulfurProcessing', maxCount: 50 },
  { id: 'plasticPlant', name: '塑料厂', description: '将石油气和煤炭聚合为塑料。', category: 'processing', icon: 'chemical-plant', inputs: { petroleumGas: 1.5, coal: 0.75 }, outputs: { plastic: 1.2 }, buildCost: { steel: 34, circuit: 18, pipe: 18 }, powerDemand: 9, unlockStage: 4, unlock: 'plastics', maxCount: 80 },
  { id: 'batteryPlant', name: '电池厂', description: '用硫酸与金属板制造电池。', category: 'processing', icon: 'chemical-plant', inputs: { sulfuricAcid: 0.5, ironPlate: 0.4, copperPlate: 0.4 }, outputs: { battery: 0.3 }, buildCost: { steel: 42, advancedCircuit: 16, pipe: 16 }, powerDemand: 11, unlockStage: 5, unlock: 'batteryTech', maxCount: 60 },
  { id: 'solidFuelGasPlant', name: '石油气固化厂', description: '将过剩石油气压制为固体燃料。', category: 'processing', icon: 'chemical-plant', inputs: { petroleumGas: 2 }, outputs: { solidFuel: 0.5 }, buildCost: { steel: 32, circuit: 16, pipe: 18 }, powerDemand: 8, unlockStage: 5, unlock: 'advancedOilProcessing', maxCount: 40 },
  { id: 'solidFuelLightPlant', name: '轻油固化厂', description: '高效将轻油压制为固体燃料。', category: 'processing', icon: 'chemical-plant', inputs: { lightOil: 1.5 }, outputs: { solidFuel: 0.75 }, buildCost: { steel: 40, advancedCircuit: 16, pipe: 18 }, powerDemand: 9, unlockStage: 5, unlock: 'advancedOilProcessing', maxCount: 60 },
  { id: 'concreteMixer', name: '混凝土搅拌站', description: '混合岩石、石砖和水生产混凝土。', category: 'processing', icon: 'concrete', inputs: { stone: 1, brick: 0.5, water: 1 }, outputs: { concrete: 1 }, buildCost: { steel: 38, brick: 40, gear: 16, pipe: 12 }, powerDemand: 8, unlockStage: 5, unlock: 'advancedMaterialProcessing', maxCount: 60 },
  { id: 'refinedConcreteMixer', name: '钢筋混凝土站', description: '使用钢材强化混凝土。', category: 'processing', icon: 'concrete', inputs: { concrete: 1, steel: 0.12, water: 0.5 }, outputs: { refinedConcrete: 0.8 }, buildCost: { steel: 55, concrete: 50, advancedCircuit: 12 }, powerDemand: 10, unlockStage: 6, unlock: 'advancedMaterialProcessing', maxCount: 50 },
  { id: 'uraniumCentrifuge', name: '铀处理离心机', description: '将铀矿分离为两种铀同位素。', category: 'processing', icon: 'nuclear', inputs: { uraniumOre: 1 }, outputs: { uranium238: 0.97, uranium235: 0.03 }, buildCost: { concrete: 90, steel: 70, advancedCircuit: 35 }, powerDemand: 24, unlockStage: 6, unlock: 'uraniumProcessing', maxCount: 40 },
  { id: 'kovarexCentrifuge', name: '同位素增殖离心机', description: '消耗铀-238并缓慢增殖铀-235。', category: 'processing', icon: 'nuclear', inputs: { uranium235: 4, uranium238: 0.6 }, outputs: { uranium235: 4.2, uranium238: 0.4 }, buildCost: { refinedConcrete: 80, steel: 80, processingUnit: 25 }, powerDemand: 32, unlockStage: 6, unlock: 'kovarexEnrichment', maxCount: 20 },
  { id: 'uraniumFuelCellPlant', name: '核燃料棒厂', description: '封装铀同位素，制造反应堆燃料。', category: 'processing', icon: 'nuclear', inputs: { uranium235: 0.02, uranium238: 0.38, ironPlate: 0.6 }, outputs: { uraniumFuelCell: 0.4 }, buildCost: { steel: 55, advancedCircuit: 24, concrete: 35 }, powerDemand: 14, unlockStage: 6, unlock: 'nuclearPower', maxCount: 30 },
  { id: 'nuclearReprocessing', name: '乏燃料回收线', description: '从乏燃料棒中回收铀-238。', category: 'processing', icon: 'nuclear', inputs: { usedUraniumFuelCell: 1 }, outputs: { uranium238: 0.6 }, buildCost: { refinedConcrete: 45, steel: 50, processingUnit: 16 }, powerDemand: 18, unlockStage: 6, unlock: 'nuclearPower', maxCount: 20 },

  { id: 'gearAssembler', name: '齿轮冲压线', description: '冲压铁板制造铁齿轮。', category: 'assembly', icon: 'gear', inputs: { ironPlate: 1 }, outputs: { gear: 0.5 }, buildCost: { ironPlate: 28, brick: 12 }, powerDemand: 3, unlockStage: 2, unlock: null, maxCount: 120 },
  { id: 'wireAssembler', name: '铜缆拉制线', description: '把铜板拉制为铜缆。', category: 'assembly', icon: 'wire', inputs: { copperPlate: 0.5 }, outputs: { wire: 1 }, buildCost: { ironPlate: 24, gear: 8 }, powerDemand: 3, unlockStage: 2, unlock: null, maxCount: 120 },
  { id: 'circuitAssembler', name: '电子电路装配线', description: '装配基础自动化电路。', category: 'assembly', icon: 'circuit', inputs: { ironPlate: 0.25, wire: 0.75 }, outputs: { circuit: 0.5 }, buildCost: { ironPlate: 36, gear: 10, wire: 16 }, powerDemand: 4, unlockStage: 2, unlock: null, maxCount: 120 },
  { id: 'advancedCircuitAssembler', name: '高级电路装配线', description: '使用塑料、铜缆和基础电路制造高级电路。', category: 'assembly', icon: 'circuit', inputs: { plastic: 0.4, wire: 0.8, circuit: 0.4 }, outputs: { advancedCircuit: 0.2 }, buildCost: { steel: 35, circuit: 30, plastic: 20 }, powerDemand: 10, unlockStage: 4, unlock: 'advancedElectronics', maxCount: 100 },
  { id: 'processingUnitAssembler', name: '处理器装配线', description: '以硫酸蚀刻方式制造高性能处理器。', category: 'assembly', icon: 'processor', inputs: { advancedCircuit: 0.4, circuit: 2, sulfuricAcid: 0.5 }, outputs: { processingUnit: 0.12 }, buildCost: { steel: 60, advancedCircuit: 30, concrete: 30 }, powerDemand: 16, unlockStage: 5, unlock: 'advancedElectronicsTwo', maxCount: 100 },
  { id: 'pipeAssembler', name: '管道加工线', description: '加工流体系统所需工业管道。', category: 'assembly', icon: 'pipe', inputs: { ironPlate: 0.5 }, outputs: { pipe: 0.5 }, buildCost: { ironPlate: 32, gear: 12 }, powerDemand: 4, unlockStage: 3, unlock: 'fluidHandling', maxCount: 80 },
  { id: 'engineAssembler', name: '内燃机组装配线', description: '组合钢材、齿轮和管道制造内燃机组。', category: 'assembly', icon: 'engine', inputs: { steel: 0.4, gear: 0.4, pipe: 0.8 }, outputs: { engine: 0.2 }, buildCost: { steel: 40, gear: 35, circuit: 16 }, powerDemand: 9, unlockStage: 4, unlock: 'engineTechnology', maxCount: 100 },
  { id: 'electricEngineAssembler', name: '电动机组装配线', description: '用润滑剂与电路升级内燃机组。', category: 'assembly', icon: 'engine', inputs: { engine: 0.3, circuit: 0.4, lubricant: 0.4 }, outputs: { electricEngine: 0.2 }, buildCost: { steel: 55, advancedCircuit: 22, battery: 12 }, powerDemand: 13, unlockStage: 5, unlock: 'electricEngines', maxCount: 80 },
  { id: 'electricFurnaceWorks', name: '电炉组件厂', description: '制造电炉和生产科学所需炉体。', category: 'assembly', icon: 'furnace', inputs: { steel: 1, advancedCircuit: 0.5, brick: 1 }, outputs: { electricFurnace: 0.12 }, buildCost: { steel: 60, concrete: 45, advancedCircuit: 20 }, powerDemand: 13, unlockStage: 6, unlock: 'advancedMaterialProcessing', maxCount: 60 },
  { id: 'flyingRobotFrameAssembler', name: '飞行框架装配线', description: '组合电动机、电池和电子元件制造飞行框架。', category: 'assembly', icon: 'robot-frame', inputs: { electricEngine: 0.3, battery: 0.6, steel: 0.3, circuit: 0.6 }, outputs: { flyingRobotFrame: 0.18 }, buildCost: { steel: 70, processingUnit: 16, battery: 25 }, powerDemand: 18, unlockStage: 7, unlock: 'robotics', maxCount: 80 },
  { id: 'solarPanelAssembler', name: '太阳能板装配线', description: '制造光伏电场和卫星所需太阳能板。', category: 'assembly', icon: 'solar', inputs: { steel: 0.6, copperPlate: 1.2, circuit: 0.6 }, outputs: { solarPanel: 0.18 }, buildCost: { steel: 45, circuit: 30, copperPlate: 45 }, powerDemand: 9, unlockStage: 5, unlock: 'solarEnergy', maxCount: 70 },
  { id: 'accumulatorAssembler', name: '蓄电池组装配线', description: '制造电网和卫星所需蓄电池组。', category: 'assembly', icon: 'battery', inputs: { ironPlate: 0.7, battery: 1.4 }, outputs: { accumulator: 0.18 }, buildCost: { steel: 40, circuit: 30, battery: 30 }, powerDemand: 9, unlockStage: 5, unlock: 'batteryTech', maxCount: 70 },
  { id: 'radarAssembler', name: '雷达阵列装配线', description: '制造卫星导航和区域扫描组件。', category: 'assembly', icon: 'radar', inputs: { ironPlate: 1.4, gear: 0.8, circuit: 0.8 }, outputs: { radar: 0.12 }, buildCost: { steel: 38, circuit: 26, gear: 24 }, powerDemand: 8, unlockStage: 5, unlock: 'advancedElectronics', maxCount: 40 },

  { id: 'beltAssembler', name: '传送带装配线', description: '制造基础地面物流设备。', category: 'logistics', icon: 'belt', inputs: { gear: 0.25, ironPlate: 0.5 }, outputs: { transportBelt: 1 }, buildCost: { ironPlate: 34, gear: 16, circuit: 5 }, powerDemand: 5, unlockStage: 3, unlock: 'logistics', maxCount: 100 },
  { id: 'undergroundBeltAssembler', name: '地下传送带装配线', description: '制造跨越设备区的地下物流通道。', category: 'logistics', icon: 'belt', inputs: { transportBelt: 1, ironPlate: 2 }, outputs: { undergroundBelt: 0.3 }, buildCost: { ironPlate: 42, gear: 20, circuit: 8 }, powerDemand: 6, unlockStage: 3, unlock: 'logistics', maxCount: 70 },
  { id: 'splitterAssembler', name: '分流器装配线', description: '制造均衡物流分支。', category: 'logistics', icon: 'splitter', inputs: { transportBelt: 0.5, circuit: 0.2, ironPlate: 0.5 }, outputs: { splitter: 0.25 }, buildCost: { ironPlate: 46, gear: 18, circuit: 12 }, powerDemand: 6, unlockStage: 3, unlock: 'logistics', maxCount: 70 },
  { id: 'inserterAssembler', name: '机械臂装配线', description: '制造自动装卸机械臂。', category: 'logistics', icon: 'inserter', inputs: { gear: 0.3, ironPlate: 0.3, circuit: 0.2 }, outputs: { inserter: 0.35 }, buildCost: { ironPlate: 40, gear: 20, circuit: 10 }, powerDemand: 6, unlockStage: 3, unlock: 'logistics', maxCount: 80 },
  { id: 'fastBeltAssembler', name: '高速传送带装配线', description: '升级基础传送带吞吐。', category: 'logistics', icon: 'belt', inputs: { transportBelt: 0.8, gear: 1.2 }, outputs: { fastTransportBelt: 0.4 }, buildCost: { steel: 35, gear: 35, advancedCircuit: 10 }, powerDemand: 9, unlockStage: 5, unlock: 'fastLogistics', maxCount: 80 },
  { id: 'fastUndergroundAssembler', name: '高速地下带装配线', description: '升级地下物流通道。', category: 'logistics', icon: 'belt', inputs: { undergroundBelt: 0.3, gear: 1.5 }, outputs: { fastUndergroundBelt: 0.2 }, buildCost: { steel: 42, gear: 40, advancedCircuit: 12 }, powerDemand: 10, unlockStage: 5, unlock: 'fastLogistics', maxCount: 60 },
  { id: 'fastSplitterAssembler', name: '高速分流器装配线', description: '升级物流均衡节点。', category: 'logistics', icon: 'splitter', inputs: { splitter: 0.25, gear: 1.2, circuit: 0.5 }, outputs: { fastSplitter: 0.18 }, buildCost: { steel: 45, gear: 36, advancedCircuit: 14 }, powerDemand: 10, unlockStage: 5, unlock: 'fastLogistics', maxCount: 60 },
  { id: 'fastInserterAssembler', name: '高速机械臂装配线', description: '制造高频装卸机械臂。', category: 'logistics', icon: 'inserter', inputs: { inserter: 0.3, circuit: 0.6, ironPlate: 0.2 }, outputs: { fastInserter: 0.25 }, buildCost: { steel: 40, circuit: 40, advancedCircuit: 12 }, powerDemand: 9, unlockStage: 5, unlock: 'fastLogistics', maxCount: 70 },
  { id: 'expressBeltAssembler', name: '极速传送带装配线', description: '使用润滑剂制造终局地面物流。', category: 'logistics', icon: 'belt', inputs: { fastTransportBelt: 0.5, gear: 1.8, lubricant: 0.8 }, outputs: { expressTransportBelt: 0.25 }, buildCost: { steel: 60, processingUnit: 8, speedModule2: 4 }, powerDemand: 14, unlockStage: 7, unlock: 'expressLogistics', maxCount: 70 },
  { id: 'expressUndergroundAssembler', name: '极速地下带装配线', description: '制造终局地下物流通道。', category: 'logistics', icon: 'belt', inputs: { fastUndergroundBelt: 0.2, gear: 2, lubricant: 1 }, outputs: { expressUndergroundBelt: 0.12 }, buildCost: { steel: 70, processingUnit: 10, speedModule2: 5 }, powerDemand: 15, unlockStage: 7, unlock: 'expressLogistics', maxCount: 50 },
  { id: 'expressSplitterAssembler', name: '极速分流器装配线', description: '制造终局物流均衡节点。', category: 'logistics', icon: 'splitter', inputs: { fastSplitter: 0.18, gear: 1.8, processingUnit: 0.2, lubricant: 0.6 }, outputs: { expressSplitter: 0.1 }, buildCost: { steel: 75, processingUnit: 12, speedModule2: 5 }, powerDemand: 15, unlockStage: 7, unlock: 'expressLogistics', maxCount: 50 },
  { id: 'stackInserterAssembler', name: '集装机械臂装配线', description: '制造批量搬运机械臂。', category: 'logistics', icon: 'inserter', inputs: { fastInserter: 0.4, gear: 0.4, advancedCircuit: 0.8 }, outputs: { stackInserter: 0.15 }, buildCost: { steel: 65, processingUnit: 10, speedModule2: 4 }, powerDemand: 13, unlockStage: 7, unlock: 'expressLogistics', maxCount: 50 },
  { id: 'railAssembler', name: '铁路预制线', description: '批量预制铁路。', category: 'logistics', icon: 'rail', inputs: { steel: 0.3, stone: 0.5, ironPlate: 0.5 }, outputs: { rail: 1.2 }, buildCost: { steel: 45, gear: 30, circuit: 12 }, powerDemand: 8, unlockStage: 4, unlock: 'railTransport', maxCount: 60 },
  { id: 'locomotiveAssembler', name: '机车总装线', description: '制造大宗运输机车。', category: 'logistics', icon: 'rail', inputs: { engine: 1, steel: 2, circuit: 0.5 }, outputs: { locomotive: 0.05 }, buildCost: { steel: 70, engine: 20, advancedCircuit: 12 }, powerDemand: 14, unlockStage: 4, unlock: 'railTransport', maxCount: 30 },
  { id: 'cargoWagonAssembler', name: '货运车厢总装线', description: '制造固体物料运输车厢。', category: 'logistics', icon: 'wagon', inputs: { steel: 1, gear: 0.5, ironPlate: 1 }, outputs: { cargoWagon: 0.08 }, buildCost: { steel: 55, gear: 30, circuit: 8 }, powerDemand: 10, unlockStage: 4, unlock: 'railTransport', maxCount: 30 },
  { id: 'fluidWagonAssembler', name: '液罐车厢总装线', description: '制造流体运输车厢。', category: 'logistics', icon: 'wagon', inputs: { steel: 1, pipe: 1, gear: 0.5 }, outputs: { fluidWagon: 0.08 }, buildCost: { steel: 60, pipe: 35, advancedCircuit: 8 }, powerDemand: 11, unlockStage: 5, unlock: 'fluidHandling', maxCount: 30 },
  { id: 'logisticRobotAssembler', name: '物流机器人装配线', description: '制造空中物流机器人。', category: 'logistics', icon: 'robot', inputs: { flyingRobotFrame: 1, advancedCircuit: 0.5 }, outputs: { logisticRobot: 0.2 }, buildCost: { steel: 70, processingUnit: 18, battery: 30 }, powerDemand: 18, unlockStage: 7, unlock: 'logisticRobotics', maxCount: 60 },
  { id: 'constructionRobotAssembler', name: '建设机器人装配线', description: '制造自动建设和维护机器人。', category: 'logistics', icon: 'robot', inputs: { flyingRobotFrame: 1, circuit: 0.8 }, outputs: { constructionRobot: 0.2 }, buildCost: { steel: 65, processingUnit: 15, battery: 28 }, powerDemand: 17, unlockStage: 7, unlock: 'constructionRobotics', maxCount: 60 },

  { id: 'speedModule1Assembler', name: '速度模块 I 装配线', description: '制造基础速度模块。', category: 'assembly', icon: 'speed', inputs: { advancedCircuit: 0.5, circuit: 0.5 }, outputs: { speedModule1: 0.12 }, buildCost: { steel: 45, advancedCircuit: 20, circuit: 30 }, powerDemand: 11, unlockStage: 5, unlock: 'modules', maxCount: 50 },
  { id: 'efficiencyModule1Assembler', name: '节能模块 I 装配线', description: '制造基础节能模块。', category: 'assembly', icon: 'efficiency', inputs: { advancedCircuit: 0.4, circuit: 0.7 }, outputs: { efficiencyModule1: 0.12 }, buildCost: { steel: 45, advancedCircuit: 20, circuit: 30 }, powerDemand: 11, unlockStage: 5, unlock: 'modules', maxCount: 50 },
  { id: 'productivityModule1Assembler', name: '产能模块 I 装配线', description: '制造基础产能模块。', category: 'assembly', icon: 'productivity', inputs: { advancedCircuit: 0.6, circuit: 0.5 }, outputs: { productivityModule1: 0.1 }, buildCost: { steel: 50, advancedCircuit: 24, circuit: 30 }, powerDemand: 12, unlockStage: 5, unlock: 'modules', maxCount: 50 },
  { id: 'speedModule2Assembler', name: '速度模块 II 装配线', description: '制造高级速度模块。', category: 'assembly', icon: 'speed', inputs: { speedModule1: 0.4, advancedCircuit: 0.6, processingUnit: 0.1 }, outputs: { speedModule2: 0.04 }, buildCost: { steel: 65, processingUnit: 18, speedModule1: 12 }, powerDemand: 15, unlockStage: 6, unlock: 'moduleTwo', maxCount: 40 },
  { id: 'efficiencyModule2Assembler', name: '节能模块 II 装配线', description: '制造高级节能模块。', category: 'assembly', icon: 'efficiency', inputs: { efficiencyModule1: 0.4, advancedCircuit: 0.6, processingUnit: 0.1 }, outputs: { efficiencyModule2: 0.04 }, buildCost: { steel: 65, processingUnit: 18, efficiencyModule1: 12 }, powerDemand: 15, unlockStage: 6, unlock: 'moduleTwo', maxCount: 40 },
  { id: 'productivityModule2Assembler', name: '产能模块 II 装配线', description: '制造高级产能模块。', category: 'assembly', icon: 'productivity', inputs: { productivityModule1: 0.4, advancedCircuit: 0.7, processingUnit: 0.12 }, outputs: { productivityModule2: 0.035 }, buildCost: { steel: 70, processingUnit: 20, productivityModule1: 12 }, powerDemand: 16, unlockStage: 6, unlock: 'moduleTwo', maxCount: 40 },
  { id: 'speedModule3Assembler', name: '速度模块 III 装配线', description: '制造尖端速度模块。', category: 'assembly', icon: 'speed', inputs: { speedModule2: 0.3, advancedCircuit: 0.8, processingUnit: 0.3 }, outputs: { speedModule3: 0.012 }, buildCost: { refinedConcrete: 60, processingUnit: 30, speedModule2: 10 }, powerDemand: 20, unlockStage: 7, unlock: 'moduleThree', maxCount: 30 },
  { id: 'efficiencyModule3Assembler', name: '节能模块 III 装配线', description: '制造尖端节能模块。', category: 'assembly', icon: 'efficiency', inputs: { efficiencyModule2: 0.3, advancedCircuit: 0.8, processingUnit: 0.3 }, outputs: { efficiencyModule3: 0.012 }, buildCost: { refinedConcrete: 60, processingUnit: 30, efficiencyModule2: 10 }, powerDemand: 20, unlockStage: 7, unlock: 'moduleThree', maxCount: 30 },
  { id: 'productivityModule3Assembler', name: '产能模块 III 装配线', description: '制造尖端产能模块。', category: 'assembly', icon: 'productivity', inputs: { productivityModule2: 0.3, advancedCircuit: 0.9, processingUnit: 0.35 }, outputs: { productivityModule3: 0.01 }, buildCost: { refinedConcrete: 65, processingUnit: 35, productivityModule2: 10 }, powerDemand: 22, unlockStage: 7, unlock: 'moduleThree', maxCount: 30 },

  { id: 'automationScienceAssembler', name: '自动化科学装配线', description: '用铜板和齿轮制造自动化科学包。', category: 'science', icon: 'science', inputs: { copperPlate: 0.4, gear: 0.4 }, outputs: { automationScience: 0.2 }, buildCost: { ironPlate: 48, gear: 20, circuit: 12 }, powerDemand: 6, unlockStage: 2, unlock: null, maxCount: 60 },
  { id: 'logisticScienceAssembler', name: '物流科学装配线', description: '用传送带和机械臂制造物流科学包。', category: 'science', icon: 'science', inputs: { transportBelt: 0.2, inserter: 0.2 }, outputs: { logisticScience: 0.17 }, buildCost: { steel: 36, gear: 25, circuit: 18 }, powerDemand: 8, unlockStage: 3, unlock: 'logistics', maxCount: 60 },
  { id: 'chemicalScienceAssembler', name: '化工科学装配线', description: '用高级电路、发动机和硫磺制造化工科学包。', category: 'science', icon: 'science', inputs: { advancedCircuit: 0.375, engine: 0.25, sulfur: 0.125 }, outputs: { chemicalScience: 0.083 }, buildCost: { steel: 60, advancedCircuit: 30, engine: 18 }, powerDemand: 14, unlockStage: 4, unlock: 'chemicalScience', maxCount: 80 },
  { id: 'productionScienceAssembler', name: '生产科学装配线', description: '用铁路、电炉和产能模块验证规模化生产。', category: 'science', icon: 'science', inputs: { rail: 1.4, electricFurnace: 0.05, productivityModule1: 0.05 }, outputs: { productionScience: 0.14 }, buildCost: { concrete: 80, steel: 60, advancedCircuit: 35 }, powerDemand: 18, unlockStage: 6, unlock: 'productionScience', maxCount: 80 },
  { id: 'utilityScienceAssembler', name: '效用科学装配线', description: '用处理器、飞行框架和轻质结构制造效用科学包。', category: 'science', icon: 'science', inputs: { processingUnit: 0.1, flyingRobotFrame: 0.05, lowDensityStructure: 0.15 }, outputs: { utilityScience: 0.14 }, buildCost: { refinedConcrete: 90, processingUnit: 30, productivityModule2: 8 }, powerDemand: 22, unlockStage: 7, unlock: 'utilityScience', maxCount: 80 },

  { id: 'researchLab', name: '研究实验室', description: '科研项目至少需要一座运行中的实验室。', category: 'infrastructure', icon: 'lab', inputs: {}, outputs: {}, buildCost: { ironPlate: 60, gear: 20, circuit: 15 }, powerDemand: 5, unlockStage: 2, unlock: null, maxCount: 20 },
  { id: 'warehouse', name: '钢制仓库', description: '每座为所有资源增加 2,400 单位仓储。', category: 'infrastructure', icon: 'warehouse', inputs: {}, outputs: {}, buildCost: { steel: 55, brick: 60, gear: 25 }, powerDemand: 0, storageBonus: 2_400, passive: true, unlockStage: 3, unlock: 'logistics', maxCount: 30 },
  { id: 'fluidTankFarm', name: '综合罐区', description: '扩建共享仓储，并保障化工链缓冲。', category: 'infrastructure', icon: 'warehouse', inputs: {}, outputs: {}, buildCost: { steel: 70, pipe: 50, concrete: 45 }, powerDemand: 0, storageBonus: 1_600, passive: true, unlockStage: 5, unlock: 'fluidHandling', maxCount: 24 },
  { id: 'steamPowerPlant', name: '燃煤蒸汽机组', description: '按负载消耗煤炭，为共享电网供电。', category: 'power', icon: 'power', inputs: {}, outputs: {}, buildCost: { ironPlate: 90, brick: 55, gear: 30, pipe: 20 }, powerDemand: 0, powerSupply: 40, fuel: { resourceId: 'coal', perSecond: 0.22 }, unlockStage: 3, unlock: 'steamPower', maxCount: 40 },
  { id: 'solarField', name: '太阳能电场', description: '消耗太阳能板建设稳定免燃料电源。', category: 'power', icon: 'solar', inputs: {}, outputs: {}, buildCost: { solarPanel: 18, steel: 25, circuit: 18 }, powerDemand: 0, powerSupply: 18, unlockStage: 5, unlock: 'solarEnergy', maxCount: 60 },
  { id: 'accumulatorBank', name: '蓄电站', description: '以蓄电池组平滑尖峰负载。', category: 'power', icon: 'battery', inputs: {}, outputs: {}, buildCost: { accumulator: 16, steel: 30, circuit: 20 }, powerDemand: 0, powerSupply: 8, unlockStage: 5, unlock: 'batteryTech', maxCount: 50 },
  { id: 'nuclearPowerPlant', name: '核能机组', description: '消耗铀燃料棒，提供高密度电力并产生乏燃料。', category: 'power', icon: 'nuclear-plant', inputs: {}, outputs: {}, buildCost: { refinedConcrete: 180, steel: 150, processingUnit: 45, uraniumFuelCell: 20 }, powerDemand: 0, powerSupply: 180, fuel: { resourceId: 'uraniumFuelCell', perSecond: 0.015, byproductId: 'usedUraniumFuelCell' }, unlockStage: 6, unlock: 'nuclearPower', maxCount: 16 },
  { id: 'logisticsHub', name: '基础物流枢纽', description: '提高全厂物流吞吐 2.5%。', category: 'infrastructure', icon: 'belt', inputs: {}, outputs: {}, buildCost: { transportBelt: 100, undergroundBelt: 20, splitter: 12, inserter: 30 }, powerDemand: 4, throughputBonus: 0.025, unlockStage: 3, unlock: 'logistics', maxCount: 8 },
  { id: 'railwayDepot', name: '铁路集散中心', description: '提高全厂物流吞吐 4%。', category: 'infrastructure', icon: 'rail', inputs: {}, outputs: {}, buildCost: { rail: 160, locomotive: 2, cargoWagon: 6, fluidWagon: 2 }, powerDemand: 8, throughputBonus: 0.04, unlockStage: 5, unlock: 'railTransport', maxCount: 6 },
  { id: 'roboportNetwork', name: '机器人调度网', description: '提高全厂物流吞吐 5%。', category: 'infrastructure', icon: 'roboport', inputs: {}, outputs: {}, buildCost: { logisticRobot: 30, constructionRobot: 20, steel: 80, processingUnit: 24 }, powerDemand: 16, throughputBonus: 0.05, unlockStage: 7, unlock: 'logisticRobotics', maxCount: 6 },
  { id: 'speedBeaconNetwork', name: '速度信标网', description: '使用速度模块提高全厂吞吐 3.5%。', category: 'infrastructure', icon: 'beacon', inputs: {}, outputs: {}, buildCost: { speedModule2: 12, steel: 65, processingUnit: 22 }, powerDemand: 22, throughputBonus: 0.035, unlockStage: 7, unlock: 'moduleTwo', maxCount: 8 },
  { id: 'efficiencyGrid', name: '能效控制网', description: '使用节能模块降低全厂耗电 4%。', category: 'infrastructure', icon: 'efficiency', inputs: {}, outputs: {}, buildCost: { efficiencyModule2: 12, steel: 60, processingUnit: 20 }, powerDemand: 3, powerEfficiencyBonus: 0.04, unlockStage: 7, unlock: 'moduleTwo', maxCount: 8 },
  { id: 'productivityCenter', name: '产能控制中心', description: '使用产能模块提高全厂成品率 1.5%。', category: 'infrastructure', icon: 'productivity', inputs: {}, outputs: {}, buildCost: { productivityModule2: 12, refinedConcrete: 55, processingUnit: 22 }, powerDemand: 20, productivityBonus: 0.015, unlockStage: 7, unlock: 'moduleTwo', maxCount: 8 },

  { id: 'lowDensityStructureAssembler', name: '轻质结构装配线', description: '制造火箭壳体所需轻质结构。', category: 'project', icon: 'cube', inputs: { copperPlate: 4, steel: 0.4, plastic: 2 }, outputs: { lowDensityStructure: 0.2 }, buildCost: { refinedConcrete: 80, steel: 80, processingUnit: 16 }, powerDemand: 20, unlockStage: 7, unlock: 'lowDensityStructure', maxCount: 80 },
  { id: 'rocketFuelAssembler', name: '火箭燃料精炼线', description: '将固体燃料和轻油升级为火箭燃料。', category: 'project', icon: 'rocket-thruster', inputs: { solidFuel: 2, lightOil: 2 }, outputs: { rocketFuel: 0.18 }, buildCost: { refinedConcrete: 75, steel: 70, processingUnit: 14 }, powerDemand: 18, unlockStage: 7, unlock: 'rocketFuelTechnology', maxCount: 80 },
  { id: 'rocketControlUnitAssembler', name: '火箭控制单元装配线', description: '组合处理器和速度模块制造控制单元。', category: 'project', icon: 'radar', inputs: { processingUnit: 0.4, speedModule1: 0.2 }, outputs: { rocketControlUnit: 0.1 }, buildCost: { refinedConcrete: 80, processingUnit: 30, speedModule2: 8 }, powerDemand: 22, unlockStage: 7, unlock: 'rocketControl', maxCount: 80 },
  { id: 'rocketSilo', name: '轨道火箭发射井', description: '消耗三类火箭组件，自动装配一百个火箭部件。', category: 'project', icon: 'rocket', inputs: { lowDensityStructure: 1.2, rocketFuel: 1.2, rocketControlUnit: 1.2 }, outputs: { rocketPart: 0.12 }, buildCost: { steel: 500, refinedConcrete: 500, pipe: 200, processingUnit: 120, electricEngine: 120 }, powerDemand: 60, unlockStage: 8, unlock: 'rocketSilo', maxCount: 1 },
  { id: 'satelliteAssembler', name: '轨道卫星总装线', description: '制造火箭首发所需轨道卫星。', category: 'project', icon: 'satellite', inputs: { lowDensityStructure: 0.5, processingUnit: 0.5, rocketFuel: 0.25, solarPanel: 0.5, accumulator: 0.5, radar: 0.05 }, outputs: { satellite: 0.005 }, buildCost: { steel: 160, refinedConcrete: 120, processingUnit: 60, constructionRobot: 20 }, powerDemand: 35, unlockStage: 8, unlock: 'rocketSilo', maxCount: 4 },
] as const satisfies readonly ProductionLineDefinition[];

export type ProductionLineId = typeof PRODUCTION_LINES[number]['id'];

export const PRODUCTION_LINE_DEFINITIONS = PRODUCTION_LINES as readonly (
  ProductionLineDefinition & { id: ProductionLineId }
)[];

export const SPECIALIZATION_IDS = ['extraction', 'metallurgy', 'chemistry', 'logistics', 'research', 'rocketry'] as const;
export type SpecializationId = typeof SPECIALIZATION_IDS[number];

export interface SpecializationDefinition {
  id: SpecializationId;
  name: string;
  description: string;
  icon: FoundryIconId;
  categories: readonly LineCategory[];
}

export const SPECIALIZATION_DEFINITIONS = [
  { id: 'extraction', name: '采掘调度', description: '提高所有采掘设施效率。', icon: 'drill', categories: ['extraction'] },
  { id: 'metallurgy', name: '冶金主管', description: '提高熔炉和材料精炼效率。', icon: 'furnace', categories: ['smelting'] },
  { id: 'chemistry', name: '化工主管', description: '提高炼油、化工和核材料处理效率。', icon: 'chemical-plant', categories: ['processing'] },
  { id: 'logistics', name: '物流调度', description: '提高组件装配和物流设备效率。', icon: 'belt', categories: ['assembly', 'logistics'] },
  { id: 'research', name: '科研主管', description: '提高所有科学包生产效率。', icon: 'science', categories: ['science'] },
  { id: 'rocketry', name: '航天总装', description: '提高火箭和卫星工程效率。', icon: 'rocket', categories: ['project'] },
] as const satisfies readonly SpecializationDefinition[];

export const PRODUCTION_LINE_BY_ID = Object.fromEntries(
  PRODUCTION_LINES.map((line) => [line.id, line]),
) as Record<ProductionLineId, ProductionLineDefinition>;

export const TECHNOLOGY_BY_ID = Object.fromEntries(
  TECHNOLOGY_DEFINITIONS.map((technology) => [technology.id, technology]),
) as unknown as Record<TechnologyId, TechnologyDefinition>;

export const RESOURCE_BY_ID = Object.fromEntries(
  RESOURCE_DEFINITIONS.map((resource) => [resource.id, resource]),
) as Record<ResourceId, ResourceDefinition>;

export const SPECIALIZATION_BY_ID = Object.fromEntries(
  SPECIALIZATION_DEFINITIONS.map((specialization) => [specialization.id, specialization]),
) as unknown as Record<SpecializationId, SpecializationDefinition>;

export const RAW_RESOURCE_IDS = ['ironOre', 'copperOre', 'coal', 'stone'] as const satisfies readonly ResourceId[];

export function isResourceUnlocked(
  resourceId: ResourceId,
  missionStage: number,
  technologies: readonly TechnologyId[],
): boolean {
  const definition = RESOURCE_BY_ID[resourceId];
  return missionStage >= definition.unlockStage
    && (definition.unlock === null || technologies.includes(definition.unlock));
}

export function isProductionLineUnlocked(
  lineId: ProductionLineId,
  missionStage: number,
  technologies: readonly TechnologyId[],
): boolean {
  const definition = PRODUCTION_LINE_BY_ID[lineId];
  if (missionStage < definition.unlockStage || (definition.unlock !== null && !technologies.includes(definition.unlock))) return false;
  const referencedResources = new Set<ResourceId>([
    ...Object.keys(definition.inputs) as ResourceId[],
    ...Object.keys(definition.outputs) as ResourceId[],
    ...Object.keys(definition.buildCost) as ResourceId[],
  ]);
  return [...referencedResources].every((resourceId) => isResourceUnlocked(resourceId, missionStage, technologies));
}

export function isTechnologyVisible(
  technologyId: TechnologyId,
  missionStage: number,
  technologies: readonly TechnologyId[],
): boolean {
  if (technologies.includes(technologyId)) return true;
  const definition = TECHNOLOGY_BY_ID[technologyId];
  return missionStage >= definition.unlockStage
    && definition.prerequisites.every((id) => technologies.includes(id));
}

export function getResourceCapacity(resourceId: ResourceId, baseCapacity: number): number {
  return baseCapacity * (RESOURCE_BY_ID[resourceId].capacityMultiplier ?? 1);
}

export const BASE_STORAGE_CAPACITY = 1_200;
export const BASE_POWER_SUPPLY = 22;
export const MAX_OFFLINE_SECONDS = 24 * 60 * 60;
export const MANUAL_GATHER_AMOUNT = 8;
export const MANUAL_GATHER_DURATION_MS = 2_500;
export const COMPLETED_MISSION_STAGE = 10;

export const LAUNCH_REQUIREMENTS: Readonly<Partial<ResourceAmounts>> = {
  rocketPart: 100,
  satellite: 1,
};

export function createResourceAmounts(initialValue = 0): ResourceAmounts {
  return Object.fromEntries(RESOURCE_IDS.map((id) => [id, initialValue])) as ResourceAmounts;
}
