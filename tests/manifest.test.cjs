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
 for (const task of tasks) {assert.ok(task.execution.Node24);assert.equal(task.minimumAgentVersion,'4.265.1');}
});
