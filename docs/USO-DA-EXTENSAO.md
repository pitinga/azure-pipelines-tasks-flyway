# Guia completo de uso — Flyway Tasks v1.2.1

## Fluxo de execução

Dentro do **mesmo job**:
1. `DownloadSecureFile@1` (se estiver usando Secure File);
2. `FlywayInstaller@1` (instala o Flyway, executa `flyway -v` a partir da pasta padrão do pipeline, mostra a versão e adiciona ao PATH do job);
3. `FlywayCLI@1` (executa `validate`, `info`, `migrate` etc.).

O agente precisa acessar o banco de dados pela rede/DNS/firewall. A task não abre tunelamento nem cria o banco. Para banco privado no Azure, use um agente com acesso à VNet ou rota adequada.

## Todos os parâmetros — FlywayInstaller@1

| Parâmetro YAML | Padrão | Explicação |
|---|---|---|
| `flywayVersion` | `latest` | Consulta a versão estável mais recente no GitHub (`api.github.com/repos/flyway/flyway/releases/latest`) **a cada execução** e instala essa versão. Também aceita `13.11.1`, por exemplo. Prefira **versão fixa em PRD** para reprodutibilidade. Se a consulta falhar, a task falha: não utiliza uma versão antiga silenciosamente. |
| `edition` | `redgate` | `redgate`: distribuição no servidor Redgate. `community`: distribuição open-source; downloads pelo Maven Central até 11.8.x e pelo GitHub Releases a partir de 11.9.0. Funcionalidades dependem de edição/licença. |
| `sha256` | vazio | Hash SHA-256 opcional, com 64 dígitos hexadecimais, verificado **apenas durante download novo**; não revalida pacotes existentes no cache. Para uso, consulte o checksum disponibilizado pelo fornecedor. |

Download 404 do Maven Central para Flyway 13.x indica task antiga: instale a versão 1.1.1 desta extensão, use `edition: community` e selecione `flywayVersion: 13.10.3` ou superior. Os IDs da extensão modernizada não substituem a task legacy de outro publisher.\n\nDownloads por HTTPS. Plataformas previstas no código: Windows x64, Linux x64, macOS x64 e ARM64. O agente precisa alcançar `api.github.com` para `latest`, além do domínio de download da edição escolhida.

**Atenção:** `latest` indica o último release estável **na execução do pipeline**; uma atualização do Flyway entre duas execuções pode introduzir incompatibilidades. Fixe a versão em PRD.

**Verificação do instalador:** inclusive quando o Flyway já estiver no cache, o instalador executa `flyway -v` (Windows: `flyway.cmd -v`) a partir de `$(System.DefaultWorkingDirectory)`; se essa variável não estiver definida, usa `$(Build.SourcesDirectory)` ou o diretório do processo. Exibe a versão efetiva no log. Se o comando falhar, a task termina com erro sem adicionar o executável ao PATH.

## Todos os parâmetros — FlywayCLI@1

| Parâmetro YAML | Padrão | Explicação |
|---|---|---|
| `command` | `validate` | `validate`: confere migrações; `info`: mostra histórico; `migrate`: aplica pendentes; `baseline`: cria marco inicial; `repair`: corrige metadados; `clean`: pode **remover objetos** dos schemas (bloqueado por padrão). |
| `workingDirectory` | **vazio; opcional** | Sem valor, executa no diretório padrão do pipeline e **não substitui** `FLYWAY_LOCATIONS`/`flyway.locations` da configuração. Se for definido, executa nessa pasta e, para preservar a compatibilidade, aplica `FLYWAY_LOCATIONS=filesystem:<pasta>`. |
| `configFile` | **vazio; opcional** | Sem valor, o Flyway procura automaticamente `flyway.conf`/`flyway.toml` no diretório de execução, diretório do usuário e instalação. Se for Secure File do Azure DevOps, informe `$(flywaySecure.secureFilePath)`: arquivos temporários não são descobertos automaticamente. |
| `url` | vazio | JDBC URL, por exemplo `jdbc:postgresql://host:5432/base` ou `jdbc:sqlserver://host:1433;databaseName=Base;encrypt=true;trustServerCertificate=false`. Quando preenchida, tem precedência sobre `configFile`. |
| `user` | vazio | Conta de migração no banco. Se preenchida, prevalece sobre a configuração do Secure File. |
| `password` | vazio | Senha em variável secreta `$(DbPassword)`, ou deixe em branco para usar a senha do Secure File. Não é colocada na lista de argumentos do Flyway. |
| `commandOptions` | vazio | Outras opções (`-outOfOrder=true`, `-baselineOnMigrate=false` etc.). Aspas suportadas para espaços. Não informe `-password`, `-url`, `-user`, tokens, licenças ou segredo neste campo. |
| `allowClean` | `false` | Requer `true` para o comando destrutivo `clean`. Não contorna a configuração `cleanDisabled` do Flyway nem substitui proteções de ambiente. |
| `flywayPath` | vazio | Caminho absoluto do executável `flyway` ou `flyway.cmd`. Em geral é desnecessário se usar a task Installer antes. |

