<!-- harness:start — gestionado por milan-harness. Escribe tus propias reglas fuera de este bloque. -->
## Cómo trabajamos

**Memoria.** El chat se pierde; `docs/` no. Al iniciar sesión recibes un bloque «Estado del proyecto»; si no lo has recibido, ejecuta `node .harness/hooks/session-start.mjs`. Lee solo lo que la tarea necesite:
- `docs/project.md` — qué es el proyecto, stack y comandos. Léelo en vez de explorar el repo.
- `docs/decisions.md` — decisiones tomadas y su porqué. Consúltalo antes de preguntar o de volver a decidir algo.
- `docs/features/<slug>.md` — un documento por trabajo en curso. Es la fuente de verdad de ese trabajo.

**Tres carriles.** Elige uno por petición y dilo en una línea.
1. **Responder** — preguntas, explicaciones, revisiones, propuestas. Solo lectura: no escribas nada.
2. **Cambio directo** — cambio entendido, riesgo acotado y retomable desde `git diff`. Hazlo, compruébalo y termina. Sin documento y sin subagentes, toque los archivos que toque.
3. **Feature** — el trabajo no se podría retomar solo desde el diff: varias sesiones, requisitos largos, decisiones que dependen unas de otras, o riesgo alto. Usa la skill `feature`.

Si la intención no está clara, haz una sola pregunta y quédate en el carril 1.

**Hecho significa comprobado.** Una tarea se marca cuando has observado la prueba (test, comando, salida), no cuando crees que funciona. Si no pudiste comprobar algo, dilo.

**Riesgo alto**: datos y migraciones, autenticación y permisos, pagos, CI y despliegue, contratos compartidos entre módulos, o código sin un test que detectaría la regresión. Exige carril 3 y la skill `review`.

**Gasto de tokens.**
- Busca antes de leer; lee rangos, no archivos enteros; no releas lo que ya tienes en contexto.
- Trabaja directo por defecto. Delega en un subagente solo si puedes nombrar el motivo: (a) exploración que pide más de unas cinco búsquedas encadenadas; (b) dos o más unidades independientes, con archivos disjuntos y varios minutos de trabajo cada una; (c) sesión muy larga, para pasar la siguiente unidad a un contexto limpio; (d) verificador independiente de un cambio de riesgo alto. En la duda, directo.
- Al delegar, pasa la ruta del documento de la feature, no un resumen suyo.
- Respuestas cortas: el resultado primero, sin repetir el diff.

**Equipo y git.**
- Una rama por feature; el campo `branch` del documento la nombra. No trabajes en una feature cuyo `owner` sea otra persona sin preguntar.
- Si otra sesión usa esta misma carpeta, trabaja en un worktree: `git worktree add ../<repo>-<slug> -b feat/<slug>`.
- Tú haces los commits: pequeños, uno por unidad de trabajo, con el documento de la feature en el mismo commit que el código que describe.
- Publicar es del usuario. No hagas `git push` ni fusiones un pull request salvo que te lo pida; al terminar, dile qué rama tiene commits sin subir.
- Nunca push forzado ni reescritura de historia compartida sin confirmación explícita.
- No leas, imprimas ni añadas a un commit secretos (`.env`, claves, tokens).

**Skills.** Están en `.agents/skills/<nombre>/SKILL.md`. Lee una solo cuando toque:
- `setup` — primera vez en el proyecto, o `docs/project.md` sin rellenar.
- `feature` — empezar un trabajo del carril 3.
- `resume` — retomar una feature en una sesión nueva.
- `verify` — antes de dar algo por hecho.
- `review` — antes de fusionar un cambio de riesgo medio o alto.
- `handoff` — al cerrar la sesión o cuando el contexto se esté llenando.

Skills de tecnología, si están instaladas en esa carpeta: `architecture`, `react`, `nextjs`, `django`, `fastapi`, `database`. Lee la que corresponda antes de escribir código de esa tecnología o de diseñar algo nuevo.
<!-- harness:end -->
