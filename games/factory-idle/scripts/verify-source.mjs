import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDirectory, '..');

const metadata = JSON.parse(
  await readFile(path.join(packageRoot, 'src/generated/reconstruction.json'), 'utf8'),
);
const manifest = await readFile(
  path.join(packageRoot, 'src/generated/module-manifest.js'),
  'utf8',
);

assert.equal(metadata.discoveredModules, 180, '原 bundle 模块数量发生变化');
assert.equal(metadata.sourceSha256, '2b9d520abaf15826cba8639987891bdf249cf0d30335077bafb08c5c39a73b9e');
assert.equal(metadata.topLevelModules, 179, '顶层模块数量异常');
assert.equal(metadata.restoredModules, 133, '恢复模块数量异常');
assert.equal(metadata.restoredTemplates, 0, '重置版模板应由项目源码维护');
assert.equal(metadata.manualTemplates.length, 26, '重置版模板数量异常');
assert.equal(metadata.scriptCount, 145, '运行脚本清单不完整');

for (const moduleName of metadata.omittedModules) {
  assert.ok(!manifest.includes(`/${moduleName}.js?url`), `已移除模块仍在清单中：${moduleName}`);
}

const blockedRuntimeText = [
  'pagead2.googlesyndication.com',
  'googletagmanager.com',
  'api.grestgames.com',
  'cdn1.kongregate.com',
  'PlayFab',
  'adsbygoogle',
  'httpMigration',
  'IncentivizedAd',
  'factoryidle@inditel.ee',
];

async function collectTextFiles(relativePath) {
  const absolutePath = path.join(packageRoot, relativePath);
  const entryStat = await stat(absolutePath);
  if (entryStat.isFile()) return [relativePath];

  const files = [];
  for (const entry of await readdir(absolutePath, { withFileTypes: true })) {
    const childPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTextFiles(childPath));
    } else if (/\.(?:js|css|html)$/.test(entry.name)) {
      files.push(childPath);
    }
  }
  return files;
}

const runtimeFiles = [
  'index.html',
  ...await collectTextFiles('src/runtime'),
  ...await collectTextFiles('src/modules'),
  ...await collectTextFiles('src/restored'),
  ...await collectTextFiles('src/styles'),
  ...await collectTextFiles('public/template'),
];

for (const relativePath of runtimeFiles) {
  const absolutePath = path.join(packageRoot, relativePath);
  const contents = await readFile(absolutePath, 'utf8');
  for (const blockedText of blockedRuntimeText) {
    assert.ok(
      !contents.includes(blockedText),
      `${relativePath} 仍包含外部或广告代码：${blockedText}`,
    );
  }
}

for (const assetPath of [
  'public/img/components.png',
  'public/img/resources.png',
  'public/img/terrains.png',
  'public/img/transportLine.png',
  'public/img/componentIcons.png',
]) {
  const assetStat = await stat(path.join(packageRoot, assetPath));
  assert.ok(assetStat.size > 0, `素材为空：${assetPath}`);
}

console.log(
  `源码验证通过：${metadata.restoredModules} 个恢复模块，${metadata.scriptCount} 个运行脚本。`,
);
