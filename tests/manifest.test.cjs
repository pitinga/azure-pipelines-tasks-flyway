'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('manifest Node24 and IDs', () => {
 const manifest=require('../vss-extension.json');
 const tasks=['FlywayInstaller','FlywayCLI'].map(x=>JSON.parse(fs.readFileSync(path.join(root,x,'task.json'))));
 assert.equal(manifest.publisher,'pitinga');
 assert.equal(manifest.version,'1.2.2');
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

test('Marketplace publish finalizes stable GitHub release only after the upload',()=>{
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/publish-marketplace.yml'),'utf8');
 assert.match(workflow,/permissions:\n  contents: write/);
 assert.match(workflow,/fetch-depth: 0/);
 assert.match(workflow,/Use previously verified release tag when present/);
 const publish=workflow.indexOf('      - name: Publish to Marketplace');
 const release=workflow.indexOf('      - name: Register published version on GitHub');
 assert.ok(publish>0 && release>publish);
 assert.match(workflow.slice(release),/gh release edit .*--draft=false/);
 assert.match(workflow.slice(release),/gh release create/);
 assert.match(workflow,/VS_MARKETPLACE_TOKEN/);
});
