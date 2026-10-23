# Estrategia de caché — Semana 3

## 1. Alcance

La aplicación utiliza únicamente datos sintéticos para las inspecciones. Durante la Semana 3 se incorpora una estrategia de caché mediante un service worker para permitir que el shell de la aplicación y las rutas visitadas anteriormente puedan continuar funcionando cuando exista conectividad intermitente o se pierda temporalmente la conexión.

El alcance de esta semana se limita a la disponibilidad del shell y de los recursos GET almacenados en caché. No se implementa almacenamiento de nuevas inspecciones, sincronización de cambios, autenticación offline ni manejo de datos reales.

## 2. Estrategia de caché

La caché utiliza una versión identificada como:

`inspecciones-shell-v2`

El service worker aplica diferentes comportamientos dependiendo del tipo de solicitud.

| Recurso o solicitud                                      | Política                                                              | Motivo                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Navegaciones HTML                                        | Network first; solo guarda respuestas correctas (`ok`)                | Prioriza la versión actual y nunca guarda un 404/500 que después se serviría sin conexión.                                           |
| Fallback de navegación sin red                           | Copia de esa ruta → `/offline.html` → `/`                             | Una ruta nunca visitada muestra una pantalla offline explícita en lugar de una vista equivocada.                                      |
| Shell inicial, `offline.html`, manifest e iconos         | Precarga atómica durante `install`                                    | Si un recurso falla, la instalación falla y no queda una caché incompleta ("versión corrupta").                                      |
| `/_next/static/*`                                        | Cache first, solo respuestas correctas                                | Los archivos llevan hash en el nombre y son inmutables: es seguro reutilizarlos.                                                     |
| Otros GET del mismo origen                               | Network first con respaldo en caché; no guarda `no-store` ni `private` | Evita que recursos que pueden cambiar (manifest, iconos) queden obsoletos y respeta la petición del servidor de no guardar contenido. |
| `/api/*` y `/sw.js`                                      | Sin interceptar y nunca en caché                                      | Los datos de la API deben venir siempre de la red; el service worker no debe cachearse a sí mismo.                                   |
| POST, PUT, DELETE y otras solicitudes que no sean GET    | Sin interceptar                                                       | Las operaciones de escritura las maneja la cola de sincronización, no la caché.                                                      |
| Solicitudes a orígenes externos                          | Sin interceptar                                                       | Mantiene la estrategia limitada a los recursos del propio sitio.                                                                     |

## 3. Recursos precargados

Durante la instalación del service worker se precargan los recursos principales del shell:

* `/`
* `/offline.html`
* `/manifest.webmanifest`
* `/icon-192.svg`
* `/icon-512.svg`

Estos recursos permiten disponer de una base mínima de la aplicación después de realizar una primera visita con conexión. Al activarse, el service worker ejecuta `clients.claim()` para controlar la página que ya estaba abierta, de modo que los recursos de `/_next/static` de esa primera carga también se guarden.

## 4. Comportamiento de las navegaciones

Las navegaciones utilizan una estrategia **Network First**.

El comportamiento es el siguiente:

1. El navegador intenta obtener la navegación desde la red.
2. Si la respuesta de red es correcta (`ok`), se devuelve al usuario y se guarda una copia con `event.waitUntil`. Las respuestas de error se devuelven pero no se guardan.
3. Si la solicitud de red falla, el service worker busca la misma navegación en la caché.
4. Si existe una respuesta almacenada, se utiliza esa respuesta.
5. Si no existe, se muestra `/offline.html` (y `/` solo como último recurso si ese archivo faltara).

## 5. Comportamiento de otros recursos GET

Los archivos de `/_next/static/` usan **Cache First** (son inmutables por su hash). El resto de recursos GET del mismo origen usan **Network First** con respaldo en caché. En ambos casos solo se guardan respuestas correctas, y las que declaran `Cache-Control: no-store` o `private` no se almacenan. Si no hay red ni copia, el error se registra con `console.error` y la solicitud falla de forma normal.

## 6. Comportamiento offline

El funcionamiento offline depende de que los recursos hayan sido almacenados previamente.

### Primera visita

La primera visita necesita conectividad para obtener los recursos y llenar la caché. Por lo tanto, no se garantiza que la aplicación pueda iniciarse completamente sin conexión antes de haber realizado una primera carga con Internet.

### Después de una primera visita

Después de que el shell y otros recursos hayan sido almacenados:

* la navegación puede utilizar una respuesta previamente cacheada si la red falla;
* si la ruta solicitada no está disponible en caché, se muestra `/offline.html`;
* los recursos GET previamente almacenados pueden servirse desde la caché;
* los recursos que nunca fueron almacenados pueden seguir necesitando conexión.

La estrategia está diseñada para mantener disponible el shell de la aplicación y los recursos previamente visitados, no para proporcionar una copia completa y permanente de todos los datos de la aplicación.

## 7. Instalación y actualización

El service worker precarga el shell durante el evento `install`.

Durante el evento `activate`, se eliminan las cachés cuyo nombre comienza con `inspecciones-shell-` y que no son la versión actual (las cachés de otras aplicaciones no se tocan), y se llama a `clients.claim()`.

El nombre de la caché incluye una versión:

