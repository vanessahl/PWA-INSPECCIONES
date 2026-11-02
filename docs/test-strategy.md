# Estrategia de pruebas — Semana 8

## Diagnóstico y alcance

La revisión de la versión integrada en `dev` confirmó pruebas unitarias, integración, contratos HTTP y un workflow verde. Faltaban una prueba automatizada desde un navegador real, pasos explícitos de lint y tipos, cobertura como artefacto y evidencia reproducible de un defecto controlado. También se encontraron marcadores de conflicto Git en `evidence/individual.md` y una descripción del flujo de ramas que decía `main`, aunque la integración de esta semana se hizo en `dev`.

Esta revisión agrega esos casos en la copia local. Los datos, nombres y operaciones de prueba son sintéticos. La ejecución de Actions correspondiente a la revisión anterior está en [run 40262409901](https://github.com/vanessahl/PWA-INSPECCIONES/actions/runs/40262409901); no corresponde a estos cambios locales. La CI del SHA final debe ejecutarse después de integrar los cambios.

## Matriz de riesgo y pruebas

| Riesgo/comportamiento | Capa y prueba | Aserción principal |
| --- | --- | --- |
| Captura con esquema inválido o evidencia no permitida | Unitaria: `tests/unit/schema.test.ts`, `tests/unit/evidence.test.ts` | Acepta datos e imágenes válidos; rechaza campos inválidos, archivos no permitidos, vacíos o mayores de 5 MiB. |
| Cola, reintento y duplicado local | Unitaria: `tests/unit/queue.test.ts`; integración: `tests/integration/offline-sync.test.ts` | Controla el reloj y el transporte; una inspección duplicada no vuelve a la cola y el fallo de red conserva el registro para reintento. |
| Persistencia offline y reconexión | Integración: `tests/integration/offline-sync.test.ts`; navegador: `tests/e2e/ui-critical-flow.test.ts` | IndexedDB conserva el registro; la E2E guarda sin conexión, recarga desde la caché del Service Worker, reconecta y muestra una sola copia sincronizada. |
| Idempotencia y conflictos del servidor | Integración: `tests/integration/sync-route.test.ts`; HTTP: `tests/e2e/application-contract.test.ts` | Repetir una clave devuelve el mismo resultado sin crear otra revisión; revisiones obsoletas producen `409`. |
| Permiso de dispositivo denegado | Navegador: `tests/e2e/ui-critical-flow.test.ts`; adaptadores: `tests/capabilities.spec.ts` | Simula el rechazo de geolocalización y confirma que la captura sin ubicación se puede guardar y sincronizar. |
| Rutas, manifest y Service Worker | HTTP: `tests/e2e/application-contract.test.ts`; navegador: `tests/e2e/ui-critical-flow.test.ts` | Verifica respuesta de rutas/manifest y controla el Service Worker real en Chromium para el caso offline. |

## Capas y decisiones

* **Unitarias:** `node:test` con `tsx`; se prueban reglas, respuestas y fallos con dependencias simuladas.
* **Integración:** handler real de `/api/inspecciones/sync`, cola real e `IndexedDbSyncStore` con `fake-indexeddb`. Así se cubren transacciones y contratos sin depender de red externa.
* **E2E HTTP:** `next start` sobre el build real comprueba rutas, manifest e idempotencia del endpoint.
* **E2E de interfaz:** Playwright y Chromium conducen la pantalla real `/inspecciones`. El contexto controla la conectividad del navegador y simula el rechazo de geolocalización. El almacenamiento usado por la UI es IndexedDB nativo del navegador; el Service Worker se deja activo.
* **Cobertura:** `c8` produce texto y `reports/coverage/lcov.info` para las suites unitarias y de integración. La cobertura sirve para identificar huecos; no se fija un umbral arbitrario ni se incluye cobertura de UI del navegador.
* **Determinismo:** datos sintéticos aislados por caso; el reloj de la cola se inyecta para no esperar el backoff. Los servidores E2E usan puertos 3107–3110; `E2E_PORT` puede sustituir el puerto al ejecutar una suite aislada.

El servidor HTTP E2E se inicia con `next start` sobre el build existente mediante `tests/helpers/server.ts`. La prueba de navegador abre Chromium headless desde Playwright y usa el mismo servidor compilado.

## Comandos reproducibles

Requisitos: Node.js 20 o superior, npm, GNU Make para ejecutar literalmente `make verify` y Chromium de Playwright para las E2E de interfaz.

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
npx playwright install chromium
npm run test:e2e
make verify
```

`npm run typecheck` comprueba la aplicación con el `tsconfig.json` del proyecto y tipa la nueva prueba de interfaz con las opciones ESM/browser de TypeScript.

En Windows sin GNU Make, `npm run verify` ejecuta exactamente el target `verify` del `Makefile`. En CI, `npx playwright install --with-deps chromium` instala Chromium y sus dependencias del runner Linux.

## Evidencia de defecto controlado

Se probó localmente una mutación temporal y se restauró inmediatamente:

1. Se desactivó temporalmente la protección `if (existing.result)` en `src/lib/storage/schema.ts`.
2. Se ejecutó `npm run test:integration`.
3. El test [offline-sync.test.ts](../tests/integration/offline-sync.test.ts) — `IndexedDB + cola + API: captura offline y sincroniza al volver la conexión` — falló (9 pasaron, 1 falló) con `Error: Falló una transacción de IndexedDB.` al intentar insertar el mismo ID por segunda vez. Esto demuestra que la prueba detecta la regresión de duplicados.
4. Se restauró la protección y `npm run test:all` volvió a ejecutar integración: 10/10 pruebas aprobadas.

Salida resumida observada:

```text
Mutación: tests 10, pass 9, fail 1
Error: Falló una transacción de IndexedDB.
Restauración: tests 10, pass 10, fail 0
```

La mutación se hizo solo en el árbol local, no se integró ni publicó. El fallo es evidencia local; todavía no existe un enlace de Actions para la mutación. El workflow sube `reports/` incluso si falla una etapa, y la ejecución de recuperación del SHA final debe enlazarse al terminar la integración.

## Límites y fallos conocidos

* El E2E de navegador prueba el flujo de la pantalla y el Service Worker en Chromium; no certifica todos los navegadores ni dispositivos.
* La denegación de geolocalización se simula en la API del navegador; cámara, ubicación real y notificaciones no usan permisos ni datos físicos en CI.
* IndexedDB se simula con `fake-indexeddb` en integración; el E2E sí usa IndexedDB de Chromium. No se cubren cuotas, modo privado ni fallos de transacción de todos los navegadores.
* La copia remota del endpoint de demostración y su idempotencia viven en memoria y se pierden al reiniciar el proceso; no representan persistencia de producción.
* La sincronización del endpoint no tiene autenticación y no debe exponerse como backend de producción.
* `npm install` informó vulnerabilidades en dependencias (5 altas y 1 crítica) en este entorno. Deben revisarse antes de un despliegue; no se ejecutó `npm audit fix` porque podría introducir cambios ajenos al alcance.
