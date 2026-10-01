# Política de persistencia y sincronización — Semana 5

## Alcance y estado

La capa de sincronización guarda inspecciones sintéticas en IndexedDB y mantiene una outbox durable. `enqueueInspection` valida el esquema y escribe el registro local y su operación pendiente en una misma transacción. El mismo ID no se inserta dos veces.

La pantalla `/inspecciones` permite capturar datos sintéticos, guardarlos localmente y enviarlos al endpoint `POST /api/inspecciones/sync`. El endpoint de demostración implementa claves idempotentes y control de revisión, pero su almacén remoto vive en memoria del proceso; no es una base persistente ni un backend listo para producción. `registerOnlineSync` vuelve a procesar la cola cuando el navegador emite `online`.

## Recorrido manual

1. Ejecutar `npm run dev` y abrir `/inspecciones`.
2. Completar el formulario con un laboratorio ficticio, fecha, seudónimo, estado, hallazgos y resumen sintético.
3. Con red, guardar y observar el mensaje de confirmación y el estado `Sincronizada`.
4. En DevTools, activar Offline, guardar otra inspección y observar `Pendiente de sincronizar`.
5. Restaurar la red y observar que el evento `online` vacía la outbox y actualiza el estado.
6. Reiniciar el servidor de desarrollo y notar que IndexedDB conserva el dato local, pero el almacén remoto simulado se reinicia.

## Esquema local

La base `pwa-inspecciones`, versión 1, contiene:

| Object store | Clave | Contenido |
| --- | --- | --- |
| `inspections` | `inspection.id` | Registro local, fecha de edición, estado de sincronización y revisión remota opcional. |
| `outbox` | `id` | Payload validado, clave idempotente, intentos, próxima ejecución, lease y revisión esperada. |

El registro local y la outbox se escriben juntos. La creación requiere un contexto de navegador con IndexedDB disponible; SSR y entornos sin IndexedDB reciben un error explícito.

## Envío, idempotencia y reintentos

1. La cola reclama una sola entrada vencida de forma transaccional y la marca `in-flight` con un lease.
2. El transporte recibe la clave idempotente estable del registro y un `AbortSignal`; debe enviar esa clave al servidor y el servidor debe deduplicarla.
3. Un ACK válido guarda la versión remota y elimina la outbox en una transacción.
4. Un fallo, timeout o respuesta inválida devuelve la entrada a `pending` y conserva el error para diagnóstico.
5. El backoff exponencial comienza en 1 segundo y llega hasta 60 segundos. Las ejecuciones se limitan a 50 operaciones.
6. Una entrada `in-flight` con lease vencido puede reclamarse después de un cierre o interrupción de pestaña.

La garantía local es que una inspección y su entrada se encolan una vez por ID, y que los reintentos conservan la clave idempotente. La prevención de duplicados remotos depende de que el servidor implemente y persista esa clave; un cliente no puede garantizarla si un servidor acepta una operación y pierde su respuesta sin soportar idempotencia.

## Política de conflictos

El transporte informa un conflicto con la versión remota actual, su fecha `updatedAt` y `revision`:

- Gana la fecha de actualización más reciente (last-write-wins).
- Si las fechas son iguales, gana la versión remota para que los clientes converjan.
- Si gana la versión remota, se adopta localmente y se elimina la operación pendiente.
- Si gana la local, se programa un reintento con el intervalo base contra la revisión remota observada y se deriva una nueva clave idempotente que incluye esa revisión. El retraso evita un bucle inmediato si el servidor vuelve a responder conflicto.
- Las fechas y el registro remoto se validan antes de aceptarse.

Esta política es simple y determinista, pero no combina campos editados en paralelo. Para datos de mayor criticidad se necesitaría resolución por campo o revisión humana.

## Límites y riesgos

- El endpoint remoto es una simulación en memoria del servidor Next.js; sus registros e índices idempotentes se pierden cuando el proceso se reinicia y no sirven para producción.
- La ruta de demostración no tiene autenticación ni límites de frecuencia; solo acepta datos sintéticos locales.
- Para producción hay que reemplazar los mapas en memoria por almacenamiento compartido y persistente que aplique las claves idempotentes y actualizaciones condicionales entre instancias.
- El listener `online` es una señal de oportunidad, no garantiza que el servidor esté accesible ni que el navegador ejecute tareas en segundo plano.
- IndexedDB puede ser borrada por el usuario o el navegador; no sustituye una copia de seguridad remota.
- El almacenamiento local no cifra datos. Este incremento solo usa registros sintéticos y no debe guardar PII ni credenciales.
- Las pruebas usan una implementación en memoria para escenarios aislados, `fake-indexeddb` para el adapter y llaman al handler HTTP directamente. Una prueba manual en navegador verificó captura conectada y desconectada, restauración de red y estado sincronizado; aún conviene repetirla en otros navegadores.
- No se implementan edición de inspecciones existentes, autenticación offline ni resolución manual.

## Validación reproducible

```bash
npm ci
npm test
npm run build
npm run verify
```

En Windows sin GNU Make, `npm run verify` es el equivalente exacto de `make verify` porque el target `verify` del Makefile ejecuta únicamente ese script. `tests/sync.spec.ts` comprueba duplicados, validación, reintentos, backoff, éxito, conflictos local/remoto y recuperación de leases expirados.

## Fallos encontrados durante la integración

- El primer build detectó que TypeScript infería como `unknown` el resultado de la transacción que encola; se resolvió declarando explícitamente el resultado booleano y el build posterior pasó.
- El check público del kit invoca `rg`, que no está disponible en el Bash de este Windows. El equivalente ejecutado en PowerShell confirmó los artefactos; su escaneo amplio produjo falsos positivos por `js-tokens` en `package-lock.json` y menciones preventivas en documentos, no por valores sensibles.
- `npm ci` reporta dos vulnerabilidades en el árbol de dependencias (una alta y una crítica). No se aplicó `npm audit fix --force` porque podría introducir cambios mayores no relacionados con esta entrega.