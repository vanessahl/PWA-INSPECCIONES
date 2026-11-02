# Inventario de datos y privacidad — Semana 9

## Alcance

La aplicación es una demostración educativa. Las pruebas, los ejemplos y cualquier captura manual deben usar exclusivamente datos sintéticos. No se deben ingresar nombres, ubicaciones, fotografías, credenciales ni otra información real o sensible. Este inventario describe lo que hace el código actual; no es una autorización para tratar datos personales.

## Datos tratados

| Dato | Origen y propósito | Almacenamiento y transferencia | Retención y eliminación |
| --- | --- | --- | --- |
| Inspecciones de ejemplo (`id`, laboratorio, fecha, responsable ficticio, estado, hallazgos y resumen) | Registros predefinidos y datos sintéticos ingresados para probar la captura y sincronización. | Los ejemplos están en el código de la aplicación. Los registros capturados se guardan en IndexedDB del navegador y se envían al endpoint del mismo origen cuando hay conexión. | IndexedDB conserva los registros hasta que se borren los datos del sitio/perfil del navegador. La interfaz actual no ofrece una función para borrar inspecciones. La copia remota de demostración se conserva en memoria y se pierde al reiniciar el servidor. |
| Cola de sincronización, clave idempotente, revisión, intentos y tiempos de reintento | Metadatos generados por la aplicación para reintentar envíos y detectar duplicados o conflictos. | Se guardan en IndexedDB junto con el registro y se envían al endpoint de sincronización del mismo origen. | Se eliminan de la cola al completar o resolver la sincronización. Los registros locales permanecen según la fila anterior. |
| Ubicación | Solo se solicita mediante una acción explícita. Se usa para demostrar la capacidad opcional de geolocalización. | Las coordenadas, precisión y hora viven temporalmente en el estado de la pantalla; el esquema de inspección y la solicitud de sincronización actuales no las incluyen. | Se descartan al abandonar o reiniciar la pantalla. No se conserva historial de ubicación en la aplicación. |
| Evidencia de imagen | Archivo JPEG, PNG o WebP opcional, seleccionado tras una acción explícita y limitado a 5 MiB. | El nombre se muestra temporalmente en la pantalla. El formulario no incorpora el archivo ni su nombre al registro enviado al endpoint. El navegador puede mantener el archivo seleccionado en el control mientras la página está abierta. | El estado de la pantalla se limpia después de guardar o al cerrar la página; no existe almacenamiento de imágenes en IndexedDB ni carga a un servicio remoto. |
| Permisos de cámara y geolocalización | Decisión del usuario ante el diálogo del navegador. | Los concede y administra el navegador; la aplicación no guarda un historial de permisos. El stream de cámara se detiene después de comprobar el permiso. | Conforme a la configuración del navegador y del sistema operativo. |
| Secretos y credenciales | No son necesarios para ejecutar la demostración, las pruebas o el workflow de CI. | No se envían ni guardan secretos como parte del flujo; `.env` y `.env.*` están excluidos por `.gitignore`. | No aplica. No agregar tokens, secretos, PII ni respuestas de quizzes al repositorio, logs o artefactos. |

## Destinatarios y límites

- La sincronización usa una ruta relativa del mismo origen. El workflow de GitHub Actions compila y prueba datos sintéticos; no procesa registros de usuarios.
- El endpoint de demostración no tiene autenticación ni autorización y mantiene su estado remoto en memoria. No debe exponerse como servicio real ni usarse con datos reales.
- IndexedDB no cifra los registros y cualquier persona con acceso al perfil del navegador puede consultarlos. No hay política configurable de retención ni eliminación desde la interfaz.
- Las respuestas de sincronización incluyen `Cache-Control: no-store`; `robots.txt` pide a rastreadores cooperativos no recorrer `/api/`, pero no restringe el acceso.
- En producción se requieren autenticación, autorización, persistencia segura, retención y borrado definidos, HTTPS/TLS, análisis de dependencias y revisión institucional antes de tratar información real.

## Verificación

La validación de tamaños, campos, caracteres y revisiones está en `src/lib/security/request.ts` y `src/lib/storage/schema.ts`. Las pruebas reproducibles están en `tests/security.spec.ts`; se ejecutan con `npm run test:security`. El modelo de amenazas y los riesgos residuales están en `docs/threat-model.md`.
