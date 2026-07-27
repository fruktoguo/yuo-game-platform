import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { parse } from 'acorn';
import { transform } from 'esbuild';
import postcss from 'postcss';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDirectory, '..');
const referenceRoot = path.resolve(packageRoot, '../../references/factoryidle.com');
const sourceBundlePath = path.join(referenceRoot, 'app.js');
const restoredRoot = path.join(packageRoot, 'src/restored');
const manualRoot = path.join(packageRoot, 'src/modules');
const generatedRoot = path.join(packageRoot, 'src/generated');
const templateRoot = path.join(packageRoot, 'public/template');

const manualModules = new Set([
  'config/config',
  'config/event/ApiEvent',
  'play/UrlHandler',
  'play/api/api/LocalApi',
  'play/api/Local',
  'play/api/ApiFactory',
  'play/Play',
  'ui/MainUi',
  'ui/FactoryUi',
  'app',
]);

const additionalManualModules = ['locale/zhCN'];

const omittedModules = new Set([
  'play/api/api/ServerApi',
  'play/api/lib/playFab/PlayFabClientApi',
  'play/api/api/PlayFabApi',
  'play/api/Web',
  'play/api/api/KongregateApi',
  'play/api/Kongregate',
  'game/action/IncentivizedAdCompletedAction',
  'ui/IncentivizedAdButtonUi',
  'ui/GoogleAddsUi',
]);

const omittedTemplates = new Set(['incentivizedAd.html']);
const manualTemplates = new Set([
  'achievementPopup.html',
  'achievements.html',
  'factories.html',
  'factory.html',
  'factory/component/sorter.html',
  'factory/components.html',
  'factory/controls.html',
  'factory/info.html',
  'factory/infoDetails.html',
  'factory/mapTools.html',
  'factory/menu.html',
  'factory/overview.html',
  'help.html',
  'helper/alert.html',
  'helper/confirm.html',
  'helper/loading.html',
  'helper/tip.html',
  'intro.html',
  'missions.html',
  'purchases.html',
  'research.html',
  'runningInBackgroundInfoUi.html',
  'settings.html',
  'statistics.html',
  'timeTravel.html',
  'upgrades.html',
]);

const unavailableCssAssets = new Set([
  'img/timeline/delete.png',
  'img/network/cross.png',
  'img/network/backIcon.png',
  'img/network/addNodeIcon.png',
  'img/network/editIcon.png',
  'img/network/connectIcon.png',
  'img/network/deleteIcon.png',
  'img/network/upArrow.png',
  'img/network/downArrow.png',
  'img/network/leftArrow.png',
  'img/network/rightArrow.png',
  'img/network/plus.png',
  'img/network/minus.png',
  'img/network/zoomExtends.png',
]);

function findOuterBody(program) {
  const unaryExpression = program.body[0]?.expression;
  const callExpression = unaryExpression?.argument;
  const functionExpression = callExpression?.callee;
  const block = functionExpression?.body;

  if (block?.type !== 'BlockStatement') {
    throw new Error('未识别 Factory Idle bundle 的外层 IIFE。');
  }

  return { start: block.start + 1, end: block.end - 1 };
}

function findDefinitions(program) {
  const all = [];
  const topLevel = [];

  function traverse(node, functionDepth) {
    if (!node || typeof node !== 'object') return;

    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Identifier' &&
      node.callee.name === 'define' &&
      node.arguments?.[0]?.type === 'Literal' &&
      typeof node.arguments[0].value === 'string'
    ) {
      const definition = {
        name: node.arguments[0].value,
        start: node.start,
        end: node.end,
        node,
      };
      all.push(definition);
      if (functionDepth === 1) topLevel.push(definition);
    }

    const nextFunctionDepth = /Function(?:Declaration|Expression)$|ArrowFunctionExpression/.test(
      node.type,
    )
      ? functionDepth + 1
      : functionDepth;

    for (const [key, value] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(value)) {
        for (const child of value) traverse(child, nextFunctionDepth);
      } else if (value && typeof value === 'object' && value.type) {
        traverse(value, nextFunctionDepth);
      }
    }
  }

  traverse(program, 0);
  return {
    all: all.sort((left, right) => left.start - right.start),
    topLevel: topLevel.sort((left, right) => left.start - right.start),
  };
}

