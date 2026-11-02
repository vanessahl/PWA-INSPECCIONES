# Capacidades del dispositivo y notificaciones

La Semana 6 agrega capacidades opcionales para inspecciones sintéticas. El flujo principal no depende de cámara, geolocalización ni notificaciones: si una capacidad no existe, el permiso se rechaza o el dispositivo falla, la inspección puede continuar con los datos normales.

## Cámara y evidencia

`src/lib/device/camera.ts` comprueba la disponibilidad de `mediaDevices.getUserMedia` y solicita únicamente video de la cámara trasera, sin audio. La solicitud debe ejecutarse desde una acción explícita del usuario. La evidencia es opcional y se aceptan imágenes JPEG, PNG o WebP de hasta 5 MiB mediante `validateEvidenceFile`.

La aplicación no envía ni conserva una fotografía automáticamente. El consumidor decide si adjunta el archivo a una inspección y debe liberar la transmisión con `stopCameraStream`. Si el permiso es rechazado o la cámara no está disponible, el fallback es continuar sin evidencia.

En `/inspecciones`, **Seleccionar archivo** abre directamente el selector normal de archivos: no pide permiso de cámara, de modo que rechazarlo nunca bloquea la evidencia. **Tomar foto** solicita la cámara del dispositivo mediante `capture="environment"`. La interfaz valida el archivo y confirma su selección sin convertirlo en un requisito del formulario. Esta entrega no sube fotografías a un backend real. El navegador no ofrece un permiso nativo separado para leer archivos; el cuadro **Permitir/Bloquear** corresponde a la cámara.

## Geolocalización

`src/lib/device/geolocation.ts` solicita una posición de baja precisión, con timeout de cinco segundos y una antigüedad máxima de un minuto. Solo devuelve latitud, longitud, precisión y hora de captura; no obtiene nombre, dirección ni identificadores del dispositivo.

La ubicación es opcional. `getCurrentLocation` devuelve una razón explícita cuando el navegador no soporta la API, se deniega el permiso, vence el timeout o ocurre otro fallo. `getSyntheticLocation` existe únicamente para pruebas y documentación, y no representa una ubicación real de una persona.

En `/inspecciones`, el botón **Usar ubicación** activa la solicitud únicamente después de que la persona lo pulsa. En un navegador compatible aparecerá el cuadro **Permitir / Bloquear**. Si se obtiene una posición, la interfaz muestra solo su precisión aproximada; si falla o se usa una dirección HTTP por IP en el celular, el formulario sigue disponible y explica que se requiere HTTPS.

## Notificaciones

`src/lib/notifications/client.ts` solicita permiso solo cuando se llama a `notifyInspectionChange`, nunca al cargar la aplicación. Si `Notification` no existe, el permiso es denegado o la construcción de la notificación falla, se ejecuta el callback de fallback. El fallback puede mostrar un mensaje dentro de la interfaz o registrar un aviso local; no usa un servicio push ni requiere credenciales.

## Pruebas y límites

`tests/capabilities.spec.ts` comprueba los fallbacks sin APIs del navegador, la validación de tipos de archivo, los datos sintéticos de ubicación y el fallback de notificaciones. Las APIs reales dependen del navegador, HTTPS y una acción del usuario, por lo que también deben validarse manualmente en un dispositivo de prueba sin datos personales.

Cuando una inspección se sincroniza después de pulsar **Guardar inspección**, la interfaz intenta mostrar una notificación de cambio. Si el permiso se deniega o la API no existe, muestra el aviso dentro de la aplicación.

El endpoint de demostración de semanas anteriores continúa siendo sintético y volátil. Esta semana no se almacenan coordenadas ni se agregan credenciales ni suscripciones push.

## Capacidades de la aplicación de inspecciones

## 1. Seleccionar archivo

El botón **Seleccionar archivo** permite elegir una imagen para utilizarla como evidencia de una inspección. Abre directamente el selector de archivos, sin solicitar permiso de cámara, para elegir una imagen JPEG, PNG o WebP.

La imagen seleccionada debe tener un tamaño máximo de 5 MiB. Si el archivo no cumple con el formato o tamaño permitido, la aplicación muestra un mensaje de error y no acepta la imagen. Cuando la selección es válida, se muestra el nombre del archivo en la pantalla.

Como no depende de ningún permiso, es el fallback cuando la cámara se bloquea.

## 2. Tomar foto

El botón **Tomar foto** solicita permiso para utilizar la cámara del dispositivo. Si se concede el permiso, la aplicación detiene la transmisión de la cámara y abre el selector de imágenes configurado para utilizar la cámara trasera cuando el dispositivo lo permite.

El usuario puede intentar capturar una fotografía y seleccionar una imagen válida. Si el permiso se rechaza o la cámara no está disponible, se muestra un mensaje que indica que puede seleccionarse un archivo, y **Seleccionar archivo** sigue funcionando.

