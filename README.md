# Flyway Azure Pipelines Tasks — modernização 1.0.0

Branch de modernização do projeto originalmente criado por Mathieu Filotto, sob licença MIT. A branch master foi preservada.

## Implementação

- FlywayInstaller@1 e FlywayCLI@1, novos GUIDs e handler Node24
- Código JavaScript sem dependências npm de runtime
- Variáveis de ambiente para FLYWAY_URL, FLYWAY_USER e FLYWAY_PASSWORD
- Comando clean desabilitado por padrão
- Versão padrão Flyway 13.11.1; agente mínimo 4.265.1

## Comandos PowerShell 7

```powershell
npm run test
npm run build
npm run package
```

O pacote VSIX precisa ser validado com tfx-cli antes de publicar. O publisher `pitinga` é provisório: confirme no Marketplace. Publicação privada até realizar os testes em agente e banco reais.

## Azure Pipelines YAML

```yaml
steps:
  - task: FlywayInstaller@1
    inputs:
      flywayVersion: '13.11.1'
      edition: redgate
  - task: FlywayCLI@1
    inputs:
      command: validate
      workingDirectory: '$(Build.SourcesDirectory)/database/sql'
      url: '$(DbJdbcUrl)'
      user: '$(DbUser)'
      password: '$(DbPassword)'
```

A variável DbPassword deve ser secreta. Não envie credenciais diretamente nas opções CLI.

## Limitações e validação

O build e a execução em agentes Windows/Linux e bancos reais precisam de testes de integração. Os executáveis Flyway são baixados durante o job. O checksum informado só é validado ao baixar (não ao reutilizar cache). Em caso de política corporativa de rede, configure o acesso HTTPS à fonte do Flyway.
