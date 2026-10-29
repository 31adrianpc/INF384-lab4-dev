# Respuestas · Laboratorio 4
Alumno: 20212137
Presupuesto: 11 min  Métrica DORA: time to restore

## Parte 1 · Diagnóstico

Run base (antes de las correcciones): https://github.com/31adrianpc/INF384-lab4-dev/actions/runs/40957919640

### Defecto 1
- Job y etapa: `smoke`, etapa deploy (`needs: build-push`, al mismo nivel que `deploy`). Debe estar en post-deploy.
- Problema que causa en el pipeline: smoke arranca en paralelo con deploy, así que puede probar la Lambda con la versión anterior. Además, el workflow no le pasa `EXPECTED_COMMIT` y `smoke.sh` se salta la verificación de `/version`. Un despliegue que no se aplicó pasa el smoke, y `e2e` y `load` (que dependen de smoke) prueban una versión distinta a la del commit.
- Link al commit: https://github.com/31adrianpc/INF384-lab4-dev/commit/a5de287
- Corrección: mover de etapa (`needs: deploy`) + ajustar configuración (`EXPECTED_COMMIT: ${{ github.sha }}`).
- Evidencia: en el run base, `smoke` y `deploy` arrancan juntos después de `build-push` (grafo del run), y el log de smoke solo muestra `salud: {"ok":true,"version":"1.0.0","commit":"49ba49e..."}` sin la línea `commit:`: la verificación de versión no se ejecutó. Después de la corrección, el log de smoke del run https://github.com/31adrianpc/INF384-lab4-dev/actions/runs/40963964955 muestra `commit: fb3601e...`.

### Defecto 2
- Job y etapa: `integration`, pre-build (`test/integration/transferir.test.js`).
- Problema que causa en el pipeline: los tests comparten una misma base y cada uno depende del estado que dejó el anterior (900, 600, 750, 1500). El resultado depende del orden: un test aislado falla sin que haya un defecto en la aplicación, y cuando uno falla arrastra a los siguientes, lo que oculta cuál es el defecto real.
- Link al commit: https://github.com/31adrianpc/INF384-lab4-dev/commit/b203a01
- Corrección: modificar tests (cada test usa una base nueva con `beforeEach` y prepara su propio estado).
- Evidencia (salida local, test aislado):
  - Antes: `✖ el saldo de ana refleja el debito` → `+ saldo: 1000` / `- saldo: 900`
  - Después: `✔ el saldo de ana refleja el debito` → `pass 1, fail 0`

### Defecto 3
- Job y etapa: `sca`, pre-build.
- Problema que causa en el pipeline: con `--include-dev-deps` el job se detiene por vulnerabilidades en herramientas de desarrollo (Playwright, c8, esbuild) que no llegan a la imagen, porque el Dockerfile ejecuta `npm prune --omit=dev`. Un hallazgo que no es alcanzable en producción puede bloquear un despliegue, incluso una corrección urgente.
- Link al commit: https://github.com/31adrianpc/INF384-lab4-dev/commit/fb3601e
- Corrección: ajustar configuración + dejar como informativo (producción detiene; desarrollo se sigue escaneando, pero solo informa, porque esas herramientas corren en el runner con credenciales).
- Evidencia (salida local): `npm ls --all --parseable | wc -l` → 98; `npm ls --omit=dev --all --parseable | wc -l` → 39. Unos 59 de los paquetes que podían detener el pipeline no viajan en la imagen.

### Defecto 4
- Job y etapa: `load`, post-deploy (`test/load/transferir.js`).
- Problema que causa en el pipeline: `http.expectedStatuses(200, 400)` y el check "transferir 200 o 400" cuentan un 400 como respuesta correcta. Si `/transferir` empezara a responder 400 a todo, `http_req_failed` quedaría en 0 % y `checks` en 100 %: la prueba de carga deja pasar la regresión.
- Link al commit: https://github.com/31adrianpc/INF384-lab4-dev/commit/2d32b1b
- Corrección: modificar tests (solo 200 cuenta como éxito; check `transferir 200`).
- Evidencia: run base, resumen de k6: `checks_succeeded 100.00% 36436 out of 36436`, `http_req_failed 0.00%`, `✓ transferir 200 o 400`. El resumen no permite distinguir transferencias aceptadas de rechazadas.

### Defecto 5
- Job y etapa: `e2e`, post-deploy.
- Problema que causa en el pipeline: instala Chromium con las dependencias del sistema (`npx playwright install --with-deps chromium`) en cada run, aunque los tests solo hacen llamadas HTTP (`page.request`). Es tiempo desperdiciado en cada ejecución.
- Link al commit: https://github.com/31adrianpc/INF384-lab4-dev/commit/82de37a
- Corrección: eliminar (paso "Navegador") + modificar tests (fixture `request` en lugar de `page`).
- Evidencia: en el run base, el paso "Navegador" duró 20 s de los 34 s del job `e2e` (59 %).

## Parte 2 · Implementación
- Link al run en verde en main: https://github.com/31adrianpc/INF384-lab4-dev/actions/runs/40963964955
- Link al pull request: https://github.com/31adrianpc/INF384-lab4-dev/pull/1
- Defecto de la aplicación introducido (archivo y descripción): `src/wallet.js`, función `transferir`: la condición `cuentaOrigen.saldo < centimos` pasó a `<=`. Una transferencia por el saldo completo se rechaza con 400 "saldo insuficiente", aunque el usuario tiene exactamente ese monto. El cliente no puede vaciar su cuenta.
- Job que debería detenerlo: `unit` (pre-build), con el test "transferir todo el saldo deja el origen en cero". Es el nivel más barato de la pirámide: detecta el error de regla de negocio en milisegundos y señala la función exacta, antes de construir la imagen. `integration` también lo detecta ("diego transfiere todo su saldo a elena"). Como `build-push` depende de ambos, el bug no se publica ni se despliega.
- Link al run fallido: https://github.com/31adrianpc/INF384-lab4-dev/actions/runs/40964002336

