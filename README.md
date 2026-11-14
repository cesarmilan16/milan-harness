# milan-harness

Un harness mínimo para desarrollar con agentes de código, solo o en equipo pequeño.
Cuatro objetivos: que sea sencillo, que gaste pocos tokens, que el contexto no se pierda
entre sesiones y que haya una forma clara de trabajar.

Funciona con Claude Code, Codex, Cursor, Gemini CLI y OpenCode. Sin dependencias: Node 18+ y git.

## Guía rápida

### Una vez por proyecto

1. Instala el harness desde la carpeta del proyecto. Añade `--team` si trabajáis varios.
   ```bash
   node ~/milan-harness/install.mjs . --team
   ```
2. Abre tu agente en el proyecto y dile una de estas dos cosas:
   - **Proyecto nuevo: «planifica el proyecto».** Te hace unas pocas preguntas, fija el stack y
     escribe `docs/plan.md`: hitos y tareas ordenadas, cada una con su tamaño (S, M o L).
   - **Proyecto que ya existe: «usa la skill setup».** Explora el repo y rellena `docs/project.md`.
3. Revisa lo que ha escrito en `docs/`, haz commit de todo y súbelo a `main`.

Quien clone el proyecto después ya tiene el harness. No instala nada.

### Cada vez que trabajas

1. **Abre el agente en el proyecto.** Ya sabe en qué rama estás y qué quedó pendiente.
2. **Da la tarea**, con tus palabras, o di **«siguiente tarea»** si hay plan.
3. **El agente la lleva hasta el final**: mide su tamaño, planifica, implementa con tests, revisa
   y hace commit en la rama. Solo te pregunta si el alcance es ambiguo o la tarea es grande.
4. **Tú revisas y publicas:**
   ```bash
   git log --oneline main..      # qué commits ha hecho
   git diff main...              # qué ha cambiado
   git push -u origin <rama>     # súbelo cuando te convenza
   ```
5. **Antes de cerrar, di «lo dejamos aquí».** El agente anota el siguiente paso.

Para continuar otro día, abre el agente y di **«sigue»**.

### Quién hace qué

| Acción | Quién |
| --- | --- |
| Escribir código y hacer commits en la rama | El agente |
| `git push` y fusionar un pull request | Tú. Si se lo pides al agente, te pide confirmación antes. |
| Commit o push directo a `main` (con `--team`) | Nadie desde el agente: está bloqueado |
| Borrar trabajo o datos (`git reset --hard`, `rm -rf`, push forzado, `DROP TABLE`) | El agente solo con tu confirmación |

Si prefieres que el agente suba ramas sin preguntar, pon `"agentPush": "allow"` en
`.harness/config.json`. `main` y el push forzado siguen protegidos.

### Opciones del instalador

```bash
node ~/milan-harness/install.mjs . --agents claude,codex   # solo algunos agentes
node ~/milan-harness/install.mjs . --dry-run               # ver qué haría sin escribir
node ~/milan-harness/install.mjs . --force                 # actualizar también reglas, skills y docs
node .harness/doctor.mjs                                    # comprobar que todo está en su sitio
```

## Qué instala

| Pieza | Dónde | Para qué |
| --- | --- | --- |
| Reglas | `AGENTS.md` (bloque marcado) | Lo único que se carga siempre: unos 1.000 tokens. |
| Memoria | `docs/project.md`, `docs/decisions.md`, `docs/features/` | Lo que debe sobrevivir al chat. Markdown en git. |
| Skills | `.agents/skills/<nombre>/SKILL.md` | Procedimientos que se leen solo cuando hacen falta. |
| Roles | `.agents/roles/` y `agents/` de cada agente | Implementador y revisor, como subagentes nativos. |
| Hooks | `.harness/hooks/` | Estado al iniciar sesión y guardia de comandos. |
| Cableado | `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.opencode/` | Conecta lo anterior con cada agente. |
| Diagnóstico | `.harness/doctor.mjs` | `node .harness/doctor.mjs` comprueba que todo sigue en su sitio. |

