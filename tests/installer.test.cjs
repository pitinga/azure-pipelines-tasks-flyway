'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const installer=path.resolve(__dirname,'../FlywayInstaller/index.cjs');
function runWithMockFlyway(exitCode) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'flyway-verify-'));
 try {
  const working=path.join(root,'pipeline-work'),toolDir=path.join(root,'tools');
  const binaryDir=path.join(toolDir,'flyway','13.11.1',process.platform+'-'+process.arch+'-community');
  fs.mkdirSync(working,{recursive:true});fs.mkdirSync(binaryDir,{recursive:true});
  const binary=path.join(binaryDir,'flyway'),output=path.join(root,'check.json');
  fs.writeFileSync(binary,'#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.FLYWAY_TEST_OUTPUT,JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));\nconsole.log("Flyway 13.11.1");\nprocess.exit('+exitCode+');\n');
  fs.chmodSync(binary,0o755);
  const p=spawnSync(process.execPath,[installer],{encoding:'utf8',
    env:{...process.env,AGENT_TOOLSDIRECTORY:toolDir,
      SYSTEM_DEFAULTWORKINGDIRECTORY:working,INPUT_FLYWAYVERSION:'13.11.1',
      INPUT_EDITION:'community',FLYWAY_TEST_OUTPUT:output}});
  return {proc:p,info:fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null,working};
 } finally {fs.rmSync(root,{recursive:true,force:true});}
}
test('Installer runs flyway -v in pipeline cwd, prints version', {skip:process.platform==='win32'},()=>{
 const {proc,info,working}=runWithMockFlyway(0);
 assert.equal(proc.status,0,proc.stdout+proc.stderr);
 assert.deepEqual(info,{cwd:working,args:['-v']});
 assert.match(proc.stdout,/Flyway 13\.11\.1/);
 assert.match(proc.stdout,/task.prependpath/);
});
test('Installer fails if flyway -v exits with error', {skip:process.platform==='win32'},()=>{
 const {proc}=runWithMockFlyway(9);
 assert.equal(proc.status,1);
 assert.doesNotMatch(proc.stdout,/task.prependpath/);
});