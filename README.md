# Monedero Andino

Billetera digital. API HTTP en Node 20 sobre AWS Lambda, con SQLite como persistencia.

Repositorio base del Laboratorio 4 de INF384.

## Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/saldo/{usuario}` | `{ usuario, saldo }` |
| GET | `/historial/{usuario}` | lista de movimientos |
| POST | `/transferir` | body `{ origen, destino, monto }` |
| GET | `/salud` | `{ ok, version, commit }` |
| GET | `/version` | `{ version, commit }` |

Usuarios semilla: `ana`, `beto`, `carla`, `diego`, `elena`.

## Fork

1. Hacer fork a su cuenta personal.
2. En el fork, abrir la pestaña **Actions** y habilitar los workflows.

## Secrets

Cargar en `Settings > Secrets and variables > Actions`, como **Secret**:

| Nombre | Origen |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS Academy, AWS Details |
| `AWS_SECRET_ACCESS_KEY` | AWS Academy, AWS Details |
| `AWS_SESSION_TOKEN` | AWS Academy, AWS Details |

La sesión de AWS Academy caduca. Al iniciar una nueva sesión, recargar los tres valores.

## Ejecutar el workflow

1. Abrir **Actions > ci**.
2. **Run workflow** sobre `main`.

El workflow también corre en cada `push` a `main` y en cada pull request. Los cambios que solo tocan archivos `.md` no lo disparan.

## Pull requests

Al abrir un pull request, elegir como base el `main` de su fork. GitHub propone por defecto el repositorio original.

La primera ejecución crea el repositorio ECR `monedero-andino`, la función Lambda `monedero-andino` y su Function URL. La URL aparece en el log del job `deploy`.
