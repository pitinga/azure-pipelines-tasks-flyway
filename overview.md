# Flyway - Database Migration Tasks (v1.2.1)

**Duas tasks modernas (Node24):**
- `FlywayInstaller@1`: instala a última versão estável `latest` ou versão exata, nas edições Redgate/Community, e executa `flyway -v` no diretório padrão do pipeline para mostrar e verificar a versão.
- `FlywayCLI@1`: executa `validate`, `info`, `migrate`, `baseline`, `repair` e `clean` (bloqueado por padrão). `configFile` e `workingDirectory` são opcionais; sem eles, Flyway utiliza os arquivos/configurações padrão.

**Modo automático:** quando `flyway.conf` ou `flyway.toml` estiver na pasta padrão do pipeline, use apenas `FlywayCLI@1` com `command: validate` e sem `configFile` nem `workingDirectory`. Configure as migrations em `flyway.locations` e mantenha a senha numa variável secreta.

**Modo Secure File:** use `DownloadSecureFile@1` e forneça `$(flywaySecure.secureFilePath)` no campo `configFile` (arquivos `flyway.conf` / `flyway.toml`) ou utilize variáveis secretas para JDBC URL, usuário e senha. Não coloque segredos nos argumentos CLI.

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
    # workingDirectory omitido; locations definidas no arquivo protegido
    configFile: '$(flywaySecure.secureFilePath)'
```

**Documentação de todos os parâmetros, exemplos e segurança:**
https://github.com/pitinga/azure-pipelines-tasks-flyway/blob/master/docs/USO-DA-EXTENSAO.md

Fixe a versão do Flyway em PRD para garantir releases reprodutíveis. Requer Azure Pipelines Agent >=4.265.1 (Node24).