## Parte 3 · Decisión bajo restricción
Link al run medido: https://github.com/31adrianpc/INF384-lab4-dev/actions/runs/40963964955

| Job | Duración (min:seg) |
|---|---|
| unit | 0:11 |
| integration | 0:13 |
| sast | 0:24 |
| sca | 0:24 |
| build-push | 0:53 |
| deploy | 0:18 |
| smoke | 0:09 |
| e2e | 0:14 |
| load | 12:11 |
| **Total** | **14:57** |

Resultado de load en ese run:
| Métrica | Valor |
|---|---|
| p90 | 48,77 ms |
| p95 | 51,22 ms |
| Máximo | 335,15 ms |
| Tasa de error | 0,00 % (0 de 36 664) |
| Requests por segundo | 50,89 req/s |

Conclusión sobre el comportamiento bajo carga: con 30 usuarios virtuales sostenidos durante 10 minutos, Monedero Andino responde de forma estable: p95 de 51 ms, con una cola corta (p90 49 ms, casi igual al p95) y 0 % de errores; además, el 100 % de las transferencias respondió 200, así que ninguna fue rechazada. El máximo de 335 ms es un caso aislado, compatible con el arranque en frío de una instancia nueva de Lambda, y no mueve el p95. Bajo esta carga el servicio tiene mucha holgura: el umbral anterior de 500 ms era unas 10 veces el p95 real.

SLO propuesto (percentil, valor, ventana) y justificación: el 95 % de las peticiones a la API responde en menos de 150 ms, medido en una ventana móvil de 30 días (en el pipeline, sobre la ventana de la prueba de carga). SLO_P95 = 150. El p95 medido es 51 ms: 150 ms deja un margen de casi 3 veces para absorber la variación normal entre runs y los arranques en frío, sin que load falle por ruido, y sigue detectando una regresión real. Con 500 ms, un servicio casi 10 veces más lento seguía pasando. Verificación: en el run con los cambios, el p95 fue 19,83 ms frente a 51,22 ms del run de la Parte 2, con el mismo código. La variación entre runs confirma que el margen es necesario.

SLA propuesto y diferencia con el SLO: el 95 % de las peticiones responde en menos de 500 ms y la disponibilidad mensual es de 99,5 %, con compensación al cliente si se incumple. El SLA es un compromiso contractual externo, con consecuencias; el SLO es el objetivo interno del equipo. El SLA es más laxo a propósito: si el SLO se rompe, el equipo se entera y reacciona antes de incumplir el contrato. La diferencia entre ambos es el colchón que protege al cliente de la variación normal.

Cambios para cumplir el presupuesto:
| Cambio | Job | Minutos recuperados |
|---|---|---|
| Etapas de carga 1m/10m/1m → 30s/4m/30s (meseta de 4 min, el mínimo permitido) | load | 7:03 (12:11 → 5:08) |

Total resultante: 7:38 min (unit 0:13, integration 0:14, sast 0:17, sca 0:20, build-push 0:41, deploy 0:18, smoke 0:09, e2e 0:18, load 5:08), bajo el presupuesto de 11 min.
Link al run en main con los cambios: https://github.com/31adrianpc/INF384-lab4-dev/actions/runs/40966817017

Riesgo aceptado (defecto de la aplicación concreto y efecto en la métrica DORA asignada): con una meseta de 4 min en lugar de 10, el pipeline deja de detectar defectos que degradan el servicio de forma gradual. Por ejemplo, si `db.js` abriera una conexión SQLite nueva por cada request sin cerrarla, los descriptores de archivo se agotarían después de varios minutos de carga sostenida y la API empezaría a responder 500. La prueba de 4 min terminaría en verde y el defecto se descubriría en producción. Efecto en time to restore: sube para ese incidente. Como la degradación es gradual, ninguna prueba del pipeline la detecta; se descubre por quejas o métricas de producción, y diagnosticar una fuga toma más que un error inmediato. Como contrapeso, el pipeline más corto (~8 min en vez de ~15) reduce el tiempo de redesplegar la reversión en todos los incidentes, pero no compensa el tiempo de detección de este tipo de defecto.

Decisión sobre sast (se queda / se mueve a otra etapa o evento / informativo) y razón: se queda en pre-build, bloqueante. Cuesta 0:24 por run, alrededor del 4 % del presupuesto de 11 min, y cumple los cuatro criterios para estar en integración continua: es rápido, determinista, acotable al cambio y no necesita ambiente. Corre en paralelo con unit, integration y sca, y dura lo mismo que sca (0:24), así que no alarga el tiempo de reloj de un run de reversión: su efecto en time to restore es que no cambia. En cambio, si se moviera a un evento nocturno o fuera informativo, una inyección SQL en `/transferir` podría llegar a producción, y restaurar exigiría detectar, corregir y volver a correr el pipeline: time to restore subiría. Mantenerlo cuesta 24 s por run y evita incidentes con exposición.

## Declaración de uso de IA
Herramientas usadas y para qué:
- Claude (claude.ai): repaso de las sesiones, análisis del repositorio para identificar defectos candidatos, explicación de conceptos (etapas, SLO/SLA, DORA) y borrador de la redacción de las respuestas, que revisé y ajusté.
- Claude Code (en GitHub Codespaces): implementar las correcciones en ci.yml y test/, ejecutar tests locales para obtener evidencia, y comandos git/gh (commits, push, PR, links de runs).