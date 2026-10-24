'use strict';
const path = require('node:path');

function getInput(name, fallback = '') {
  const key = `INPUT_${name.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}`;
  return Object.hasOwn(process.env, key) ? process.env[key] : fallback;
}
function requiredInput(name) {
  const value = getInput(name);
  if (!value || !value.trim()) throw new Error(`O parâmetro '${name}' é obrigatório.`);
  return value.trim();
}
function boolInput(name, fallback = false) {
  const value = getInput(name, String(fallback)).trim().toLowerCase();
  if (!['true', 'false'].includes(value)) throw new Error(`Parâmetro '${name}' deve ser true ou false.`);
  return value === 'true';
}
function escapeLogging(text) {
  return String(text).replace(/%/g, '%AZP25').replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A').replace(/\]/g, '%5D').replace(/;/g, '%3B');
}
function taskFail(err) {
  // Do not stringify nested errors, which could contain connection secrets.
  const message = err instanceof Error ? err.message : 'Falha inesperada na task';
  console.error(`##vso[task.logissue type=error]${escapeLogging(message)}`);
  console.log('##vso[task.complete result=Failed;]A task falhou');
  process.exitCode = 1;
}
function taskSuccess() {
  console.log('##vso[task.complete result=Succeeded;]Concluído');
}
function versionCheck(value) {
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9][A-Za-z0-9.-]*)?$/.test(value)) {
    throw new Error('A versão deve ter o formato 13.11.1 (sem caminhos ou URLs).');
  }
  return value;
}
function target(platform = process.platform, arch = process.arch) {
  const combinations = {
    'win32:x64': ['windows-x64.zip', '.cmd'],
    'linux:x64': ['linux-x64.tar.gz', ''],
    'darwin:x64': ['macosx-x64.tar.gz', ''],
    'darwin:arm64': ['macosx-arm64.tar.gz', '']
  };
  const found = combinations[`${platform}:${arch}`];
  if (!found) throw new Error(`Plataforma sem distribuição validada: ${platform}/${arch}`);
  return { archiveSuffix: found[0], executableSuffix: found[1], platform, arch };
}
function downloadUrl(version, edition = 'redgate', platform = process.platform, arch = process.arch) {
  versionCheck(version);
  const { archiveSuffix } = target(platform, arch);
  const filename = `flyway-commandline-${version}-${archiveSuffix}`;
  if (edition === 'redgate') {
    return `https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/${version}/${filename}`;
  }
  if (edition === 'community') {
    return `https://github.com/flyway/flyway/releases/download/flyway-${version}/${filename}`;
  }
  throw new Error('A edição deve ser redgate ou community.');
}
function parseOptions(source) {
  const args = [];
  let token = '';
  let quote = '';
  let started = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '\\' && quote && source[i + 1] === quote) {
      token += quote;
      i++;
    } else if (char === '"' || char === "'") {
      if (!quote) { quote = char; started = true; }
      else if (quote === char) quote = '';
      else token += char;
    } else if (/\s/.test(char) && !quote) {
      if (started) { args.push(token); token = ''; started = false; }
    } else {
      started = true;
      token += char;
    }
  }
  if (quote) throw new Error('Aspas não fechadas em commandOptions.');
  if (started) args.push(token);
  return args;
}
function validateOptions(options) {
  const denied = /^(?:-{1,2})(?:password|url|user|licensekey|token|environments\.[^.]+\.password)(?:=|$)/i;
  for (const value of options) {
    if (denied.test(value)) throw new Error('As opções url/user/password/licenseKey/token devem ser informadas por meio de variáveis de ambiente seguras, não em commandOptions.');
    if (process.platform === 'win32' && /[&|<>^%!\r\n]/.test(value)) throw new Error('Caracteres de shell não permitidos em commandOptions no Windows.');
  }
  return options;
}
function flywayLocation(directory) { return `filesystem:${path.resolve(directory)}`; }
function commandAllowed(command, allowClean = false) {
  const commands = ['migrate','validate','info','baseline','repair','clean'];
  if (!commands.includes(command)) throw new Error(`Comando Flyway não permitido: ${command}`);
  if (command === 'clean' && !allowClean) throw new Error('Comando clean bloqueado. Configure allowClean=true somente com aprovação de ambiente.');
  return command;
}
function findOnPath(name, envPath = process.env.PATH || '', platform = process.platform) {
  const fs = require('node:fs');
  for (const folder of envPath.split(path.delimiter)) {
    if (!folder) continue;
    const binary = path.join(folder, platform === 'win32' ? `${name}.cmd` : name);
    if (fs.existsSync(binary)) return binary;
  }
  return '';
}
module.exports = { getInput, requiredInput, boolInput, escapeLogging, taskFail, taskSuccess,
  versionCheck, target, downloadUrl, parseOptions, validateOptions, flywayLocation,
  commandAllowed, findOnPath };
