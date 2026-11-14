---
name: project-plan
description: Planifica un proyecto nuevo, un MVP o un hito grande, lo divide en tareas ordenadas con tamaño (S, M, L) y lo deja en docs/plan.md. Úsala al empezar un proyecto con el harness o cuando el usuario pida planificar el proyecto entero. No implementa nada.
---
# project-plan

El resultado es `docs/plan.md`: una lista de tareas que la skill `task` puede ejecutar una a una.

## 1. Entiende

Lee lo que ya exista (README, `docs/`, código). Después pregunta en **una sola tanda**, cinco preguntas como mucho, solo lo que no esté escrito:

- Qué es y para quién.
- Qué entra en la primera versión y qué queda fuera.
- Stack. Si no hay preferencia, propón uno y di por qué.
- Restricciones: plazo, dónde se despliega, datos sensibles.
- Quién trabaja en el proyecto.

## 2. Fija lo estructural

- `docs/project.md`: qué es, stack, comandos previstos, mapa de carpetas. Borra la línea `harness:pendiente`.
- `docs/decisions.md`: una entrada por decisión estructural (stack, base de datos, autenticación, despliegue), con lo descartado.

## 3. Divide en hitos

Cada hito deja algo que se puede usar y comprobar. El primero es lo mínimo que funciona de extremo a extremo, aunque sea feo.

**Detalla tarea a tarea solo el primer hito.** Los demás, en una o dos líneas: se detallan al llegar, cuando ya se sabe más. Un plan detallado a seis meses vista queda obsoleto y cuesta tokens en cada lectura.

## 4. Divide el hito en tareas

- Una tarea es un comportamiento con sus tests, cabe en una sesión y tiene una comprobación concreta. Si no sabes cómo comprobarla, está mal definida.
- **T01 es siempre el esqueleto**: proyecto que arranca, tests y lint funcionando. Así todas las demás pueden empezar por el test.
- Lo arriesgado o incierto va pronto, para descubrir los problemas cuando aún es barato cambiar.
- Ordena por dependencia: una tarea nunca depende de otra posterior.

## 5. Pon tamaño a cada tarea

| Tamaño | Qué es | Modelo |
| --- | --- | --- |
| **S** | Cambio localizado, sigue un patrón existente, sin decisiones | Económico |
| **M** | Comportamiento nuevo, varios archivos, alguna decisión acotada | Estándar |
| **L** | Decisiones acopladas, cambio transversal, lógica difícil o riesgo alto | Avanzado |

Riesgo alto (datos y migraciones, autenticación, pagos, CI y despliegue) es siempre **L**.

Para gastar poco, **parte las tareas L**: casi siempre esconden una decisión difícil y varias tareas S o M mecánicas. Deja como L solo la parte difícil.

## 6. Escribe `docs/plan.md`

El formato de las líneas de tarea es fijo, porque el estado de inicio lo lee:

```markdown
# Plan

Actualizado: AAAA-MM-DD

## Hito 1 — Nombre: qué se puede usar al terminarlo

- [ ] **T01** [S] Esqueleto del proyecto con tests y lint · prueba: `npm test` pasa
- [ ] **T02** [M] Registro de usuarios · depende: T01 · prueba: test de alta y de email duplicado
- [ ] **T03** [L] Sesiones y permisos · depende: T02 · riesgo: alto · prueba: tests de acceso por rol

## Hito 2 — Nombre

Por detallar: una o dos líneas de lo que incluye.
```

## 7. Enseña el resumen y espera

Hitos, número de tareas por tamaño y las decisiones tomadas. Espera el visto bueno del usuario y haz commit de `docs/`. **No implementes nada**: para empezar, el usuario dice «siguiente tarea».

## Mantener el plan

- Si la realidad cambia, cambia primero el plan y después el código.
- Al terminar un hito, detalla el siguiente con esta misma skill.
- En equipo: quien empieza una tarea M o L crea su rama y su documento de feature, y así los demás ven que está cogida.
