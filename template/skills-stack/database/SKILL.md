---
name: database
description: Buenas prácticas de base de datos relacional. Úsala al diseñar o cambiar tablas, escribir migraciones, añadir índices, escribir consultas, usar transacciones o tocar datos existentes, con cualquier ORM o SQL directo.
---
# database

Todo cambio de esquema o de datos es **riesgo alto**: va por el carril de feature y pasa por la skill `review`.

## Esquema

- Clave primaria en todas las tablas. Claves foráneas reales, con su comportamiento al borrar elegido a conciencia.
- **Las reglas viven en la base de datos**, no solo en el código: `NOT NULL`, `UNIQUE`, `CHECK`. El código tiene bugs y hay más de un camino para escribir.
- Tipos correctos: fechas con zona horaria, dinero en decimal o en céntimos enteros (nunca coma flotante), enumerados acotados.
- `created_at` y `updated_at` en las tablas de negocio.
- Normaliza por defecto. Duplica un dato solo con una razón medida, y anótala en `docs/decisions.md`.

## Migraciones

- Todo cambio de esquema es una migración versionada en el repo. Nunca a mano contra la base de datos.
- **No edites una migración ya aplicada.** Crea otra.
- Cada migración se prueba aplicándola sobre una copia con datos, no solo sobre una base vacía.
- Cambios compatibles hacia atrás, en pasos, para que el código antiguo siga funcionando durante el despliegue:
  - Añadir columna obligatoria: añádela opcional o con valor por defecto → rellena → hazla obligatoria.
  - Renombrar o borrar: añade lo nuevo → migra el código → borra lo antiguo en un cambio posterior.
- En tablas grandes, cuidado con lo que bloquea: crear índices, cambiar tipos, rellenar millones de filas en una sola transacción. Hazlo por lotes.
- Separa las migraciones de esquema de las de datos.

## Consultas

- **Siempre parametrizadas.** Nunca concatenes ni interpoles valores en SQL.
- Evita N+1: carga las relaciones en la misma consulta o en una segunda, no una por fila.
- Pide solo las columnas y filas que necesitas. Todo listado lleva límite y paginación.
- Índice en las columnas por las que filtras, ordenas o unes, y en las claves foráneas. Ante una consulta lenta, mira el plan (`EXPLAIN`) antes de tocar nada.
- No añadas índices «por si acaso»: cada uno encarece las escrituras.

## Transacciones

- Las escrituras que deben ocurrir juntas van en una transacción.
- Transacciones cortas: sin llamadas a servicios externos dentro.
- Para leer-y-luego-escribir con concurrencia, bloquea la fila o usa una actualización atómica. Una comprobación previa en el código no evita duplicados: eso lo hace un `UNIQUE`.

## Datos reales

- **Nunca ejecutes contra producción** desde el agente. Trabaja en local o en una copia.
- `UPDATE` y `DELETE` siempre con `WHERE`; comprueba antes con un `SELECT` cuántas filas afecta.
- Antes de un cambio destructivo, confirma que hay copia de seguridad y que se sabe restaurar.
- Datos personales: guarda los mínimos, nunca en logs, y contraseñas siempre con hash.
- Las credenciales de la base de datos vienen del entorno; la aplicación usa un usuario con los permisos justos.
