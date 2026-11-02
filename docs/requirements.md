# Requisitos del producto — completar en Semana 1

> Conserva estos encabezados y reemplaza las instrucciones por tu análisis. No uses datos reales.

## 1. Problema y contexto

Las inspecciones de mantenimiento de los laboratorios se registran en papel o de forma dispersa, por lo que resulta difícil consultar el estado de un espacio, sus hallazgos y quién realizó la revisión. El personal realiza recorridos desde un teléfono y puede pasar por zonas con red lenta, sin cobertura o con conexión que se interrumpe.

La aplicación debe permitir consultar y, en iteraciones posteriores, registrar inspecciones con una experiencia móvil y tolerante a conectividad intermitente. En la Semana 1 el alcance se limita a una pantalla reproducible que muestra inspecciones sintéticas.

Quedan fuera de alcance: autenticación, roles administrativos, integración con sistemas institucionales, notificaciones, captura de evidencia fotográfica, datos reales y la sincronización offline completa.

## 2. Usuarios y escenarios

**Técnico de mantenimiento.** Consulta sus recorridos y registra observaciones de un laboratorio desde un teléfono.

**Responsable de laboratorio.** Revisa el estado reciente de su espacio y los hallazgos pendientes para coordinar mantenimiento.

**Docente evaluador.** Verifica que el proyecto se ejecuta de forma reproducible y que solo presenta datos sintéticos.

### Escenario 1: consulta con conectividad disponible

1. El responsable abre la aplicación en un navegador móvil con conexión.
2. Consulta las inspecciones recientes y distingue ubicación, fecha, responsable, estado y número de hallazgos.
3. Identifica la inspección de Electrónica con dos hallazgos y la usa como referencia para seguimiento.

Resultado observable: la pantalla muestra tres registros y cada uno presenta los datos descritos sin usar información personal real.

### Escenario 2: recorrido con conectividad intermitente

1. El técnico abre la aplicación antes de entrar a un área con cobertura inestable.
2. En una iteración posterior, registra una inspección mientras no hay red; la aplicación conserva el registro localmente e indica que está pendiente de sincronización.
3. Cuando la conexión vuelve, la aplicación sincroniza el registro una sola vez y confirma el resultado.

Resultado observable futuro: una prueba de red desconectada permite crear y volver a consultar el registro local; al recuperar red, no se generan duplicados. Esta capacidad no forma parte de la implementación de Semana 1.

## 3. Requisitos funcionales

### RF-01. Mostrar inspecciones sinteticas

La aplicacion debe mostrar una lista de inspecciones recientes usando exclusivamente el conjunto sintetico incluido en el repositorio.

**Aceptacion:** al abrir `http://localhost:3000` se muestran exactamente tres registros: Laboratorio de Redes, Laboratorio de Electronica y Laboratorio de Software.

### RF-02. Mostrar resumen por inspeccion

Cada registro debe mostrar ubicacion, fecha, responsable sintetico, estado, cantidad de hallazgos y resumen.

**Aceptacion:** cada una de las tres tarjetas visibles contiene los seis campos y el registro de Electronica muestra estado "Requiere atencion" y `2` hallazgos.

### RF-03. Identificar el caracter sintetico de la informacion

La interfaz debe indicar que los datos de demostracion son sinteticos.

**Aceptacion:** la pantalla incluye el texto que informa que los datos mostrados son sinteticos y los nombres de responsables usan seudonimos como "Tecnica A" y "Tecnico B".

### RF-04. Base para operacion offline futura

La arquitectura futura debe permitir que un tecnico consulte datos previamente almacenados y registre inspecciones pendientes sin red, para sincronizarlas al recuperar conectividad.

**Aceptacion:** antes de implementar la funcionalidad, existe una decision arquitectonica documentada que selecciona la estrategia PWA y define la prueba offline y de sincronizacion para semanas posteriores.

## 4. Requisitos no funcionales

| ID | Requisito medible | Criterio de medicion |
| --- | --- | --- |
| RNF-01 | Reproducibilidad | En Node.js 20 LTS, `npm ci`, `npm test` y `npm run build` terminan con codigo `0` en un clon limpio. |
| RNF-02 | Accesibilidad | La estructura usa un `main`, encabezados en orden logico y cada seccion tiene un nombre accesible; una revision con Lighthouse debe obtener al menos 90/100 en accesibilidad cuando se incorpore a CI. |
| RNF-03 | Seguridad | No se solicitan, transmiten ni almacenan credenciales o datos personales; `git ls-files` no debe incluir archivos `.env` con secretos. |
| RNF-04 | Privacidad | Los datos del repositorio y de las demostraciones deben ser sinteticos; ninguna persona, matricula, correo, telefono, fotografia o ubicacion institucional exacta puede aparecer en codigo, documentos o evidencias. |
| RNF-05 | Rendimiento | En una compilacion de produccion, la ruta inicial debe ser utilizable en menos de 3 s bajo una simulacion movil de red Fast 3G y CPU 4x; se medira con Lighthouse antes de la entrega final. |
| RNF-06 | Operacion offline futura | La futura PWA debe permitir abrir la ultima lista sincronizada sin red y conservar localmente una inspeccion pendiente durante al menos un reinicio del navegador; la prueba se ejecutara con DevTools en modo Offline. |

## 5. Datos sinteticos y limites

La actividad usa tres inspecciones ficticias: Redes, Electronica y Software. Sus fechas, responsables, hallazgos y descripciones existen solo para demostrar la interfaz y se conservan en `src/lib/data/inspections.ts`.

Esta prohibido incluir nombres reales, matriculas, correos, telefonos, fotografias identificables, credenciales, ubicaciones exactas, inventarios reales, direcciones IP internas o resultados de inspecciones reales. Los ejemplos futuros deben usar seudonimos, lugares genericos y observaciones ficticias.

## 6. Criterios de aceptacion de la Semana 1

| Entrega | Evidencia de aceptacion |
| --- | --- |
| Aplicacion ejecutable | Ejecutar `npm run dev`, abrir `http://localhost:3000` y comprobar el contador `3 registros` junto con las tres tarjetas. |
| Datos sinteticos | Revisar `src/lib/data/inspections.ts` y comprobar que contiene tres registros de demostracion, sin identificadores personales reales. |
| Requisitos | Revisar este documento: contiene problema, usuarios, dos escenarios, RF con aceptacion, RNF medibles, limites y datos sinteticos. |
| Decision arquitectonica | Revisar `docs/decision-record.md`: compara cuatro alternativas, selecciona una y define consecuencias, riesgos y validacion. |
| Verificacion automatizada | Ejecutar `npm test`, `npm run build` y `make verify`; los tres comandos deben terminar correctamente. |