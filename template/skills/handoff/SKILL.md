---
name: handoff
description: Deja el trabajo listo para que otra sesión, otro agente u otra persona lo retome sin el chat. Úsala al terminar la sesión, al pausar una feature, cuando el contexto se esté llenando o cuando el usuario diga "guarda", "lo dejamos aquí" o "recuerda esto".
---
# handoff

Lo que no quede escrito en el repo se pierde con la sesión.

1. **Documento de la feature**, si hay una activa:
   - Marca solo las tareas con evidencia.
   - `Siguiente paso`: lo primero que hay que hacer, tan concreto que se pueda empezar sin preguntar. Incluye el archivo y el comando si los hay.
   - `Notas`: lo que has descubierto y no es evidente en el código, como intentos fallidos y su motivo.
   - `updated` con la fecha de hoy, y `status: paused` si se aparca.
2. **Decisiones**: lo que se decidió y alguien podría querer reabrir va a `docs/decisions.md`, con su porqué y lo descartado.
3. **`docs/project.md`**: actualízalo solo si cambió algo de lo que describe, como un comando, el stack o una convención.
4. **Commit** de la documentación junto con el código que describe. Si hay código a medias, déjalo en la rama de la feature y nómbralo en `Siguiente paso`; no lo descartes.
5. Dile al usuario en dos líneas qué queda guardado y cuál es el siguiente paso.

Si el usuario dice «recuerda esto» sin feature activa: si es una decisión va a `docs/decisions.md`; si es un hecho del proyecto, a `docs/project.md`.

No guardes resúmenes de la conversación, lo que `git log` ya cuenta, ni secretos.
