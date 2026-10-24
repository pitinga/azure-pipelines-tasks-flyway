'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { getInput, requiredInput, boolInput, taskFail, taskSuccess, parseOptions,
  validateOptions, flywayLocation, commandAllowed, findOnPath } = require(require('node:fs').existsSync(require('node:path').join(__dirname, 'runtime.cjs')) ? './runtime.cjs' : '../shared/runtime.cjs');

async function invoke(file, args, options) {
  // .cmd wrappers require a Windows command interpreter; PowerShell receives only a
  // base64-encoded script with JSON-decoded arguments (no shell string interpolation).
  let executable = file;
  let argv = args;
  if (process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(file)) {
    const json = JSON.stringify({ file, args });
    const payload = Buffer.from(json, 'utf8').toString('base64');
    const script = `$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')) | ConvertFrom-Json; $exe = [string]$p.file; $argv = [string[]]@($p.args); & $exe @argv; exit $LASTEXITCODE`;
    executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    argv = ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
  }
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, { stdio: 'inherit', shell: false, ...options });
    child.on('error', reject);
    child.on('close', (code, signal) => signal
      ? reject(new Error(`Flyway interrompido por sinal ${signal}.`))
      : code === 0 ? resolve() : reject(new Error(`Flyway retornou código ${code}.`)));
  });
}

async function run() {
  const command = commandAllowed(requiredInput('command'), boolInput('allowClean'));
  const directory = path.resolve(getInput('workingDirectory', process.cwd()));
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Diretório de scripts inexistente: ${directory}`);
  }
  const supplied = getInput('flywayPath');
  const executable = supplied || findOnPath('flyway');
  if (!executable || !fs.existsSync(executable)) throw new Error('Flyway não encontrado. Execute a task FlywayInstaller antes de FlywayCLI ou configure flywayPath.');
  const args = validateOptions(parseOptions(getInput('commandOptions')));
  const env = { ...process.env, FLYWAY_LOCATIONS: flywayLocation(directory) };
  // Env avoids sensitive connection values appearing in the process command line.
  for (const [input, key] of [['url','FLYWAY_URL'], ['user','FLYWAY_USER'], ['password','FLYWAY_PASSWORD']]) {
    const value = getInput(input);
    if (value) env[key] = value;
  }
  console.log(`Executando Flyway: ${command}; diretório: ${directory}`);
  await invoke(executable, [...args, command], { cwd: directory, env });
}
if (require.main === module) run().then(taskSuccess).catch(taskFail);
module.exports = { run, invoke };
