# Tareas — ALS DevStudio

- [x] Auditoría de landing heredada y definición de alcance.
- [x] Consulta de assets de marca en `F:\Proyectos\ALS DevStudio\Img`.
- [x] Consulta pública de repositorios y demos de `andresleosan`.
- [x] Definir Design DNA en `STACK.md`.
- [x] Implementar rebranding, portafolio curado e interacciones.
- [x] Verificar sintaxis, rutas de assets, responsive y reduced motion.
- [x] Auditoría final de seguridad y QA con evidencia.

## Evidencia de cierre
- `node --check` sobre el JavaScript embebido: PASS.
- Validación de landing y assets: HTML publicado en Vercel `200`; 9 capturas de proyecto y 2 assets de marca presentes.
- Conteo verificado: 6 proyectos con imagen, 4 filtros, 6 slides de proyectos en el hero, marquesina a 14s y 20 enlaces externos seguros.
- Escaneo de seguridad estática: PASS sin secretos, `javascript:` ni `target="_blank"` sin `noopener`.

- [x] Refinar carrusel: logo de navegación, proporción de capturas, contacto por WhatsApp y limpieza del correo temporal.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas y 6 capturas verificadas; proporción 16:10 y altura mínima 420px.
- 15 enlaces externos seguros, cero URLs javascript: y correo temporal ausente.

- [x] Rediseñar contacto como mini brief interactivo con mensajes dinámicos de WhatsApp.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- Mini brief con 3 opciones, mensaje dinámico y enlace al +57 314 643 2135.
- Correo ausente; 15 enlaces externos conservan rel="noopener"; cero URLs javascript:.

- [x] Rediseñar proyectos con dos columnas equilibradas, capturas grandes y tarjetas completas clicables.

## QA de esta iteración
- JavaScript embebido: sintaxis PASS.
- 6 tarjetas con imagen y enlace directo a cada proyecto.
- Cero textos Demo/Código dentro de las tarjetas; 9 enlaces externos seguros.

- [x] Incorporar los 19 proyectos públicos restantes, excluyendo exactamente HTML-CSS, layoutresponsive, prueba2, ejercicio-react, performai, Analista y Fullstack-Challenge---E-commerce.

## QA de esta iteración
- 19 capturas de Chromium integradas en el carrusel inicial y la grilla.
- 19 tarjetas completas clicables; capturas de GitHub usadas solo cuando no existe demo pública verificada.

- [x] Validar y limpiar la sección de proyectos: retirar Cronos, ALS DevStudio y las demos sin sitio publicado; usar capturas web verificadas y enlaces directos a demos.

## QA de esta iteración
- `node --check` sobre el JavaScript embebido: PASS.
- 15 tarjetas y 15 slides visibles; 0 overlays `project-code`/`project-type`; 0 destinos GitHub en tarjetas.
- 15 assets locales verificados; 6 capturas web regeneradas desde demos p�blicas.
- 15 destinos web comprobados con HTTP 200; SurtiFacil y Coctelsops-F- se excluyeron porque sus demos declaradas respondieron HTTP 404.
- Auditor�a est�tica: sin URLs `javascript:`, sin secretos nuevos y enlaces externos con `rel="noopener"`.

- [x] Consolidar la entrada única de la landing en `index.html` y retirar el HTML duplicado del repositorio.

## QA de esta iteración
- Hash SHA256 de ambos HTML idéntico antes de la eliminación.
- `STACK.md` actualizado; no quedan referencias al archivo eliminado.
- `node --check`, auditoría estática y comprobación de enlaces ejecutadas con PASS.

- [x] Actualizar captura web de Hachi Grecia Spa y conservar su enlace directo a la demo.

## QA de esta iteración
- Web `https://hachi-greciaspa.vercel.app/`: HTTP 200.
- Captura reemplazada: `assets/projects/hachi-greciaspa.png`, 2560×1600.
- `node --check`, auditoría estática y `git diff --check`: PASS.

- [x] Mejorar la captura de Hachi Grecia Spa para mostrar el hero real con logo central y navegación visible.

## QA de esta iteración
- Asset PNG actualizado en assets/projects/hachi-greciaspa.png, 1657×949.
- Carrusel local verificado: la captura se carga, el slide cambia a Hachi y la etiqueta Hachi Grecia Spa / pet care aparece correctamente.
- Tarjeta de proyecto verificada en el DOM con enlace directo a https://hachi-greciaspa.vercel.app/.
- Consola del navegador local: 0 errores.

- [x] Añadir fondo generativo reactivo y puntero personalizado con el logo ALS.

## QA de esta iteración
- node --check sobre el JavaScript embebido: PASS.
- Navegador local: canvas de fondo activo a 1680×949, puntero ALS visible en puntero fino y logo cargado desde favicon.svg.
- Interacción verificada: el puntero actualiza su posición, el fondo responde con halo y la landing conserva su navegación.
- prefers-reduced-motion: la rama estática evita la animación y desactiva el cursor personalizado.
- Consola del navegador local: 0 errores.
- Seguridad del código nuevo: sin eval, red, almacenamiento, cookies ni secretos.

- [x] Reducir el puntero personalizado con el isotipo ALS manteniendo su posición centrada.

## QA de esta iteración
- Puntero ALS reducido de 46×46 px a 36×36 px; isotipo de 28×28 px a 21×21 px.
- Navegador local: cursor visible con puntero fino, centrado y cargando favicon.svg; fondo reactivo continúa activo.
- prefers-reduced-motion y fallback táctil conservados.
- node --check: PASS; consola del navegador local: 0 errores.

- [x] Actualizar las vistas de Mercado Inteligente, PintuMaster y Coctels OPS con las capturas entregadas.

## QA de esta iteración
- Assets reemplazados: mercadointeligente.png, pintumaster.png y coctelsops.png.
- Carrusel y tarjetas reutilizan las rutas existentes; no se modificaron enlaces externos.
- Se actualizaron nombres y textos alternativos para Mercado Inteligente y Coctels OPS.
