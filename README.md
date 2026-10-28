# PWA de inspecciones de laboratorio

Proyecto realizado para la materia de **Aplicaciones Web Progresivas**.

Durante la Semana 3 se agregó el **Service Worker** y una estrategia de caché para mejorar el funcionamiento de la aplicación cuando no hay conexión.

Durante la Semana 4 se comparan dos rutas de renderizado: el listado `/inspecciones` usa CSR y el detalle `/inspecciones/[id]` usa SSR. La decisión está documentada en `docs/rendering-decision.md`.

Durante la Semana 5 se agregó una outbox durable en IndexedDB, reintentos idempotentes y una política de resolución de conflictos. Las decisiones y límites se explican en `docs/sync-policy.md`.

Durante la Semana 6 se agregaron capacidades opcionales de cámara, geolocalización y notificaciones con permisos mínimos, fallback y datos sintéticos. Las decisiones y límites se explican en `docs/capabilities.md`.

Durante la Semana 8 se agregaron pruebas unitarias, de integración y E2E del flujo crítico (captura offline → outbox → sincronización) y un workflow de CI. La estrategia, supuestos y límites están en `docs/test-strategy.md`.

Durante la Semana 9 se agregaron un modelo de amenazas, un inventario de datos, encabezados de seguridad y validación estricta del endpoint de sincronización. Los límites y riesgos residuales están en `docs/threat-model.md` y `docs/privacy-data-inventory.md`.

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

