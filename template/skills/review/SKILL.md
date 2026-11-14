---
name: review
description: Revisa un cambio terminado con una profundidad proporcional a su riesgo, antes de fusionarlo o abrir un pull request. Úsala cuando el usuario pida una revisión fuera de una tarea; dentro de una tarea, la revisión ya la dirige la skill task.
---
# review

Primero la skill `verify`: no se revisa lo que no pasa sus comprobaciones.

## 1. Fija qué se revisa

`git diff <base>...HEAD` sobre la rama. Anota el commit revisado; si el código cambia después, la revisión ya no vale para lo nuevo.

## 2. Elige la profundidad

| Riesgo | Qué es | Revisión |
| --- | --- | --- |
| Bajo | Documentación, textos, configuración local | Ninguna. Basta `verify`. |
| Medio | Código ordinario con tests | Relee tú el diff completo con la lista de abajo. |
| Alto | Datos y migraciones, autenticación, pagos, CI y despliegue, contratos compartidos, código sin test que detecte la regresión | Verificador independiente. |

**Verificador independiente**: un subagente `reviewer` con contexto limpio (rol en `.agents/roles/reviewer.md`), o una sesión nueva si el agente no tiene subagentes. Recibe la ruta del documento de la feature y el rango de commits. No recibe tu razonamiento ni tu resumen. Nunca es la misma sesión que escribió el cambio. Con riesgo alto, lanza dos a la vez: lentes `correccion` y `seguridad`.

## 3. Qué mirar

- ¿Hace lo que pide `Objetivo`, ni menos ni más?
- Casos límite: vacío, nulo, duplicado, concurrente, fallo a medias.
- Errores: ¿se tragan, se propagan o dejan datos a medio escribir?
- Seguridad: entrada sin validar, secretos, permisos.
- ¿Los tests fallarían si el comportamiento se rompiera?

## 4. Hallazgos

Cada hallazgo lleva `archivo:línea` y un escenario concreto de fallo. Antes de aceptarlo, intenta reproducirlo o trazarlo en el código; descarta lo que no se sostenga. Gustos y estilo no bloquean.

Corrige lo confirmado y repite `verify`. Dos rondas de corrección como máximo; si quedan hallazgos, preséntalos al usuario y que decida.

Informa así: «N reportados, M confirmados, K corregidos», con los descartados y su motivo. Fusionar y publicar lo decide el usuario.
