# FlywayInstaller@1 — documentação atual

A implementação executada pela task encontra-se em [index.cjs](index.cjs). Os arquivos TypeScript antigos continuam no repositório apenas como referência histórica.

A instalação usa `latest` (último release estável) por padrão ou permite uma versão fixa, por exemplo `13.11.1`. Escolha a distribuição `redgate` ou `community`.

**Novo:** após download ou cache, a task executa `flyway -v` no diretório padrão do pipeline, imprime no log a versão instalada e falha caso o executável não funcione. Somente após sucesso adiciona o Flyway ao PATH dos próximos passos do mesmo job.

Veja o [Guia completo Flyway](../docs/USO-DA-EXTENSAO.md) para os demais parâmetros, downloads e exemplos de pipeline.
