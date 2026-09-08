# PWA de inspecciones de laboratorio

Starter oficial para la materia **Aplicaciones Web Progresivas**.

Este repositorio es el proyecto común para las actividades de las semanas 1–13. Esta entrega agrega el shell instalable de Semana 2 sobre la base reproducible de Semana 1. Cada semana conservarás el mismo repositorio y agregarás únicamente la capacidad indicada por la actividad.

## Requisitos locales

- Node.js 20 LTS o superior compatible con Next.js.
- npm 10 o superior.
- Git y una cuenta de GitHub.

## Arranque verificable

```bash
npm ci
npm run dev
```

Abre <http://localhost:3000>. La pantalla inicial muestra el shell de la aplicación y tres inspecciones sintéticas.

El shell incluye navegación accesible y estados reproducibles:

- `http://localhost:3000/`: lista de inspecciones.
- `http://localhost:3000/?estado=cargando`: estado de carga.
- `http://localhost:3000/?estado=error`: estado de error.
- `http://localhost:3000/?estado=vacio`: estado vacío.

El manifest se encuentra en `/manifest.webmanifest` y se enlaza desde el layout de Next.js. Esta semana no implementa service worker, almacenamiento offline ni sincronización.

Antes de entregar ejecuta:

```bash
make verify
bash public-tests/check.sh
```

En Windows sin `make` o Bash, el equivalente reproducible es `npm run verify`. La verificación genera `reports/verification.json`; ese archivo y la corrida verde de GitHub Actions son la evidencia técnica del arranque.

## Flujo de trabajo del curso

1. Conserva este repositorio como tu proyecto personal y crea un repositorio privado en GitHub.
2. Completa únicamente los entregables de la actividad de la semana.
3. Haz cambios pequeños y descriptivos; no borres lo que ya funciona.
4. Ejecuta `npm ci`, `npm test`, `npm run build` y `npm run verify`.
5. Ejecuta GitHub Actions sobre el SHA final y conserva el enlace de esa corrida.
6. Entrega en Classroom la URL del repositorio, el SHA exacto evaluado, el enlace a Actions y `evidence/individual.md`.

No uses datos reales de personas, laboratorios o estudiantes. Todo dato del starter es sintético.

## Estructura inicial

- `src/app/`: aplicación Next.js con App Router y página de inspecciones.
- `src/components/app-shell.tsx`: navegación y marco común de la aplicación.
- `public/manifest.webmanifest`: metadatos del shell instalable.
- `src/lib/data/`: datos sintéticos de inspecciones.
- `docs/`: documentación de decisiones y requisitos.
- `scripts/verify.mjs`: verificación reproducible local.
- `tests/`: pruebas del starter y del manifest.

El alcance de esta semana no incluye service worker, sincronización, autenticación ni datos reales.

