# Modelo de amenazas y controles — Semana 9

## Alcance y supuestos

Se modela la PWA acumulada para capturar inspecciones sintéticas en un navegador, conservarlas en IndexedDB y sincronizarlas con `/api/inspecciones/sync`. El escenario de despliegue es una aplicación servida por HTTPS. La API actual es una demostración sin autenticación, con registros e idempotencia en memoria; no se considera un sistema apto para información real ni para producción.

El límite de confianza incluye el navegador y sus extensiones, el almacenamiento local, la conexión entre navegador y servidor, el endpoint de sincronización, el servidor y las dependencias/CI. Las personas usuarias y sus dispositivos no se consideran confiables automáticamente. No se incluyen proveedores externos ni integraciones de terceros.

## Activos y riesgos

| Activo | Amenaza y escenario | Control implementado | Riesgo residual |
| --- | --- | --- | --- |
| Inspecciones pendientes en IndexedDB | Una persona con acceso al perfil del navegador puede leer o modificar registros locales. | La evidencia y las pruebas usan datos sintéticos; se valida el esquema al encolar y en el servidor. | IndexedDB no cifra los datos y no hay eliminación/retención configurable. No guardar datos personales o de acceso restringido. |
| API de sincronización | Una solicitud manipulada puede enviar campos inesperados, texto excesivo o revisiones inválidas. | Cuerpo JSON limitado a 16 KiB, esquema estricto, longitud y controles de texto acotados, clave idempotente validada y errores genéricos. | No hay autenticación, autorización, límites de frecuencia ni persistencia compartida; no exponer como servicio de producción. |
| Transporte | Intercepción o modificación de datos durante su envío. | El cliente usa rutas relativas del mismo origen; el despliegue debe usar HTTPS. HSTS y `upgrade-insecure-requests` solo se activan en producción. | El desarrollo local puede usar HTTP. La plataforma de despliegue debe terminar TLS y renovar certificados. |
| HTML y recursos de la aplicación | Inyección de contenido o carga de recursos ajenos al origen. | CSP restringe por defecto al mismo origen, bloquea objetos y marcos, y limita conexiones, formularios, imágenes y workers. No se permite `unsafe-eval` en producción. | Next.js requiere `unsafe-inline` para scripts de hidratación y estilos. Una CSP con nonce requiere adaptar la renderización y la caché offline; por ahora es una excepción documentada. |
| Capacidades del dispositivo | Solicitud de cámara o ubicación sin necesidad o acceso al micrófono. | Permisos bajo acción explícita; Permissions-Policy limita cámara y ubicación al mismo origen y deshabilita micrófono. Los fallbacks mantienen el flujo sin permisos. | El usuario puede conceder ubicación/cámara reales en un navegador compatible. La prueba automatizada no concede permisos reales. |
| Dependencias, configuración y CI | Inclusión accidental de credenciales o publicación de datos reales en artefactos. | No se requieren credenciales de despliegue para probar; `.env*` está ignorado; CI tiene permiso `contents: read` y usa datos sintéticos. | La revisión del repositorio y la configuración del proveedor de CI siguen siendo necesarias antes de un despliegue. |
| Indexación pública | Robots cooperativos podrían indexar el endpoint. | `robots.txt` solicita no rastrear `/api/`. | Robots es una instrucción para rastreadores, no control de acceso; la API continúa accesible sin autenticación. |

## Abuso y respuesta

1. **JSON sobredimensionado o malformado:** el parser consume como máximo 16 KiB y el endpoint contesta `413` para exceso de tamaño o `400` para contenido no válido, sin guardar cambios.
2. **Campos adicionales o valores fuera de rango:** el validador rechaza el objeto completo. Límites actuales: ID 128 caracteres, laboratorio 100, responsable 80, etiqueta 80, resumen 500 y hallazgos de 0 a 1000.
3. **Repetición de solicitudes:** una clave idempotente acotada mantiene el comportamiento de reintento existente. La protección solo vive en memoria y se reinicia con el proceso.
4. **Permiso de cámara/ubicación no concedido:** no se bloquea el guardado; la persona puede continuar sin la capacidad opcional.
5. **Contenido incrustado o carga de recursos externos:** CSP limita recursos al mismo origen y bloquea objetos y marcos. Cualquier integración externa futura exige revisar y probar la política antes de permitirla.

## Decisiones, límites y verificación

Se eligieron límites pequeños y explícitos para el contrato actual, manteniendo los campos que ya produce el formulario. La política CSP comparte una única configuración entre Next.js y las pruebas. En desarrollo permite `unsafe-eval` y conexiones WebSocket para las herramientas de Next; producción no. No se crea una configuración de credenciales porque el endpoint de demostración no consume servicios externos.

Las pruebas reproducibles están en [`tests/security.spec.ts`](../tests/security.spec.ts) y se ejecutan con `npm run test:security` o `npm test`. Verifican los encabezados de producción/desarrollo, el parser acotado, el esquema y los rechazos del endpoint. La prueba usa exclusivamente valores sintéticos.

Antes de producción hacen falta autenticación y autorización, limitación de frecuencia, almacenamiento remoto persistente, política de retención y borrado, revisión legal/institucional, análisis de dependencias, TLS en la plataforma y una CSP con nonce que se haya validado con el Service Worker. La restricción de robots no sustituye ninguno de esos controles.

El escaneo de texto del `public-tests/check.sh` incluido en el kit marca coincidencias falsas por una dependencia listada en el lockfile y una nota previa de `docs/capabilities.md`, porque busca subcadenas sin distinguir dependencias o documentación. No se alteraron esos archivos ajenos a esta actividad para ocultar el falso positivo; el resultado de `npm run verify` y las pruebas funcionales se reporta por separado.