## Opção A — Modo automático: sem workingDirectory e sem configFile

Se o repositório tiver `flyway.conf` ou `flyway.toml` na pasta padrão de execução do pipeline, você pode usar apenas:

```yaml
steps:
- task: FlywayInstaller@1
  inputs:
    flywayVersion: '13.11.1'
- task: FlywayCLI@1
  inputs:
    command: 'validate'
    password: '$(DbPassword)' # variável secreta em Azure DevOps, se necessária
```

Exemplo de `flyway.conf`, sem senha:

```properties
flyway.url=jdbc:postgresql://db-qas.exemplo.local:5432/minha_base
flyway.user=deploy
flyway.locations=filesystem:database/sql
```

No formato TOML, use `[flyway] locations = ["filesystem:database/sql"]` e `[environments.default]` com `url` e `user`. `flyway.locations` é a opção que indica **onde estão os scripts SQL**. Já `workingDirectory` é um parâmetro de execução do Flyway (não uma propriedade normal do `flyway.conf`).

Quando ambos os inputs são omitidos, a task utiliza `SYSTEM_DEFAULTWORKINGDIRECTORY` do agente (fallback `BUILD_SOURCESDIRECTORY`, depois cwd). O Flyway usa suas regras nativas para detectar o arquivo. Nenhuma sobrescrita de `FLYWAY_LOCATIONS` ou `FLYWAY_CONFIG_FILES` é feita pela task. Arquivos TOML e CONF possuem regras próprias de precedência: consulte a documentação Redgate.

**Não versione senhas no GitHub**. A variável `DbPassword` deve ser marcada secreta, ou use Secure File (opção B). Veja [pipeline de configuração automática](../examples/azure-pipelines-auto-config.yml).

## Opção B — Secure File: caminho explícito do arquivo protegido

Recomendado para conservar a arquitetura que utiliza um `flyway.conf` protegido:

1. Fora do repositório, crie `flyway-qas.conf` (arquivo de texto). Exemplo:
   ```properties
   flyway.url=jdbc:sqlserver://sql-qas.exemplo.local:1433;databaseName=MinhaBase;encrypt=true;trustServerCertificate=false
   flyway.user=usuario_deploy
   flyway.password=SENHA_REAL_SOMENTE_NO_SECURE_FILE
   flyway.locations=filesystem:database/sql
   ```
2. Azure DevOps → **Pipelines → Library → Secure files → Upload**. Selecione `flyway-qas.conf`.
3. Configure **Pipeline permissions** para autorizar somente o pipeline correto. Restrinja quem pode acessar os recursos.
4. Em YAML use `DownloadSecureFile@1`, com **`name: flywaySecure`**. A saída é **`$(flywaySecure.secureFilePath)`**, caminho onde o agente armazenou o arquivo.
5. Configure `FlywayCLI@1` com `configFile: '$(flywaySecure.secureFilePath)'`. Deixe `url`, `user`, `password` vazios se já estão no arquivo. **`workingDirectory` pode ser omitido** quando o Secure File configurar `flyway.locations`.
6. Use `validate` ou `info` primeiro; após conferir o banco, use `migrate` em pipelines autorizados.

Exemplo completo: [azure-pipelines-secure-file.yml](../examples/azure-pipelines-secure-file.yml).

Também aceita **TOML moderno**:

```toml
[environments.default]
url = "jdbc:postgresql://pg-qas.exemplo.local:5432/minha_base"
user = "usuario_deploy"
password = "SENHA_REAL_SOMENTE_NO_SECURE_FILE"
```

Não misture os formatos TOML e legacy CONF na mesma configuração. Os arquivos com dados reais não devem entrar no GitHub nem ser copiados para artefatos.

