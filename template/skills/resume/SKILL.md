---
name: resume
description: Retoma una feature en curso en una sesión nueva, o después de que otra persona o agente haya trabajado en ella. Úsala cuando el usuario diga "sigue", "continúa" o nombre una feature existente.
---
# resume

1. **Localiza el documento.** El estado de inicio nombra la feature de esta rama. Si hay varias activas y ninguna es de esta rama, pregunta cuál.
2. **Lee el documento entero** y nada más todavía. Es la fuente de verdad; no reconstruyas el plan a partir del código.
3. **Contrasta con git**: `git status --short` y `git log --oneline -5`. Si hay cambios sin commitear o tareas marcadas que el código no respalda, dilo antes de continuar.
4. **Si el `owner` es otra persona**, pregunta antes de escribir.
5. **Continúa desde `Siguiente paso`**, leyendo solo los archivos que esa tarea necesita.
6. Di en una línea dónde estás: feature, tareas hechas sobre el total y qué vas a hacer ahora.

Si el documento y el código se contradicen, manda el código: corrige el documento y avisa.
