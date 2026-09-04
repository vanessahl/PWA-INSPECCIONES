# ADR-001 - Estrategia de aplicacion

## Estado

Aceptada - 2026-09-03

## Contexto y restricciones

El producto apoya inspecciones de mantenimiento realizadas principalmente desde telefonos. La conectividad puede ser intermitente durante los recorridos, por lo que las futuras funciones de consulta y captura deben operar con datos locales y sincronizar cuando haya red. En Semana 1 solo se muestran tres inspecciones sinteticas; no hay datos reales ni backend de produccion.

El proyecto forma parte de una materia de 14 semanas y debe poder clonarse, instalarse y ejecutarse de forma reproducible. Se necesita una ruta de despliegue web sencilla, mantenimiento acotado y posibilidad de evolucionar gradualmente hacia cache, almacenamiento local y sincronizacion.

## Alternativas consideradas

| Alternativa | Instalacion y distribucion | Offline y capacidades del dispositivo | Costo y mantenimiento | Riesgos principales |
| --- | --- | --- | --- | --- |
| PWA | URL web, instalable desde el navegador sin tienda | Service worker, Cache Storage e IndexedDB permiten offline; camara y notificaciones dependen del navegador | Una base web y despliegue continuo; costo bajo para el curso | Diferencias entre navegadores, limites de almacenamiento y sincronizacion en segundo plano no uniforme |
| Web tradicional | URL web sin instalacion | Depende de red; acceso a hardware y cache offline no son parte del objetivo | El menor costo inicial | No resuelve recorridos sin cobertura ni ofrece experiencia instalable |
| App nativa | Requiere compilaciones, tiendas o distribucion empresarial | Mejor integracion con sistema, almacenamiento y tareas en segundo plano | Dos plataformas o una plataforma priorizada; alto costo de mantenimiento | Tiempo de publicacion y curva de aprendizaje incompatibles con el alcance de 14 semanas |
| Multiplataforma (React Native/Flutter) | Paquetes moviles y proceso de compilacion/distribucion | Buen acceso a APIs nativas y offline | Una base movil, pero con toolchain y ciclos de release adicionales | Complejidad de build, emuladores y posible duplicacion de una interfaz web para evaluacion |

## Decision

Se elige una **Progressive Web App (PWA)** construida sobre la aplicacion web existente de Next.js. Esta opcion mantiene una URL accesible para la evaluacion y permite añadir en semanas posteriores un manifiesto, service worker, cache de la aplicacion, IndexedDB para registros pendientes y una estrategia de sincronizacion explicita.

La eleccion entrega suficiente soporte para un flujo de inspeccion movil sin el costo operativo de tiendas, compilaciones moviles y dos plataformas. No resuelve todavia la instalacion, el funcionamiento offline, la cola de cambios, la deteccion de conflictos, la sincronizacion en segundo plano ni la captura de evidencia con camara. Esas capacidades se implementaran y probaran por incrementos.

## Consecuencias y riesgos

Consecuencias positivas:

- Una sola base de codigo web para escritorio y movil, accesible mediante URL e instalable cuando se agregue el manifiesto.
- Despliegue reproducible con Node.js, npm y el flujo actual de Next.js.
- Evolucion incremental: primero cache de recursos, despues consulta offline y finalmente registros pendientes y sincronizacion.

Costos y riesgos con mitigacion:

| Riesgo o costo | Mitigacion |
| --- | --- |
| Cache desactualizada puede mostrar datos viejos | Versionar la cache, definir una politica de actualizacion y mostrar la fecha de ultima sincronizacion. |
| Una sincronizacion reintentada puede duplicar inspecciones | Usar identificadores generados en cliente e idempotencia en el endpoint de sincronizacion. |
| IndexedDB puede llenarse o ser eliminada por el navegador | Guardar solo datos necesarios, manejar cuotas y comunicar al usuario el estado pendiente. |
| APIs PWA no se comportan igual en todos los navegadores | Probar Chrome Android y un navegador de escritorio; usar degradacion funcional para capacidades no disponibles. |
| No se cuenta aun con servidor para sincronizar | Mantener datos sinteticos y definir el contrato de sincronizacion antes de conectar un servicio externo. |
| El scope puede crecer mas rapido que las 14 semanas | Priorizar consulta offline y registro pendiente sobre notificaciones, camara e integraciones. |

## Validacion

La decision se revisara con evidencia incremental en semanas posteriores:

1. **Base reproducible:** `npm ci`, `npm test`, `npm run build` y `make verify` terminan correctamente; la pantalla inicial muestra tres inspecciones sinteticas.
2. **Instalacion y recursos offline:** Lighthouse confirma que existe manifiesto y service worker; con DevTools en modo Offline, una recarga muestra la ultima version cacheada de la interfaz.
3. **Datos offline:** se crea una inspeccion sintetica sin red, se reinicia el navegador y el registro pendiente continua disponible en IndexedDB.
4. **Sincronizacion:** al restaurar la red, una prueba automatizada verifica que el registro se envia una vez, se marca como sincronizado y no se duplica tras reintentos.

La ADR se reabrira si las pruebas demuestran que los navegadores objetivo no proporcionan las capacidades de almacenamiento o sincronizacion necesarias para el flujo de inspeccion.