Para reproducir la verificación de Semana 8:

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
npm run verify
make verify
```

En Windows sin GNU Make, ejecuta `npm run verify`; es el equivalente exacto de `make verify` según el target `verify` del Makefile.

`npm run test:e2e` levanta `next start` sobre el build compilado y corre las comprobaciones HTTP y las pruebas de interfaz en Chromium. Las pruebas de interfaz guardan una inspección con el contexto offline, recargan la pantalla, reconectan y verifican que quede sincronizada una sola vez; también simulan el rechazo de geolocalización.

`npm run test:coverage` genera cobertura de unitarias e integración en `reports/coverage/`. Los comandos de lint, tipos, build, pruebas y `make verify` también se ejecutan en `.github/workflows/academic-evaluation.yml`. El workflow publica `reports/` como artefacto incluso si falla una etapa.

La revisión local de este incremento pasó `npm ci`, lint, comprobación de tipos, build, pruebas anteriores, unitarias (19), integración (10), cobertura y E2E. Las dos pruebas de interfaz usan Chromium. Las vulnerabilidades informadas por npm deben revisarse antes de producción; no se ejecutó una actualización automática de dependencias.

## Evidencia

Para la entrega se debe conservar el commit correspondiente y, cuando aplique, el resultado de GitHub Actions.

## Semana 9: seguridad y privacidad

### Instalación y ejecución

```bash
npm ci
npm run dev
```

La aplicación se abre en <http://localhost:3000>. Para una versión desplegada se requiere HTTPS; el endpoint y los datos de esta demostración no deben usarse en producción.

### Verificación reproducible

```bash
npm run lint
npm run typecheck
npm run build
npm run test:security
npm test
npm run verify
```

En Windows sin GNU Make, `npm run verify` es el equivalente exacto del target `make verify`. El workflow existente `.github/workflows/academic-evaluation.yml` ejecuta la validación en GitHub Actions cuando se publique una rama o se abra un Pull Request; todavía no se ha ejecutado para los cambios locales de Semana 9.

### Evidencia y límites

* Modelo de amenazas y controles: [`docs/threat-model.md`](docs/threat-model.md).
* Datos, finalidades, almacenamiento y retención: [`docs/privacy-data-inventory.md`](docs/privacy-data-inventory.md).
* Pruebas deterministas con datos sintéticos: `tests/security.spec.ts` (`npm run test:security`).
* `public/robots.txt` solicita excluir `/api/` de rastreadores, pero no es un control de acceso.
* El endpoint de demostración no tiene autenticación ni almacenamiento persistente. No introducir información personal, credenciales, ubicaciones o fotografías reales.

Si el trabajo se realiza en equipo, consulten la [guía paso a paso para Vanne y Ángel](docs/week-09-team-guide.md). Cada integrante trabaja en su rama, documenta su evidencia individual y abre su propio Pull Request con base `dev`.

Los resultados de verificación se generan en:

```text
reports/verification.json
```

## Alcance de la Semana 4

En esta semana se agregaron rutas separadas para listado y detalle, con CSR para el listado, SSR para el detalle y estados reproducibles de carga, error y vacío. La evidencia individual registra el commit, la prueba ejecutada, la limitación y el uso declarado de IA.

## Alcance de la Semana 3

En la Semana 3 se trabajó en el **Service Worker, la estrategia de caché y el funcionamiento offline de los recursos de la aplicación**. La captura offline y sincronización de inspecciones se incorporó posteriormente como parte de la Semana 5.

## Alcance de la Semana 5

Se implementaron el formulario de captura, el esquema IndexedDB, la outbox y un endpoint de demostración para probar sincronización, deduplicación y conflictos con datos sintéticos. El estado remoto es volátil y no reemplaza una API con base de datos persistente. El recorrido manual se describe en `docs/sync-policy.md`.

## Alcance de la Semana 6

Se añadieron adaptadores opcionales para cámara, geolocalización y notificaciones. No se solicitan permisos durante la carga inicial, no se almacenan datos personales y cada capacidad conserva un flujo útil cuando el navegador no la soporta o el usuario la rechaza.

## Prueba manual de permisos

### Objetivo

Comprobar que la pantalla de inspecciones maneja correctamente los permisos de la cámara y la ubicación, que ofrece alternativas cuando se rechazan y que permite consultar el detalle de una inspección guardada.

Las pruebas deben realizarse con datos sintéticos y sin utilizar información personal real.

### Preparación

1. Instalar las dependencias del proyecto con `npm ci`.
2. Iniciar la aplicación con `npm run dev`.
3. Abrir en el navegador la dirección local que muestra la terminal.
4. Entrar a la pantalla `/inspecciones`.
5. Utilizar datos ficticios para completar los campos obligatorios de una inspección.

### Prueba 1. Tomar foto y permitir el acceso

**Pasos:**

1. Abrir la pantalla de inspecciones.
2. Presionar **Tomar foto**.
3. Cuando el navegador solicite permiso para utilizar la cámara, presionar **Permitir**.
4. Si el dispositivo muestra la cámara, realizar una captura de prueba.
5. Confirmar la captura y revisar la pantalla.

**Resultado esperado:**

El navegador solicita permiso para acceder a la cámara. Al presionar Permitir, la aplicación intenta abrir el selector configurado para capturar una fotografía. Si se selecciona una imagen válida, se muestra su nombre en la pantalla. Si el dispositivo no permite acceder a la cámara, se muestra un mensaje informativo.

### Prueba 2. Tomar foto y bloquear el acceso

**Pasos:**

1. Restablecer o cambiar el permiso de la cámara en la configuración del sitio del navegador.
2. Regresar a la pantalla `/inspecciones`.
3. Presionar **Tomar foto**.
4. Cuando aparezca la solicitud de permiso, presionar **Bloquear**.
5. Revisar el mensaje que muestra la aplicación y las alternativas disponibles.

**Resultado esperado:**

La aplicación muestra un mensaje indicando que el permiso de cámara fue rechazado y que se puede seleccionar un archivo. Sin embargo, en la implementación actual, el botón Seleccionar archivo también solicita permiso de cámara, por lo que no abre el selector si ese permiso permanece bloqueado. Este comportamiento debe registrarse como una limitación detectada.

### Prueba 3. Usar ubicación y permitir el acceso

**Pasos:**

1. Restablecer el permiso de ubicación del sitio si ya se había bloqueado.
2. Regresar a la pantalla de inspecciones.
3. Presionar **Usar ubicación**.
4. Cuando el navegador solicite permiso, presionar **Permitir**.
5. Esperar a que el navegador intente obtener la ubicación.
6. Revisar el resultado mostrado en la pantalla.

**Resultado esperado:**

Si el navegador y el dispositivo permiten obtener la ubicación, la aplicación debe recibir las coordenadas y utilizarlas según el funcionamiento de la pantalla. Si la ubicación no se obtiene, debe mostrarse o manejarse el error sin provocar que la aplicación deje de funcionar.

### Prueba 4. Usar ubicación y bloquear el acceso

**Pasos:**

1. Restablecer el permiso de ubicación del sitio si es necesario.
2. Abrir nuevamente la pantalla de inspecciones.
3. Presionar **Usar ubicación**.
4. Cuando aparezca la solicitud de permiso, presionar **Bloquear**.
5. Revisar el mensaje mostrado y comprobar si se puede continuar sin ubicación.

**Resultado esperado:**

La aplicación no debe obtener las coordenadas cuando el permiso está bloqueado. Debe manejar el rechazo correctamente y permitir continuar sin ubicación si los demás campos obligatorios están completos.

### Prueba 5. Guardar una inspección sin fotografía ni ubicación

**Pasos:**

1. Abrir la pantalla `/inspecciones`.
2. Completar los campos obligatorios con información ficticia.
3. No seleccionar ningún archivo ni tomar una fotografía.
4. No presionar **Usar ubicación**.
5. Presionar el botón para guardar la inspección.
6. Revisar el resultado en la pantalla.

**Resultado esperado:**

La inspección debe guardarse correctamente si se completaron todos los campos obligatorios. La falta de fotografía o ubicación no debe impedir el registro cuando estos recursos son opcionales.

### Prueba 6. Presionar Ver detalle después de guardar

**Pasos:**

1. Guardar una inspección de prueba.
2. Localizar la inspección recién guardada en la lista.
3. Presionar **Ver detalle**.
4. Revisar la información que aparece en la pantalla de detalle.

**Resultado esperado:**

La aplicación debe abrir el detalle correspondiente a la inspección seleccionada y mostrar la información guardada. Los datos deben corresponder al registro seleccionado y no a otra inspección.

## Semana 8: pruebas automatizadas y CI

### Setup

```bash
npm ci
```

### Ejecución

| Comando | Qué ejecuta |
| --- | --- |
| `npm run lint` / `npm run typecheck` | ESLint; TypeScript de la aplicación y de la nueva prueba de interfaz |
| `npm run test:unit` | `tests/unit/`: política de conflictos, validación de esquema/evidencia, cola y transporte HTTP |
| `npm run test:integration` | `tests/integration/`: ruta `/api/inspecciones/sync` y cola + IndexedDB (`fake-indexeddb`) + API |
| `npm run build` y `npm run test:e2e` | `tests/e2e/`: `next start` en los puertos 3107–3110; contratos HTTP y Chromium real para flujo offline-recarga-reconexión y geolocalización denegada |
| `npm run test:coverage` | Cobertura unitarias/integración en `reports/coverage/` |
| `npm test` | Pruebas de semanas anteriores (se conservan) |
| `npm run test:all` | Todo lo anterior en orden |
| `make verify` | `npm run verify`: valida artefactos y genera `reports/verification.json` |

### Verificación

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

Si `make` no está disponible (Windows), `npm run verify` es el equivalente exacto.

### Evidencia

* Workflow: `.github/workflows/academic-evaluation.yml` (corre en `push`, `pull_request` y manualmente; incluye lint, tipos, build, pruebas, cobertura y sube `reports/` aun ante fallo).
* Estrategia, matriz de riesgos, diagnóstico, defecto controlado, supuestos y límites: `docs/test-strategy.md`.
* Evidencia individual: `evidence/individual.md`.
* Todos los datos son sintéticos; no hay credenciales ni PII.

### Flujo de ramas

Para la Semana 8, el equipo está integrando en `dev`. Cada integrante crea su rama de trabajo a partir de `dev` y abre un Pull Request con base `dev`; no se hacen commits directos a `main`/`master` ni se cambia la rama objetivo sin confirmarlo con el docente. Aunque GitHub muestre `main` como rama predeterminada del repositorio, la rama de integración acordada para este incremento es `dev`.