La pantalla muestra el nombre de la evidencia seleccionada. En el código revisado, la imagen no se incorpora al registro guardado como un archivo persistente.

## 3. Usar ubicación

El botón **Usar ubicación** solicita la ubicación del dispositivo mediante la función de geolocalización. Si la operación tiene éxito, la pantalla muestra un mensaje que indica que se capturó una ubicación opcional con precisión limitada y presenta la precisión aproximada en metros.

Si se rechaza el permiso, no se obtiene la ubicación o existe un problema con el contexto de seguridad, la aplicación muestra un mensaje explicativo. El usuario puede continuar con la inspección sin ubicación.

La captura de ubicación se mantiene en el estado de la pantalla, pero en el código revisado no se agrega al registro que se guarda.

## 4. ¿Qué sucede al presionar Permitir?

Cuando el usuario presiona **Permitir**, autoriza al navegador a intentar utilizar el recurso solicitado.

- **Cámara:** la aplicación intenta obtener acceso a la cámara y, si lo consigue, abre el selector configurado para capturar una fotografía.
- **Ubicación:** la aplicación intenta obtener las coordenadas del dispositivo. Si la operación tiene éxito, muestra un mensaje de confirmación y la precisión aproximada.

El permiso no garantiza por sí solo que la operación termine correctamente, ya que también depende del dispositivo, del navegador y de la disponibilidad del recurso.

## 5. ¿Qué sucede al presionar Bloquear?

Cuando el usuario presiona **Bloquear**, el navegador rechaza el acceso al recurso solicitado.

- **Cámara:** la aplicación muestra un mensaje indicando que no se concedió el permiso. **Seleccionar archivo** sigue disponible.
- **Ubicación:** la aplicación muestra un mensaje que indica que se rechazó el permiso y que la inspección puede guardarse sin ubicación.

La aplicación maneja estos casos mediante mensajes en pantalla para informar al usuario sobre el resultado.

## 6. Alternativas cuando se rechaza un permiso

Cuando se rechaza el permiso de ubicación, el usuario puede guardar la inspección sin coordenadas, siempre que complete los campos obligatorios.

Cuando se rechaza el permiso de cámara, la aplicación informa que puede seleccionarse un archivo y el botón **Seleccionar archivo** funciona sin ese permiso. Corregido en esta revisión: antes ese botón también pedía la cámara y quedaba bloqueado.

## 6b. Decisiones, trade-offs y fallos encontrados

| Decisión | Alternativa descartada | Motivo |
| --- | --- | --- |
| Permisos solo tras un clic | Pedir al cargar la página | Menos intrusivo; los navegadores penalizan los avisos sin gesto. |
| Notificación local con fallback en la interfaz | Web Push con servidor | No hay secretos ni suscripciones; el límite es que solo avisa con la app abierta. |
| Notificar solo con permiso `granted` | Crear siempre `new Notification` | `default` (diálogo descartado) no debe mostrar nada nativo; se usa el fallback. |
| Ubicación de baja precisión, sin guardarla | Alta precisión y persistencia | Minimiza datos; no se envía al servidor. |
| Selector de archivos independiente de la cámara | Pedir permiso antes | Fallo corregido: bloquear la cámara impedía adjuntar evidencia. |

Límites: las APIs reales no se ejecutan en CI, solo dobles de prueba; la foto y la ubicación no se persisten en el registro.

## 7. Cámara y ubicación opcionales

La fotografía y la ubicación se presentan como funciones opcionales de la pantalla. Los campos obligatorios para guardar una inspección son laboratorio, fecha, hallazgos y resumen.

El usuario puede registrar una inspección sin solicitar la ubicación y sin seleccionar una fotografía. La aplicación intenta guardar el registro en el almacenamiento local y, si hay conexión, intenta sincronizarlo con el servicio de demostración.

Aunque la pantalla permite seleccionar una imagen y capturar una ubicación, el código revisado no incorpora esos datos al objeto de inspección que se guarda.

## 8. Uso de datos sintéticos en las pruebas

La aplicación utiliza registros sintéticos de mantenimiento de laboratorios y opciones ficticias para el responsable de la inspección. Las pruebas manuales deben utilizar información de ejemplo, sin incluir datos personales reales.

Los datos sintéticos permiten comprobar el comportamiento de la pantalla, los mensajes de permisos, el registro local y la navegación al detalle.

## 9. Requisito HTTPS para la ubicación

La geolocalización del navegador puede requerir un contexto seguro, normalmente HTTPS. En desarrollo local, los navegadores suelen permitir esta función desde `localhost`; sin embargo, el acceso desde la dirección IP de un celular puede requerir HTTPS.

Si la ubicación no funciona, se debe revisar la dirección utilizada, los permisos del navegador y la disponibilidad de los servicios de ubicación. La aplicación muestra un mensaje específico cuando detecta el problema de contexto inseguro al acceder desde la IP del celular.