## Cómo se trabaja

Cada petición va por uno de dos carriles:

1. **Responder.** Preguntas, explicaciones, propuestas. No se escribe nada.
2. **Tarea.** Cualquier petición de construir, cambiar o arreglar. El agente mide la tarea y aplica
   el proceso en proporción a su tamaño:

| Tamaño | Qué es | Qué ocurre | Modelo |
| --- | --- | --- | --- |
| **S** | Cambio localizado, sin decisiones | El agente lo hace directo: test, cambio, commit. Sin subagentes. | El de la sesión |
| **M** | Comportamiento nuevo, varios archivos | Plan breve → un implementador → verificación → un revisor con contexto limpio | Estándar |
| **L** | Decisiones acopladas, lógica difícil o riesgo alto | Plan que **tú apruebas** → implementador → verificación → dos revisores (corrección y seguridad) | Avanzado |

Todo cambio lleva su test, escrito antes que el código. El agente principal vuelve a ejecutar los
tests él mismo: no se fía del informe del implementador. Los hallazgos de la revisión se corrigen
en dos rondas como máximo; lo que quede, lo decides tú.

No todas las tareas pasan por subagentes a propósito. Un subagente arranca sin contexto y relee el
proyecto, así que en una tarea pequeña cuesta más de lo que aporta.

### Empezar un proyecto

```text
tú      «planifica el proyecto: una app para gestionar reservas de un gimnasio»
agente  skill project-plan: pregunta lo imprescindible, fija stack y decisiones,
        escribe docs/plan.md y espera tu visto bueno

docs/plan.md
  ## Hito 1 — Reservar una clase de extremo a extremo
  - [ ] **T01** [S] Esqueleto con tests y lint · prueba: npm test pasa
  - [ ] **T02** [M] Alta de usuarios · depende: T01 · prueba: test de alta y de email duplicado
  - [ ] **T03** [L] Sesiones y permisos · depende: T02 · riesgo: alto
  ## Hito 2 — Pagos
  Por detallar.

tú      «siguiente tarea»
agente  skill task: T01, tamaño S → la hace directa y la marca
tú      «siguiente tarea»
agente  skill task: T02, tamaño M → plan, implementador, verificación, revisor, commit
```

Solo se detalla tarea a tarea el primer hito; los siguientes se detallan al llegar. Al iniciar
cada sesión el agente ve el progreso del plan y cuál es la siguiente tarea.

### Qué modelo se usa

El plan asigna un tamaño a cada tarea y `.harness/config.json` dice qué modelo corresponde:

```json
"models": {
  "claude": { "economico": "haiku", "estandar": "sonnet", "avanzado": "opus" },
  "codex":  { "economico": "", "estandar": "", "avanzado": "" }
}
```

- En Claude Code viene configurado. En el resto de agentes está vacío, que significa «el modelo de
  la sesión»: pon ahí los nombres de modelo de tu cuenta y vuelve a ejecutar el instalador.
- Las tareas S sueltas las hace la sesión directamente. Las S del plan, ejecutadas en serie, van al
  modelo económico si hay uno configurado.
- Si el implementador falla la verificación dos veces, el agente sube un nivel en lugar de insistir.
- El revisor nunca usa un modelo inferior al del implementador.
- El ahorro grande está en la planificación: partir una tarea L en una parte difícil y varias S o M
  mecánicas hace que casi todo el trabajo corra en modelos baratos.
- El modelo de la sesión principal lo eliges tú. Conviene uno potente para planificar y orquestar.

### Continuar otro día

```text
tú      «lo dejamos aquí»
agente  skill handoff: anota el siguiente paso y hace commit

(otra sesión, otro día, otro agente u otra persona)

inicio  el hook inyecta: rama, feature de esta rama, tareas 2/5, siguiente paso, progreso del plan
tú      «sigue»
agente  skill resume: lee el documento y continúa desde el siguiente paso
```

### Las skills

