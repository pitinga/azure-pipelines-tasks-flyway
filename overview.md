# Flyway - Database Migration Tasks (v1.1.4)

**Duas tasks modernas (Node24):**
- `FlywayInstaller@1`: instala a última versão estável `latest` ou versão exata, nas edições Redgate/Community.
- `FlywayCLI@1`: executa `validate`, `info`, `migrate`, `baseline`, `repair` e `clean` (bloqueado por padrão).

**Credenciais:** use `DownloadSecureFile@1` e forneça `$(flywaySecure.secureFilePath)` no campo `configFile` (arquivos `flyway.conf` / `flyway.toml`) ou utilize variáveis secretas para JDBC URL, usuário e senha. Não coloque segredos nos argumentos CLI.

```yaml
- task: DownloadSecureFile@1
  name: flywaySecure
  inputs:
    secureFile: 'flyway-qas.conf'
- task: FlywayInstaller@1
  inputs:
    flywayVersion: '13.11.1'
- task: FlywayCLI@1
  inputs:
    command: 'validate'
    workingDirectory: '$(Build.SourcesDirectory)/database/sql'
    configFile: '$(flywaySecure.secureFilePath)'
```

**Documentação de todos os parâmetros, exemplos e segurança:**
https://github.com/pitinga/azure-pipelines-tasks-flyway/blob/master/docs/USO-DA-EXTENSAO.md

Fixe a versão do Flyway em PRD para garantir releases reprodutíveis. Requer Azure Pipelines Agent >=4.265.1 (Node24).
