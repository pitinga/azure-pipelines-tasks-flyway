'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('manifest Node24 and IDs', () => {
 const manifest=require('../vss-extension.json');
 const tasks=['FlywayInstaller','FlywayCLI'].map(x=>JSON.parse(fs.readFileSync(path.join(root,x,'task.json'))));
 assert.equal(manifest.publisher,'pitinga');
 assert.equal(manifest.version,'1.2.3');
 assert.equal(tasks.find(t=>t.name==='FlywayInstaller').version.Minor,2);
 assert.equal(tasks.find(t=>t.name==='FlywayCLI').version.Minor,2);
 assert.equal(tasks.find(t=>t.name==='FlywayCLI').version.Patch,1);
 assert.equal(new Set(tasks.map(x=>x.id)).size,2);
 const cli = tasks.find(t=>t.name==='FlywayCLI');
 for (const name of ['configFile','workingDirectory','flywayPath']) {
   const input = cli.inputs.find(i => i.name === name);
   assert.ok(input, name);
   assert.equal(input.required, false, name);
   // filePath on Azure Pipelines may substitute repository root for an omitted input.
   // A string with defaultValue='' preserves genuine omission.
   assert.equal(input.type, 'string', name);
   assert.equal(input.defaultValue, '', name);
 }
 for (const task of tasks) {assert.deepEqual(Object.keys(task.execution),['Node24']);assert.equal(task.minimumAgentVersion,'4.265.1');}
 assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Node 24 ou superior requerido');
 assert.equal(require('../package.json').engines.node, '>=24');
});

test('GitHub Actions usam somente runtime Node 24 e Actions v7', () => {
 for (const filename of ['build-vsix.yml', 'publish-marketplace.yml']) {
   const workflow = fs.readFileSync(path.join(root,'.github','workflows',filename),'utf8');
   assert.match(workflow,/actions\/checkout@v7/);
   assert.match(workflow,/actions\/setup-node@v7/);
   assert.match(workflow,/node-version: '24'/);
   assert.doesNotMatch(workflow,/actions\/checkout@v[1-6]|actions\/setup-node@v[1-6]|node-version: '(?:1[0-9]|2[0-3])'/);
 }
 const build=fs.readFileSync(path.join(root,'.github','workflows','build-vsix.yml'),'utf8');
 assert.match(build,/actions\/upload-artifact@v7/);
 for (const name of ['FlywayCLI','FlywayInstaller']) {
   assert.equal(fs.existsSync(path.join(root,name,'package-lock.json')),false, name);
   assert.equal(fs.existsSync(path.join(root,name,'package.json')),false, name);
 }
});

test('Marketplace upload is separate from public GitHub Release',()=>{
 const wf=fs.readFileSync(path.join(root,'.github/workflows/publish-marketplace.yml'),'utf8');
 assert.match(wf,/workflow_dispatch:/);
 assert.match(wf,/VS_MARKETPLACE_TOKEN/);
 assert.match(wf,/name: Publish to Marketplace/);
 assert.doesNotMatch(wf,/gh release (create|edit|upload)/);
});
test('Flyway CI artifact is consumed by independent GitHub Release',()=>{
 const build=fs.readFileSync(path.join(root,'.github/workflows/build-vsix.yml'),'utf8');
 const wf=fs.readFileSync(path.join(root,'.github/workflows/github-release.yml'),'utf8');
 const script=fs.readFileSync(path.join(root,'.github/scripts/github-release.sh'),'utf8');
 assert.match(build,/steps.ext-version.outputs.version/);
 assert.match(wf,/workflow_run:/);
 assert.match(wf,/Build Flyway extension VSIX/);
 assert.match(script,/flyway-tasks-v\$version-vsix/);
 assert.match(script,/gh run download/);
 assert.match(script,/gh release create/);
 assert.doesNotMatch(script,/extension publish|VS_MARKETPLACE_TOKEN/);
});
test('Main branch and Node24 remain the only CI publication source',()=>{
 for(const name of ['build-vsix.yml','publish-marketplace.yml','github-release.yml']){
  const wf=fs.readFileSync(path.join(root,'.github/workflows',name),'utf8');
  assert.doesNotMatch(wf,/refs\/heads\/master|branches: \[master\]|^\s+- master$/m);
 }
 const build=fs.readFileSync(path.join(root,'.github/workflows/build-vsix.yml'),'utf8');
 assert.match(build,/push:\n\s+branches:\n\s+- main/);
 assert.match(build,/pull_request:\n\s+branches:\n\s+- main/);
 const release=fs.readFileSync(path.join(root,'.github/workflows/github-release.yml'),'utf8');
 assert.match(release,/head_branch == 'main'/);
 const publish=fs.readFileSync(path.join(root,'.github/workflows/publish-marketplace.yml'),'utf8');
 assert.match(publish,/refs\/heads\/main/);
});

test('MIT license é arquivo explícito, endereçável e preserva atribuição original',()=>{
 const manifest=require('../vss-extension.json');
 assert.equal(manifest.content.license.path,'LICENSE');
 assert.ok(manifest.files.some(f=>f.path==='LICENSE'&&f.addressable===true));
 assert.equal(require('../package.json').version,manifest.version);
 const license=fs.readFileSync(path.join(root,'LICENSE'),'utf8');
 assert.match(license,/Copyright \(c\) 2020 Mathieu Filotto/);
 assert.match(license,/MIT License/);
 const build=fs.readFileSync(path.join(root,'.github/workflows/build-vsix.yml'),'utf8');
 const publish=fs.readFileSync(path.join(root,'.github/workflows/publish-marketplace.yml'),'utf8');
 assert.match(build,/archive.read\('LICENSE'\)/);
 assert.match(publish,/z.read\('LICENSE'\)/);
});

test('Legado TypeScript e arquivos de build obsoletos foram removidos',()=>{
 for(const name of ['FlywayInstaller/src','FlywayCLI/src','FlywayInstaller/tsconfig.json','FlywayCLI/tsconfig.json','FlywayInstaller/.env-sample','FlywayCLI/.env-sample','FlywayInstaller/icon.png','FlywayCLI/icon.png','vss-extension-icon.png'])
  assert.equal(fs.existsSync(path.join(root,name)),false,name);
});
