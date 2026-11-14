---
name: task
description: Punto de entrada para cualquier petición que cambie código. Recibe una tarea, o «siguiente tarea» del plan, mide su tamaño y la lleva de principio a fin (plan, implementación con tests, verificación y revisión), delegando en subagentes con el modelo adecuado. Úsala siempre que el usuario pida construir, cambiar o arreglar algo.
---
# task

El usuario da la tarea y tú la llevas hasta el final. Solo paras a preguntar en los casos que se indican.

## 1. Mide la tarea

Si el usuario dice «siguiente tarea», toma la primera sin marcar de `docs/plan.md`, que ya trae su tamaño.

| Tamaño | Qué es | Ruta |
| --- | --- | --- |
| **S** | Cambio localizado, un comportamiento, sigue un patrón que ya existe en el repo, sin decisiones | Directa |
| **M** | Comportamiento nuevo, varios archivos, tests nuevos, alguna decisión de diseño acotada | Delegada |
| **L** | Decisiones que dependen unas de otras, cambio transversal, lógica difícil, **o cualquier riesgo alto** | Delegada con aprobación |

Riesgo alto: datos y migraciones, autenticación y permisos, pagos, CI y despliegue, contratos compartidos, o código sin test que detecte la regresión.

Di en una línea el tamaño, el motivo y el modelo que vas a usar. En la duda entre dos tamaños, el mayor.

Si la petición es ambigua en algo que cambia el alcance, haz **una** tanda de preguntas antes de empezar. Lo demás, decídelo y anótalo.

## 2. Ruta directa (S)

Sin documento y, por defecto, sin subagentes.

1. Escribe el test que falla, haz el cambio, comprueba que pasa (skill `verify`).
2. Commit en la rama. Si la tarea venía del plan, márcala `[x]` en el mismo commit.
3. Informa: qué cambió y qué comando lo demuestra.

Si a mitad resulta ser más grande de lo previsto, para y pásala a la ruta delegada.

**Excepción para gastar menos:** si estás ejecutando tareas S seguidas de `docs/plan.md` y hay un modelo económico configurado, lanza cada una en un `implementer` con ese modelo. Pásale la línea del plan como encargo; después verifica tú y marca la tarea. Sin documento y sin revisor.

## 3. Ruta delegada (M y L)

**Planifica.** Crea la rama `feat/<slug>` y `docs/features/<slug>.md` desde `_template.md`: objetivo con las palabras literales del usuario, y entre 3 y 8 tareas, cada una con su comprobación. Lee antes `docs/project.md`, `docs/decisions.md` y la skill de tecnología que aplique. Haz commit del documento.

- **L:** enseña el plan y espera el visto bueno del usuario.
- **M:** continúa sin preguntar.

**Implementa.** Lanza un subagente `implementer` con el modelo del tamaño. Pásale la ruta del documento y qué tareas le tocan; no le resumas el documento. Uno cada vez. En paralelo solo si las unidades son independientes y tocan archivos distintos, cada una en su worktree.

**Verifica tú.** No te fíes del informe: ejecuta la suite de tests y el lint, y mira el diff por encima (`git diff --stat`). Si falla, devuélveselo al implementador con el error exacto.

**Revisa.** Lanza un subagente `reviewer` con contexto limpio. Pásale la ruta del documento y el rango (`<base>...HEAD`); nunca tu razonamiento.

- **M:** un revisor, lente `correccion`.
- **L:** dos revisores a la vez, lentes `correccion` y `seguridad`, con el modelo avanzado.

**Corrige.** Descarta los hallazgos que no se sostengan al trazarlos en el código. Los confirmados vuelven al implementador; después verifica otra vez. Dos rondas como máximo: si quedan hallazgos, preséntalos al usuario.

**Cierra.** `status: done` en el documento, `[x]` en `docs/plan.md` si venía de ahí, decisiones duraderas a `docs/decisions.md`. Informa en pocas líneas: qué se hizo, tests ejecutados y resultado, «N hallazgos, M confirmados, K corregidos», y qué rama tiene commits sin subir. El push lo hace el usuario.

## Modelos

El modelo de cada tamaño (S económico, M estándar, L avanzado) está en `models` de `.harness/config.json` y aparece en el estado de inicio.

- **Claude Code:** pasa el modelo al lanzar `implementer` o `reviewer`.
- **Codex, Cursor, Gemini y OpenCode:** el modelo va fijado en la definición del subagente. Usa la variante del nivel: `implementer-economico`, `implementer`, `implementer-avanzado`, `reviewer`, `reviewer-avanzado`. Si solo existen `implementer` y `reviewer`, no hay modelos configurados y todo usa el de la sesión.

- Empieza por el modelo del tamaño. Si el implementador falla la verificación dos veces, sube un nivel en lugar de insistir.
- El revisor nunca usa un modelo inferior al del implementador.

## Si no puedes lanzar subagentes

Si tu agente o tu sesión no lo permiten, sigue los mismos pasos en la misma sesión, leyendo `.agents/roles/implementer.md` y `.agents/roles/reviewer.md` en cada fase. Para una tarea L, dile al usuario que la revisión no ha sido independiente y propón repetirla en una sesión nueva.

## Cuándo parar y preguntar

Alcance ambiguo, plan de una tarea L, algo destructivo o irreversible, hallazgos sin resolver tras dos rondas, o un bloqueo externo (credenciales, servicio caído). En todo lo demás, sigue.
