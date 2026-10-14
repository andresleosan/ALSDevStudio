# Poses distintas de Sarin en Alcance y Proceso

Solicitud del titular, 2026-10-14: añadir Sarin escribiendo junto al texto de Alcance y usar otra pose en el encabezado de Proceso. Dos poses nuevas del mismo personaje, con dos fotogramas cada una y textos actuales progresivos. Se conserva el vuelo sin pausa manual y las otras escenas.

## Implementación

Escena finita global reutiliza el controlador de 3000 ms. Título de Alcance con reveal propio y escena fuera de ese ancestro, para ver la escritura desde el inicio. Original semántico completo y overlay decorativo; Proceso cambia sus PNG y proporción reservada. Sin dependencias nuevas ni conexiones.

Generación con la herramienta integrada imagegen y transparent_background=true. Referencias locales de identidad: mascot-typing-a.png y mascot-welcome.png. Una lámina de dos fotogramas por pose, seguida de limpieza de fragmentos exteriores mediante la misma herramienta; originales conservados en C:/Users/USER/.codex/generated_images/. Exportación técnica con Sharp ya instalado: recorte común para ambas celdas, resize contain a 320×384 y PNG con alfa. No se elimina manualmente el fondo.

Archivos finales:

- assets/brand/mascot-global-typing-a.png
- assets/brand/mascot-global-typing-b.png
- assets/brand/mascot-process-typing-a.png
- assets/brand/mascot-process-typing-b.png

## Prompts exactos

### global

```text
Use case: stylized-concept, identity-preserving pose variation. Asset type: transparent two-frame typing animation sprite strip for ALS DevStudio website. Input images: mascot-typing-a.png and mascot-welcome.png are identity/style references for the EXACT SAME Sarin robot, not compositions to copy. Keep pearl white/silver armor, rounded helmet, headphone-like ears with cyan rings, glossy near-black visor with two cyan oval eyes, dark navy joints and contours, compact chibi proportions, polished smooth 2D comic illustration, small exact ALS chest lettering. Landscape sprite strip with exactly TWO equal square cells side by side, no dividers. In both cells the complete character, props, head, torso, legs, camera, scale, lighting and position must be IDENTICAL and aligned at the same cell coordinates. Only fingers and wrists differ subtly: left frame fingers slightly lifted, right frame fingers pressing keyboard. Both hands visible. Opaque white armor, true alpha=0 outside silhouettes, no floor, cast shadow, scenery, colored background, checkerboard, glow cloud, loose flecks, speech balloons, UI, extra limbs, other characters, labels or watermark. Each cell must contain one complete isolated robot and all its props, with a modest identical transparent margin; fill most of each cell, clear at 100-140px display height. Do not reproduce the reference cross-legged seated pose. New pose for Alcance: Sarin hovering gently in mid-air in three-quarter view, knees bent downward and feet separated, torso upright. An open compact dark navy laptop is held comfortably at waist/chest level, both hands typing on the keyboard. No wings or cape; no large rocket flames. Face and laptop remain readable. A buoyant working pose, clearly different from sitting cross-legged and from standing at a desk. Small turquoise ALS on laptop lid, no other text. EXACTLY two aligned frames of this hovering laptop pose on one transparent horizontal strip.
```

### process

```text
Use case: stylized-concept, identity-preserving pose variation. Asset type: transparent two-frame typing animation sprite strip for ALS DevStudio website. Input images: mascot-typing-a.png and mascot-welcome.png are identity/style references for the EXACT SAME Sarin robot, not compositions to copy. Keep pearl white/silver armor, rounded helmet, headphone-like ears with cyan rings, glossy near-black visor with two cyan oval eyes, dark navy joints and contours, compact chibi proportions, polished smooth 2D comic illustration, small exact ALS chest lettering. Landscape sprite strip with exactly TWO equal square cells side by side, no dividers. In both cells the complete character, props, head, torso, legs, camera, scale, lighting and position must be IDENTICAL and aligned at the same cell coordinates. Only fingers and wrists differ subtly: left frame fingers slightly lifted, right frame fingers pressing keyboard. Both hands visible. Opaque white armor, true alpha=0 outside silhouettes, no floor, cast shadow, scenery, colored background, checkerboard, glow cloud, loose flecks, speech balloons, UI, extra limbs, other characters, labels or watermark. Each cell must contain one complete isolated robot and all its props, with a modest identical transparent margin; fill most of each cell, clear at 100-140px display height. Do not reproduce the reference cross-legged seated pose. New pose for Proceso: Sarin standing with both feet planted and slightly apart behind a compact narrow navy work table, leaning forward slightly while both hands type on a laptop resting on the table. The table is a small simple lightweight workstation with two slim supports, not a room, large desk or scenery. Entire robot feet, desk and open laptop visible. Three-quarter view with visor toward viewer. Clearly different silhouette from the hovering laptop pose and the cross-legged reference. Small turquoise ALS on laptop lid, no other text. EXACTLY two aligned frames of this standing workstation pose on one transparent horizontal strip.
```

### Limpieza de ambas láminas

