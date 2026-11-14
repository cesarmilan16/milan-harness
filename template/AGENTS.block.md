<!-- harness:start — gestionado por milan-harness. Escribe tus propias reglas fuera de este bloque. -->
## Cómo trabajamos

**Memoria.** El chat se pierde; `docs/` no. Al iniciar sesión recibes un bloque «Estado del proyecto»; si no lo has recibido, ejecuta `node .harness/hooks/session-start.mjs`. Lee solo lo que la tarea necesite:
- `docs/project.md` — qué es el proyecto, stack y comandos. Léelo en vez de explorar el repo.
- `docs/decisions.md` — decisiones tomadas y su porqué. Consúltalo antes de preguntar o de volver a decidir algo.
- `docs/plan.md` — las tareas del proyecto, con su tamaño. Puede no existir.
- `docs/features/<slug>.md` — un documento por trabajo en curso. Es la fuente de verdad de ese trabajo.

**Dos carriles.** Elige uno por petición.
1. **Responder** — preguntas, explicaciones, revisiones, propuestas. Solo lectura: no escribas nada.
2. **Tarea** — cualquier petición de construir, cambiar o arreglar. Usa la skill `task`: mide la tarea (S, M, L) y la lleva de principio a fin con tests y revisión. El usuario da la tarea y tú procedes.

Si no está claro si te piden un cambio, haz una sola pregunta y quédate en el carril 1.

**Hecho significa comprobado.** Todo cambio de comportamiento lleva su test, escrito antes que el código cuando es posible. Una tarea se marca cuando has observado la prueba, no cuando crees que funciona. Si no pudiste comprobar algo, dilo.

**Gasto de tokens.**
- Busca antes de leer; lee rangos, no archivos enteros; no releas lo que ya tienes en contexto.
- Las tareas S se hacen directas. Los subagentes y el modelo de cada uno los decide la skill `task` según el tamaño; fuera de ella, no delegues sin un motivo que puedas nombrar.
- Al delegar, pasa la ruta del documento, no un resumen suyo.
- Respuestas cortas: el resultado primero, sin repetir el diff.

**Equipo y git.**
- Una rama por feature; el campo `branch` del documento la nombra. No trabajes en una feature cuyo `owner` sea otra persona sin preguntar.
- Si otra sesión usa esta misma carpeta, trabaja en un worktree: `git worktree add ../<repo>-<slug> -b feat/<slug>`.
- Tú haces los commits: pequeños, uno por unidad de trabajo, con el documento de la feature en el mismo commit que el código que describe.
- Publicar es del usuario. No hagas `git push` ni fusiones un pull request salvo que te lo pida; al terminar, dile qué rama tiene commits sin subir.
- Nunca push forzado ni reescritura de historia compartida sin confirmación explícita.
- No leas, imprimas ni añadas a un commit secretos (`.env`, claves, tokens).

**Skills.** Están en `.agents/skills/<nombre>/SKILL.md`. Lee una solo cuando toque:
- `task` — cualquier petición que cambie código, o «siguiente tarea».
- `project-plan` — empezar un proyecto o un hito: lo divide en tareas con tamaño.
- `setup` — primera vez en un proyecto que ya existe, o `docs/project.md` sin rellenar.
- `resume` — retomar una feature en una sesión nueva.
- `verify` — antes de dar algo por hecho.
- `review` — revisión a petición del usuario, fuera de una tarea.
- `handoff` — al cerrar la sesión o cuando el contexto se esté llenando.

Skills de tecnología, si están instaladas en esa carpeta: `architecture`, `react`, `nextjs`, `django`, `fastapi`, `database`. Lee la que corresponda antes de escribir código de esa tecnología o de diseñar algo nuevo.
<!-- harness:end -->
