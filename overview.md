# Database Migration Tasks (Flyway)

Extensão independente e privada para Azure DevOps Pipelines.

- `FlywayInstaller@1`: instala e adiciona Flyway ao PATH do agente.
- `FlywayCLI@1`: executa migrate, validate, info, baseline, repair e clean (bloqueado por padrão).

Requer agente Azure Pipelines 4.265.1 ou superior com handler Node24. Armazene credenciais em variáveis secretas do pipeline e valide a extensão em DEV/QAS antes de PRD.