```text
Use case: precise-object-edit / transparent sprite cleanup. The supplied PNG is an existing two-frame horizontal Sarin typing sprite strip with real alpha. Preserve the TWO drawings EXACTLY: character identity, body, props, fingers in each frame, positions, scale, cell alignment, camera, colors, ALS letters, lighting and all silhouette edges. Keep the two equal cells and the entire robot/props inside them. Change ONLY empty pixels OUTSIDE the robot/laptop (and table, if present): remove every floating dark fleck, isolated pixel, fragment or detached mark, especially beside the helmets, at the outer left/right margins and around/below the feet or table. All background between and around the silhouettes must be perfectly clean real alpha=0. Do not remove meaningful robot, laptop or table pixels. Do not add gray haze, glow, shadow, background color, checkerboard, labels or new details. Keep white armor solid. This is production animation artwork; do not redraw, reposition or redesign the poses, and preserve the different hand positions. Output the same two-frame strip with truly transparent clean margins.
```

### process-cleanup

```text
Precise transparent sprite cleanup. Image 1 is LEFT typing frame A, Image 2 is RIGHT typing frame B of the SAME Sarin standing at a small table. Rebuild them into ONE horizontal strip with exactly two equal cells, image 1 in the left cell and image 2 in the right cell. Preserve both robot/table/laptop drawings, the distinct hand positions, their proportions, size, color, white armor, cyan eyes, ALS text and alignment. REMOVE the visible stray black specks and disconnected fragments outside the main silhouette: especially above/right of the head, along outer left/right margins and around the feet/table. Every detached dot not belonging to robot, laptop or table is unwanted noise. There must be absolutely NOTHING outside those foreground silhouettes: no dark vignette, blue haze, grain, shadow, particles or loose fragments. Real clean alpha=0 background everywhere outside, including the gap between cells. Keep foreground opaque and crisp. Do not redraw or reposition the character or change poses, and do not merge the hands into one pose. A clean transparent two-frame production asset only.
```

### process-final-render

```text
Use case: clean production transparent website mascot animation. Create a NEW crisp rendering of the exact Sarin ALS robot from the first attached image, using the second image only as a pose guide. Do not copy its stray pixels or background. Keep the same pearl-white/silver armor, rounded helmet, cyan-ring headphone ears, glossy black visor with two cyan oval eyes, dark navy outlines/joints and ALS lettering. Make a horizontal sprite sheet with exactly TWO equal cells, each showing the full robot standing behind a small navy table and typing on an open ALS laptop. Robot's head, body, desk, laptop and feet must have precisely the same positions and size in both cells. Only fingertips/wrists differ for typing: left frame fingers slightly up, right frame pressing keys. Both feet visible, two thin table legs. Smooth polished 2D comic illustration. Output true transparent alpha, perfectly clean empty margins. There must be ZERO detached dots, ink flecks, fragments, black smears, haze, shadows, floor, glow or texture outside the robot/desk silhouette. Draw the contour edges cleanly like a vector cutout. Opaque white armor. No labels, dividers, speech balloons, checkerboard or backdrop. New clean drawing from the identity reference; do not preserve imperfections from the pose guide. Exactly two aligned complete desk-typing robot frames.
```

## Verificación

Cronos repitió módulo 56/56 PASS, build tests 12/12 PASS, TSC aislado del controlador y diff-check PASS. Build final: 191 archivos / 5.030.365 bytes. Los cuatro PNG son 320×384, con alfa y esquinas transparentes. Dos poses distintas y dos estados de manos por pose; fotogramas finales inspeccionados dentro de la página en 390/1440.

QA integrada 10/10 PASS en 320/390/680/681/900/901/1440, noJS/reducido y axe; fotogramas 18/18 PASS, sin errores, geometría estable y texto semántico completo. Informes: `test-results/sarin-poses-local-scenes.json` y `test-results/sarin-motion-frames-poses-local.json`. Revisión independiente del código sin bloqueantes; lista pública fija de cuatro PNG, sin conexiones nuevas ni cambios de CSP/datos/analítica. TSC global conserva los 11 errores previos en Analytics, archivo intacto; no se afirma auditoría completa WCAG ni de lectores de pantalla.

Candidato `2711ab6c` de `8962f2e`: Cronos repitió Pages 4/4 y fotogramas 18/18 PASS en línea. Chrome real confirma nueve escenas, ambas poses distintas con texto completo y sin overflow ni botón de vuelo; capturas `sarin-poses-preview-global-chrome.jpg` y `sarin-poses-preview-process-chrome.jpg`. HTTP independiente: ocho recursos exactos frente a dist, cuatro PNG/alfa/dimensiones, noindex/canonical/CSP/Analytics y cuatro301 conservados. Informe `test-results/sarin-poses-http-preview.json`. Publicación como extensión concreta solicitada de las animaciones autorizadas expresamente en esta sesión. Producción pendiente.

## Reversión

Base conocida `5a8c880`. Revertir el commit funcional mediante commit nuevo y push normal a main; esperar Pages y comprobar retorno del encabezado simple de Alcance y la pose anterior de Proceso, conservando el vuelo sin pausa manual. El build retirará únicamente estos nuevos recursos públicos de su salida propia. Sin cambios de dominio, correo, datos, plan o analítica.

