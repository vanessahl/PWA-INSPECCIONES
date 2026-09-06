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

- **RF-01:** El sistema debe mostrar una lista de inspecciones recientes con ubicación, fecha, responsable, estado y número de hallazgos.
  *Criterio de aceptación:* al cargar `/` se muestran exactamente 3 registros sintéticos con esos 5 campos visibles.

- **RF-02:** El sistema debe identificar visualmente el estado de cada inspección (por ejemplo "Sin incidencias" o "Requiere atención").
  *Criterio de aceptación:* cada tarjeta de inspección muestra una etiqueta de estado distinguible visualmente (color/badge).

- **RF-03:** El sistema debe mostrar el número de hallazgos por inspección.
  *Criterio de aceptación:* la inspección del Laboratorio de Electrónica muestra el valor "2" en el campo Hallazgos.

- **RF-04:** El sistema debe indicar el estado general del starter (ej. "ejecutable · PWA aún no implementada").
  *Criterio de aceptación:* la cabecera de la pantalla principal muestra un badge con el estado actual del proyecto.

## 4. Requisitos no funcionales

- **RNF-01 (Reproducibilidad):** el proyecto debe iniciar sin errores con `npm ci && npm run dev` en cualquier máquina con Node 20 LTS.
- **RNF-02 (Verificación automatizada):** `make verify` debe ejecutarse sin errores y generar `reports/verification.json`.
- **RNF-03 (Accesibilidad):** los textos deben tener suficiente contraste y las tarjetas deben ser legibles en pantalla de teléfono (viewport móvil).
- **RNF-04 (Seguridad y privacidad):** no se debe incluir ningún dato real de personas, laboratorios o estudiantes; todos los datos son sintéticos.
- **RNF-05 (Rendimiento):** la pantalla principal debe cargar en menos de 2 segundos en entorno local.
- **RNF-06 (Operación offline futura):** la arquitectura de datos debe permitir, en iteraciones posteriores, almacenar registros localmente sin conexión y sincronizarlos una sola vez al recuperar la red.

## 5. Datos sintéticos y límites

Para esta actividad se usan únicamente datos ficticios: nombres de laboratorios genéricos (Redes, Electrónica, Software), responsables identificados solo con "Técnica A/B/C" o "Técnico A/B/C", fechas de ejemplo y hallazgos numéricos inventados.

Está prohibido usar: nombres reales de personas, matrículas, correos institucionales, ubicaciones exactas de laboratorios reales, fotografías reales o cualquier dato que permita identificar a un estudiante, docente o espacio físico real de la universidad.

## 6. Criterios de aceptación de la Semana 1

| Entrega | Comando/prueba de verificación |
|---|---|
| La app inicia correctamente | `npm ci && npm run dev` → pantalla visible en `localhost:3000` |
| Se muestran 3 inspecciones sintéticas con los 5 campos | Inspección visual en navegador |
| El proyecto pasa la verificación local | `make verify` → genera `reports/verification.json` sin errores |
| El proyecto pasa las pruebas públicas | `bash public-tests/check.sh` sin errores |
| El proyecto es reproducible en CI | Ejecución en verde de GitHub Actions |
| Evidencia individual entregada | `evidence/individual.md` completo |