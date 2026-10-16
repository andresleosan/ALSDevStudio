# Repositorio con una única rama main

El 14 de octubre de 2026 el titular solicitó unificar todas las ramas y mantener únicamente `main`, tanto localmente como en GitHub. La política queda registrada en `AGENTS.md`: los siguientes trabajos se realizan sobre `main`; crear otra rama requiere una solicitud explícita.

## Integración

Nota posterior: el 15 de octubre se retira el panel a petición del titular; los apartados siguientes conservan la evidencia histórica de la unificación. La política de rama única sigue vigente. [Estado actual](RETIRADA-PANEL.md).

- El panel de suscripciones `1708cfe` se incorpora por fast-forward. Su código queda en `control/`, independiente del build del portafolio y sin Firebase real conectado.
- Las ramas de mascota, Argentina, escenas y vuelos de Sarin, correcciones y Cloudflare ya eran ancestros de `main`; no contenían commits pendientes de integrar.
- La rama local `feat/depth-3d-live-previews` tenía 39 hashes fuera de `main`. `git cherry` confirmó que sus 39 parches ya tenían equivalentes en `main`; su punta `4334836` equivale a `7e6e3c4`. Se preservan también esos hashes con una fusión de historia mediante `--strategy=ours`, manteniendo el contenido actual.
- Se conserva la retirada posterior de vistas externas y otras decisiones de privacidad, diseño y accesibilidad. No se reintroduce el árbol antiguo.
- Se retiran las 16 ramas locales auxiliares y las 15 remotas auxiliares únicamente después de comprobar que sus puntas son ancestros del `main` integrado. La publicación y la eliminación remota se realizan con un push atómico y verificaciones de las puntas esperadas para evitar borrar cambios concurrentes.

La copia `.worktrees/control` puede conservarse en modo detached para la demostración local, sin crear una segunda rama ni borrar sus dependencias, resultados o datos temporales. El directorio principal permanece en `main`.

## Verificación

- Ambos árboles de trabajo estaban limpios antes de comenzar.
- Copia completa `git bundle` verificada antes de integrar o eliminar referencias.
- Archivos públicos y `.github/` sin diferencias respecto del `origin/main` anterior (`9abdf09`). Código `control/` idéntico al panel `1708cfe`, cuya QA completa pasó 63/63 pruebas y el recorrido E2E.
- Repetición de `node --test .github/cloudflare/build.test.mjs`: 12/12, sin fallidas ni omitidas.
- Build público: 205 archivos, 4.908.959 bytes. `dist/control` no existe y el panel no se publica en el sitio.
- No hay workflow de despliegue Firebase. Cloudflare Pages mantiene su build automático de `main`; no se cambian sus archivos de entrada ni su configuración.

## Recuperación

La copia local previa contiene los commits y nombres originales de las ramas:

```text
F:/Proyectos/ALS DevStudio/Dev/.git/unification-backups/ALSDevStudio-20261014-220437.bundle
F:/Proyectos/ALS DevStudio/Dev/.git/unification-backups/ALSDevStudio-20261014-220437-refs.json
```

El bundle pesa 32.948.101 bytes y `git bundle verify` comprobó su historia completa. Es una copia local dentro de `.git`, no un archivo publicado. Las puntas de todas las ramas también quedan alcanzables desde `main`; eliminar sus nombres no elimina sus commits.

Para inspeccionar la copia sin cambiar el repositorio:

```powershell
git bundle list-heads .git/unification-backups/ALSDevStudio-20261014-220437.bundle
```

No se usan force pushes ni se reescribe la historia de `main`. Cualquier reversión funcional posterior se realiza mediante commits nuevos, seleccionando el cambio concreto; no hace falta restaurar versiones antiguas completas del sitio.