| Skill | Cuándo |
| --- | --- |
| `task` | Cualquier petición que cambie código, o «siguiente tarea». Es el punto de entrada. |
| `project-plan` | Empezar un proyecto o un hito: lo divide en tareas con tamaño. |
| `setup` | Primera vez en un proyecto que ya existe. |
| `resume` | Retomar una feature en una sesión nueva. |
| `verify` | Antes de dar algo por hecho: se marca lo comprobado, no lo que parece correcto. |
| `review` | Revisión a petición tuya, fuera de una tarea. |
| `handoff` | Al cerrar la sesión o cuando el contexto se llena. |

### Skills de tecnología

Son listas cortas de lo que más se hace mal en cada tecnología: seguridad, rendimiento y
estructura. No sustituyen a la documentación del framework.

| Skill | Se instala si el proyecto usa |
| --- | --- |
| `architecture` | Siempre |
| `react` | React o Next.js |
| `nextjs` | Next.js |
| `django` | Django |
| `fastapi` | FastAPI |
| `database` | Django, o un ORM o driver de base de datos (Prisma, Drizzle, SQLAlchemy, `pg`…) |

El instalador las detecta leyendo `package.json`, `requirements.txt` y `pyproject.toml` en la raíz
y en sus carpetas directas. Si añades una tecnología más adelante, vuelve a ejecutar el instalador.
Para elegirlas a mano: `--stack react,database`, o `--stack none` para no instalar ninguna.

## Dónde se ahorran tokens

- **Poco texto fijo.** Solo `AGENTS.md` se carga en cada sesión. `doctor` avisa si pasa de ~2.500 tokens.
- **Skills bajo demanda.** Se paga su descripción; el cuerpo se lee cuando se usa.
- **`docs/project.md` en lugar de explorar.** 60 líneas con stack, comandos y mapa del código.
- **Estado de inicio con tope.** 1.500 caracteres como máximo (`maxContextChars` en `.harness/config.json`).
- **Proceso proporcional.** Las tareas S se hacen directas; los subagentes solo entran en M y L.
- **Modelo según el tamaño.** Las tareas fáciles corren en el modelo económico y solo las difíciles en el avanzado.
- **Los documentos se pasan por ruta**, no resumidos.

## En equipo

- La configuración, las skills y la memoria van en git: todos trabajan igual sin instalar nada.
- Cada feature tiene `owner` y `branch`. Al iniciar sesión se ven las features activas de los demás.
- Con `--team` el agente no puede hacer commit ni push directo a `main` o `master`; trabaja en ramas.
  Las ramas se eligen en `protectedBranches`, en `.harness/config.json`.
- `docs/decisions.md` usa `merge=union`: dos personas añadiendo decisiones a la vez no chocan.
- Dos sesiones en la misma carpeta: la segunda trabaja en un `git worktree`.

El guardia solo ve los comandos que ejecuta el agente. Lo que tú hagas en tu terminal no se toca.

## Soporte por agente

| | Reglas | Skills | Estado al iniciar | Guardia de comandos |
| --- | --- | --- | --- | --- |
| Claude Code | `CLAUDE.md` importa `AGENTS.md` | nativas, enlazadas en `.claude/skills/` | hook `SessionStart` | hook `PreToolUse`, pregunta al usuario |
| Codex | `AGENTS.md` | `.agents/skills/` | `.codex/hooks.json` (confía con `/hooks`) | bloquea y pide confirmar |
| Cursor | `AGENTS.md` | `.agents/skills/` | `.cursor/hooks.json` | pregunta al usuario |
| Gemini CLI | `AGENTS.md` vía `context.fileName` | `.agents/skills/` | `.gemini/settings.json` | bloquea y pide confirmar |
| OpenCode | `AGENTS.md` | `.agents/skills/` | plugin | bloquea y pide confirmar |

**Subagentes.** Se instalan `implementer` y `reviewer` en el formato nativo de cada agente:

