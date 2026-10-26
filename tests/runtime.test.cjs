'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const r = require('../shared/runtime.cjs');
test('versions reject traversal', () => {
  assert.equal(r.versionCheck('13.11.1'), '13.11.1');
  assert.throws(() => r.versionCheck('../x'));
});
test('Flyway URL and platforms', () => {
  assert.match(r.downloadUrl('13.11.1','redgate','linux','x64'), /^https:\/\/download.red-gate.com/);
  assert.equal(r.downloadUrl('13.10.3','community','linux','x64'),
    'https://github.com/flyway/flyway/releases/download/flyway-13.10.3/flyway-commandline-13.10.3-linux-x64.tar.gz');
  assert.equal(r.downloadUrl('11.9.0','community','linux','x64'),
    'https://github.com/flyway/flyway/releases/download/flyway-11.9.0/flyway-commandline-11.9.0-linux-x64.tar.gz');
  assert.equal(r.downloadUrl('11.8.2','community','linux','x64'),
    'https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/11.8.2/flyway-commandline-11.8.2-linux-x64.tar.gz');
  assert.equal(r.downloadUrl('13.10.3','community','win32','x64'),
    'https://github.com/flyway/flyway/releases/download/flyway-13.10.3/flyway-commandline-13.10.3-windows-x64.zip');
  assert.throws(() => r.target('linux','arm64'));
});
test('options handle quoted text and block secrets', () => {
  assert.deepEqual(r.parseOptions('-encoding=UTF-8 -placeholders.label="two words"'), ['-encoding=UTF-8','-placeholders.label=two words']);
  assert.throws(() => r.validateOptions(['-password=secret']));
});
test('clean denied by default', () => {
  assert.throws(() => r.commandAllowed('clean'));
  assert.equal(r.commandAllowed('clean',true),'clean');
});

test('latest parses stable Flyway release tag', () => {
  assert.equal(r.releaseVersion({tag_name:'flyway-13.11.1',prerelease:false,draft:false}), '13.11.1');
  assert.throws(() => r.releaseVersion({tag_name:'flyway-13.11.1-rc1',prerelease:true}));
  assert.throws(() => r.releaseVersion({tag_name:'invalid'}));
});
