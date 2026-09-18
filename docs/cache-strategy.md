# Estrategia de caché — Semana 3

## Alcance

La aplicación usa únicamente datos sintéticos. Esta semana agrega un service worker para que el shell y la última ruta visitada puedan abrirse con conectividad intermitente. No implementa almacenamiento de inspecciones, sincronización de cambios ni autenticación.

## Recursos y políticas

| Recurso | Política | Motivo |
| --- | --- | --- |
| Navegaciones HTML | Network first, fallback a la respuesta cacheada y después `/` | Prioriza contenido actualizado y conserva una pantalla funcional offline. |
| Shell inicial, manifest e iconos | Precarga durante `install` | Permite abrir la aplicación después de una primera visita. |
| JavaScript, CSS y otros GET del mismo origen | Cache first, con guardado de respuestas exitosas | Reduce dependencia de la red después de la primera carga. |
| POST, PUT, DELETE y orígenes externos | Sin interceptar | Evita guardar mutaciones o datos fuera del alcance de la semana. |

## Instalación y actualización segura

El worker precarga el shell en `install` y elimina versiones anteriores en `activate`. El nombre de caché incluye una versión (`inspecciones-shell-v1`); al cambiar el shell se incrementa ese valor para invalidar recursos antiguos de forma controlada.

El worker no ejecuta `skipWaiting` automáticamente. Solo acepta el mensaje explícito `SKIP_WAITING`, de modo que una futura interfaz pueda pedir la actualización cuando sea seguro hacerlo y no interrumpa una sesión activa.

## Límites y validación

La primera visita necesita red para llenar la caché. Las respuestas dinámicas pueden quedar desactualizadas y no existe una cola de cambios. Se valida con `npm test`, `npm run build`, una recarga en DevTools con modo Offline y una comprobación de que una nueva versión activa elimina la caché anterior.