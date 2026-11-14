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
2. Abre tu agente en el proyecto y dile **«usa la skill setup»**. Explora el repo, te hace unas
   pocas preguntas y rellena `docs/project.md`.
3. Revisa `docs/project.md`, haz commit de todo y súbelo a `main`.

Quien clone el proyecto después ya tiene el harness. No instala nada.

### Cada vez que trabajas

1. **Abre el agente en el proyecto.** Ya sabe en qué rama estás y qué quedó pendiente.
2. **Pide lo que quieres**, con tus palabras. El agente te dice si es una respuesta, un cambio
   directo o una feature.
3. **El agente hace el cambio, lo comprueba y hace commit** en la rama.
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
| Skills | `.agents/skills/<nombre>/SKILL.md` | Seis procedimientos que se leen solo cuando hacen falta. |
| Hooks | `.harness/hooks/` | Estado al iniciar sesión y guardia de comandos. |
| Cableado | `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.opencode/` | Conecta lo anterior con cada agente. |
| Diagnóstico | `.harness/doctor.mjs` | `node .harness/doctor.mjs` comprueba que todo sigue en su sitio. |

## Cómo se trabaja

Cada petición va por uno de tres carriles, y el agente dice cuál:

1. **Responder.** Preguntas, explicaciones, propuestas. No se escribe nada.
2. **Cambio directo.** Un cambio entendido, de riesgo acotado, que se retoma desde `git diff`.
   Se hace, se comprueba y se acaba. Sin documento y sin subagentes.
3. **Feature.** Trabajo que no se podría retomar desde el diff: varias sesiones, requisitos largos
   o riesgo alto. Tiene rama propia y un documento en `docs/features/<slug>.md` con el objetivo
   literal, el plan, la evidencia y el siguiente paso.

Un día normal:

```text
tú      «añade login con email»
agente  carril 3 → skill feature: rama feat/login + docs/features/login.md, implementa tarea a tarea
tú      «lo dejamos aquí»
agente  skill handoff: anota el siguiente paso y hace commit

(otra sesión, otro día, otro agente u otra persona)

inicio  el hook inyecta: rama, feature de esta rama, tareas 2/5, siguiente paso
tú      «sigue»
agente  skill resume: lee el documento y continúa desde el siguiente paso
```

### Las skills

| Skill | Cuándo |
| --- | --- |
| `setup` | Primera vez en el proyecto. |
| `feature` | Empezar un trabajo del carril 3. |
| `resume` | Retomar una feature en una sesión nueva. |
| `verify` | Antes de dar algo por hecho: se marca lo comprobado, no lo que parece correcto. |
| `review` | Antes de fusionar. Profundidad según el riesgo; verificador independiente solo si es alto. |
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
- **Directo por defecto.** Un subagente arranca sin caché y relee el repo; solo se delega con un motivo nombrado.
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
  skills/              las seis skills
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
