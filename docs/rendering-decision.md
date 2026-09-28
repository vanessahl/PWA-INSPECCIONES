# Decisión de renderizado — Semana 4

## Alcance

La semana compara dos rutas del mismo flujo de inspecciones usando únicamente los tres registros sintéticos de `src/lib/data/inspections.ts`:

- `/inspecciones` implementa el listado con **CSR**.
- `/inspecciones/[id]` implementa el detalle con **SSR** mediante un Server Component de Next.js.
- `src/app/inspecciones/[id]/loading.tsx` presenta el estado de carga de segmento durante la navegación al detalle.

Ambas rutas muestran estados explícitos de carga o error y no dependen de un backend, autenticación ni datos reales.

## Decisión

El listado usa CSR porque permite demostrar la transición de carga a contenido en el navegador y deja preparado el punto donde una consulta futura podría reaccionar a filtros o conectividad. El estado inicial muestra `LoadingState`; después del montaje, el navegador presenta los datos sintéticos o un estado de error/vacío controlado mediante la URL.

El detalle usa SSR porque el identificador forma parte de la ruta y el contenido puede resolverse antes de enviar HTML al navegador. Esto favorece el primer render, los enlaces compartibles y una respuesta clara para un identificador inexistente sin agregar JavaScript de cliente.

## Comparación

| Criterio | Listado CSR | Detalle SSR |
| --- | --- | --- |
| Ubicación del render | Navegador, después de hidratar | Servidor, antes de enviar la respuesta |
| Estado inicial | `LoadingState` visible | Respuesta HTML del detalle o error |
| Interactividad | Adecuada para filtros y refrescos futuros | Menor JavaScript para una consulta puntual |
| Costo actual | Más JavaScript y una transición de carga | Menor JavaScript, pero depende de resolver la ruta |
| Prueba | Frontera `use client`, `useEffect` y estados | Ausencia de `use client`, `params` y búsqueda por `id` |

## Supuestos y límites

- Los datos son locales, sintéticos y estáticos; no se simula una API ni latencia de red.
- El listado muestra carga durante la inicialización en el navegador; los estados `error` y vacío se reproducen con `/inspecciones?estado=error` y `/inspecciones?estado=vacio`.
- El detalle inexistente se reproduce con `/inspecciones/id-inexistente`.
- Las pruebas automatizadas verifican el contrato de archivos y estados, pero no sustituyen una comprobación visual en un navegador.
- La estrategia offline de la Semana 3 conserva las rutas visitadas; no agrega sincronización de inspecciones.

## Fallos encontrados

La prueba de renderizado ya existía en el árbol local, aunque no estaba conectada a `npm test`. Al integrar el cambio se detectó una definición duplicada que causaba `SyntaxError: Identifier 'assert' has already been declared`. El primer build también detectó contenido duplicado en las rutas y en el componente de carga; se consolidó cada archivo en una sola implementación. También se amplió la verificación para detectar la ausencia de las rutas, el componente y la decisión documentada. En Windows no estaba disponible GNU Make, por lo que se ejecutó el equivalente exacto `npm run verify`.

## Validación

Se ejecutan `npm ci`, `npm test`, `npm run build` y `make verify`. La prueba `tests/rendering.spec.ts` comprueba la frontera CSR/SSR, los estados de carga, los enlaces al detalle y los estados de error y vacío. GitHub Actions debe ejecutarse en el repositorio después de publicar el commit; no se puede confirmar un resultado remoto desde un árbol local sin publicar cambios.


# Decisión de renderizado

## Pruebas realizadas

Para comprobar el funcionamiento de las páginas de inspecciones, se realizaron pruebas directamente desde el navegador utilizando las diferentes rutas indicadas. El objetivo fue revisar qué información se muestra en cada caso y verificar el comportamiento de la aplicación cuando existen registros, cuando ocurre un error, cuando no hay resultados y cuando se consulta una inspección que no existe.

