# ALS DevStudio · Guía del Proyecto para Agentes

Bienvenido a **ALS DevStudio**, el sitio web oficial y portafolio de Andrés Santiago (Medellín, Colombia) enfocado en diseño y desarrollo de sitios web, tiendas y aplicaciones a medida.

Este documento establece los principios de arquitectura, estándares de código y directrices de desarrollo para cualquier asistente o agente de IA que trabaje en esta base de código.

---

## 1. Visión y Filosofía

- **Rendimiento extremo y ligereza:** Este proyecto se basa en tecnologías web nativas (HTML5 semántico, CSS moderno con variables CSS y JavaScript Vanilla modular con ES Modules). No se deben introducir frameworks pesados (React, Vue, Tailwind, etc.) a menos que se solicite explícitamente.
- **Mejora progresiva (*Progressive Enhancement*):** La experiencia base debe ser funcional incluso sin JavaScript (usando etiquetas `<noscript>`, semántica clara y estilos adecuados).
- **Estética oscura y cyberpunk pulida:** Identidad visual propia basada en tonos oscuros (`--ink`, `--ink-deep`, `--panel`), toques de menta (`--mint: #65d49d`), azul tecnológico (`--blue: #4d9bff`) y tipografías *Chakra Petch*, *DM Sans* e *IBM Plex Mono*.
- **Accesibilidad (a11y - WCAG 2.2 AA):** Toda interacción debe ser navegable por teclado (`:focus-visible`), compatible con lectores de pantalla (estados `aria-pressed`, `aria-live`, etiquetas semánticas) y respetar `prefers-reduced-motion`.

---

## 2. Estructura del Proyecto

```text
├── index.html                 # Página principal y estructura semántica
├── privacidad.html            # Política de privacidad
├── terminos.html              # Términos y condiciones
├── cookies.html               # Política de cookies
├── styles/
│   ├── main.css               # Hoja de estilos central con arquitectura por secciones
│   └── ...
├── scripts/
│   ├── main.js                # Punto de entrada de inicialización de módulos
│   ├── picture-fallback.js    # Soporte responsivo de imágenes
│   └── modules/               # Módulos JS específicos y aislados
│       ├── env.js             # Detección de entorno, medios y capacidades
│       ├── dom.js             # Utilidades de selección DOM seguras
│       ├── projects.js        # Lógica de filtrado y paginación del portafolio
│       ├── hero-carousel.js   # Carrusel del Hero principal
│       ├── global-map.js      # Mapa interactivo SVG
│       ├── space.js           # Fondo canvas interactivo
│       ├── mascot-scenes.js   # Escenas e interacciones de Sarin Bot
│       └── ...
└── assets/                    # Imágenes, fuentes, marcas y proyectos
```

---

## 3. Convenciones de Desarrollo

### HTML & Marcado
- Emplear etiquetas semánticas (`<header>`, `<main>`, `<section>`, `<article>`, `<figure>`, `<nav>`).
- Todas las imágenes deben incluir atributos `width`, `height`, `alt` descriptivo y formato responsivo `<picture>` con fuentes AVIF/WebP.
- Para elementos interactivos dinámicos, mantener soporte en `<noscript>`.

### CSS & Estilos
- Definir propiedades mediante tokens globales en `:root` (`--ink`, `--mint`, `--line`, etc.).
- Diseñar mobile-first y respetar breakpoints estándar (`≤900px`, `≤680px`).
- Preservar las reglas de `prefers-reduced-motion` y rendimiento para dispositivos de baja potencia.

### JavaScript
- Código modular bajo ES Modules (`import`/`export`).
- Usar directiva `// @ts-check` y tipado JSDoc cuando sea aplicable.
- Encapsular inicializaciones de forma segura con captura de excepciones para que el fallo de un módulo no comprometa al resto de la aplicación.
- Mantener funciones puras o con efectos secundarios controlados en el DOM.

---

## 4. Flujo de Trabajo y Modificaciones

1. **Comprensión del contexto:** Inspeccionar los archivos existentes antes de editar para no duplicar utilidades ni romper estilos compartidos.
2. **Ediciones quirúrgicas:** Realizar modificaciones puntuales y limpias preservando comentarios, estructura y código no relacionado.
3. **Verificación:** Probar siempre la funcionalidad, la responsividad y la accesibilidad de cada cambio antes de darlo por completado.
4. **Idioma:** Todas las explicaciones y comentarios dirigidos al operador deben ser en español.
5. **Rama única:** Por instrucción del titular, este repositorio mantiene únicamente `main`, tanto localmente como en GitHub. Trabajar sobre `main` y no crear ramas nuevas salvo solicitud explícita del titular. Conservar copias de recuperación locales cuando una operación lo requiera.
