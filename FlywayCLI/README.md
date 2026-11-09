# FlywayCLI@1 — documentação atual

A implementação utilizada na extensão está em [index.cjs](index.cjs). Os arquivos `src/*.ts` antigos estão preservados apenas para referência histórica; os manifestos npm legados não fazem parte do build e foram removidos.

Documentação de **todos os parâmetros**: [Guia completo Flyway](../docs/USO-DA-EXTENSAO.md).

## Sem arquivos ou diretórios explícitos

```yaml
- task: FlywayCLI@1
  inputs:
    command: validate
    password: '$(DbPassword)'
```

Flyway procura automaticamente `flyway.conf`/`flyway.toml` no diretório padrão do job. Configure `flyway.locations` no arquivo. Não versione senhas.

## Com Secure File

```yaml
- task: DownloadSecureFile@1
  name: flywaySecure
  inputs:
    secureFile: 'flyway-qas.conf'
- task: FlywayCLI@1
  inputs:
    command: validate
    configFile: '$(flywaySecure.secureFilePath)'
```

`workingDirectory` é opcional nos dois casos. Se preenchido, define a pasta de execução e sobrescreve a localização das migrações com `FLYWAY_LOCATIONS`, por compatibilidade.