`inspecciones-shell-v2`

Se pasó de `v1` a `v2` porque cambió la política de caché: así se descartan las copias antiguas, que podían incluir respuestas de error. Cuando sea necesario invalidar una versión anterior, se incrementa el número de versión.

Si algún recurso del shell falla durante `install`, la instalación falla y se registra el error; el navegador conserva el service worker anterior en lugar de activar una caché incompleta.

## 8. Actualización controlada del service worker

El service worker no ejecuta `skipWaiting` automáticamente.

La actualización inmediata solamente se solicita cuando recibe explícitamente un mensaje con el tipo:

`SKIP_WAITING`

Desde la aplicación, `applyServiceWorkerUpdate(registration)` en `src/lib/pwa/register-service-worker.ts` envía ese mensaje solo si hay una versión en espera. La interfaz decide cuándo llamarla. El registro usa `updateViaCache: "none"` para que el navegador siempre revise si `sw.js` cambió.

**Invalidación controlada:** el mensaje `CLEAR_CACHE` (función `clearAppCaches()`) borra todas las cachés `inspecciones-shell-*` sin tocar las de otras aplicaciones.

**Registro de errores:** el service worker usa `console.error` cuando falla la precarga, la activación, el guardado en caché o un recurso sin red ni copia. El registro en el cliente captura el error y no interrumpe la aplicación.

Esto permite que una futura interfaz pueda solicitar la activación de una nueva versión cuando sea conveniente, evitando que una actualización interrumpa automáticamente una sesión activa.

## 9. Límites de la estrategia

La estrategia de caché tiene los siguientes límites:

* La primera visita necesita conexión para llenar la caché.
* Una respuesta almacenada puede representar contenido anterior y, por lo tanto, puede quedar desactualizada.
* No existe una cola de cambios para operaciones realizadas sin conexión.
* No se implementa sincronización posterior con un servidor desde el service worker (la maneja la cola de la semana 5).
* No se almacenan operaciones `POST`, `PUT` o `DELETE`.
* Las páginas navegadas se guardan aunque el servidor envíe `no-store` (se guardan para que funcionen offline); solo contienen datos sintéticos. Con datos reales habría que revisar esta decisión.
* No hay una interfaz que muestre el aviso de actualización; solo está la función `applyServiceWorkerUpdate`.
* Las pruebas simulan `caches` y `fetch`; no se ejecutan en un navegador real.
* No se implementa autenticación offline.
* No se utilizan datos reales de personas, laboratorios o estudiantes.
* Los datos utilizados por el proyecto son sintéticos.
* Los recursos externos no son interceptados por el service worker.
* La disponibilidad offline depende de que el recurso haya sido almacenado previamente.

## 10. Decisiones técnicas

Se decidió utilizar **Network First para las navegaciones** porque se busca priorizar la información más actual cuando existe conexión, utilizando una respuesta almacenada únicamente como respaldo cuando la red no está disponible.

Para los archivos inmutables de `/_next/static/` se utiliza **Cache First**, y para los demás recursos GET del mismo origen **Network First**: un Cache First general dejaba el manifest, los iconos y cualquier GET dinámico obsoletos para siempre. La API y `sw.js` nunca se cachean.

Se decidió no guardar respuestas de error ni `no-store`/`private` en recursos para evitar servir una versión corrupta o contenido sensible.

También se decidió utilizar una caché versionada para facilitar la actualización controlada del shell y eliminar versiones anteriores durante la activación del service worker.

No se implementa sincronización de datos en esta semana porque el alcance actual se concentra en la disponibilidad del shell y de los recursos previamente almacenados.

## 11. Validación

La estrategia se valida mediante las pruebas y verificaciones disponibles en el proyecto:

```bash
npm ci
npm test
npx tsx tests/service-worker.spec.ts
npx tsx tests/offline.spec.ts
npm run build
npm run verify
```

Las pruebas `service-worker.spec.ts` y `offline.spec.ts` cargan `public/sw.js` real en un contexto aislado con `caches` y `fetch` simulados (`tests/helpers/sw-harness.ts`), por lo que verifican comportamiento y fallan si se rompe una regla (por ejemplo, cachear un 500 o no reclamar clientes).

También se puede comprobar el comportamiento offline desde las herramientas de desarrollo del navegador utilizando el modo **Offline**, después de haber realizado una primera visita con conexión.

La validación debe comprobar que:

* el service worker se registra correctamente;
* los recursos del shell se almacenan;
* las navegaciones pueden utilizar la caché cuando falla la red;
* las respuestas de error no se guardan y una ruta nunca visitada muestra `/offline.html`;
* los archivos de `/_next/static` se reutilizan desde la caché y los demás recursos se actualizan con red;
* la API y `sw.js` no se interceptan ni se guardan;
* las versiones anteriores de la caché pueden eliminarse al activar una nueva versión.

## 12. Alcance futuro

La estrategia actual constituye una base para futuras mejoras de la PWA. En versiones posteriores podrían incorporarse mecanismos de almacenamiento local de inspecciones, sincronización de cambios pendientes y otras capacidades offline.

Estas funcionalidades quedan fuera del alcance de la Semana 3 y no se consideran implementadas actualmente.
