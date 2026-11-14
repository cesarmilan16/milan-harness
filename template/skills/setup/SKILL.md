---
name: setup
description: Rellena docs/project.md la primera vez que se usa el harness en un proyecto, o cuando está vacío o desfasado. Úsala si el estado de inicio dice que project.md está sin rellenar.
---
# setup

Objetivo: que ninguna sesión futura tenga que explorar el repo para saber lo básico.

1. **Reúne evidencia barata.** Manifiestos (`package.json`, `pyproject.toml`, `go.mod`…), README, configuración de CI, carpetas a dos niveles y `git log -15 --oneline`. No leas código fuente salvo los puntos de entrada.
2. **Pregunta solo lo que el repo no dice**: para qué es el proyecto, quién trabaja en él y qué no se debe tocar. Una sola tanda, cuatro preguntas como mucho.
3. **Rellena `docs/project.md`** en 60 líneas como máximo. Ejecuta una vez los comandos de tests y lint y anota el comando exacto que funcionó. Si alguno falla, anótalo como roto; no lo omitas.
4. **Borra la primera línea** (`harness:pendiente`).
5. Si al preguntar salió alguna decisión, añádela a `docs/decisions.md`.
6. Si trabajan varias personas, propón proteger la rama principal: `"protectedBranches": ["main"]` en `.harness/config.json`.

No escribas historia del proyecto, listados exhaustivos de archivos ni nada que `ls` o `git log` ya cuenten.
