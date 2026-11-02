# Estrategia de caché — Semana 3

## 1. Alcance

La aplicación utiliza únicamente datos sintéticos para las inspecciones. Durante la Semana 3 se incorpora una estrategia de caché mediante un service worker para permitir que el shell de la aplicación y las rutas visitadas anteriormente puedan continuar funcionando cuando exista conectividad intermitente o se pierda temporalmente la conexión.

El alcance de esta semana se limita a la disponibilidad del shell y de los recursos GET almacenados en caché. No se implementa almacenamiento de nuevas inspecciones, sincronización de cambios, autenticación offline ni manejo de datos reales.

## 2. Estrategia de caché

La caché utiliza una versión identificada como:

`inspecciones-shell-v1`

El service worker aplica diferentes comportamientos dependiendo del tipo de solicitud.

| Recurso o solicitud                                      | Política                                          | Motivo                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Navegaciones HTML                                        | Network first, con fallback a caché y después `/` | Prioriza la versión actualizada de la aplicación y permite mostrar una respuesta disponible cuando no existe conexión. |
| Shell inicial, manifest e iconos                         | Precarga durante `install`                        | Permite que los recursos básicos estén disponibles después de la primera visita.                                       |
| Solicitudes GET del mismo origen que no son navegaciones | Cache first, con guardado de respuestas exitosas  | Reduce la dependencia de la red después de que un recurso ya fue almacenado.                                           |
| POST, PUT, DELETE y otras solicitudes que no sean GET    | Sin interceptar                                   | Evita almacenar o modificar datos relacionados con operaciones que no forman parte del alcance de esta semana.         |
| Solicitudes a orígenes externos                          | Sin interceptar                                   | Mantiene la estrategia limitada a los recursos del propio sitio.                                                       |

## 3. Recursos precargados

Durante la instalación del service worker se precargan los recursos principales del shell:

* `/`
* `/manifest.webmanifest`
* `/icon-192.svg`
* `/icon-512.svg`

Estos recursos permiten disponer de una base mínima de la aplicación después de realizar una primera visita con conexión.

Además, las solicitudes GET del mismo origen que obtienen una respuesta correcta pueden almacenarse posteriormente en la caché.

## 4. Comportamiento de las navegaciones

Las navegaciones utilizan una estrategia **Network First**.

El comportamiento es el siguiente:

1. El navegador intenta obtener la navegación desde la red.
2. Si la respuesta de red es correcta, se devuelve al usuario y se guarda una copia en la caché.
3. Si la solicitud de red falla, el service worker busca la misma navegación en la caché.
4. Si existe una respuesta almacenada, se utiliza esa respuesta.
5. Si tampoco existe una respuesta para esa ruta, se utiliza `/` como último fallback.

De esta manera, la aplicación puede conservar una pantalla funcional cuando la conexión es intermitente o se pierde después de haber realizado una primera visita.

## 5. Comportamiento de otros recursos GET

Para las solicitudes GET del mismo origen que no corresponden a una navegación se utiliza una estrategia **Cache First**.

El flujo es:

1. El service worker busca primero el recurso en la caché.
2. Si existe una respuesta almacenada, se devuelve directamente.
3. Si no existe, se solicita el recurso a la red.
4. Cuando la respuesta de red es correcta, se guarda una copia en la caché.
5. En futuras solicitudes, el recurso almacenado puede utilizarse sin depender nuevamente de la red.

Esta estrategia permite reducir las solicitudes de red después de que los recursos ya fueron cargados al menos una vez.

## 6. Comportamiento offline

El funcionamiento offline depende de que los recursos hayan sido almacenados previamente.

### Primera visita

La primera visita necesita conectividad para obtener los recursos y llenar la caché. Por lo tanto, no se garantiza que la aplicación pueda iniciarse completamente sin conexión antes de haber realizado una primera carga con Internet.

### Después de una primera visita

Después de que el shell y otros recursos hayan sido almacenados:

