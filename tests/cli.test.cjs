'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cli=path.resolve(__dirname,'../FlywayCLI/index.cjs');
test('CLI clean blocked by default',()=>{
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8',env:{...process.env,INPUT_COMMAND:'clean',INPUT_ALLOWCLEAN:'false'}});
 assert.equal(r.status,1); assert.match(r.stdout+r.stderr,/clean bloqueado/);
});
test('CLI secrets kept out of argv',{skip:process.platform==='win32'},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'flyway-test-'));
 try {
  const fake=path.join(tmp,'flyway'),out=path.join(tmp,'out.json');
  fs.writeFileSync(fake,'#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.FLYWAY_TEST_RESULT,JSON.stringify({args:process.argv.slice(2),password:process.env.FLYWAY_PASSWORD}));\n');
  fs.chmodSync(fake,0o755);
  const r=spawnSync(process.execPath,[cli],{encoding:'utf8',env:{...process.env,INPUT_COMMAND:'migrate',INPUT_WORKINGDIRECTORY:tmp,INPUT_FLYWAYPATH:fake,INPUT_PASSWORD:'test-secret',FLYWAY_TEST_RESULT:out}});
  assert.equal(r.status,0,r.stdout+r.stderr);
  const data=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(data.password,'test-secret');
  assert.ok(!data.args.join(' ').includes('test-secret'));
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('CLI uses secure config via FLYWAY_CONFIG_FILES without exposing secret', {skip:process.platform==='win32'},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'flyway-secure-'));
 try{
  const fake=path.join(tmp,'flyway'),out=path.join(tmp,'captured.json'),config=path.join(tmp,'flyway.conf');
  fs.writeFileSync(config, 'flyway.url=jdbc:postgresql://host/db\nflyway.user=deploy\nflyway.password=only-in-secure-file\n');
  fs.writeFileSync(fake,'#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.FLYWAY_TEST_RESULT,JSON.stringify({args:process.argv.slice(2),configFiles:process.env.FLYWAY_CONFIG_FILES}));\n');
  fs.chmodSync(fake,0o755);
  const r=spawnSync(process.execPath,[cli],{encoding:'utf8',env:{
    ...process.env,INPUT_COMMAND:'validate',INPUT_WORKINGDIRECTORY:tmp,INPUT_FLYWAYPATH:fake,INPUT_CONFIGFILE:config,FLYWAY_TEST_RESULT:out
  }});
  assert.equal(r.status,0,r.stdout+r.stderr);
  const data=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(data.configFiles,config);
  assert.ok(!data.args.join(' ').includes('only-in-secure-file'));
  assert.ok(!(r.stdout+r.stderr).includes('only-in-secure-file'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('CLI refuses missing configuration file',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'flyway-no-config-'));
 try{
  const fake=path.join(tmp,process.platform==='win32'?'flyway.cmd':'flyway');
  fs.writeFileSync(fake,'');
  const r=spawnSync(process.execPath,[cli],{encoding:'utf8',env:{
    ...process.env,INPUT_COMMAND:'validate',INPUT_WORKINGDIRECTORY:tmp,INPUT_FLYWAYPATH:fake,INPUT_CONFIGFILE:path.join(tmp,'missing.conf')
  }});
  assert.equal(r.status,1);
  assert.match(r.stdout+r.stderr,/configFile não é um arquivo acessível/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
