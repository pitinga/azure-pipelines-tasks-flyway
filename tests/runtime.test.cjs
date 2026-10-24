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
