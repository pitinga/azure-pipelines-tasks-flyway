# Flyway Tasks para Azure DevOps — v1.1.0

Extensão independente para Azure DevOps Pipelines. Modernização do projeto MIT de Mathieu Filotto.

> **Leia o [Guia completo do usuário](docs/USO-DA-EXTENSAO.md):** documentação de todos os parâmetros, exemplos JDBC, senhas, Secure Files, versionamento e troubleshooting.

## Tarefas

- `FlywayInstaller@1`: instala Flyway Redgate ou Community. **`flywayVersion: latest`** é o padrão e busca o último release estável ao executar o job. Para PRD, **fixe a versão**.
- `FlywayCLI@1`: comandos `validate` (padrão), `info`, `migrate`, `baseline`, `repair` e `clean` (bloqueado por padrão). Configuração via Secure File `.conf` / `.toml` ou variáveis secretas.

## Conexão segura com banco — método Secure File

1. Crie, fora do repositório, um arquivo `flyway-qas.conf` com o endereço do banco, usuário e senha.
2. Faça upload em **Pipelines → Library → Secure files**, autorizando explicitamente o pipeline.
3. Use `DownloadSecureFile@1` para obter o arquivo e repassar seu caminho em `configFile`.

Exemplo do arquivo (a senha abaixo é apenas ilustrativa — a real fica **somente** no Secure File):

```properties
flyway.url=jdbc:sqlserver://sql-qas.exemplo.local:1433;databaseName=MinhaBase;encrypt=true;trustServerCertificate=false
flyway.user=usuario_deploy
flyway.password=SENHA_REAL_SOMENTE_NO_SECURE_FILE
```

```yaml
steps:
- task: DownloadSecureFile@1
  name: flywaySecure
  inputs:
    secureFile: 'flyway-qas.conf'
- task: FlywayInstaller@1
  inputs:
    flywayVersion: '13.11.1' # PRD: versão fixa; omitido = latest
- task: FlywayCLI@1
  inputs:
    command: 'validate'
    workingDirectory: '$(Build.SourcesDirectory)/database/sql'
    configFile: '$(flywaySecure.secureFilePath)'
```

O Secure File é removido automaticamente ao finalizar o job pela task Microsoft. O `configFile` é passado ao processo Flyway por `FLYWAY_CONFIG_FILES`, não impresso no log nem lido pela própria task. Alternativamente, use `url`, `user` e `password` com variável secreta. **Não versione arquivos com credenciais.**

## Testes e VSIX

Requer Node >=22 localmente e Azure Pipelines Agent >=4.265.1 com executor Node24.

```powershell
npm run test
npm run build
npm run package
```

O publisher `pitinga` no manifesto é provisório: confirme se esse ID existe no Marketplace. Publicação e teste real de Flyway em agentes Windows/Linux com banco não foram realizados.

## Exemplos

- [Pipeline usando Secure File](examples/azure-pipelines-secure-file.yml)
- [Pipeline usando variável secreta](examples/azure-pipelines-variables.yml)
- [Arquivo flyway.conf de exemplo](examples/flyway.conf.example)
- [Arquivo flyway.toml de exemplo](examples/flyway.toml.example)
- [Guia completo: todos os inputs e solução de problemas](docs/USO-DA-EXTENSAO.md)
