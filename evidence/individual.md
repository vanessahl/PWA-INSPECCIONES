# Evidencia individual — completar antes de entregar

- Nombre: Vanessa Hernandez Lopez

- Repositorio y commit evaluado: https://github.com/vanessahl/PWA-INSPECCIONES.git, cd0934588d9d780453651948458a2d79b7522d7b

- Mi contribución concreta: Mi contribución fue elaborar el archivo docs/decision-record.md, donde comparé las alternativas PWA, web tradicional, aplicación nativa y multiplataforma. Analicé sus ventajas, costos, mantenimiento, instalación, distribución, funcionamiento con conectividad intermitente y capacidades del dispositivo. También documenté los riesgos de elegir una PWA, sus posibles mitigaciones y una propuesta de validación futura.

- Decisión técnica que puedo explicar: La decisión técnica que puedo explicar es la elección de una Progressive Web App (PWA) utilizando Next.js. Se eligió esta opción porque permite mantener una aplicación accesible mediante una URL y, posteriormente, agregar funciones como instalación, almacenamiento local y funcionamiento con conectividad intermitente. También reduce el costo de mantenimiento al utilizar una sola base de código, en comparación con desarrollar aplicaciones nativas para diferentes plataformas.

- Comando o prueba que ejecuté y resultado: Ejecuté el comando npm ci para instalar las dependencias del proyecto. El resultado fue exitoso: se agregaron 28 paquetes y se auditaron 29 paquetes en aproximadamente 49 segundos. También ejecuté npm run dev y el proyecto inició correctamente con Next.js 14.2.35, mostrando la aplicación disponible en http://localhost:3000. Durante la instalación se reportaron 2 vulnerabilidades de severidad alta, por lo que este resultado no significa que el proyecto esté libre de vulnerabilidades.

- Limitación o riesgo que encontré: Una limitación identificada es que las funciones PWA y de trabajo offline todavía no están implementadas en esta semana. Por lo tanto, aún no se ha comprobado el funcionamiento sin conexión, la sincronización de datos ni el almacenamiento local. También se identificaron 2 vulnerabilidades de severidad alta durante npm ci, por lo que será necesario revisarlas posteriormente.

- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana): Utilicé ChatGPT como apoyo para comprender las instrucciones de la actividad, organizar el análisis de las alternativas tecnológicas. La IA influyó principalmente en la organización y redacción de algunas partes del análisis, pero la decisión de utilizar PWA fue revisada y comprendida por mí. Realicé una validación humana revisando el contenido del documento y comprobando personalmente la instalación y ejecución del proyecto mediante npm ci y npm run dev.





- Nombre: Jessica Juarez Rodriguez 

- Repositorio y commit evaluado: https://github.com/vanessahl/PWA-INSPECCIONES.git, d4d6c9e8c9a473db2e4f3c46c04e306309c8a8d1

- Mi contribución concreta: Redacté y revisé los apartados “Problema y contexto” y “Usuarios y escenarios” de docs/requirements.md, definiendo la problemática de las inspecciones y los usuarios que utilizarán la aplicación.

- Decisión técnica que puedo explicar: Se consideró que la aplicación debe tener una experiencia orientada a dispositivos móviles y contemplar la conectividad intermitente, dejando el funcionamiento offline y la sincronización como una capacidad futura, ya que no forman parte de la Semana 1.

- Comando o prueba que ejecuté y resultado: Ejecuté npm ci y npm run dev para comprobar que el proyecto pudiera iniciar correctamente. El resultado fue que la aplicación se ejecutó localmente y permitió visualizar la pantalla inicial con las inspecciones sintéticas.

- Limitación o riesgo que encontré: La principal limitación es que en esta semana no se implementa todavía el funcionamiento offline, por lo que la aplicación aún dependerá de la conexión para las funcionalidades que posteriormente requerirán sincronización.

- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana): Utilicé ChatGPT como apoyo para organizar y mejorar la redacción de los apartados 1 y 2 de requirements.md. La IA influyó en la redacción del problema, usuarios y escenarios. Revisé y adapté personalmente el contenido para verificar que correspondiera con el alcance de la Semana 1 y que utilizara únicamente datos sintéticos.





- Nombre: Angel Gabriel Guzman Miguel 

- Repositorio y commit evaluado: https://github.com/vanessahl/PWA-INSPECCIONES.git, 470d2a15c7a98f2e9f93dbcfb665fca96665cd6c

- Mi contribución concreta: Definición y documentación del marco de requisitos funcionales (RF-01 a RF-04) y no funcionales (RNF-01 a RNF-06) para la Semana 1, garantizando que el sistema despliegue únicamente 3 registros sintéticos (Redes, Electrónica, Software) en la ruta inicial sin usar datos reales ni personales.

- Decisión técnica que puedo explicar: La selección del enfoque PWA (Progressive Web App) documentado para garantizar la tolerancia a conectividad intermitente (escenario 2), permitiendo el almacenamiento local previo y la sincronización posterior en una sola ejecución al recuperar la red.

- Comando o prueba que ejecuté y resultado: Ejecución de git pull origin main (precedido por la limpieza de archivos no rastreados) para sincronizar los requisitos del repositorio remoto, permitiendo posteriormente verificar la compilación y pruebas con npm ci, npm test y npm run build

- Limitación o riesgo que encontré: Sobrescritura no deseada de archivos no rastreados (untracked) durante la sincronización del repositorio local y la imposibilidad de incluir datos o evidencia real por restricciones explícitas de privacidad (RNF-04 y Sección 5).

- Uso de IA (herramienta, propósito, fragmentos influenciados y validación humana): Se utilizó ChatGPT para el diagnóstico y resolución de conflictos de ramas en Git (git remote, git clean y git pull), así como para el formateo estructurado de evidencias; los fragmentos influenciados corresponden a los comandos de terminal ejecutados para la limpieza del árbol de trabajo local y la redacción/estructuración del reporte de entrega.
