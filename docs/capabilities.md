# Capacidades del dispositivo y notificaciones

La Semana 6 agrega capacidades opcionales para inspecciones sintéticas. El flujo principal no depende de cámara, geolocalización ni notificaciones: si una capacidad no existe, el permiso se rechaza o el dispositivo falla, la inspección puede continuar con los datos normales.

## Cámara y evidencia

`src/lib/device/camera.ts` comprueba la disponibilidad de `mediaDevices.getUserMedia` y solicita únicamente video de la cámara trasera, sin audio. La solicitud debe ejecutarse desde una acción explícita del usuario. La evidencia es opcional y se aceptan imágenes JPEG, PNG o WebP de hasta 5 MiB mediante `validateEvidenceFile`.

La aplicación no envía ni conserva una fotografía automáticamente. El consumidor decide si adjunta el archivo a una inspección y debe liberar la transmisión con `stopCameraStream`. Si el permiso es rechazado o la cámara no está disponible, el fallback es continuar sin evidencia.

En `/inspecciones`, **Seleccionar archivo** solicita primero el permiso de cámara para mantener una confirmación explícita antes de adjuntar evidencia y después abre el selector normal. **Tomar foto** solicita la cámara del dispositivo mediante `capture="environment"`. La interfaz valida el archivo y confirma su selección sin convertirlo en un requisito del formulario. Esta entrega no sube fotografías a un backend real. El navegador no ofrece un permiso nativo separado para leer archivos; el cuadro **Permitir/Bloquear** corresponde a la cámara.

## Geolocalización

`src/lib/device/geolocation.ts` solicita una posición de baja precisión, con timeout de cinco segundos y una antigüedad máxima de un minuto. Solo devuelve latitud, longitud, precisión y hora de captura; no obtiene nombre, dirección ni identificadores del dispositivo.

La ubicación es opcional. `getCurrentLocation` devuelve una razón explícita cuando el navegador no soporta la API, se deniega el permiso, vence el timeout o ocurre otro fallo. `getSyntheticLocation` existe únicamente para pruebas y documentación, y no representa una ubicación real de una persona.

En `/inspecciones`, el botón **Usar ubicación** activa la solicitud únicamente después de que la persona lo pulsa. En un navegador compatible aparecerá el cuadro **Permitir / Bloquear**. Si se obtiene una posición, la interfaz muestra solo su precisión aproximada; si falla o se usa una dirección HTTP por IP en el celular, el formulario sigue disponible y explica que se requiere HTTPS.

## Notificaciones

`src/lib/notifications/client.ts` solicita permiso solo cuando se llama a `notifyInspectionChange`, nunca al cargar la aplicación. Si `Notification` no existe, el permiso es denegado o la construcción de la notificación falla, se ejecuta el callback de fallback. El fallback puede mostrar un mensaje dentro de la interfaz o registrar un aviso local; no usa un servicio push ni requiere secretos.

## Pruebas y límites

`tests/capabilities.spec.ts` comprueba los fallbacks sin APIs del navegador, la validación de tipos de archivo, los datos sintéticos de ubicación y el fallback de notificaciones. Las APIs reales dependen del navegador, HTTPS y una acción del usuario, por lo que también deben validarse manualmente en un dispositivo de prueba sin datos personales.

Cuando una inspección se sincroniza después de pulsar **Guardar inspección**, la interfaz intenta mostrar una notificación de cambio. Si el permiso se deniega o la API no existe, muestra el aviso dentro de la aplicación.

El endpoint de demostración de semanas anteriores continúa siendo sintético y volátil. Esta semana no se almacenan coordenadas ni se agregan credenciales, tokens o suscripciones push.
