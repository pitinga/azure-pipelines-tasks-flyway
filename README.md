# Flyway Tasks para Azure DevOps — v1.2.2

Extensão independente para Azure DevOps Pipelines. Modernização do projeto MIT de Mathieu Filotto.

> **Leia o [Guia completo do usuário](docs/USO-DA-EXTENSAO.md):** documentação de todos os parâmetros, exemplos JDBC, senhas, Secure Files, versionamento e troubleshooting.

## Tarefas

- `FlywayInstaller@1`: instala Flyway Redgate ou Community (Community usa Maven antes de 11.9.0 e GitHub Releases a partir de 11.9.0). **`flywayVersion: latest`** é o padrão e busca o último release estável ao executar o job. Para PRD, **fixe a versão**.
- `FlywayCLI@1`: comandos `validate` (padrão), `info`, `migrate`, `baseline`, `repair` e `clean` (bloqueado por padrão). `workingDirectory` e `configFile` são opcionais. Sem eles, Flyway pode descobrir `flyway.conf`/`flyway.toml` automaticamente.

## Duas maneiras de usar a configuração

### Opção 1: descoberta automática (ambos os parâmetros opcionais)

Se `flyway.conf` ou `flyway.toml` estiver no diretório padrão de execução do pipeline, basta:

```yaml
steps:
- task: FlywayInstaller@1
  inputs:
    flywayVersion: '13.11.1'
- task: FlywayCLI@1
  inputs:
    command: 'validate'
```

Configure a pasta dos scripts SQL em `flyway.locations=filesystem:database/sql` (CONF)
ou em `[flyway] locations = ["filesystem:database/sql"]` (TOML).
Evite colocar senhas no arquivo versionado: use uma variável secreta (`password: '$(DbPassword)'`)
ou um Secure File. Sem `workingDirectory`, não há override de `FLYWAY_LOCATIONS`.

### Opção 2: Secure File no Azure DevOps

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
    edition: 'community' # Download oficial GitHub Releases
- task: FlywayCLI@1
  inputs:
    command: 'validate'
    # workingDirectory omitido: scripts em flyway.locations dentro do Secure File
    configFile: '$(flywaySecure.secureFilePath)'
```

O parâmetro `configFile` é necessário para Secure Files porque o Azure DevOps baixa o arquivo numa pasta temporária; o Flyway não o descobriria automaticamente. Se preferir, `workingDirectory` continua disponível para apontar explicitamente para uma pasta SQL (o que define `FLYWAY_LOCATIONS` e sobrepõe os locations do arquivo). O campo `workingDirectory` não deve ser confundido com `flyway.locations`.

Depois de instalar ou reutilizar o Flyway do cache, `FlywayInstaller@1` executa **`flyway -v` no diretório padrão do pipeline**, exibe a versão efetiva e falha se o teste retornar erro.

O Secure File é removido automaticamente ao finalizar o job pela task Microsoft. O `configFile` é passado ao processo Flyway por `FLYWAY_CONFIG_FILES`, não impresso no log nem lido pela própria task. Alternativamente, use `url`, `user` e `password` com variável secreta. **Não versione arquivos com credenciais.**

## Testes e VSIX

Requer Node >=22 localmente e Azure Pipelines Agent >=4.265.1 com executor Node24.

```powershell
npm run test
npm run build
npm run package
```

O manifesto utiliza o publisher `pitinga`. O pacote gerado no GitHub Releases é um pré-lançamento técnico; a publicação no Visual Studio Marketplace requer credenciais/permissões do publisher. A nova extensão possui IDs de task próprios e **não substitui automaticamente** a extensão antiga `mfilotto`. Teste a instalação e migrations em ambiente DEV/QAS antes de PRD.

## Exemplos

- [Pipeline com descoberta automática de flyway.conf/toml](examples/azure-pipelines-auto-config.yml)
- [Pipeline usando Secure File](examples/azure-pipelines-secure-file.yml)
- [Pipeline usando variável secreta](examples/azure-pipelines-variables.yml)
- [Arquivo flyway.conf de exemplo](examples/flyway.conf.example)
- [Arquivo flyway.toml de exemplo](examples/flyway.toml.example)
- [Guia completo: todos os inputs e solução de problemas](docs/USO-DA-EXTENSAO.md)