**Navegador utilizado:** Google Chrome.

### 1. Listado de inspecciones

**Ruta:** `/inspecciones`

Al ingresar a esta dirección se muestra el listado de las inspecciones recientes. La página contiene información de demostración y trabaja con datos sintéticos.

Se muestran **3 registros**:

* **Laboratorio de Redes:** revisión visual de cableado, ventilación y estaciones de trabajo. Tiene 0 hallazgos y aparece como “Sin incidencias”.
* **Laboratorio de Electrónica:** tiene 2 hallazgos y aparece como “Requiere atención”. El responsable es Técnico B.
* **Laboratorio de Software:** comprobación de equipo, señalización y disponibilidad del espacio. Tiene 0 hallazgos y aparece como “Sin incidencias”.

También se puede acceder al detalle de cada inspección mediante el botón **“Ver detalle”**.

En la parte superior se indica **“Listado · renderizado en cliente”**, por lo que esta vista corresponde al renderizado del listado desde el cliente.

### 2. Estado de error

**Ruta:** `/inspecciones?estado=error`

En esta ruta la aplicación muestra la interfaz principal de inspecciones, pero la consulta de los registros no está disponible.

Se muestra el mensaje:

**“No pudimos cargar las inspecciones”**

Debajo se explica que la consulta no está disponible y se proporciona la opción **“Reintentar”** para volver a realizar el proceso desde el inicio.

Esta prueba permite comprobar cómo responde la aplicación cuando ocurre un problema al intentar cargar la información.

### 3. Estado vacío

**Ruta:** `/inspecciones?estado=vacio`

En esta ruta se muestra la sección de inspecciones recientes, pero en lugar de presentar los registros aparece el mensaje:

**“No hay inspecciones”**

También se indica que no se encontraron registros para mostrar en ese momento y se incluye el botón **“Volver al inicio”**.

Este caso permite comprobar el comportamiento de la interfaz cuando no existen datos disponibles para mostrar al usuario.

### 4. Detalle de una inspección existente

**Ruta:** `/inspecciones/inspection-002`

Al ingresar a esta dirección se muestra correctamente el detalle de la inspección correspondiente al **Laboratorio de Electrónica**.

La información mostrada es:

* **Estado:** Requiere atención.
* **Fecha:** 2026-08-27.
* **Responsable:** Técnico B.
* **Hallazgos:** 2.
* **Identificador:** inspection-002.

La página también incluye la opción **“Volver al listado”** para regresar a la pantalla principal de inspecciones.

En esta vista aparece la indicación **“Detalle · renderizado en servidor”**, por lo que se identifica como una página de detalle renderizada en servidor.

### 5. Identificador de inspección inexistente

**Ruta:** `/inspecciones/id-inexistente`

Al ingresar un identificador que no corresponde a ninguna inspección existente, la aplicación muestra una página informando que el registro no fue encontrado.

El mensaje principal es:

**“Inspección no encontrada”**

También se indica que no existe un registro sintético con el identificador solicitado. La página proporciona el botón **“Volver al listado”** para regresar a la lista de inspecciones.

Este comportamiento permite comprobar que la aplicación contempla el caso en el que el usuario intenta consultar un registro que no existe.

## Conclusión

Después de realizar las pruebas, se comprobó que las diferentes rutas de la aplicación responden de acuerdo con el escenario solicitado. El listado permite consultar las inspecciones disponibles, mientras que las rutas de error y estado vacío muestran mensajes específicos para informar al usuario sobre lo que está sucediendo.

También se comprobó el acceso al detalle de una inspección existente y el manejo de un identificador inexistente. Con estas pruebas se pudo verificar que la aplicación cuenta con diferentes estados de interfaz y que cada uno presenta información y opciones de navegación acordes con el caso.

En general, las pruebas realizadas permitieron identificar la diferencia entre el listado, que se muestra como **renderizado en cliente**, y el detalle de una inspección, que se muestra como **renderizado en servidor**.