function trimChunk(chunk) {
  const normalized = chunk.replace(/^\s*[,;]+\s*/, '').trim();
  return /^function\s*\(/.test(normalized) ? `!${normalized}` : normalized;
}

async function formatJavaScript(code) {
  const result = await transform(code, {
    loader: 'js',
    target: 'es2018',
    minify: false,
    legalComments: 'inline',
    charset: 'utf8',
  });
  return result.code.trimEnd() + '\n';
}

function getTemplateValue(definition) {
  const factory = definition.node.arguments.at(-1);
  const returnStatement = factory?.body?.body?.find(
    (statement) => statement.type === 'ReturnStatement',
  );
  const value = returnStatement?.argument?.value;

  if (typeof value !== 'string') {
    throw new Error(`模板模块 ${definition.name} 不是静态字符串。`);
  }

  return value.replace(/\r\n/g, '\n');
}

async function cleanProductsModule(chunk) {
  let products;
  vm.runInNewContext(chunk, {
    define(_name, _dependencies, factory) {
      products = factory();
    },
  });

  for (const item of products.items) {
    item.priceStr = { local: item.priceStr.local };
  }

  return formatJavaScript(
    `define("config/products", [], function () { return ${JSON.stringify(products, null, 2)}; });`,
  );
}

async function cleanMainConfigModule(chunk) {
  return formatJavaScript(
    chunk.replace(',incentivizedAdBonusTicks:1e3', ''),
  );
}

function moduleFilePath(root, moduleName) {
  return path.join(root, ...moduleName.split('/')) + '.js';
}

function moduleImportPath(rootName, moduleName) {
  return `../${rootName}/${moduleName}.js?url`;
}

async function writeRestoredModule(moduleName, code) {
  const outputPath = moduleFilePath(restoredRoot, moduleName);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const header = `/**\n * 从 Factory Idle 浏览器 bundle 恢复。\n * AMD 模块：${moduleName}\n */\n`;
  await writeFile(outputPath, header + code, 'utf8');
}

async function reconstructCss() {
  const originalCss = await readFile(path.join(referenceRoot, 'main.css'), 'utf8');
  const root = postcss.parse(originalCss);

  root.walkRules((rule) => {
    if (/\.incentivizedAdBox|\.mainWithAdd/.test(rule.selector)) {
      rule.remove();
    }
  });

  root.walkDecls((declaration) => {
    for (const unavailablePath of unavailableCssAssets) {
      if (declaration.value.includes(unavailablePath)) {
        declaration.remove();
        return;
      }
    }

    declaration.value = declaration.value
      .replaceAll('../img/', '../assets/img/')
      .replaceAll('url(img/', 'url(../assets/img/');
  });

  const formatted = await transform(root.toString(), {
    loader: 'css',
    minify: false,
  });
  const outputPath = path.join(packageRoot, 'src/styles/main.css');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    '/* 从网页样式恢复；广告样式与失效资源声明已移除。 */\n' + formatted.code,
    'utf8',
  );
}

async function writeManifest(entries) {
  await mkdir(generatedRoot, { recursive: true });
  const imports = [
    `import script0 from '../runtime/browser-globals.js?url';`,
    ...entries.map(
      (entry, index) => `import script${index + 1} from '${entry.importPath}';`,
    ),
  ];
  const identifiers = Array.from(
    { length: entries.length + 1 },
    (_, index) => `script${index}`,
  );
  await writeFile(
    path.join(generatedRoot, 'module-manifest.js'),
    `${imports.join('\n')}\n\nexport const scriptUrls = [\n  ${identifiers.join(',\n  ')},\n];\n`,
    'utf8',
  );
}

async function main() {
  const source = await readFile(sourceBundlePath, 'utf8');
  const program = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const outerBody = findOuterBody(program);
  const definitionGroups = findDefinitions(program);
  const definitions = definitionGroups.topLevel;
  const manifestEntries = [];
  let restoredModuleCount = 0;
  let templateCount = 0;

  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    const moduleName = definition.name;

    if (moduleName.startsWith('text!template/')) {
      const templateName = moduleName.slice('text!template/'.length);
      if (omittedTemplates.has(templateName) || manualTemplates.has(templateName)) continue;
      const outputPath = path.join(templateRoot, templateName);
      await mkdir(path.dirname(outputPath), { recursive: true });
      const template = getTemplateValue(definition).replace(
        'Let me know at Reddit/Kongregate - what do you think!<br/>',
        'Experiment, iterate, and build efficient production chains.<br/>',
      );
      await writeFile(outputPath, template, 'utf8');
      templateCount += 1;
      continue;
    }

    if (omittedModules.has(moduleName)) continue;

    if (manualModules.has(moduleName)) {
      manifestEntries.push({
        name: moduleName,
        importPath: moduleImportPath('modules', moduleName),
      });
      continue;
    }

    const start = index === 0 ? outerBody.start : definitions[index - 1].end;
    const end = definition.end;
    const chunk = trimChunk(source.slice(start, end));
    let formatted;
    if (moduleName === 'config/products') {
      formatted = await cleanProductsModule(chunk);
    } else if (moduleName === 'config/main/main') {
      formatted = await cleanMainConfigModule(chunk);
    } else {
      formatted = await formatJavaScript(chunk);
    }
    await writeRestoredModule(moduleName, formatted);
    restoredModuleCount += 1;
    manifestEntries.push({
      name: moduleName,
      importPath: moduleImportPath('restored', moduleName),
    });
  }

  await cp(path.join(referenceRoot, 'img'), path.join(packageRoot, 'public/img'), {
    recursive: true,
    force: true,
  });
  await cp(path.join(referenceRoot, 'img'), path.join(packageRoot, 'src/assets/img'), {
    recursive: true,
    force: true,
  });
  await reconstructCss();
  const appIndex = manifestEntries.findIndex((entry) => entry.name === 'app');
  manifestEntries.splice(
    appIndex < 0 ? manifestEntries.length : appIndex,
    0,
    ...additionalManualModules.map((moduleName) => ({
      name: moduleName,
      importPath: moduleImportPath('modules', moduleName),
    })),
  );
  await writeManifest(manifestEntries);

  const metadata = {
    source: path.relative(packageRoot, sourceBundlePath),
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    discoveredModules: definitionGroups.all.length,
    topLevelModules: definitions.length,
    restoredModules: restoredModuleCount,
    manualModules: [...manualModules, ...additionalManualModules],
    omittedModules: [...omittedModules],
    restoredTemplates: templateCount,
    manualTemplates: [...manualTemplates],
    omittedTemplates: [...omittedTemplates],
    scriptCount: manifestEntries.length + 1,
  };
  await writeFile(
    path.join(generatedRoot, 'reconstruction.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf8',
  );

  console.log(
    `已恢复 ${restoredModuleCount} 个模块、${templateCount} 个模板，运行脚本共 ${metadata.scriptCount} 个。`,
  );
}

await main();
