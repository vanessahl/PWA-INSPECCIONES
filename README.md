# PWA de inspecciones de laboratorio

Proyecto realizado para la materia de **Aplicaciones Web Progresivas**.

Durante la Semana 3 se agregó el **Service Worker** y una estrategia de caché para mejorar el funcionamiento de la aplicación cuando no hay conexión.

Durante la Semana 4 se comparan dos rutas de renderizado: el listado `/inspecciones` usa CSR y el detalle `/inspecciones/[id]` usa SSR. La decisión está documentada en `docs/rendering-decision.md`.

Durante la Semana 5 se agregó una outbox durable en IndexedDB, reintentos idempotentes y una política de resolución de conflictos. Las decisiones y límites se explican en `docs/sync-policy.md`.

## Requisitos

* Node.js 20 o superior
* npm
* Git

## Instalación

Primero instalar las dependencias:

```bash
npm ci
```

## Ejecutar el proyecto

Para iniciar la aplicación:

```bash
npm run dev
```

Después abrir:

```text
http://localhost:3000
```

También se pueden probar los siguientes estados:

* `/?estado=cargando`
* `/?estado=error`
* `/?estado=vacio`
* `/inspecciones`
* `/inspecciones?estado=error`
* `/inspecciones?estado=vacio`
* `/inspecciones/inspection-002`
* `/inspecciones/id-inexistente`

## Service Worker

El Service Worker se encuentra en:

```text
public/sw.js
```

Y su registro está en:

```text
src/lib/pwa/register-service-worker.ts
```

La aplicación utiliza:

* **Network First** para las navegaciones.
* **Cache First** para otros recursos `GET` del mismo origen.
* Caché inicial para los recursos principales de la aplicación.

La estrategia completa está explicada en:

```text
docs/cache-strategy.md
```

## Funcionamiento offline

La aplicación puede utilizar recursos que ya fueron guardados en caché.

La primera visita necesita conexión para cargar la aplicación. En `/inspecciones`, el formulario guarda inspecciones sintéticas en IndexedDB; si no hay conexión, quedan pendientes y se envían al recuperar internet. El endpoint de demostración responde y resuelve conflictos, pero mantiene su copia remota en memoria y la pierde al reiniciar el servidor.

La cola aplica backoff exponencial, claves idempotentes, leases recuperables y una política de conflicto last-write-wins. La simulación permite probar ese flujo; para producción se requiere cambiar el almacenamiento remoto en memoria por una base persistente. Consulta `docs/sync-policy.md` para los supuestos y límites.

## Verificación

Para comprobar que el proyecto funciona correctamente se ejecutan:

```bash
npm ci
npm test
npm run build
npm run verify
make verify
```

En Windows sin GNU Make, ejecuta `npm run verify`; es el equivalente exacto de `make verify` según el target `verify` del Makefile.

GitHub Actions ejecuta los mismos gates en `.github/workflows/week-05-w05-sync-data.yml` al publicar cambios.

También se puede revisar el comportamiento offline desde las herramientas de desarrollo del navegador.

La prueba de renderizado se ejecuta dentro de `npm test` y valida que el listado sea CSR, que el detalle sea SSR y que existan los estados de carga y error.
Las pruebas de renderizado y sincronización forman parte de `npm test`; cubren el formulario, IndexedDB simulado, endpoint, duplicados, reintentos, conflictos y recuperación tras expirar un lease. Para la comprobación manual offline, desactiva la red desde DevTools, guarda otra inspección en `/inspecciones` y restablece la conexión para verla sincronizada.

## Evidencia

Para la entrega se debe conservar el commit correspondiente y, cuando aplique, el resultado de GitHub Actions.

Los resultados de verificación se generan en:

```text
reports/verification.json
```

## Alcance de la Semana 4

En esta semana se agregaron rutas separadas para listado y detalle, con CSR para el listado, SSR para el detalle y estados reproducibles de carga, error y vacío. La evidencia individual registra el commit, la prueba ejecutada, la limitación y el uso declarado de IA.

## Alcance de la Semana 3

En esta semana se trabajó principalmente en el **Service Worker, la estrategia de caché, el funcionamiento básico offline y la documentación del proyecto**.

El proyecto utiliza datos sintéticos y todavía no cuenta con sincronización de inspecciones offline.

## Alcance de la Semana 5

Se implementaron el formulario de captura, el esquema IndexedDB, la outbox y un endpoint de demostración para probar sincronización, deduplicación y conflictos con datos sintéticos. El estado remoto es volátil y no reemplaza una API con base de datos persistente. El recorrido manual se describe en `docs/sync-policy.md`.