**Precedência Flyway:** parâmetros CLI > variáveis de ambiente > arquivo de configuração > defaults. Os campos `url`, `user`, `password` preenchidos na task sobrepõem valores do Secure File porque são passados por `FLYWAY_URL`, `FLYWAY_USER` e `FLYWAY_PASSWORD`.

## Opção C — Variáveis secretas do pipeline

1. Crie um Variable Group, por exemplo `Flyway-QAS`, com `DbJdbcUrl`, `DbUser` e **`DbPassword` marcado secret**.
2. Na `FlywayCLI@1`, preencha `url: '$(DbJdbcUrl)'`, `user: '$(DbUser)'` e `password: '$(DbPassword)'`.
3. Não escreva a senha diretamente no YAML nem em `commandOptions`.
4. Veja o [YAML com variáveis](../examples/azure-pipelines-variables.yml).

## JDBC URLs típicas

| Banco | JDBC URL exemplo |
|---|---|
| PostgreSQL | `jdbc:postgresql://pg-qas.exemplo.local:5432/minha_base` |
| SQL Server | `jdbc:sqlserver://sql-qas.exemplo.local:1433;databaseName=MinhaBase;encrypt=true;trustServerCertificate=false` |
| MySQL | `jdbc:mysql://mysql-qas.exemplo.local:3306/minha_base` |

Não coloque `password=` na própria URL. Configure driver, certificado confiável e permissões de banco conforme a plataforma; em produção, não desative a validação TLS.

## Comandos: quando usar

- **validate** — confere consistência e checksums das migrações registradas (boa primeira execução).
- **info** — lista versões e status das migrations.
- **migrate** — executa scripts SQL pendentes.
- **baseline** — cria estado inicial para banco existente; exige cautela.
- **repair** — ajusta metadados de histórico; não recupera alterações SQL perdidas.
- **clean** — pode remover objetos de schemas gerenciados; evite em PRD. Precisa `allowClean=true`, mas a configuração interna Flyway também pode bloquear.

## Diagnóstico
**Inputs realmente opcionais (v1.2.1):** `configFile`, `workingDirectory` e `flywayPath` são declarados como `string`, com valor padrão `""`, para impedir a substituição implícita pela raiz do repositório associada ao tipo `filePath` no Azure Pipelines. Quando omitidos, a task executa o Flyway sem definir `FLYWAY_CONFIG_FILES` e `FLYWAY_LOCATIONS`; use apenas `command: 'validate'` para testar a descoberta automática de `flyway.conf` na raiz do checkout. Se um caminho for informado explicitamente, ele continua validado. O teste não confirma conectividade com o banco sem uma execução real no agente.


Na v1.2.1, o log informa apenas se `configFile` e `workingDirectory` foram **informados** ou **omitidos**, sem revelar caminhos ou credenciais. Ausência, espaços e strings vazias entre aspas (`""`, `''`) não introduzem configurações no Flyway. Caminhos explicitamente inválidos continuam causando falha; macros `$(...)` não resolvidas geram mensagem específica.


| Erro | Verificação |
|---|---|
| Download Secure File negado | Recurso carregado na Library, permissão de Pipeline e referência `name`. |
| `configFile não é um arquivo acessível` | `DownloadSecureFile@1` no mesmo job e valor `$(flywaySecure.secureFilePath)` correto. |
| `Flyway não encontrado` | Executar Installer antes ou definir `flywayPath`; no mesmo job. |
| Falha em `latest` | Liberar HTTPS a `api.github.com`, conferir proxy e rate limit; ou fixar versão. |
| 404 durante download | Arquivo/versão da distribuição pode não existir; confirmar edição e plataforma. |
| Falha JDBC | DNS, firewall, VNet, porta, SQL login, driver e certificado. |
| Falha `validate` | Verifique mudanças em migrations aplicadas e histórico antes de cogitar `repair`. |
| `clean bloqueado` | Comportamento intencional para evitar exclusões acidentais. |

## Segurança e limitações

O Secure File é criptografado/gerenciado pelo Azure DevOps e removido do agente ao fim do job, mas seu conteúdo fica legível temporariamente ao processo Flyway. Restrinja acesso à Library, jobs e agentes, e não habilite logs de debug que possam expor informações de conexão.

**Validações ainda necessárias:** teste real do instalador para cada OS/distribuição, conectividade com bancos DEV/QAS, revisão de drivers e empacotamento oficial VSIX. A implementação e os testes unitários não constituem prova de que uma migração de produção foi validada.
