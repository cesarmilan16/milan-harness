---
name: verify
description: Comprueba un cambio antes de darlo por hecho o de marcar una tarea. Úsala antes de decir "listo", "funciona" o "arreglado", y antes de cada commit de una feature.
---
# verify

Una tarea está hecha cuando has visto la prueba en esta sesión, no cuando el código parece correcto.

1. **Nombra la comprobación** que demostraría que funciona: un test, un comando, una petición HTTP, una salida concreta. Si la tarea venía con una, usa esa.
2. **Ejecútala y lee la salida.** Que el comando termine no basta; mira qué dice.
3. **Comprueba que no rompiste lo de al lado**: el test enfocado primero y después la suite y el lint que indica `docs/project.md`. Si la suite es lenta, ejecuta al menos la parte afectada y di cuál.
4. **Si un bug motivó el cambio**, reproduce el fallo antes y comprueba después que ya no ocurre.
5. **Informa con hechos**: comando y resultado. Anótalo en `Evidencia` si hay documento de feature.

Si algo falla, no lo marques: arréglalo o déjalo anotado como pendiente con el error.
Si no puedes comprobar algo (falta un servicio, credenciales, entorno), dilo tal cual y no lo des por hecho.
No debilites ni borres un test para que pase sin decirlo.
