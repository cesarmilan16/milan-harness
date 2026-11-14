---
name: feature
description: Empieza un trabajo que no se podría retomar solo desde el diff (varias sesiones, requisitos largos, decisiones acopladas o riesgo alto). Crea la rama y el documento de la feature y guía la implementación tarea a tarea. No la uses para cambios pequeños y entendidos.
---
# feature

1. **Confirma el carril.** Si el cambio está entendido, el riesgo es acotado y se retoma desde `git diff`, no hace falta documento: hazlo directo.
2. **Entiende antes de planificar.** Lee `docs/project.md`, busca en `docs/decisions.md` lo relacionado y explora solo el código que vas a tocar.
3. **Pregunta solo lo que cambia el alcance**, el riesgo o algo irreversible. Lo demás, decídelo y anótalo.
4. **Crea la rama** `feat/<slug>`. Si otra sesión usa esta carpeta, usa un worktree.
5. **Crea `docs/features/<slug>.md`** desde `_template.md`:
   - `Objetivo`: las palabras del usuario, literales.
   - `Plan`: entre 3 y 8 tareas, cada una con su comprobación. Una tarea es una unidad de comportamiento con su código, sus tests y su documentación juntos.
   - `owner`, `branch` y `updated` rellenos.
6. **Enseña el plan y espera el visto bueno** si el riesgo es alto o el alcance era ambiguo. Si no, continúa.
7. **Implementa tarea a tarea:**
   - Test primero cuando exista un test ejecutable y un resultado esperado claro. Si no lo hay, di por qué y comprueba de otra forma.
   - Marca `[x]` solo con evidencia (skill `verify`) y anótala en `Evidencia`.
   - Actualiza `Siguiente paso` al cerrar cada tarea, no al final.
   - Un commit por tarea, con el documento incluido.
8. **Cierra.** Si el riesgo es medio o alto, skill `review`. Pon `status: done`, pasa las decisiones duraderas a `docs/decisions.md` y actualiza `docs/project.md` si cambió algo de lo que describe.

Si el plan deja de ser válido a mitad, cambia el documento primero y el código después.
