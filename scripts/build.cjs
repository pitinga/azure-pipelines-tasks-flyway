'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const name of ['FlywayInstaller', 'FlywayCLI']) {
  const source = path.join(root, name);
  const output = path.join(source, '.dist');
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const [from, to] of [
    [path.join(source, 'index.cjs'), 'index.cjs'],
    [path.join(root, 'shared', 'runtime.cjs'), 'runtime.cjs'],
    [path.join(source, 'task.json'), 'task.json'],
    [path.join(root, 'images', 'extension-icon.png'), 'icon.png']
  ]) fs.copyFileSync(from, path.join(output, to));
  console.log(`Preparada ${name}/.dist`);
}
