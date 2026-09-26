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