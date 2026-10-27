'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { spawn } = require('node:child_process');
const { getInput, requiredInput, taskFail, taskSuccess, versionCheck, releaseVersion, target, downloadUrl } = require(require('node:fs').existsSync(require('node:path').join(__dirname, 'runtime.cjs')) ? './runtime.cjs' : '../shared/runtime.cjs');

async function resolveVersion(inputVersion) {
  if (inputVersion !== 'latest') return versionCheck(inputVersion);
  const url = 'https://api.github.com/repos/flyway/flyway/releases/latest';
  const response = await new Promise((resolve, reject) => {
    const req = https.get(url, {timeout: 15000,
      headers: {'User-Agent':'azure-pipelines-flyway-installer','Accept':'application/vnd.github+json'}
    }, resolve);
    req.once('timeout', () => req.destroy(new Error('Timeout ao consultar o latest Flyway.')));
    req.once('error', reject);
  });
  if (response.statusCode !== 200) {
    response.resume();
    throw new Error(`Falha ao consultar latest do Flyway (HTTP ${response.statusCode}). Fixe uma versão ou libere api.github.com no proxy.`);
  }
  let json = '';
  for await (const chunk of response) {
    json += chunk.toString('utf8');
    if (json.length > 131072) throw new Error('Resposta de release excessivamente grande.');
  }
  const version = releaseVersion(JSON.parse(json));
  console.log(`Versão estável latest do Flyway: ${version}`);
  return version;
}
async function exec(file, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: 'inherit', shell: false, ...options });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`Falha ao executar ${path.basename(file)} (exit ${code}).`)));
  });
}
async function verifyInstalledFlyway(binary) {
  // The version check runs with the pipeline's default working directory.
  const directory = path.resolve(process.env.SYSTEM_DEFAULTWORKINGDIRECTORY ||
    process.env.BUILD_SOURCESDIRECTORY || process.cwd());
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error('Diretório padrão do pipeline não encontrado para verificar flyway -v.');
  }
  let executable = binary;
  let args = ['-v'];
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(binary)) {
    // PowerShell executes Windows .cmd safely, without constructing shell arguments.
    const script = `& '${binary.replace(/'/g, "''")}' -v; exit $LASTEXITCODE`;
    executable = path.join(process.env.SystemRoot || 'C:\\Windows',
      'System32','WindowsPowerShell','v1.0','powershell.exe');
    args = ['-NoProfile','-NonInteractive','-EncodedCommand',
      Buffer.from(script,'utf16le').toString('base64')];
  }
  console.log(`Testando instalação a partir de ${directory}: flyway -v`);
  await exec(executable, args, { cwd: directory });
  console.log('Verificação da versão do Flyway concluída.');
}
async function download(url, destination, redirects = 0) {
  if (redirects > 6) throw new Error('Limite de redirecionamentos excedido.');
  if (new URL(url).protocol !== 'https:') throw new Error('Download sem HTTPS não permitido.');
  const response = await new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 120_000 }, resolve);
    req.once('error', reject);
    req.once('timeout', () => req.destroy(new Error('Tempo de conexão esgotado.')));
  });
  if ([301,302,303,307,308].includes(response.statusCode)) {
    const next = response.headers.location;
    response.resume();
    if (!next) throw new Error('Redirecionamento sem URL de destino.');
    return download(new URL(next, url).href, destination, redirects + 1);
  }
  if (response.statusCode !== 200) {
    response.resume();
    throw new Error(`Falha HTTP ${response.statusCode} ao baixar o Flyway.`);
  }
  await pipeline(response, fs.createWriteStream(destination, { flags: 'wx' }));
}
async function verifySha256(filename, expected) {
  if (!expected) return;
  if (!/^[a-fA-F0-9]{64}$/.test(expected)) throw new Error('sha256 deve conter exatamente 64 dígitos hexadecimais.');
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
  const actual = hash.digest('hex');
  if (actual.toLowerCase() !== expected.toLowerCase()) throw new Error('SHA-256 do pacote Flyway não confere!');
}
async function extract(filename, destination) {
  if (process.platform === 'win32') {
    const quote = text => String(text).replace(/'/g, "''");
    const script = `Expand-Archive -LiteralPath '${quote(filename)}' -DestinationPath '${quote(destination)}' -Force`;
    await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')]);
  } else {
    await exec('tar', ['-xzf', filename, '-C', destination]);
  }
}
async function run() {
  const version = await resolveVersion(getInput('flywayVersion', 'latest').trim() || 'latest');
  const edition = getInput('edition', 'redgate').trim();
  if (!['redgate', 'community'].includes(edition)) throw new Error('Distribuição deve ser redgate ou community.');
  const wantedHash = getInput('sha256').trim();
  if (wantedHash && !/^[a-f0-9]{64}$/i.test(wantedHash)) throw new Error('sha256 deve ter 64 caracteres hexadecimais.');
  const { executableSuffix } = target();
  const toolsDir = process.env.AGENT_TOOLSDIRECTORY || path.join(os.homedir(), '.flyway-agent-tools');
  const cache = path.join(toolsDir, 'flyway', version, `${process.platform}-${process.arch}-${edition}`);
  const binary = path.join(cache, `flyway${executableSuffix}`);
  if (!fs.existsSync(binary)) {
    const temp = fs.mkdtempSync(path.join(process.env.AGENT_TEMPDIRECTORY || os.tmpdir(), 'flyway-'));
    const archive = path.join(temp, process.platform === 'win32' ? 'flyway.zip' : 'flyway.tar.gz');
    const extracted = path.join(temp, 'extract');
    fs.mkdirSync(extracted, { recursive: true });
    try {
      const url = downloadUrl(version, edition);
      console.log(`Instalando Flyway ${version} (${edition}) para ${process.platform}/${process.arch}`);
      await download(url, archive);
      await verifySha256(archive, wantedHash);
      await extract(archive, extracted);
      const source = path.join(extracted, `flyway-${version}`);
      if (!fs.existsSync(path.join(source, `flyway${executableSuffix}`))) {
        throw new Error('O pacote não contém o executável Flyway esperado.');
      }
      fs.mkdirSync(path.dirname(cache), { recursive: true });
      // Same-volume atomic rename ensures other jobs do not see a partial install.
      const staging = `${cache}.staging-${crypto.randomUUID()}`;
      fs.cpSync(source, staging, { recursive: true });
      if (process.platform !== 'win32') fs.chmodSync(path.join(staging, 'flyway'), 0o755);
      try { fs.renameSync(staging, cache); }
      catch (err) {
        fs.rmSync(staging, { recursive: true, force: true });
        if (!fs.existsSync(binary)) throw err;
      }
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  } else if (wantedHash) {
    console.warn('Pacote já em cache: SHA-256 informado somente é aplicado a novos downloads.');
  }
  await verifyInstalledFlyway(binary);
  console.log(`##vso[task.prependpath]${path.dirname(binary)}`);
  console.log(`Flyway preparado: ${binary}`);
  return binary;
}
if (require.main === module) run().then(taskSuccess).catch(taskFail);
module.exports = { run, download, extract, verifySha256, resolveVersion, verifyInstalledFlyway };