| Agente | Dónde | Cómo recibe el modelo |
| --- | --- | --- |
| Claude Code | `.claude/agents/*.md` | La skill `task` lo pasa en cada lanzamiento |
| Codex | `.codex/agents/*.toml` | Fijado en la definición |
| Cursor | `.cursor/agents/*.md` | Fijado en la definición |
| Gemini CLI | `.gemini/agents/*.md` | Fijado en la definición |
| OpenCode | `.opencode/agents/*.md` | Fijado en la definición |

Donde el modelo va fijado, al rellenar `models` y volver a ejecutar el instalador se genera una
variante por nivel: `implementer-economico`, `implementer`, `implementer-avanzado`, `reviewer` y
`reviewer-avanzado`. Sin modelos configurados hay un solo `implementer` y un solo `reviewer`, que
usan el modelo de la sesión. Todas las definiciones apuntan al mismo rol en `.agents/roles/`.

**Qué está probado.** Los tests cubren el instalador, la lógica de los hooks y el formato de salida
de cada agente. Los formatos de Codex, Cursor, Gemini y OpenCode están tomados de cómo los cablea
[rsc-harness](https://github.com/ericrisco/rsc-harness), pero no se han ejecutado dentro de esos
agentes. Si en alguno no llega el estado de inicio, `AGENTS.md` ya le indica que ejecute
`node .harness/hooks/session-start.mjs`, y el índice de skills de `AGENTS.md` funciona en cualquier
agente que lea ese archivo.

«Bloquea y pide confirmar»: el comando se rechaza, el agente te explica qué hace y, si aceptas,
lo repite con el prefijo `HARNESS_OK=1`. Es un freno contra despistes, no un candado de seguridad.

## Límites de seguridad

- El guardia solo ve los comandos de shell del agente. Un comando envuelto en `bash -c "..."` o
  dentro de un script se le escapa.
- La protección de `main` es local. Activa también la protección de rama en GitHub o GitLab para
  que nadie pueda saltársela desde su terminal.
- No hay bloqueo técnico de secretos: que el agente no lea `.env` es una regla de `AGENTS.md`, no
  un hook. Mantén los secretos fuera del repo y en `.gitignore`.
- Revisa el diff antes de hacer push. El harness hace que el agente compruebe su trabajo, no que
  acierte siempre.

## Adaptarlo

- **Tus reglas**: escríbelas en `AGENTS.md` fuera del bloque `harness:start … harness:end`.
- **Tus skills**: crea `.agents/skills/<nombre>/SKILL.md` con `name` y `description`, añade una línea
  al índice de `AGENTS.md` y vuelve a ejecutar el instalador para enlazarla en Claude Code.
- **Actualizar**: el instalador renueva siempre el código de `.harness/` y el cableado. Tu texto
  (`AGENTS.md`, skills, `docs/`) solo cambia con `--force`.
- **Quitarlo**: borra `.harness/`, `.agents/skills/`, el bloque de `AGENTS.md` y las entradas que
  contienen `.harness/hooks/` en la configuración de cada agente.

## Desarrollo

```bash
npm test
```

```text
install.mjs            instalador y cableado por agente
template/
  AGENTS.block.md      reglas siempre cargadas
  harness/hooks/       lib.mjs (lógica), session-start.mjs, guard.mjs
  harness/doctor.mjs   diagnóstico
  skills/              skills de flujo (task, project-plan, setup, resume, verify, review, handoff)
  skills-stack/        skills de tecnología, se instalan según el proyecto
  roles/               instrucciones del implementador y del revisor
  docs/                plantillas de la memoria
  opencode/harness.js  plugin de OpenCode
test/                  node:test
```

## De dónde salen las ideas

De [rsc-harness](https://github.com/ericrisco/rsc-harness): los tres carriles, el documento de
feature, la memoria en markdown dentro del repo y el plan compartido por git.
De [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai): mantener pequeño el trabajo
pequeño, delegar solo con motivo y revisar según el riesgo.
Aquí está solo el núcleo: sin catálogo de skills, sin telemetría y sin auto-actualización.
