'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('manifest Node24 and IDs', () => {
 const manifest=require('../vss-extension.json');
 const tasks=['FlywayInstaller','FlywayCLI'].map(x=>JSON.parse(fs.readFileSync(path.join(root,x,'task.json'))));
 assert.equal(manifest.publisher,'pitinga');
 assert.equal(manifest.version,'1.1.3');
 assert.equal(tasks.find(t=>t.name==='FlywayInstaller').version.Patch,2);
 assert.equal(tasks.find(t=>t.name==='FlywayCLI').version.Patch,0);
 assert.equal(new Set(tasks.map(x=>x.id)).size,2);
 for (const task of tasks) {assert.ok(task.execution.Node24);assert.equal(task.minimumAgentVersion,'4.265.1');}
});
