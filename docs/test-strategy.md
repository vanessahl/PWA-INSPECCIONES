# Estrategia de pruebas — Semana 8

## Flujo crítico

Capturar una inspección sin conexión → guardarla en IndexedDB y en la outbox → sincronizarla al volver la red (`POST /api/inspecciones/sync`) con idempotencia, reintentos con backoff y resolución de conflictos. Es el comportamiento con mayor riesgo de pérdida de datos, por eso concentra las pruebas.

## Pirámide

| Nivel | Carpeta | Qué prueba | Qué aísla |
| --- | --- | --- | --- |
| Unitario | `tests/unit/` | `chooseConflictWinner`, `isInspectionRecord`, `enqueueInspection`, `createHttpSyncTransport` | Sin red ni IndexedDB; `fetch` y store simulados |
| Integración | `tests/integration/` | Handler real de la ruta (400/409/idempotencia/revisiones); cola + `IndexedDbSyncStore` (con `fake-indexeddb`) + handler real | Sin servidor HTTP ni navegador |
| E2E | `tests/e2e/` | `next start` sobre el build real: HTML, manifest, `sw.js`, sincronización por HTTP real, idempotencia y 409 | Sin navegador; IndexedDB simulado |

Las pruebas de semanas 1–6 (`tests/*.spec.*`) se conservan y se ejecutan con `npm test`. Los nuevos archivos usan `node:test` ejecutado con `tsx`, sin dependencias nuevas.

### Cobertura E2E de contrato

`tests/e2e/application-contract.test.ts` usa el helper `tests/helpers/server.ts` para iniciar el build con `next start` en el puerto fijo 3109 (o el valor explícito de `E2E_PORT`). Comprueba por HTTP real la página principal, el listado de inspecciones, un detalle existente, el manifest instalable y el endpoint de sincronización. Para este último valida éxito, repetición idempotente, conflicto de revisión (`409`) y ausencia de clave idempotente (`400`). Todos los identificadores, textos y fechas de prueba son sintéticos.

## Decisiones y trade-offs

* **E2E sin navegador (Playwright).** Un navegador agrega ~300 MB de descarga, es más lento y más frágil en CI. Se prueba el servidor real y la lógica del cliente por HTTP; el costo es que **no** se valida la UI renderizada, el registro real del Service Worker ni la cámara/geolocalización. Esas siguen cubiertas por las pruebas manuales de `README.md` (semana 6).
* **Archivos explícitos en los scripts `test:*`.** Node 20 no expande globs en `--test`; listar archivos evita diferencias entre sistemas operativos.
* **Reloj inyectado** (`now`) en `syncPending`: elimina esperas reales del backoff y hace las pruebas deterministas.
* **Estado del servidor en memoria.** La ruta guarda revisiones en un `Map` por proceso; por eso cada prueba usa IDs y claves únicos, y el E2E arranca un proceso nuevo.
* **Puertos del E2E.** Las suites usan 3107, 3108 y 3109 para evitar competir entre sí cuando el ejecutor las inicia en paralelo. `E2E_PORT` permite sustituir el puerto en una ejecución aislada.

## Supuestos

* Todos los datos son sintéticos (`synthetic-*`, `integration-*`, `e2e-*`, y las `inspection-00x` del repositorio).
* Node.js 20+; puerto 3107 libre (configurable con `E2E_PORT`).
* `npm run build` se ejecuta antes de `npm run test:e2e`.

## Límites y fallos conocidos

* No hay pruebas de UI en navegador ni de accesibilidad.
* IndexedDB real de cada navegador (cuotas, modo privado, transacciones interrumpidas) no se prueba; se usa `fake-indexeddb`.
* La idempotencia del servidor vive en memoria: se pierde al reiniciar, y no hay pruebas de concurrencia entre pestañas.
* La ruta `/api/inspecciones/sync` no tiene autenticación (fuera del alcance académico).
* Las pruebas de integración que usan `inspection-001` y `inspection-002` dependen de que los datos semilla no cambien (fecha 2026-08-28 / 2026-08-27, revisión 1).

## Cómo reproducir

```bash
npm ci
npm run build
npm run test:all
npm run verify
```

CI (`.github/workflows/academic-evaluation.yml`) ejecuta los mismos pasos en cada push y PR.

## Resultados de ejecución — Semana 8

Se ejecutaron las pruebas unitarias, las pruebas de integración y la verificación de la PWA para comprobar el funcionamiento de la validación de inspecciones, la cola de sincronización y el manejo de conflictos.

### Pruebas unitarias

**Comando ejecutado:**

```bash
npm run test:unit
```

**Resultado:** PASS. Se aprobaron 19 de 19 pruebas, sin fallos.

Estas pruebas comprobaron la resolución de conflictos según la fecha de actualización, el rechazo de fechas inválidas, la validación de imágenes permitidas y el funcionamiento de la cola y del transporte HTTP. También se verificó que las inspecciones cumplan con el esquema esperado.

### Pruebas de integración

**Comando ejecutado:**

```bash
npm run test:integration
```

**Resultado:** PASS. Se aprobaron 10 de 10 pruebas, sin fallos.

Se comprobó la integración entre IndexedDB, la cola de sincronización y la API. También se verificaron los reintentos después de un fallo de conexión, la prevención de duplicados mediante claves de idempotencia, las respuestas HTTP 400 y 409, y la actualización de revisiones.

### Verificación de la PWA

**Comando ejecutado:**

```bash
npm run verify
```

**Resultado:** PASS. La verificación de la PWA terminó correctamente y se generó el reporte `reports/verification.json`.

### Conclusión

Los resultados obtenidos indican que las pruebas unitarias y de integración ejecutadas pasaron correctamente y que la verificación de la PWA fue satisfactoria. Estas pruebas respaldan el funcionamiento de la validación de datos y de la sincronización de inspecciones, incluidos algunos escenarios de desconexión y resolución de conflictos.

Los resultados no sustituyen las pruebas manuales en un navegador real, ni comprueban por sí solos el funcionamiento de la cámara, la geolocalización o el comportamiento de IndexedDB en todos los dispositivos.
