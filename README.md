# PWA de inspecciones de laboratorio

Proyecto realizado para la materia de **Aplicaciones Web Progresivas**.

Durante la Semana 3 se agregó el **Service Worker** y una estrategia de caché para mejorar el funcionamiento de la aplicación cuando no hay conexión.

## Requisitos

* Node.js 20 o superior
* npm
* Git

## Instalación

Primero instalar las dependencias:

```bash
npm ci
```

## Ejecutar el proyecto

Para iniciar la aplicación:

```bash
npm run dev
```

Después abrir:

```text
http://localhost:3000
```

También se pueden probar los siguientes estados:

* `/?estado=cargando`
* `/?estado=error`
* `/?estado=vacio`

## Service Worker

El Service Worker se encuentra en:

```text
public/sw.js
```

Y su registro está en:

```text
src/lib/pwa/register-service-worker.ts
```

La aplicación utiliza:

* **Network First** para las navegaciones.
* **Cache First** para otros recursos `GET` del mismo origen.
* Caché inicial para los recursos principales de la aplicación.

La estrategia completa está explicada en:

```text
docs/cache-strategy.md
```

## Funcionamiento offline

La aplicación puede utilizar recursos que ya fueron guardados en caché.

La primera visita necesita conexión, y actualmente no se pueden registrar nuevas inspecciones sin conexión ni sincronizar cambios posteriormente.

## Verificación

Para comprobar que el proyecto funciona correctamente se ejecutan:

```bash
npm ci
npm test
npm run build
npm run verify
```

También se puede revisar el comportamiento offline desde las herramientas de desarrollo del navegador.

## Evidencia

Para la entrega se debe conservar el commit correspondiente y, cuando aplique, el resultado de GitHub Actions.

Los resultados de verificación se generan en:

```text
reports/verification.json
```

## Alcance de la Semana 3

En esta semana se trabajó principalmente en el **Service Worker, la estrategia de caché, el funcionamiento básico offline y la documentación del proyecto**.

El proyecto utiliza datos sintéticos y todavía no cuenta con sincronización de inspecciones offline.