* la navegación puede utilizar una respuesta previamente cacheada si la red falla;
* si la ruta solicitada no está disponible en caché, se utiliza `/` como fallback;
* los recursos GET previamente almacenados pueden servirse desde la caché;
* los recursos que nunca fueron almacenados pueden seguir necesitando conexión.

La estrategia está diseñada para mantener disponible el shell de la aplicación y los recursos previamente visitados, no para proporcionar una copia completa y permanente de todos los datos de la aplicación.

## 7. Instalación y actualización

El service worker precarga el shell durante el evento `install`.

Durante el evento `activate`, se buscan las versiones anteriores de las cachés cuyo nombre comienza con:

`inspecciones-shell-`

Las versiones anteriores diferentes de la versión actual se eliminan para evitar conservar recursos obsoletos.

El nombre de la caché incluye una versión:

`inspecciones-shell-v1`

Cuando sea necesario cambiar los recursos del shell o invalidar una versión anterior, se puede incrementar el número de versión para crear una nueva caché y eliminar la anterior durante la activación.

## 8. Actualización controlada del service worker

El service worker no ejecuta `skipWaiting` automáticamente.

La actualización inmediata solamente se solicita cuando recibe explícitamente un mensaje con el tipo:

`SKIP_WAITING`

Esto permite que una futura interfaz pueda solicitar la activación de una nueva versión cuando sea conveniente, evitando que una actualización interrumpa automáticamente una sesión activa.

## 9. Límites de la estrategia

La estrategia de caché tiene los siguientes límites:

* La primera visita necesita conexión para llenar la caché.
* Una respuesta almacenada puede representar contenido anterior y, por lo tanto, puede quedar desactualizada.
* No existe una cola de cambios para operaciones realizadas sin conexión.
* No se implementa sincronización posterior con un servidor.
* No se almacenan operaciones `POST`, `PUT` o `DELETE`.
* No se implementa autenticación offline.
* No se utilizan datos reales de personas, laboratorios o estudiantes.
* Los datos utilizados por el proyecto son sintéticos.
* Los recursos externos no son interceptados por el service worker.
* La disponibilidad offline depende de que el recurso haya sido almacenado previamente.

## 10. Decisiones técnicas

Se decidió utilizar **Network First para las navegaciones** porque se busca priorizar la información más actual cuando existe conexión, utilizando una respuesta almacenada únicamente como respaldo cuando la red no está disponible.

Para los demás recursos GET del mismo origen se utiliza **Cache First**, debido a que estos recursos pueden reutilizarse después de haber sido descargados y almacenados.

También se decidió utilizar una caché versionada para facilitar la actualización controlada del shell y eliminar versiones anteriores durante la activación del service worker.

No se implementa sincronización de datos en esta semana porque el alcance actual se concentra en la disponibilidad del shell y de los recursos previamente almacenados.

## 11. Validación

La estrategia se valida mediante las pruebas y verificaciones disponibles en el proyecto:

```bash
npm ci
npm test
npm run build
npm run verify
```

También se puede comprobar el comportamiento offline desde las herramientas de desarrollo del navegador utilizando el modo **Offline**, después de haber realizado una primera visita con conexión.

La validación debe comprobar que:

* el service worker se registra correctamente;
* los recursos del shell se almacenan;
* las navegaciones pueden utilizar la caché cuando falla la red;
* `/` funciona como fallback cuando no existe una respuesta cacheada para una navegación;
* los recursos GET del mismo origen pueden reutilizarse desde la caché;
* las versiones anteriores de la caché pueden eliminarse al activar una nueva versión.

## 12. Alcance futuro

La estrategia actual constituye una base para futuras mejoras de la PWA. En versiones posteriores podrían incorporarse mecanismos de almacenamiento local de inspecciones, sincronización de cambios pendientes y otras capacidades offline.

Estas funcionalidades quedan fuera del alcance de la Semana 3 y no se consideran implementadas actualmente.
