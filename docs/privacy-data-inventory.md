# Inventario de datos y privacidad — Semana 9

## Contexto y propósito

La aplicación de clase demuestra la captura y sincronización de inspecciones de mantenimiento de laboratorios. Para esta actividad y sus pruebas se usan únicamente registros, nombres, ubicaciones y observaciones sintéticos. El inventario describe el comportamiento actual del código y no constituye una declaración de cumplimiento legal.

La institución del escenario es un organismo público estatal en Puebla. Antes de tratar información real, el área jurídica y la persona responsable de privacidad deben confirmar la normativa federal y estatal vigente aplicable, el aviso de privacidad, las bases y finalidades autorizadas, los plazos de conservación, los derechos y el procedimiento de atención a incidentes. Esta demostración no sustituye esa revisión.

## Inventario del tratamiento

| Dato | Origen y ejemplo sintético | Finalidad | Ubicación y conservación actual | Acceso y minimización |
| --- | --- | --- | --- | --- |
| Identificador de inspección | Generado en el navegador, por ejemplo `local-...`. | Distinguir registros y reintentos. | IndexedDB local; durante el proceso, el servidor de demostración lo conserva en memoria. No hay vencimiento automático. | Se genera sin identificar a una persona. |
| Laboratorio, fecha, estado, etiqueta, hallazgos y resumen | Formulario, datos precargados y fixtures sintéticos. | Registrar y mostrar el mantenimiento de prueba. | IndexedDB y, al sincronizar, memoria del servidor. El Service Worker excluye la API del caché; el detalle precargado pertenece al shell público. | Longitudes y rangos se validan. En uso real, un resumen podría revelar información operativa; no introducirla aquí. |
| Responsable | Selección entre `Técnica A`, `Técnico B` y `Técnica C`. | Asociar el registro de demostración a un rol ficticio. | Se guarda junto a la inspección local/remota de demostración. | No se solicitan nombres reales, cuentas ni identificadores personales. |
| Clave idempotente y revisión | Generadas por la cola de sincronización y el cliente. | Evitar duplicados y detectar actualizaciones obsoletas. | En IndexedDB mientras hay pendientes y en mapas de memoria del proceso remoto. | No son una credencial; se validan y acotan. |
| Archivo de evidencia seleccionado | El usuario elige un archivo de imagen opcional. | Demostrar la selección de evidencia. | El componente conserva solo el nombre en memoria de interfaz; los bytes no se agregan al registro ni se envían a la API. | Se aceptan JPEG, PNG y WebP hasta 5 MiB. Usar imágenes sintéticas. |
| Ubicación | Se solicita explícitamente mediante la API opcional del navegador. | Demostrar la capacidad opcional de ubicación. | El resultado queda en estado temporal de interfaz y no forma parte del esquema de inspección ni de la sincronización. | El permiso puede rechazarse; las pruebas usan ubicación sintética y no coordenadas personales. |
| Notificación | Texto genérico de sincronización. | Avisar del resultado de la sincronización. | Solo se muestra localmente; no se registran suscripciones push. | No incluir información de una inspección en el mensaje. |
| Datos técnicos de acceso | Navegador, conexión, petición HTTP y logs gestionados por navegador/plataforma. | Operación técnica. | La retención depende del navegador y del proveedor del servidor/CI; el repositorio no define su ciclo de vida. | No se añade analítica ni telemetría propia. Revisar la retención del proveedor antes de producción. |

## Flujos, retención y controles

1. El formulario crea un registro de inspección sintético y la cola lo guarda localmente en IndexedDB.
2. Con conexión, el cliente envía el registro por una solicitud `POST` al mismo origen. El servidor valida el JSON y actualiza sus mapas en memoria.
3. Si no hay conexión, la cola conserva la inspección local para reintentar después. El Service Worker no almacena respuestas bajo `/api/`.
4. Cámara/ubicación requieren acción y permiso explícitos. El archivo y la ubicación no se incorporan al registro de sincronización actual.

No existe una función de borrado ni un plazo de expiración para IndexedDB. Los registros del servidor de demostración se pierden al reiniciar el proceso, lo cual no es una política de retención adecuada. Para datos reales habría que implementar retención aprobada, acceso por rol, borrado verificable en servidor y cliente, copias de seguridad alineadas y un proceso de atención a solicitudes e incidentes. Borrar caché o datos del navegador no garantiza borrar copias remotas.

## No recolectar

No registrar nombres reales, matrículas, teléfonos, correos, credenciales, fotografías reales, coordenadas personales, datos de salud, contraseñas ni información que identifique a estudiantes, personal o instalaciones sensibles. No subir esos datos a issues, CI, capturas, commits o archivos de prueba. Las imágenes y ubicaciones automatizadas deben ser sintéticas.

## Eliminación de datos locales

La aplicación permite eliminar una inspección que se encuentre almacenada en el dispositivo. Para realizar esta operación, el usuario selecciona la opción **Eliminar inspección** y aparece un mensaje de confirmación con la posibilidad de aceptar o cancelar.

Cuando se confirma la eliminación, se ejecuta una transacción de escritura en IndexedDB que elimina:

- El registro de la inspección del almacén `inspections`.
- La tarea pendiente relacionada con esa inspección del almacén `outbox`.

Ambas operaciones se realizan dentro de la misma transacción para evitar que quede información incompleta. Las demás inspecciones y sus tareas de sincronización se conservan.

Si el usuario cancela la operación, no se elimina ningún dato y la inspección permanece almacenada en el dispositivo. La interfaz muestra un mensaje indicando si la eliminación se realizó correctamente o si ocurrió algún error.

**Importante:** esta función elimina únicamente los datos del almacenamiento local. Si una inspección ya fue sincronizada, eliminarla del dispositivo no significa que también se elimine del servidor. Para borrar información remota se necesitaría un procedimiento independiente autorizado.

## Consideraciones de privacidad

Para comprobar la eliminación se utilizan identificadores, responsables, ubicaciones y observaciones ficticias. No se deben utilizar datos personales reales durante las pruebas.

La eliminación local ayuda a mantener un mejor control de la información almacenada en el dispositivo, pero no sustituye una política completa de conservación y eliminación de datos en el servidor.